import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { GlobalTelInputDirective } from "../../directives/global-tel-input.directive";
import { ItemLoaderService } from "../../services/item-loader-service";

@Component({
    selector: 'app-armory',
    standalone: true,
    imports: [CommonModule, FormsModule, GlobalTelInputDirective],
    templateUrl: './armory.component.html',
    styleUrls: ['./armory.component.scss']
})
export class ArmoryComponent implements OnInit {
    constructor(private dataLoader: ItemLoaderService) { }

    async ngOnInit() {
        await this.dataLoader.loadUnlockedCraftables();
    }
}
