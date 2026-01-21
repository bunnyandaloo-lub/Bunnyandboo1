self.addEventListener('push', function(event) {
  let data = { title: 'Thinking of you', body: 'A heart was sent your way.', count: 1 };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://res.cloudinary.com/dnpjnknro/image/upload/v1765741271/intro_zmc0ue.jpg',
    badge: 'https://res.cloudinary.com/dnpjnknro/image/upload/v1765741271/intro_zmc0ue.jpg',
    data: data
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      navigator.setAppBadge ? navigator.setAppBadge(data.count) : Promise.resolve()
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});