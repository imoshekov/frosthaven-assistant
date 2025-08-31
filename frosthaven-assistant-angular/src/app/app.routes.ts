import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/scenario/scenario.component').then(m => m.ScenarioComponent)
  },
  {
    path: 'potions',
    loadComponent: () => import('./components/potion/potions.component').then(m => m.PotionsComponent)
  },
  { path: '**', redirectTo: '' }
];