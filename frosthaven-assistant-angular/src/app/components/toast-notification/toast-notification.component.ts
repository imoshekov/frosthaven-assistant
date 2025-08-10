import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  messages: Array<{id: number, type: 'error' | 'info', message: string, timestamp: Date}> = [];
  private subscription = new Subscription();
  private messageCounter = 0;
  private displayDuration = 2000; // Display for 2 seconds (2000ms)

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.notificationService.message$.subscribe(message => {
        const id = this.messageCounter++;
        this.messages.push({
          id,
          type: message.type,
          message: message.message,
          timestamp: new Date()
        });
        
        // Remove the message after the display duration
        setTimeout(() => {
          this.removeMessage(id);
        }, this.displayDuration);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  removeMessage(id: number): void {
    const index = this.messages.findIndex(msg => msg.id === id);
    if (index !== -1) {
      this.messages.splice(index, 1);
    }
  }
}
