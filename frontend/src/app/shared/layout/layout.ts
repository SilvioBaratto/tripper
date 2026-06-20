import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar';
import { ToastComponent } from '../toast/toast';
import { BottomTabBarComponent } from '../bottom-tab-bar/bottom-tab-bar';
import { ThemeService } from '../../services/theme.service';
import { MobileChatBridgeService } from '../../services/mobile-chat-bridge.service';
import { LucidePlus, LucideSun, LucideMoon } from '@lucide/angular';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, SidebarComponent, ToastComponent, BottomTabBarComponent, LucidePlus, LucideSun, LucideMoon],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);
  private readonly bridge = inject(MobileChatBridgeService);

  isSidebarOpen = signal(false);
  isMobile = signal(false);

  showOverlay = computed(() => this.isSidebarOpen() && this.isMobile());

  /** Current page title — drives the main landmark aria-label + sr route announcer. */
  readonly currentPageTitle = signal('Chat');
  readonly routeAnnouncement = computed(() => `Navigated to ${this.currentPageTitle()}`);

  private resizeObserver?: ResizeObserver;

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.currentPageTitle.set(this.titleForUrl(this.router.url));
      });
  }

  ngOnInit() {
    this.checkScreenSize();
    this.initializeResizeObserver();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  toggleSidebar() {
    this.isSidebarOpen.update((v) => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  /** Start a fresh chat from any page (shared mobile top bar). */
  newChat(): void {
    this.bridge.resetRequested.update((v) => v + 1);
    this.router.navigate(['/']);
  }

  private titleForUrl(url: string): string {
    if (url.startsWith('/itinerary')) return 'Itinerary';
    return 'Chat';
  }

  private checkScreenSize() {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 768;
      this.isMobile.set(mobile);
      if (mobile) this.isSidebarOpen.set(false);
    }
  }

  private initializeResizeObserver() {
    if (typeof window === 'undefined' || !('ResizeObserver' in window)) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const mobile = entry.contentRect.width < 768;
        this.isMobile.set(mobile);
        if (mobile && this.isSidebarOpen()) {
          this.isSidebarOpen.set(false);
        }
      }
    });
    this.resizeObserver.observe(document.body);
  }
}
