import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { WebSocketService } from './app/services/web-socket.service';
import { LocalStorageService } from './app/services/local-storage.service';
import { NotificationService } from './app/services/notification.service';
import { DataLoaderService } from './app/services/data-loader.service';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';



bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    WebSocketService,
    LocalStorageService,
    NotificationService,
    DataLoaderService, provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
}).catch((err) => console.error(err));
