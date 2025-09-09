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
  {
    path: 'armory',
    loadComponent: () => import('./components/armory/armory.component').then(m => m.ArmoryComponent)
  },
  { path: '**', redirectTo: '' }
];