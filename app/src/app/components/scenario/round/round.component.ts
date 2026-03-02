import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from "@angular/core";
import { AppContext } from "../../../app-context";
import { Element, ElementState } from '../../../types/game-types';
import { Subscription } from "rxjs";
import { InitiativeService } from "../../../services/initiative.service";
import { FormsModule } from "@angular/forms";
import { GlobalTelInputDirective } from "../../../directives/global-tel-input.directive";


@Component({
    selector: 'app-round',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class RoundComponent implements OnInit, OnDestroy {
    roundNumber: number = 1;

    @Output() roundAdvanced = new EventEmitter<number>();
    @Input() elements: Element[] = [];

    private sub?: Subscription;

    constructor(public appContext: AppContext, private initiativeService: InitiativeService) { }

    ngOnInit() {
        this.sub = this.appContext.roundNumber$.subscribe((round: number) => {
            this.roundNumber = round;
        });
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }


    onRoundBlur(): void {
        this.commitRound(this.roundNumber);
    }

    nextRound(): void {
        this.resetAllCreatures();
        this.applyPendingInitiative();
        this.resetElements();

        this.commitRound((Number(this.roundNumber) || 0) + 1);

        this.initiativeService.onRoundAdvanced();
    }

    private commitRound(round: unknown): number {
        const normalized = Math.max(1, Number(round) || 1);
        this.roundNumber = normalized;
        this.appContext.setRoundNumber(normalized);

        this.roundAdvanced.emit(normalized);

        return normalized;
    }

    private applyPendingInitiative(): void {
        const pending = this.initiativeService.getPendingInitiative();
        const charType = this.initiativeService.getSelectedCharacterType();
        if (pending === null || !charType) return;

        const character = this.appContext.getCreatures().find(
            c => c.type === charType && !c.aggressive
        );
        if (character?.id) {
            this.appContext.updateCreatureBaseStat(character.id, 'initiative', pending, false);
        }
    }

    resetAllCreatures(): void {
        const creatures = this.appContext.getCreatures().map(creature => ({
            ...creature,
            initiative: 0,
            roundArmor: 0,
            roundRetaliate: 0
        }));
        this.appContext.setCreatures(creatures);
    }

    private resetElements(): void {
        const updatedElements = this.appContext.getElements().map(el => {
            let newState: ElementState;
            if (el.state === ElementState.Half) newState = ElementState.None;
            else if (el.state === ElementState.Full) newState = ElementState.Half;
            else newState = el.state;

            return { ...el, state: newState };
        });

        this.appContext.setElements(updatedElements);
    }

}