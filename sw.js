const CACHE_NAME = 'all-project-cache-v1';

// Подія встановлення (можна залишити пустою або кешувати головну сторінку)
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Подія активації — очищає старі кеші, якщо ви оновили версію
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехоплення запитів: беремо з мережі та зберігаємо в кеш усе підряд
self.addEventListener('fetch', event => {
  // Ігноруємо запити не для GET (наприклад, POST-запити до баз даних чи API)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Якщо файл є в кеші — повертаємо його
      if (cachedResponse) {
        // Також у фоновому режимі оновлюємо кеш новими версіями файлів
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {}); // Ігноруємо помилки мережі офлайн
        
        return cachedResponse;
      }

      // Якщо файлу немає в кеші — завантажуємо з мережі і зберігаємо
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(error => {
        console.log('Помилка завантаження, офлайн-режим:', error);
        // Тут можна повернути кастомну сторінку "Ви офлайн", якщо файл недоступний
      });
    })
  );
});
