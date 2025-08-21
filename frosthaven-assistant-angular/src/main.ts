import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { WebSocketService } from './app/services/web-socket.service';
import { LocalStorageService } from './app/services/local-storage.service';
import { NotificationService } from './app/services/notification.service';
import { DataLoaderService } from './app/services/data-loader.service';


bootstrapApplication(App, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    WebSocketService,
    LocalStorageService,
    NotificationService,
    DataLoaderService
  ]
}).catch((err) => console.error(err));
