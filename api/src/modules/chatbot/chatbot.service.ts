import { Injectable, Logger } from '@nestjs/common';
import { QdrantService, SearchResult } from '../qdrant/qdrant.service';
import { ChatRequestDto, RichChatResponseDto, StreamChunkDto } from './dto/chat.dto';

function toRetrievedChunks(results: SearchResult[]) {
  return results.map((r) => ({
    text: r.payload.text,
    page_title: r.payload.page_title,
    section_title: r.payload.section_title,
    source_url: r.payload.source_url,
    links: JSON.stringify(r.payload.links ?? []),
    addresses: (r.payload.addresses ?? []).join(', '),
    image_urls: (r.payload.image_urls ?? []).join(', '),
    opening_hours: r.payload.opening_hours ?? null,
    prices: r.payload.prices ?? null,
    relevance_score: r.score,
  }));
}

const EMPTY_RICH: RichChatResponseDto = {
  text: '',
  images: [],
  links: [],
  map_links: [],
  tables: [],
  sources: [],
};

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(private readonly qdrantService: QdrantService) {}

  async chat(request: ChatRequestDto): Promise<RichChatResponseDto> {
    try {
      const { b } = await import('../../../baml_client');

      const searchResults = await this.qdrantService.search(
        request.user_question,
        5,
      );
      const contextChunks = toRetrievedChunks(searchResults);

      const result = await b.RAGChat(
        request.user_question,
        contextChunks,
        request.conversation_history,
      );

      return {
        text: result.text ?? '',
        images: result.images ?? [],
        links: result.links ?? [],
        map_links: result.map_links ?? [],
        tables: result.tables ?? [],
        sources: result.sources ?? [],
      };
    } catch (error) {
      this.logger.error(`Chat error: ${error}`);
      return {
        ...EMPTY_RICH,
        text: 'Mi dispiace, si è verificato un errore. Riprova più tardi.',
      };
    }
  }

  async *streamChat(
    request: ChatRequestDto,
  ): AsyncGenerator<StreamChunkDto> {
    try {
      const { b } = await import('../../../baml_client');

      const searchResults = await this.qdrantService.search(
        request.user_question,
        5,
      );
      const contextChunks = toRetrievedChunks(searchResults);

      const stream = b.stream.StreamRAGChat(
        request.user_question,
        contextChunks,
        request.conversation_history,
      );

      for await (const event of stream) {
        yield {
          type: 'partial',
          data: {
            text: event?.text ?? undefined,
            images: event?.images ?? undefined,
            links: event?.links ?? undefined,
            map_links: event?.map_links ?? undefined,
            tables: event?.tables ?? undefined,
            sources: event?.sources ?? undefined,
          },
          done: false,
        };
      }

      const final = await stream.getFinalResponse();
      yield {
        type: 'complete',
        data: {
          text: final.text ?? '',
          images: final.images ?? [],
          links: final.links ?? [],
          map_links: final.map_links ?? [],
          tables: final.tables ?? [],
          sources: final.sources ?? [],
        },
        done: true,
      };
    } catch (error) {
      this.logger.error(`Stream chat error: ${error}`);
      yield {
        type: 'error',
        data: {
          text: 'Mi dispiace, si è verificato un errore. Riprova più tardi.',
        },
        done: true,
      };
    }
  }
}
