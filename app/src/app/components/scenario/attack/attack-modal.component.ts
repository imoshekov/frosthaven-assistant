import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { AppContext } from '../../../app-context';
import { ConditionsComponent } from '../conditions/conditions.component';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { BuffsComponent } from './buffs.component';
import { FormsModule } from '@angular/forms';
import { InitiativeService } from '../../../services/initiative.service';
import { LogService } from '../../../services/log.service';
import { DamageService } from '../../../services/damage.service';

@Component({
  selector: 'app-attack-modal',
  standalone: true,
  imports: [CommonModule, ConditionsComponent, GlobalTelInputDirective, BuffsComponent, FormsModule],
  templateUrl: './attack-modal.component.html',
  styleUrl: './attack-modal.component.scss'
})
export class AttackModalComponent {

  @ViewChild(BuffsComponent) buffsComponent!: BuffsComponent;
  public creature: Creature;
  public conditions = Object.values(CreatureConditions);
  public attack = 0;
  public armorPen = 0;
  /**
   * Ignores the target's shield entirely — off by default on every open, since it's
   * the exceptional case (an item, a special ability), not the norm. On, it disables
   * the pierce input, which would otherwise have nothing left to reduce.
   */
  public ignoreArmor = false;
  public damage = 0;
  /**
   * Whether the target's retaliate comes back at the attacking hero. On by default —
   * an attack normally provokes it — but the app has no board, so a ranged attacker
   * outside the retaliate range turns it off.
   */
  public applyRetaliate = true;
  public selectedCharacterId: string | null = null;
  private tempConditions: CreatureConditions[] = [];
  /**
   * The one-shot conditions the pending attack will use up on the target (ward,
   * brittle). Recomputed with the damage, applied on confirm.
   */
  private consumedConditions: CreatureConditions[] = [];
  /**
   * True when opened via the card execution panel's "Custom" button. In that case
   * Confirm hands the adjusted values back to the panel instead of applying them —
   * the panel's own "Execute" is what actually commits them.
   */
  public openedFromCardPanel = false;

  constructor(
    public appContext: AppContext,
    private initiativeService: InitiativeService,
    private logService: LogService,
    private damageService: DamageService
  ) {
    this.creature = appContext.selectedCreature;
    // Attacking an enemy is credited to whichever hero actually swung — a guess is
    // as likely to be wrong as right, so the DM picks explicitly rather than the
    // modal silently crediting "whoever this device is set to." Any other open (a
    // monster's attack landing on a hero/summon, say) still defaults, since nothing
    // there depends on picking the *attacker* right.
    this.selectedCharacterId = this.creature?.aggressive ? null : this.getDefaultSelectedCharacterId();

    // The card execution panel's "Custom" button hands over the card's values.
    const prefill = appContext.attackModalPrefill;
    if (prefill) {
      this.attack = prefill.attack;
      this.armorPen = prefill.armorPen;
      // Starts on when the card prints it, so confirming without touching anything
      // hands the same ignore-armor back rather than silently dropping it.
      this.ignoreArmor = prefill.ignoreArmor;
      if (prefill.attackerId) this.selectedCharacterId = prefill.attackerId;
      appContext.attackModalPrefill = null;
      this.openedFromCardPanel = true;
      this.calculateDamage();
    }
  }

  get shouldShowBuffs(): boolean {
    const {
      armor = 0,
      roundArmor = 0,
      retaliate = 0,
      roundRetaliate = 0
    } = this.creature ?? {};

    return (
      armor > 0 ||
      roundArmor > 0 ||
      retaliate > 0 ||
      roundRetaliate > 0
    );
  }

  /**
   * Heroes and their summons — anyone whose attack can be credited to a player. A
   * summon only belongs in the attacker strip if it actually has a printed attack —
   * a healer or lure token with no attack stat has nothing to select it for.
   */
  getHeroes(): Creature[] {
    return this.appContext.getCreatures().filter(c => !c.aggressive && (!c.isSummon || (c.attack ?? 0) > 0));
  }

  private getDefaultSelectedCharacterId(): string | null {
    const selectedCharacterType = this.initiativeService.getSelectedCharacterType();
    if (!selectedCharacterType) {
      return null;
    }

    const selectedHero = this.getHeroes().find(hero => hero.type === selectedCharacterType);
    return selectedHero?.id ?? null;
  }

  /** Summon token art if selecting a summon; otherwise the usual hero thumbnail. */
  attackerPortrait(attacker: Creature): string {
    if (attacker.isSummon) {
      return attacker.summonImage ? `./images/${attacker.summonImage}` : './images/summons/fh.png';
    }
    return `./images/character/thumbnail/fh-${attacker.type}.png`;
  }

  selectCharacter(characterId: string | null): void {
    this.selectedCharacterId = this.selectedCharacterId === characterId ? null : characterId;
    if (!characterId || this.selectedCharacterId !== characterId) return;

    // A summon's attack ability is printed on its token, so selecting it fills in
    // its numbers the same way the card panel does for a hero's card — the DM
    // shouldn't have to remember or re-type a figure's stat line. Any condition it
    // inflicts is still applied the normal way, by checking it below.
    const attacker = this.getHeroes().find(c => c.id === characterId);
    if (attacker?.isSummon) {
      this.attack = attacker.attack ?? 0;
      this.armorPen = attacker.pierce ?? 0;
      this.calculateDamage();
    }
  }

  /**
   * Whose damage stats an attack counts against. A summon has no stats of its own —
   * its owner acts through it — so its damage is credited to the owning hero.
   */
  creditTypeFor(attacker: Creature): string | undefined {
    if (!attacker.isSummon) return attacker.type;
    const owner = this.appContext.getCreatures().find(c => c.id === attacker.summonOwnerId);
    return owner?.type;
  }

  /**
   * Tracks which conditions the player flipped, as a set rather than a running list.
   *
   * It used to push every click, which only worked by accident on the direct path:
   * `toggleCreatureConditions` toggles, so two clicks cancelled each other out. The
   * "Custom…" path de-duplicates the list instead, which turned a condition switched
   * on and back off into one that still got applied.
   */
  toggleCondition(condition: CreatureConditions) {
    const index = this.tempConditions.indexOf(condition);
    if (index > -1) this.tempConditions.splice(index, 1);
    else this.tempConditions.push(condition);
  }

  toggleIgnoreArmor(): void {
    this.ignoreArmor = !this.ignoreArmor;
    this.calculateDamage();
  }

  attackCreature(): void {
    if (this.attack <= 0) {
      return;
    }
    const calculatedDamage = this.calculateDamage();
    const resultHp = this.creature.hp - calculatedDamage;

    // The HP loss and the ward/brittle this attack used up go in one patch, so the log
    // shows a single change and one Undo puts both back.
    const patch: Partial<Creature> = { hp: resultHp };
    Object.assign(
      patch,
      this.appContext.buildRemoveConditionsPatch(this.creature, this.consumedConditions)
    );
    this.appContext.updateCreatureMultipleStats(this.creature.id!, patch);

    if (resultHp <= 0) {
      this.appContext.killCreature(this.creature.id!);
    }

    this.retaliateAgainstAttacker();
  }

  /**
   * Sends the target's retaliate back at the attacking hero. Triggered by the attack
   * rather than by the damage, so a blocked hit still provokes it; the player has
   * already said whether the attacker stood within its range.
   */
  private retaliateAgainstAttacker(): void {
    const retaliate = this.retaliateDamage;
    if (!this.applyRetaliate || retaliate <= 0 || !this.selectedCharacterId) return;

    const attacker = this.appContext.getCreatures().find(c => c.id === this.selectedCharacterId);
    if (!attacker?.id) return;
    this.appContext.updateCreatureBaseStat(attacker.id, 'hp', Math.max((attacker.hp ?? 0) - retaliate, 0));
  }

  calculateDamage(): number {
    const result = this.damageService.compute({
      baseAttack: Number(this.attack) || 0,
      armorPen: Number(this.armorPen) || 0,
      ignoreArmor: this.ignoreArmor,
      target: this.creature,
    });
    this.damage = result.damage;
    this.consumedConditions = result.consumedConditions;
    return this.damage;
  }

  /** What this target deals back to its attacker, before the range question. */
  get retaliateDamage(): number {
    return this.creature ? this.damageService.retaliateDamage(this.creature) : 0;
  }

  toggleRetaliate(): void {
    this.applyRetaliate = !this.applyRetaliate;
  }

  confirm() {
    if (this.openedFromCardPanel) {
      // Opened via "Custom": this modal only lets the player adjust the attack value,
      // pierce and conditions. Applying them is the card panel's "Execute" button's
      // job, so damage, XP and the spent-half flag all land in one undo batch.
      this.appContext.emitCustomAttackResult({
        attack: Number(this.attack) || 0,
        armorPen: Number(this.armorPen) || 0,
        conditions: [...this.tempConditions],
        ignoreArmor: this.ignoreArmor,
      });
      this.close();
      return;
    }

    const currentHp = this.creature?.hp ?? 0;
    this.attackCreature();
    this.tempConditions.forEach(condition => {
      this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
    });
    
    // Record full damage (not capped at monster HP) if a character is selected.
    // A summon has no stats of its own to credit, so its damage counts against
    // the hero who summoned it.
    if (this.selectedCharacterId && this.damage > 0) {
      const selectedChar = this.appContext.getCreatures().find(c => c.id === this.selectedCharacterId);
      const creditType = selectedChar && this.creditTypeFor(selectedChar);
      if (creditType) {
        this.appContext.recordDamage(creditType, this.damage);
        this.logService.appendDamageToLastBatch(creditType, this.damage);
        if (this.damage >= currentHp) {
          this.appContext.recordKill(creditType);
          this.logService.appendKillToLastBatch(creditType);
        }
      }
    }
    
    this.buffsComponent?.publishBuffs();
    this.close();
  }
  close() {
    this.appContext.selectedCreature = null;
  }
}
