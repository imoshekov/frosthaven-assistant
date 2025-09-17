export enum CreatureConditions {
  poison = "poison",
  wound = "wound",
  muddle = "muddle",
  immobilize = "immobilize",
  bane = "bane",
  stun = "stun",
  disarm = "disarm",
  brittle = "brittle",
  ward = "ward",
  invisible = "invisible",
  strengthen = "strengthen",
  regenerate = "regenerate"
}

export interface CreatureAction {
  type: string;
  value?: string | number;
}

export type CreatureRetaliate = {
  value: number;   
  range: number;   
};

export interface Creature {
  id?: string;
  name?: string;
  standee?: number | string,
  type?: string;
  aggressive?: boolean;
  isElite?: boolean; 
  level?: number; 
  hp?: number;
  maxHp?: number;
  attack?: number;
  attackTarget?: number;
  movement?: number | null;
  initiative?: number;
  armor?: number;
  retaliate?: number;
  retaliateRange?: number;
  flying?: boolean;
  boss?: boolean;
  conditions?: CreatureConditions[];
  immunities?: CreatureConditions[];
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
