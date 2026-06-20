import {
  Component,
  signal,
  inject,
  viewChild,
  ElementRef,
  DestroyRef,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatService } from '../../services/chat.service';
import { MobileChatBridgeService } from '../../services/mobile-chat-bridge.service';
import { ChatMessage, RichContent } from '../../models/chat.model';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { ChatInputComponent } from '../../shared/chat-input/chat-input';
import { uuid } from '../../shared/uuid';
import {
  LucideMapPin,
  LucideExternalLink,
  LucideFileText,
  LucideCircleAlert,
} from '@lucide/angular';

@Component({
  selector: 'app-chatbot',
  imports: [
    MarkdownPipe,
    ChatInputComponent,
    LucideMapPin,
    LucideExternalLink,
    LucideFileText,
    LucideCircleAlert,
  ],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'flex:1; display:flex; flex-direction:column; min-height:0' },
})
export class ChatbotComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bridge = inject(MobileChatBridgeService);
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private readonly desktopChatInput = viewChild<ChatInputComponent>('desktopChatInput');

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  userInput = signal('');
  lastCompletedSummary = signal('');

  /** Reset chat when the sidebar / mobile header requests a new chat. */
  private readonly chatResetEffect = effect(() => {
    this.bridge.resetRequested();
    this.messages.set([]);
    this.isLoading.set(false);
    this.bridge.isLoading.set(false);
    this.lastCompletedSummary.set('');
  });

  ngOnInit() {
    this.bridge.register({
      send: (text) => this.sendMessage(text),
      inputChange: (text) => this.userInput.set(text),
    });
    this.bridge.showInput.set(true);
  }

  ngOnDestroy() {
    this.bridge.unregister();
    this.bridge.showInput.set(false);
  }

  quickPrompt(text: string) {
    this.userInput.set(text);
    this.syncMobileInput(text);
    this.sendMessage(text);
    setTimeout(() => {
      const desktopInput = this.desktopChatInput();
      if (desktopInput) {
        desktopInput.focus();
      } else {
        this.scrollContainer()?.nativeElement.focus();
      }
    }, 0);
  }

  /** Called from desktop ChatInputComponent */
  onChatInputSend(text: string) {
    this.sendMessage(text);
  }

  /** Called from desktop ChatInputComponent */
  onInputChange(text: string) {
    this.userInput.set(text);
    this.syncMobileInput(text);
  }

  private sendMessage(question: string) {
    question = question.trim();
    if (!question || this.isLoading()) return;

    this.messages.update((msgs) => [
      ...msgs,
      { id: uuid(), role: 'user', content: question },
    ]);
    this.userInput.set('');
    this.syncMobileInput('');
    this.lastCompletedSummary.set('');
    this.isLoading.set(true);
    this.bridge.isLoading.set(true);
    this.scrollToBottom();

    const history = this.messages()
      .filter((m) => !m.isStreaming && m.content.trim().length > 0)
      .slice(-20)
      .map((m) => `${m.role}: ${m.content}`);

    const assistantId = uuid();
    const emptyRich: RichContent = {
      images: [],
      links: [],
      map_links: [],
      tables: [],
      sources: [],
    };

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        richContent: { ...emptyRich },
        isStreaming: true,
      },
    ]);
    this.scrollToBottom();

    this.chatService
      .streamMessage(question, history)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (chunk) => {
          this.messages.update((msgs) =>
            msgs.map((m) => {
              if (m.id !== assistantId) return m;
              const data = chunk.data;
              return {
                ...m,
                content: data.text ?? m.content,
                richContent: {
                  images: data.images ?? m.richContent?.images ?? [],
                  links: data.links ?? m.richContent?.links ?? [],
                  map_links: data.map_links ?? m.richContent?.map_links ?? [],
                  tables: data.tables ?? m.richContent?.tables ?? [],
                  sources: data.sources ?? m.richContent?.sources ?? [],
                },
                isStreaming: !chunk.done,
              };
            }),
          );
          this.scrollToBottom();
        },
        error: () => {
          this.messages.update((msgs) =>
            msgs.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: 'Something went wrong. Please try again.',
                    isStreaming: false,
                    isError: true,
                  }
                : m,
            ),
          );
          this.isLoading.set(false);
          this.bridge.isLoading.set(false);
          this.scrollToBottom();
        },
        complete: () => {
          const completed = this.messages().find((m) => m.id === assistantId);
          if (completed?.content) {
            const text = completed.content.replace(/<[^>]*>/g, '');
            this.lastCompletedSummary.set(
              text.length > 200
                ? `Assistant replied: ${text.substring(0, 200)}…`
                : `Assistant replied: ${text}`,
            );
          }
          this.isLoading.set(false);
          this.bridge.isLoading.set(false);
          this.scrollToBottom();
        },
      });
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  private syncMobileInput(text: string) {
    this.bridge.userInput.set(text);
  }

  private scrollToBottom() {
    this.bridge.suppressNavAutoHide();
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
