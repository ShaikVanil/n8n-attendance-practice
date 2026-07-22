/* eslint-disable no-restricted-globals, no-undef */
const CACHE_NAME = 'attendance-pwa-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/attendance\/history/,
  /\/api\/user\/profile/,
  /\/api\/locations/
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Handle API requests with cache-first strategy for specific endpoints
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Check if this API should be cached
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
  
  if (shouldCache && request.method === 'GET') {
    try {
      // Try cache first for GET requests
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Return cached response and update in background
        fetch(request)
          .then(response => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, responseClone));
            }
          })
          .catch(() => {}); // Ignore background update errors
        
        return cachedResponse;
      }
      
      // If not in cache, fetch and cache
      const response = await fetch(request);
      if (response.status === 200) {
        const responseClone = response.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, responseClone);
      }
      return response;
    } catch (error) {
      // Return cached version if available
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For non-cacheable requests, just fetch
  return fetch(request);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData());
  }
  
  if (event.tag === 'leave-request-sync') {
    event.waitUntil(syncLeaveRequests());
  }
});

// Sync attendance data when back online
async function syncAttendanceData() {
  try {
    // Get pending attendance records from IndexedDB
    const pendingRecords = await getPendingAttendanceRecords();
    
    for (const record of pendingRecords) {
      try {
        const response = await fetch('/api/attendance/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${record.token}`
          },
          body: JSON.stringify(record.data)
        });
        
        if (response.ok) {
          // Remove synced record from IndexedDB
          await removePendingRecord(record.id);
        }
      } catch (error) {
        console.error('Failed to sync attendance record:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync leave requests when back online
async function syncLeaveRequests() {
  try {
    const pendingRequests = await getPendingLeaveRequests();
    
    for (const request of pendingRequests) {
      try {
        const response = await fetch('/api/leave/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${request.token}`
          },
          body: JSON.stringify(request.data)
        });
        
        if (response.ok) {
          await removePendingLeaveRequest(request.id);
        }
      } catch (error) {
        console.error('Failed to sync leave request:', error);
      }
    }
  } catch (error) {
    console.error('Leave request sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.title = data.title || 'Attendance System';
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Attendance System', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app to relevant page
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB operations
async function getPendingAttendanceRecords() {
  // Implementation would use IndexedDB to get pending records
  return [];
}

async function removePendingRecord(id) {
  // Implementation would remove record from IndexedDB
}

async function getPendingLeaveRequests() {
  // Implementation would use IndexedDB to get pending requests
  return [];
}

async function removePendingLeaveRequest(id) {
  // Implementation would remove request from IndexedDB
}