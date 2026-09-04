import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardActionComponent } from './card-action.component';
import { CardAction } from '../../../types/character-card-types';

/**
 * The live Supabase party rarely contains drifter or snowflake — the only two fully
 * authored decks — so the renderer is exercised here against real card data copied
 * from `src/data/character-decks/`, in the self-contained form the extractor emits.
 */
describe('CardActionComponent', () => {
  let fixture: ComponentFixture<CardActionComponent>;
  let component: CardActionComponent;

  const render = (actions: CardAction[]): HTMLElement => {
    component.actions = actions;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CardActionComponent] }).compileComponents();
    fixture = TestBed.createComponent(CardActionComponent);
    component = fixture.componentInstance;
  });

  it('renders an icon and value for a simple action', () => {
    const el = render([{ type: 'attack', value: 3 }]);
    expect(el.querySelector('.icon.attack')).toBeTruthy();
    expect(el.textContent).toContain('3');
  });

  it('coerces a string value, as the source data mixes 1 and "1"', () => {
    const el = render([{ type: 'attack', value: '1' }]);
    expect(el.textContent).toContain('1');
  });

  it('renders sub-actions nested inside their parent', () => {
    // drifter #10 "Deadly Shot": attack 1, poison.
    const el = render([{
      type: 'attack', value: '1', subActions: [
        { type: 'condition', value: 'poison', small: true },
      ],
    }]);

    const sub = el.querySelector('.sub-actions');
    expect(sub).toBeTruthy();
    // A condition's icon comes from its value, not its type.
    expect(sub!.querySelector('.icon.poison')).toBeTruthy();
    expect(el.querySelector('.icon.condition')).toBeNull();
  });

  it('renders ignoreArmor alongside whatever else the attack does', () => {
    const el = render([{
      type: 'attack', value: '3', subActions: [
        { type: 'ignoreArmor' },
        { type: 'condition', value: 'poison', small: true },
      ],
    }]);

    const sub = el.querySelector('.sub-actions');
    expect(sub!.querySelector('.icon.ignoreArmor')).toBeTruthy();
    expect(sub!.querySelector('.icon.poison')).toBeTruthy();
    // Valueless: no stray number printed next to its icon.
    expect(el.textContent).not.toContain('undefined');
  });

  it('signs values according to valueType', () => {
    expect(component.displayValue({ type: 'shield', value: 1, valueType: 'minus' })).toBe('−1');
    expect(component.displayValue({ type: 'attack', value: 2, valueType: 'add' })).toBe('+2');
    expect(component.displayValue({ type: 'attack', value: 2 })).toBe('2');
  });

  describe('elements', () => {
    it('renders an infused element from elements[]', () => {
      const el = render([{ type: 'element', elements: ['ice'] }]);
      expect(el.querySelector('.icon.elem-ice')).toBeTruthy();
    });

    it('renders a conditional bonus as an offer, not a plain effect', () => {
      // snowflake #331: consume ICE for +2 Attack and 1 XP.
      const el = render([{
        type: 'elementBonus', elements: ['ice'], consumeMode: 'all',
        subActions: [
          { type: 'attack', value: 2, valueType: 'add', small: true },
          { type: 'xp', value: 1 },
        ],
      }]);

      const bonus = el.querySelector('.element-bonus');
      expect(bonus).toBeTruthy();
      expect(bonus!.textContent!.toLowerCase()).toContain('consume');
      expect(bonus!.querySelector('.icon.elem-ice')).toBeTruthy();
      expect(bonus!.querySelector('.icon.xp')).toBeTruthy();
      expect(bonus!.textContent).toContain('+2');
    });

    it('labels an either-or bonus as consuming one of its elements', () => {
      // snowflake #357 consumes ICE or AIR.
      const el = render([{
        type: 'elementBonus', elements: ['ice', 'air'], consumeMode: 'any',
        subActions: [{ type: 'text', text: 'Range -2 instead' }],
      }]);

      expect(el.querySelector('.icon.elem-ice')).toBeTruthy();
      expect(el.querySelector('.icon.elem-air')).toBeTruthy();
      expect(el.textContent!.toLowerCase()).toContain('one of');
    });
  });

  it('renders literal prose, with no i18n key left behind', () => {
    const el = render([{
      type: 'text',
      text: 'On your next six melee attacks, add Attack +2.',
      small: true,
    }]);
    expect(el.textContent).toContain('On your next six melee attacks, add Attack +2.');
    expect(el.textContent).not.toContain('%');
    expect(el.querySelector('.action-text.unresolved')).toBeNull();
  });

  it('flags text that still holds an unresolved reference', () => {
    const el = render([{ type: 'text', text: 'add %game.action.attack%' }]);
    expect(el.querySelector('.action-text.unresolved')).toBeTruthy();
  });

  it('renders a persistent track from its explicit slots', () => {
    // drifter #1 "Crushing Weight": a 3-slot track, 1 XP per slot.
    const el = render([{ type: 'persistentTrack', slots: [{ xp: 1 }, { xp: 1 }, { xp: 1 }] }]);
    expect(el.querySelectorAll('.persistent-slot').length).toBe(3);
    expect(el.querySelectorAll('.slot-xp').length).toBe(3);
  });

  it('renders a summon with its stats inline', () => {
    // snowflake #352 "Polar Cat".
    const el = render([{
      type: 'summon',
      summon: {
        name: 'Polar Cat', health: '6', attack: '2', movement: '3',
        abilities: [{ type: 'pierce', value: 3 }],
      },
    }]);

    expect(el.textContent).toContain('Polar Cat');
    expect(el.querySelector('.icon.heart')).toBeTruthy();
    expect(el.querySelector('.icon.attack')).toBeTruthy();
    expect(el.querySelector('.icon.move')).toBeTruthy();
    // Printed abilities render as real actions.
    expect(el.querySelector('.icon.pierce')).toBeTruthy();
  });

  it('shows a summon count only when more than one is summoned', () => {
    const many = render([{ type: 'summon', summon: { name: 'White Owl', count: 2 } }]);
    expect(many.textContent).toContain('2×');

    const one = render([{ type: 'summon', summon: { name: 'Snow Fox', count: 1 } }]);
    expect(one.textContent).not.toContain('1×');
  });

  it('renders a summon image when the card prints detail the schema cannot express', () => {
    const el = render([{
      type: 'summon',
      summon: { name: 'Special', image: 'summons/fh.png' },
    }]);
    const img = el.querySelector('img.summon-image') as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toBe('./images/summons/fh.png');
  });

  it('renders forceBox as a bordered group', () => {
    const el = render([{
      type: 'forceBox', small: true,
      subActions: [
        { type: 'element', elements: ['ice'] },
        { type: 'element', elements: ['air'] },
      ],
    }]);
    expect(el.querySelector('.action-group.boxed')).toBeTruthy();
    expect(el.querySelectorAll('.icon.elem-ice, .icon.elem-air').length).toBe(2);
  });

  it('renders an xp action with the experience icon', () => {
    const el = render([{ type: 'xp', value: 2 }]);
    expect(el.querySelector('.icon.xp')).toBeTruthy();
    expect(el.textContent).toContain('2');
  });

  it('never silently drops an unknown action type', () => {
    const el = render([{ type: 'somethingNew', value: 1 }]);
    expect(el.textContent).toContain('somethingNew');
  });

  it('stops recursing past the depth guard', () => {
    // A cycle in hand-authored data must not hang the renderer.
    const deep: CardAction = { type: 'attack', value: 1 };
    deep.subActions = [deep];
    component.depth = component.maxDepth;
    const el = render([deep]);
    expect(el.querySelector('.sub-actions')).toBeNull();
  });
});
