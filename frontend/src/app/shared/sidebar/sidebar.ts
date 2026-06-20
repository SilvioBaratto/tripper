import { Component, computed, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MobileChatBridgeService } from '../../services/mobile-chat-bridge.service';
import { ThemeService } from '../../services/theme.service';
import { NavItem, NAV_ITEMS } from '../nav-item';
import {
  LucideX,
  LucidePlus,
  LucideMessageCircle,
  LucideMap,
  LucideSun,
  LucideMoon,
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideX,
    LucidePlus,
    LucideMessageCircle,
    LucideMap,
    LucideSun,
    LucideMoon,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly bridge = inject(MobileChatBridgeService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);

  isOpen = input<boolean>(false);
  isMobile = input<boolean>(false);

  closeSidebar = output<void>();

  readonly navItems: NavItem[] = NAV_ITEMS;

  showSidebar = computed(() => !this.isMobile() || this.isOpen());

  onNewChat() {
    this.bridge.resetRequested.update((v) => v + 1);
    this.router.navigate(['/']);
    this.closeSidebar.emit();
  }

  onNavClick() {
    this.closeSidebar.emit();
  }
}
