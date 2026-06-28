import {
  Component,
  signal,
  computed,
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
import { ItineraryService } from '../../services/itinerary.service';
import { MobileChatBridgeService } from '../../services/mobile-chat-bridge.service';
import { ChatMessage, RichContent } from '../../models/chat.model';
import { Trip, TripDay } from '../../models/itinerary.model';

/** A clickable starter chip: short label + the full prompt it sends. */
interface Suggestion {
  label: string;
  prompt: string;
}
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
  private readonly itineraryService = inject(ItineraryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bridge = inject(MobileChatBridgeService);
  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');
  private readonly desktopChatInput = viewChild<ChatInputComponent>('desktopChatInput');

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  userInput = signal('');
  lastCompletedSummary = signal('');

  /** Loaded trip, used to build day-aware starter suggestions. */
  private readonly trip = signal<Trip | null>(null);

  /** Static fallback chips used until the trip loads (or if there is none). */
  private readonly fallbackExplore: Suggestion[] = [
    { label: 'Cosa vedere?', prompt: 'Cosa vale la pena vedere durante il viaggio?' },
    { label: 'Dove mangiamo?', prompt: 'Dove andiamo a mangiare?' },
    { label: 'Come mi sposto?', prompt: 'Come mi sposto tra le tappe?' },
  ];

  /** The day to base suggestions on: latest day whose date is on/before today. */
  readonly currentDay = computed<TripDay | null>(() => {
    const t = this.trip();
    if (!t?.days?.length) return null;
    const today = this.todayStr();
    const sorted = [...t.days].sort((a, b) => a.dayNumber - b.dayNumber);
    let chosen = sorted[0];
    for (const d of sorted) {
      if (d.date.slice(0, 10) <= today) chosen = d;
      else break;
    }
    return chosen;
  });

  /** Short heading for the day-specific group, e.g. "Oggi · Giorno 7". */
  readonly todayHeading = computed(() => {
    const d = this.currentDay();
    return d ? `Oggi · Giorno ${d.dayNumber}` : 'Il tuo viaggio';
  });

  /** Day-specific chips: plan, top sight, food, hotel. */
  readonly tripSuggestions = computed<Suggestion[]>(() => {
    const d = this.currentDay();
    if (!d) return [{ label: 'Il mio piano?', prompt: 'Cosa prevede il mio piano per oggi?' }];
    const n = d.dayNumber;
    const acts = d.activities ?? [];
    const out: Suggestion[] = [
      { label: `Il mio Giorno ${n}?`, prompt: `Cosa prevede il mio piano per oggi, il Giorno ${n}?` },
    ];

    const sight =
      acts.find((a) => a.activityType === 'VISIT' && a.place)?.place?.name ??
      acts.find((a) => a.activityType === 'VISIT')?.title;
    if (sight) out.push({ label: this.shorten(sight), prompt: `Raccontami di ${sight}.` });

    const meal = acts.find((a) => a.activityType === 'MEAL' && a.place)?.place?.name;
    out.push({
      label: 'Dove mangiamo?',
      prompt: meal
        ? `Dove andiamo a mangiare oggi? Parlami di ${meal} e di eventuali alternative.`
        : `Dove andiamo a mangiare oggi, nel Giorno ${n}?`,
    });

    const hotel = acts.find((a) => a.activityType === 'REST' && a.place)?.place?.name;
    if (hotel) out.push({ label: 'Dove dormiamo?', prompt: `Dove dormiamo stanotte? Info su ${hotel}.` });

    return out;
  });

  /** Day-aware generic chips. */
  readonly exploreSuggestions = computed<Suggestion[]>(() => {
    const d = this.currentDay();
    if (!d) return this.fallbackExplore;
    const n = d.dayNumber;
    return [
      { label: 'Cosa vedere oggi?', prompt: `Cosa vale la pena vedere oggi lungo le tappe del Giorno ${n}?` },
      { label: 'Come mi sposto?', prompt: `Come mi sposto oggi tra le tappe del Giorno ${n}?` },
      { label: 'Consigli pratici', prompt: 'Hai consigli pratici per oggi (parcheggio, orari, meteo)?' },
    ];
  });

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
    this.loadTrip();
  }

  /** Load the first trip so suggestions can adapt to the current day. */
  private loadTrip() {
    this.itineraryService
      .getTrips()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (trips) => {
          if (!trips.length) return;
          this.itineraryService
            .getTrip(trips[0].id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (trip) => this.trip.set(trip), error: () => {} });
        },
        error: () => {},
      });
  }

  /** Local date as YYYY-MM-DD (avoids UTC offset shifting the day). */
  private todayStr(): string {
    const n = new Date();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${n.getFullYear()}-${m}-${d}`;
  }

  /** Trim a place/title to a chip-friendly length. */
  private shorten(text: string, max = 22): string {
    const t = text.split(/[—:(]/)[0].trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
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
