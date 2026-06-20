import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/layout/layout').then((m) => m.LayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/chatbot/chatbot').then((m) => m.ChatbotComponent),
        title: 'Chatbot',
      },
      {
        path: 'itinerary',
        loadComponent: () => import('./pages/itinerary/itinerary').then((m) => m.ItineraryComponent),
        title: 'Itinerary',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
