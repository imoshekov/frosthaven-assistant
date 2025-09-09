import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/scenario/scenario.component').then(m => m.ScenarioComponent)
  },
  {
    path: 'potions',
    loadComponent: () => import('./components/alchemy/alchemy.component').then(m => m.AlchemyComponent)
  },
  {
    path: 'armory',
    loadComponent: () => import('./components/armory/armory.component').then(m => m.ArmoryComponent)
  },
  { path: '**', redirectTo: '' }
];