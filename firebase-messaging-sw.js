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

// ===== 2026.5.14 アプリバッジ更新（5キャップ）=====
const BADGE_CAP = 5;

function _badgeIDB(mode, value) {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('inuyama-badge', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('badge');
      req.onsuccess = () => {
        const dbi = req.result;
        const tx = dbi.transaction('badge', mode === 'get' ? 'readonly' : 'readwrite');
        const store = tx.objectStore('badge');
        if (mode === 'get') {
          const g = store.get('count');
          g.onsuccess = () => resolve(g.result || 0);
          g.onerror = () => resolve(0);
        } else {
          store.put(value, 'count');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        }
      };
      req.onerror = () => resolve(mode === 'get' ? 0 : undefined);
    } catch (e) { resolve(mode === 'get' ? 0 : undefined); }
  });
}

async function incrementAppBadge() {
  if (!('setAppBadge' in self.navigator)) return;
  try {
    const current = await _badgeIDB('get');
    const next = Math.min(current + 1, BADGE_CAP);
    if (next >= BADGE_CAP) {
      await self.navigator.setAppBadge();    // 赤点のみ（ごろまる怒🤖）
    } else {
      await self.navigator.setAppBadge(next); // 1〜4は数字
    }
    await _badgeIDB('set', next);
  } catch (e) {}
}

// バックグラウンドでメッセージ受信時
// 2026.5.8 16:00 data-onlyメッセージ対応：dataフィールドから title/body を取得
// 2026.5.14 アプリバッジを +1 する処理を追加
// 2026.5.14 SWが途中で殺される問題対策：async/awaitで両処理の完了を待つ
messaging.onBackgroundMessage(async payload => {
  const title = payload.data?.title || payload.notification?.title || '院内連絡';
  const body  = payload.data?.body  || payload.notification?.body  || '新しいメッセージがあります';
  const msgTag = payload.messageId || ('msg-' + Date.now());

  // バッジ更新と通知表示を並列実行し、両方の完了を待つ
  await Promise.all([
    incrementAppBadge(),
    self.registration.showNotification(title, {
      body,
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      vibrate: [200, 100, 200],
      tag:     msgTag,
      renotify: false,
      data: { url: self.location.origin + self.location.pathname.replace('firebase-messaging-sw.js', '') }
    })
  ]);
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
