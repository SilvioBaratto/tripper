# Tripper - Madrid Travel Planner

An AI-powered travel planning application for Madrid. Build personalized itineraries, chat with a context-aware assistant, and manage your trip details -- all in one place.

**Live:** [madrid.silviobaratto.com](https://madrid.silviobaratto.com)

## Features

- **AI Chatbot** -- RAG-powered assistant with knowledge of Madrid restaurants, museums, neighborhoods, and more. Streams responses in real time via SSE.
- **Itinerary Management** -- Full CRUD for trips, days, and activities. Inline editing, drag-and-drop ordering, and PDF import via LLM extraction.
- **Authentication** -- Supabase Auth with JWT validation, route guards, and automatic token refresh.
- **Mobile-First** -- Responsive design tested on desktop and mobile viewports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | NestJS 11, Prisma ORM, Zod validation |
| Frontend | Angular 21, Signals, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Vector Search | Qdrant |
| AI/LLM | BAML (Claude Haiku), OpenAI embeddings |
| Infrastructure | Docker, Vercel, GitHub Actions CI/CD |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (optional, for containerized development)
- A [Supabase](https://supabase.com) project
- API keys: OpenAI, Anthropic, Qdrant

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
| `DATABASE_URL` | Supabase pooled connection string |
| `DIRECT_URL` | Supabase direct connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `OPENAI_API_KEY` | OpenAI API key (embeddings) |
| `ANTHROPIC_API_KEY` | Anthropic API key (chat) |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_API_KEY` | Qdrant API key |

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
│   │   │   ├── auth/       #   Supabase JWT authentication
│   │   │   ├── chatbot/    #   RAG pipeline + SSE streaming
│   │   │   ├── itinerary/  #   Trip/day/activity CRUD
│   │   │   ├── qdrant/     #   Vector similarity search
│   │   │   └── health/     #   Health check endpoint
│   │   ├── prisma/         # Global database service
│   │   └── common/         # Guards, filters, interceptors, decorators
│   ├── prisma/             # Schema + migrations
│   └── baml_src/           # LLM function definitions
├── frontend/               # Angular SPA
│   ├── src/app/
│   │   ├── pages/          # Chatbot, Itinerary views
│   │   ├── services/       # Auth, Chat, Itinerary services
│   │   ├── guards/         # Route protection
│   │   ├── interceptors/   # JWT injection + 401 handling
│   │   └── shared/         # Layout, sidebar, reusable components
│   └── e2e/                # Playwright tests
└── docker-compose.yml
```

### Backend Pipeline

All routes are prefixed with `/api/v1` and protected by Supabase JWT authentication (opt-out via `@Public()` decorator).

**Middleware stack:** Helmet &rarr; CORS &rarr; ThrottlerGuard (100 req/60s) &rarr; ZodValidationPipe &rarr; Exception filters &rarr; Response transform

**Chat flow:** User query &rarr; OpenAI embedding &rarr; Qdrant similarity search &rarr; Fetch user's trip context &rarr; BAML `RAGChat()` (Claude Haiku) &rarr; SSE stream to client

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

All data is user-scoped. Cascading deletes ensure cleanup when a trip is removed.

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

## Deployment

The application deploys to **Vercel** via GitHub Actions. Pushes to `main` trigger automatic deployments for both the API and frontend.

| Project | Trigger |
|---------|---------|
| API | Changes in `api/` |
| Frontend | Changes in `frontend/` |

## License

MIT
