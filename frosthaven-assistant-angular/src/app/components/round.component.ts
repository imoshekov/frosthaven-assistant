import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, QueryList, ViewChildren } from "@angular/core";
import { GlobalTelInputDirective } from "../directives/global-tel-input.directive";
import { AppContext } from "../app-context";
import { ElementComponent } from "./element.component";
import { Element, ElementState } from '../types/game-types';


@Component({
    selector: 'app-round',
    templateUrl: './round.component.html',
    styleUrls: ['./round.component.scss'],
    standalone: true,
    imports: [CommonModule]
})
export class RoundComponent {
    roundNumber: number = 1;

    @Output() roundAdvanced = new EventEmitter<number>();
    @Input() elements: Element[] = [];

    constructor(public appContext: AppContext) { }
    nextRound(): void {
        this.resetCharacters();
        this.resetElements();
        // Advance round
        this.roundNumber++;
        this.roundAdvanced.emit(this.roundNumber);
    }

    private resetCharacters(): void {
        this.appContext.getCreatures().forEach(creature => {
            this.appContext.updateCreatureBaseStat(creature.id!, 'initiative', 0);
            this.appContext.updateCreatureBaseStat(creature.id!, 'roundArmor', 0);
            this.appContext.updateCreatureBaseStat(creature.id!, 'roundRetaliate', 0);
        });
    }

    private resetElements(): void {
        this.elements.forEach(el => {
            if (el.state === ElementState.Half) {
                el.state = ElementState.None;
            }
            else if (el.state === ElementState.Full) {
                el.state = ElementState.Half;
            }
        });
    }
}