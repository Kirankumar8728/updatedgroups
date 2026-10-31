self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New trending community updates on Group Links.',
        icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=grouplinks&backgroundColor=6366f1',
        badge: 'https://api.dicebear.com/7.x/identicon/svg?seed=grouplinks&backgroundColor=6366f1',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/'
        },
        actions: [
          { action: 'open', title: 'Open Community' },
          { action: 'explore', title: 'Explore All' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Group Links Alert', options)
      );
    } catch (e) {
      console.error('Push parse error:', e);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = '/';
  if (event.action === 'explore') {
    targetUrl = '/explore';
  } else if (event.notification && event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url === absoluteUrl || client.url.startsWith(self.location.origin)) {
            client.focus();
            if ('navigate' in client && client.url !== absoluteUrl) {
              return client.navigate(absoluteUrl);
            }
            return;
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
