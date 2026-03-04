import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Trip, TripSummary } from '../models/itinerary.model';

@Injectable({
  providedIn: 'root',
})
export class ItineraryService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}itineraries/`;

  getTrips(): Observable<TripSummary[]> {
    return this.http.get<TripSummary[]>(this.endpoint);
  }

  getTrip(id: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.endpoint}${id}`);
  }
}
