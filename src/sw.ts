/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body || "New update from Scholar's Dungeon",
        icon: '/pwa-icon.svg',
        badge: '/pwa-icon.svg',
        vibrate: [100, 50, 100],
        data: data.data,
        tag: 'dungeon-notification', // Group notifications
        renotify: true,
        actions: [
          { action: 'open', title: 'Back to Dungeon' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Dungeon Alert', options)
          .catch(err => console.error('[Service Worker] Failed to show notification:', err))
      );
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback for non-JSON data
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Dungeon Alert', { body: text })
      );
    }
  } else {
    console.warn('[Service Worker] Push event but no data.');
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TEST_NOTIFICATION_SW') {
    self.registration.showNotification('Scholar\'s Dungeon', {
      body: 'Service Worker thread notification test successful!',
      icon: '/pwa-icon.svg',
      tag: 'test-thread'
    });
  }
});
