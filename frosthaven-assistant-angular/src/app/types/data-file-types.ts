export interface MonsterDefinition {
  name: string;
  type?: string;
  player2?: string;
  player3?: string;
  player4?: string;
  marker?: any;
}

export interface MonsterAction {
  type: string;
  value: string | number;
  subActions?: any
  small?  : boolean;
}

export interface MonsterStat {
  type?: 'normal' | 'elite' | 'boss';
  level?: number;
  health?: string | number;
  movement?: number | string;
  attack?: number | string;
  actions?: MonsterAction[];
  immunities?: any;
  special?: any;
  note?: string;
}

export interface Monster {
  name: string;
  edition: string;
  count?: number | string;
  standeeCount?: number | string;
  baseStat: MonsterStat;
  stats: MonsterStat[];
  immunities?: any;
  deck?: any,
  hidden?: boolean;
  standeeShare?: string;
  catching? : boolean;
  flying?: boolean;
  randomCount?: number;
  boss?: boolean;
}

export interface ScenarioRoom {
  roomNumber: number;
  ref?: string;
  initial?: boolean;
  monster?: MonsterDefinition[];
  treasures?: any[];
  objectives?: any;
  marker?: any
  links?: any[];
  rooms?: any[];
}

export interface Scenario {
  index: string;
  name: string;
  flowChartGroup?: string;
  errata?: string;
  coordinates?: any;
  edition?: string;
  initial?: boolean;
  complexity?: number;
  monsters?: string[];
  rooms?: ScenarioRoom[];
  forcedLinks?: any;
  rewards?: any;
  lootDeckConfig?: any;
  rules?: any[];
  unlocks?: any[];
  requires?: any[];
  conditions?: string[];
  links?: any[];
  requirements?: any[];
  objectives?: any;
  allies?: any[];
  blocks?: any[];
  notes?: any[];
  special?: any;
  scenarioId?: string;
  scenarioType?: string;
  scenarioLevel?: number;
  scenarioReward?: any;
  scenarioLootDeckConfig?: any;
  scenarioRules?: any[];
  allied?: string[];
  drawExtra?: string[];
  allyDeck?: boolean;
  group?: string;
  hideIndex?: boolean;
  random?: boolean;
}

export interface DataFile {
  conditions: string[];
  monsters: Monster[];
  scenarios: Scenario[];
  sections?: any[];
}
