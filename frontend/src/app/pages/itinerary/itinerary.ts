import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ItineraryService } from '../../services/itinerary.service';
import { Trip, TripDay, Activity, TripSummary } from '../../models/itinerary.model';

interface ActivityStyle {
  bgColor: string;
  borderColor: string;
}

@Component({
  selector: 'app-itinerary',
  imports: [DatePipe],
  templateUrl: './itinerary.html',
  styleUrl: './itinerary.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'flex:1;display:flex;flex-direction:column;min-height:0' },
})
export class ItineraryComponent implements OnInit {
  private readonly itineraryService = inject(ItineraryService);

  trips = signal<TripSummary[]>([]);
  trip = signal<Trip | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activeDay = signal(1);

  private readonly activityStyles: Record<string, ActivityStyle> = {
    MEAL: { bgColor: '#fef3c7', borderColor: '#f59e0b' },
    VISIT: { bgColor: '#edf2f9', borderColor: '#2d4a7a' },
    WALK: { bgColor: '#ecfdf5', borderColor: '#10b981' },
    TRANSPORT: { bgColor: '#f0f0f0', borderColor: '#9ca3af' },
    NIGHTLIFE: { bgColor: '#f3e8ff', borderColor: '#8b5cf6' },
    SHOW: { bgColor: '#fdf0ec', borderColor: '#c45d3e' },
    SHOPPING: { bgColor: '#fdf2f8', borderColor: '#ec4899' },
    REST: { bgColor: '#f0f0f0', borderColor: '#9ca3af' },
  };

  private readonly defaultStyle: ActivityStyle = { bgColor: '#fdf0ec', borderColor: '#c45d3e' };

  ngOnInit() {
    this.loadTrips();
  }

  private loadTrips() {
    this.isLoading.set(true);
    this.itineraryService.getTrips().subscribe({
      next: (trips) => {
        this.trips.set(trips);
        if (trips.length > 0) {
          this.loadTrip(trips[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        this.error.set('Failed to load itineraries');
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }

  private loadTrip(id: string) {
    this.itineraryService.getTrip(id).subscribe({
      next: (trip) => {
        this.trip.set(trip);
        this.activeDay.set(trip.days[0]?.dayNumber ?? 1);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load itinerary details');
        this.isLoading.set(false);
        console.error(err);
      },
    });
  }

  selectDay(dayNumber: number) {
    this.activeDay.set(dayNumber);
  }

  getActiveDay(): TripDay | undefined {
    return this.trip()?.days.find((d) => d.dayNumber === this.activeDay());
  }

  getMainActivities(day: TripDay): Activity[] {
    return day.activities.filter((a) => !a.alternativeToId);
  }

  getAlternatives(activityId: string, day: TripDay): Activity[] {
    return day.activities.filter((a) => a.alternativeToId === activityId);
  }

  isMinorActivity(type: string): boolean {
    return ['WALK', 'TRANSPORT', 'REST'].includes(type);
  }

  activityConfig(type: string): ActivityStyle {
    return this.activityStyles[type] ?? this.defaultStyle;
  }

  formatTime(time: string | null): string {
    return time ?? '';
  }

  formatPrice(minCents: number | null, maxCents: number | null): string {
    if (minCents === null && maxCents === null) return '';
    if (minCents === 0 && maxCents === 0) return 'Free';
    const min = minCents !== null ? (minCents / 100).toFixed(0) : null;
    const max = maxCents !== null ? (maxCents / 100).toFixed(0) : null;
    if (min && max && min !== max) return `€${min}–${max}`;
    return `€${max ?? min}`;
  }

  activityIcon(type: string): string {
    const icons: Record<string, string> = {
      MEAL: '🍽️',
      VISIT: '🏛️',
      TRANSPORT: '🚕',
      WALK: '🚶',
      NIGHTLIFE: '🌙',
      SHOW: '🎭',
      SHOPPING: '🛍️',
      REST: '😴',
    };
    return icons[type] ?? '📍';
  }

  tipIcon(category: string): string {
    const icons: Record<string, string> = {
      TRANSPORT: '🚇',
      SAFETY: '⚠️',
      BUDGET: '💰',
      PACKING: '🧳',
    };
    return icons[category] ?? '💡';
  }

  placeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      RESTAURANT: 'Restaurant',
      MUSEUM: 'Museum',
      PARK: 'Park',
      MARKET: 'Market',
      BAR: 'Bar',
      LANDMARK: 'Landmark',
      VENUE: 'Venue',
      CHURCH: 'Church',
      ROOFTOP: 'Rooftop',
      NEIGHBORHOOD: 'Neighborhood',
    };
    return labels[type] ?? type;
  }
}
