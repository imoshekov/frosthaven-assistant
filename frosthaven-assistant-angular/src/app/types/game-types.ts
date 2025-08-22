export enum CreatureConditions {
  poison = "poison",
  wound = "wound",
  brittle = "brittle",
  ward = "ward",
  immobilize = "immobilize",
  bane = "bane",
  muddle = "muddle",
  stun = "stun",
  impair = "impair",
  disarm = "disarm"
}

export interface CreatureAction {
  type: string;
  value?: string | number;
}

export interface Creature {
  id?: string;
  name?: string;
  standee?: number | string,
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
  flying?: boolean;
  boss?: boolean;
  conditions?: CreatureConditions[];
  roundArmor?: number,
  roundRetaliate?: number,
  log?: any[];
  traits?: string[],
  player2?: string,
  player3?: string,
  player4?: string;
  actions?: CreatureAction[]; 
}

export enum ElementState {
  None = 'none',
  Full = 'full',
  Half = 'half'
}

export enum ElementType {
  Fire = 'fire',
  Ice = 'ice',
  Earth = 'earth',
  Air = 'air',
  Light = 'light',
  Dark = 'dark'
}

export interface Element {
  type: ElementType;
  state: ElementState;
}