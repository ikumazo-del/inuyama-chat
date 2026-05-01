// firebase-messaging-sw.js
// バックグラウンドプッシュ通知用 Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAUVZoqxo-Qmsf6wKNT4eEM14ONvqRVz7I",
  authDomain: "inuyama-chat.firebaseapp.com",
  projectId: "inuyama-chat",
  storageBucket: "inuyama-chat.firebasestorage.app",
  messagingSenderId: "477126215293",
  appId: "1:477126215293:web:25c07aee52104596625314"
});

const messaging = firebase.messaging();

// バックグラウンドでメッセージ受信時
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || '院内連絡';
  const body  = payload.notification?.body  || '新しいメッセージがあります';

  self.registration.showNotification(title, {
    body,
    icon:    './icon-192.png',
    badge:   './icon-192.png',
    vibrate: [200, 100, 200],
    tag:     'inuyama-chat',
    renotify: true,
    data: { url: self.location.origin + self.location.pathname.replace('firebase-messaging-sw.js', '') }
  });
});

// 通知タップでアプリを開く
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
