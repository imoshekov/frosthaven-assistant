import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map, filter, tap, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppContext } from '../../../app-context';
import { DataLoaderService } from '../../../services/data-loader.service';
import { Creature } from '../../../types/game-types';
import { CreatureFactoryService } from '../../../services/creature-factory.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-scenario-monster-reference',
    templateUrl: './scenario-monster-reference.component.html',
    styleUrls: ['./scenario-monster-reference.component.scss']
})
export class ScenarioMonsterReference {
    private appContext = inject(AppContext);
    public monsterList: Creature[] = [];
    public shouldExpand = true;

    vm$ = combineLatest([
        this.appContext.scenarioId$,
        this.appContext.defaultLevel$
    ]).pipe(
        map(([scenarioId, level]) => ({
            scenarioId,
            level,
            ready: scenarioId != null && level != null
        }))
    );

    private buildTrigger$ = combineLatest([
        this.appContext.scenarioId$,
        this.appContext.defaultLevel$
    ]).pipe(
        filter(([scenarioId, level]) => scenarioId != null && level != null),
        distinctUntilChanged(
            ([prevScenario, prevLevel], [currScenario, currLevel]) =>
                prevScenario === currScenario && prevLevel === currLevel
        ),
        tap(([scenarioId, level]) => this.buildMonsterList(scenarioId!, level!))
    );

    constructor(private dataLoader: DataLoaderService,
        private creatureFactory: CreatureFactoryService

    ) {
        this.buildTrigger$
            .pipe(takeUntilDestroyed())
            .subscribe();
    }

    private buildMonsterList(scenarioId: number, level: number): void {
        this.monsterList = [];

        const monsters = this.getAllScenarioMonsters(scenarioId);

        for (const type of monsters) {
            this.monsterList.push(this.creatureFactory.createCreature({
                level,
                aggressive: true,
                isElite: false,
                type
            }));
            this.monsterList.push(this.creatureFactory.createCreature({
                level,
                aggressive: true,
                isElite: true,
                type
            }));
        }
        console.log('Built monster list', this.monsterList);
    }

    get monsterRows() {
        const map = new Map<
            string,
            {
                type: string;
                normalAtk: number;
                eliteAtk: number;
                normalArmor: number;
                eliteArmor: number;
                normalHp?: number;
                eliteHp?: number;
                normalMovement?: number;
                eliteMovement?: number;
            }
        >();

        for (const m of this.monsterList) {
            const row =
                map.get(m.type) ??
                {
                    type: m.type,
                    normalAtk: 0,
                    eliteAtk: 0,
                    normalArmor: 0,
                    eliteArmor: 0,
                    normalHp: 0,
                    eliteHp: 0,
                    normalMovement: 0,
                    eliteMovement: 0
                };

            if (m.isElite) {
                row.eliteAtk = m.attack;
                row.eliteArmor = m.armor;
                row.eliteHp = m.hp;
                row.eliteMovement = m.movement;
            } else {
                row.normalAtk = m.attack;
                row.normalArmor = m.armor;  
                row.normalHp = m.hp;
                row.normalMovement = m.movement;
            }

            map.set(m.type, row);
        }

        return [...map.values()];
    }


    private getAllScenarioMonsters(id: string | number): string[] {
        const scenarioMonsters =
            this.dataLoader.getData().scenarios?.filter(s => s.index === id).flatMap(s => s.monsters ?? []) ?? [];

        const sectionMonsters =
            this.dataLoader.getData().sections?.filter(s => s.parent === id).flatMap(s => s.monsters ?? []) ?? [];

        return Array.from(
            new Set(
                [...scenarioMonsters, ...sectionMonsters]
                    .map(m => (m ?? "").trim())
                    .filter(Boolean)
            )
        );
    }
}