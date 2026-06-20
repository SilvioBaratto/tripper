# Tripper - Travel Planner

An AI-powered travel planning application. Build personalized itineraries, chat with a context-aware assistant, and manage your trip details -- all in one place.

> Runs locally via Docker Compose -- no hosted deployment.

## Features

- **AI Chatbot** -- RAG-powered assistant with knowledge of restaurants, museums, neighborhoods, and more. Streams responses in real time via SSE.
- **Itinerary Management** -- Full CRUD for trips, days, and activities. Inline editing and PDF import via LLM extraction.
- **Mobile-First** -- Responsive design (shared mobile top bar + bottom tab bar) tested on desktop and mobile viewports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 11, Prisma ORM, Zod validation |
| Frontend | Angular 21, Signals, Tailwind CSS 4 |
| Database | PostgreSQL (local Docker or Supabase) |
| Vector Search | Qdrant |
| AI/LLM | BAML (Azure OpenAI), Azure `text-embedding-3-large` (3072-dim) embeddings |
| Infrastructure | Docker Compose (local) |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (recommended — bundles PostgreSQL + Qdrant)
- Azure OpenAI access (chat deployment + `text-embedding-3-large` embeddings deployment)
- A Qdrant instance (local container or Qdrant Cloud)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/SilvioBaratto/tripper.git
cd tripper
```

2. **Configure environment variables**

```bash
cp api/.env.example api/.env
```

Fill in the required values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string |
| `AZURE_OPENAI_BASE_URL` | Azure OpenAI chat deployment base URL |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI chat API key |
| `AZURE_OPENAI_EMBEDDINGS_ENDPOINT` | Azure embeddings endpoint (`text-embedding-3-large`) |
| `AZURE_OPENAI_EMBEDDINGS_API_KEY` | Azure embeddings API key |
| `AZURE_OPENAI_EMBEDDINGS_DIM` | Embedding dimensions (`3072`) |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key (empty for local, no-auth Qdrant) |
| `QDRANT_COLLECTION_NAME` | Collection name (`tripper-kb`) |
| `QDRANT_SCORE_THRESHOLD` | Garbage floor, not a relevance gate (`0.30`) |
| `QDRANT_SEARCH_LIMIT` | Default top-K results (`5`) |

3. **Run with Docker** (recommended)

```bash
docker compose up -d --build
```

Or **run each service locally**:

```bash
# Backend
cd api
npm install
npx prisma generate
npx baml-cli generate
npm run start:dev          # http://localhost:8000

# Frontend (in a separate terminal)
cd frontend
npm install
ng serve                   # http://localhost:4200
```

4. **Apply database migrations**

```bash
cd api
npx prisma migrate deploy
```

### Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:4200 |
| API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

## Architecture

```
tripper/
├── api/                    # NestJS backend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── chatbot/    #   RAG pipeline + SSE streaming
│   │   │   ├── itinerary/  #   Trip/day/activity CRUD
│   │   │   ├── qdrant/     #   Vector similarity search + embeddings
│   │   │   └── health/     #   Health check endpoint
│   │   ├── prisma/         # Global database service
│   │   └── common/         # Filters, interceptors, logging middleware
│   ├── prisma/             # Schema + migrations
│   └── baml_src/           # LLM function definitions
├── frontend/               # Angular SPA
│   ├── src/app/
│   │   ├── pages/          # Chatbot, Itinerary views
│   │   ├── services/       # Chat, Itinerary, Theme, Toast services
│   │   └── shared/         # Layout, sidebar, bottom-tab-bar, chat-input
│   └── e2e/                # Playwright tests
└── docker-compose.yml
```

### Backend Pipeline

All routes are prefixed with `/api/v1`.

**Middleware stack:** Helmet &rarr; CORS &rarr; ThrottlerGuard (100 req/60s) &rarr; ZodValidationPipe &rarr; Exception filters &rarr; Response transform

**Chat flow:** User query &rarr; Azure `text-embedding-3-large` embedding &rarr; Qdrant similarity search (top-8, score floor `0.30`) &rarr; Fetch latest trip context &rarr; BAML `StreamRAGChat()` (Azure OpenAI) &rarr; SSE stream to client

### Data Model

```
Trip
 ├── TripDay (1:N)
 │    └── Activity (1:N)
 │         ├── Place (N:1)
 │         ├── ActivityHighlight (1:N)
 │         └── Activity (alternatives, self-ref)
 ├── Booking (1:N)
 └── TravelTip (1:N)
```

Cascading deletes ensure cleanup when a trip is removed.

## Development

### Backend

```bash
cd api
npm run start:dev              # Dev server with hot reload
npm test                       # Run Jest tests
npm run test:cov               # Coverage report
npx prisma migrate dev         # Create + apply migration
npx prisma studio              # Visual database editor
npx baml-cli generate          # Regenerate BAML client
```

### Frontend

```bash
cd frontend
ng serve                       # Dev server on :4200
ng test                        # Unit tests (Karma)
npx playwright test            # E2E tests (desktop + mobile)
ng build --configuration=production
```

## License

MIT
