export interface CharacterRow {
  id: number;
  name: string;
  type: string;
  level: number;
  total_xp?: number;
}
export interface CraftableItemRow {
  id: number;
  type: string;
  unlocked: boolean;
}
export interface ScenarioReferenceRow {
  scenario_level: number;
  monster_level: number;
  gold_conversion: number;
  trap_damage: number;
  hazardous_terrain: number;
  bonus_experience: number;
}