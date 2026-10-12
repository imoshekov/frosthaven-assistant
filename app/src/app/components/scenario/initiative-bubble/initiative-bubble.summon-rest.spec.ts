import { TestBed } from '@angular/core/testing';
import { InitiativeBubbleComponent } from './initiative-bubble.component';
import { AppContext } from '../../../app-context';
import { InitiativeService } from '../../../services/initiative.service';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { LogService } from '../../../services/log.service';
import { NotificationService } from '../../../services/notification.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { Creature } from '../../../types/game-types';

/**
 * "Long rest" moved from the card execution panel (post-reveal) into the initiative
 * bubble, alongside the normal Submit — it's now a third thing you can do with your
 * two initiatives, not an override applied after the fact. It must submit through
 * the same hidden-initiative pipeline as a real pair, not jump the hero straight to
 * "revealed" and lock everyone else out mid-submission.
 */
describe('InitiativeBubbleComponent long rest', () => {
  let component: InitiativeBubbleComponent;
  let appContext: AppContext;

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, level: 1, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    ...over,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InitiativeBubbleComponent],
      providers: [
        AppContext,
        InitiativeService,
        {
          provide: LocalStorageService,
          useValue: { load: () => null, set: () => { }, clear: () => { } },
        },
        { provide: CharacterDeckService, useValue: { hasPackedInitiatives: () => false, loadDeck: () => Promise.resolve(null), resolve: () => [] } },
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        { provide: LogService, useValue: { init: () => { } } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
      ],
    });

    appContext = TestBed.inject(AppContext);
    appContext.setCreatures([
      hero({ id: 'resting', type: 'drifter' }),
      hero({ id: 'active', type: 'snowflake' }),
    ]);

    const fixture = TestBed.createComponent(InitiativeBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit, which subscribes selectedCharacterType$
    component.selectCharacter('drifter');
  });

  it('submits the hidden 99/99 sentinel instead of revealing on its own', () => {
    component.longRest();

    const resting = appContext.getCreatures()[0];
    expect(resting.hiddenInitiative).toBe(99);
    expect(resting.secondaryHiddenInitiative).toBe(99);
    // The other hero hasn't submitted, so reveal hasn't fired yet.
    expect(resting.initiative).toBe(0);
  });

  it('closes the panel and clears the typed inputs', () => {
    component.mainInput = '12';
    component.secondaryInput = '34';
    component.isOpen = true;

    component.longRest();

    expect(component.mainInput).toBe('');
    expect(component.secondaryInput).toBe('');
    expect(component.isOpen).toBe(false);
  });

  it('records this client as having a submission, without a typed pair', () => {
    component.longRest();
    expect(component.hasSubmitted).toBe(true);
  });

  it('does nothing once initiatives are locked for the round', () => {
    // Selects the second hero (still id 'drifter' type) — lock it via a revealed initiative.
    appContext.updateCreatureMultipleStats('active', { initiative: 40 });
    component.longRest();

    const resting = appContext.getCreatures().find(c => c.id === 'resting')!;
    expect(resting.hiddenInitiative).toBe(0);
  });

  it('does not flag the refilled 99/99 pair as a duplicate on reopen', () => {
    component.longRest();

    // Reopening while still pre-reveal (the other hero hasn't submitted) refills the
    // inputs from the pending hidden initiative — see refreshInitiativeInputs().
    component.toggleOpen();

    expect(component.mainInput).toBe('99');
    expect(component.secondaryInput).toBe('99');
    expect(component.pairIsDuplicate).toBe(false);
  });

  it('still flags a genuinely typed duplicate pair', () => {
    component.mainInput = '30';
    component.secondaryInput = '30';
    expect(component.pairIsDuplicate).toBe(true);
  });
});
