export interface DefaultCondition {
  poison: boolean;
  wound: boolean;
  brittle: boolean;
  ward: boolean;
  immobilize: boolean;
  bane: boolean;
  muddle: boolean;
  stun: boolean;
  impair: boolean;
  disarm: boolean;
}

export interface Creature {
  id: number;
  name?: string;
  standee?: number,
  type?: string;
  aggressive: boolean;
  isElite?: boolean; // Optional property for elite creatures
  level?: number; // Optional property for creature level
  hp?: number;
  attack?: number;
  movement?: number | null;
  initiative?: number;
  armor?: number;
  retaliate?: number;
  conditions?: DefaultCondition;
  tempStats?: Record<string, any>;
  log?: any[];
  traits?: string[];
}

export interface Element {
  type: string;
  state: 'full' | 'half' | 'none';
}