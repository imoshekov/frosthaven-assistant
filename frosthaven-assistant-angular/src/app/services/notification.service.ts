
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messageSubject = new Subject<{ type: 'error' | 'info', message: string }>();
  message$ = this.messageSubject.asObservable();

 /**
   * Emit an error message through the message observable
   * @param message The error message to emit
   */
  emitErrorMessage(message: string): void {
    this.messageSubject.next({ type: 'error', message });
  }

  /**
   * Emit an info message through the message observable
   * @param message The info message to emit
   */
  emitInfoMessage(message: string): void {
    this.messageSubject.next({ type: 'info', message });
  }
}
