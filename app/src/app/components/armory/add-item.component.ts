import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { AppContext } from '../../app-context';
import { NotificationService } from '../../services/notification.service';
import { DbService } from '../../services/db.service';



@Component({
  selector: 'app-add-item',
  templateUrl: './add-item.component.html',
  styleUrls: ['./add-item.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class AddItemComponent {
  id: number;
  type: string = '';

  pickerOpen = false;
  itemTypes: string[] = ['head', 'body', 'legs', 'onehand', 'twohand', 'small', 'potion'];
  filteredItemTypes: string[] = [];

  constructor(
    private appContext: AppContext,
    private notificationService: NotificationService,
    private dbService: DbService
  ) { }


  addItem() {
    const dbType = this.type === 'potion' ? 'small' : this.type;
    const dbSubType = this.type === 'potion' ? 'potion' : null;

    this.dbService.insertCraftableItem(this.id, dbType, dbSubType)
      .then(() => {
        this.notificationService.emitInfoMessage(`${this.type} ${this.id} added.`);
      })
      .catch((err) => {
        this.notificationService.emitErrorMessage('Failed to add item to armory. ' + err.message);
      });
  }


  openPicker() {
    this.pickerOpen = true;
    this.filteredItemTypes = this.itemTypes.slice();
    document.documentElement.classList.add('no-scroll');
  }

  closePicker() {
    this.pickerOpen = false;
    this.filteredItemTypes = [];
    document.documentElement.classList.remove('no-scroll');
  }

  onTypeInput() {
    const value = (this.type || '').toLowerCase().trim();
    this.filteredItemTypes = !value
      ? this.itemTypes.slice()
      : this.itemTypes.filter(m => m.toLowerCase().includes(value));
  }

  selectItem(name: string) {
    this.type = name;
    this.closePicker();
  }

  closeModal() {
    this.appContext.addItemToggled = false;
  }
}
