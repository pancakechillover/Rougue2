/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let _self: ServiceWorkerGlobalScope;

precacheAndRoute(_self.__WB_MANIFEST);

_self.addEventListener('install', (event) => {
  _self.skipWaiting();
});

_self.addEventListener('activate', (event) => {
  event.waitUntil(_self.clients.claim());
});

_self.addEventListener('push', (event) => {
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
        _self.registration.showNotification(data.title || 'Dungeon Alert', options)
          .catch(err => console.error('[Service Worker] Failed to show notification:', err))
      );
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback for non-JSON data
      const text = event.data.text();
      event.waitUntil(
        _self.registration.showNotification('Dungeon Alert', { body: text })
      );
    }
  } else {
    console.warn('[Service Worker] Push event but no data.');
  }
});

_self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    _self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return _self.clients.openWindow('/');
    })
  );
});

_self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TEST_NOTIFICATION_SW') {
    _self.registration.showNotification('Scholar\'s Dungeon', {
      body: 'Service Worker thread notification test successful!',
      icon: '/pwa-icon.svg',
      tag: 'test-thread'
    });
  }
});
