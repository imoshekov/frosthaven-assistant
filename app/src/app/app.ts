import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastNotificationComponent } from './components/toast-notification/toast-notification.component';
import { AppContext } from './app-context';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { WebSocketService } from './services/web-socket.service';
import { VERSION_MAJOR, VERSION_MINOR } from '../environments/version';


@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    ToastNotificationComponent
  ]
})
export class AppComponent {
  protected readonly title = signal('app');
  clientId: string | null = null;
  sessionId: number = 1;
  version: string = `v${VERSION_MAJOR}.${VERSION_MINOR}`;

  constructor(
    public appContext: AppContext,
    public webSocketService: WebSocketService
  ) {
     this.webSocketService.clientId$.subscribe(id => {
      this.clientId = id;
    });
      this.webSocketService.sessionId$.subscribe(id => {
      if (id != null) {
        this.sessionId = id;
      }
    });
  }
}
