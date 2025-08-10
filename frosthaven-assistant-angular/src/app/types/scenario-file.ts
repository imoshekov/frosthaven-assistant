export interface ScenarioCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  gridLocation: string;
}

export interface ScenarioReward {
  custom?: string;
  ignoredBonus?: string[];
  calendarIgnore?: boolean;
}

export interface StatEffectIdentifier {
  type: string;
  edition: string;
  name: string;
}

export interface StatEffect {
  identifier: StatEffectIdentifier;
  statEffect: {
    deck: string;
  };
  note?: string;
}

export interface ScenarioRule {
  round?: string;
  always?: boolean;
  alwaysApply?: boolean;
  statEffects?: StatEffect[];
}

export interface RoomMonster {
  name: string;
  type?: string;
  player2?: string;
  player3?: string;
  player4?: string;
}

export interface ScenarioRoom {
  roomNumber: number;
  ref: string;
  initial?: boolean;
  monster: RoomMonster[];
}

export interface LootDeckConfig {
  money: number;
  lumber: number;
  metal: number;
  hide: number;
}

export interface ScenarioFile {
  index: string;
  name: string;
  flowChartGroup: string;
  errata: string;
  coordinates: ScenarioCoordinates;
  edition: string;
  complexity: number;
  initial: boolean;
  forcedLinks: string[];
  rewards: ScenarioReward;
  monsters: string[];
  lootDeckConfig: LootDeckConfig;
  rules: ScenarioRule[];
  rooms: ScenarioRoom[];
}
