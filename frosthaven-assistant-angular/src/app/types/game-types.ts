export const CONDITION_ICONS: Record<string, string> = {
  poison: './images/condition/poison.svg',
  wound: './images/condition/wound.svg',
  brittle: './images/condition/brittle.svg',
  ward: './images/condition/ward.svg',
  immobilize: './images/condition/immobilize.svg',
  bane: './images/condition/bane.svg',
  muddle: './images/condition/muddle.svg',
  stun: './images/condition/stun.svg',
  impair: './images/condition/impair.svg',
  disarm: './images/condition/disarm.svg'
};

export type CreatureConditions = Partial<Record<keyof typeof CONDITION_ICONS, true>>;


export interface Creature {
  id?: string;
  name?: string;
  standee?: number,
  type?: string;
  aggressive?: boolean;
  isElite?: boolean; 
  level?: number; 
  hp?: number;
  attack?: number;
  movement?: number | null;
  initiative?: number;
  armor?: number;
  retaliate?: number;
  conditions?: CreatureConditions;
  tempStats?: Record<string, any>;
  log?: any[];
  traits?: string[];
}

export interface Element {
  type: string;
  state: 'full' | 'half' | 'none';
}