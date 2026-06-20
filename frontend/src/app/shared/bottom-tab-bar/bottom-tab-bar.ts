import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MobileChatBridgeService } from '../../services/mobile-chat-bridge.service';
import { ChatInputComponent } from '../chat-input/chat-input';
import { NavItem, NAV_ITEMS } from '../nav-item';
import { LucideMessageCircle, LucideMap } from '@lucide/angular';

@Component({
  selector: 'app-bottom-tab-bar',
  imports: [
    RouterLink,
    RouterLinkActive,
    ChatInputComponent,
    LucideMessageCircle,
    LucideMap,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block md:hidden' },
  template: `
    <!-- Chat input (above tabs, only on chat page) — always visible -->
    @if (bridge.showInput()) {
      <div class="px-3 py-2 bg-surface/80 backdrop-blur-md border-t border-border/40">
        <app-chat-input
          [userInput]="bridge.userInput()"
          [isLoading]="bridge.isLoading()"
          (send)="bridge.send($event)"
          (inputChange)="bridge.notifyInputChange($event)"
        />
      </div>
    }

    <!-- Tab bar -->
    <nav
      class="flex items-center bg-surface-raised/80 backdrop-blur-md border-t border-border/40 pb-safe"
      aria-label="Primary navigation"
    >
      <!-- Primary nav tabs — shared with the desktop sidebar via NAV_ITEMS -->
      @for (item of navItems; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="text-primary"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-13 text-text-secondary transition-colors active:bg-surface-inset"
        >
          @switch (item.icon) {
            @case ('chat') {
              <svg lucideMessageCircle class="w-5 h-5" aria-hidden="true"></svg>
            }
            @case ('itinerary') {
              <svg lucideMap class="w-5 h-5" aria-hidden="true"></svg>
            }
          }
          <span class="text-[10px] font-medium">{{ item.mobileLabel }}</span>
        </a>
      }
    </nav>
  `,
})
export class BottomTabBarComponent {
  /** Exposed so the template can read bridge signals directly. */
  readonly bridge = inject(MobileChatBridgeService);

  /** Primary nav — shared source of truth with the desktop sidebar. */
  readonly navItems: NavItem[] = NAV_ITEMS;
}
