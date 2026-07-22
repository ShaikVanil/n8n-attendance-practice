class PWAService {
  private deferredPrompt: any = null;
  private isInstalled = false;
  private isStandalone = false;

  constructor() {
    this.init();
  }

  private init() {
    // Check if app is running in standalone mode
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');

    // Check if app is already installed
    this.isInstalled = this.isStandalone;

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled = true;
      this.hideInstallBanner();
      this.deferredPrompt = null;
    });

    // Register service worker
    this.registerServiceWorker();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });

        // Request persistent storage
        if ('storage' in navigator && 'persist' in navigator.storage) {
          const persistent = await navigator.storage.persist();
          console.log('Persistent storage:', persistent);
        }

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
      }
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  public canInstall(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public isRunningStandalone(): boolean {
    return this.isStandalone;
  }

  private showInstallBanner() {
    // Create and show install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #2563eb;
        color: white;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>📱</span>
          <span>Install Attendance App for quick access</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="pwa-install-btn" style="
            background: white;
            color: #2563eb;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">Install</button>
          <button id="pwa-dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
          ">Later</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Add event listeners
    document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
      this.showInstallPrompt();
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      this.hideInstallBanner();
    });
  }

  private hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
  }

  private showUpdateAvailable() {
    // Show update notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        max-width: 300px;
      ">
        <div style="margin-bottom: 12px; font-weight: 500;">Update Available</div>
        <div style="margin-bottom: 12px; font-size: 14px; opacity: 0.9;">A new version of the app is ready to install.</div>
        <button onclick="window.location.reload()" style="
          background: white;
          color: #059669;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        ">Update Now</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }

  // Push notification methods
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  public async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push messaging is not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      console.log('Push subscription:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Offline storage methods
  public async cacheAttendanceData(data: any): Promise<void> {
    try {
      const cache = await caches.open('attendance-data');
      const response = new Response(JSON.stringify(data));
      await cache.put('/api/attendance/offline', response);
    } catch (error) {
      console.error('Failed to cache attendance data:', error);
    }
  }

  public async getCachedAttendanceData(): Promise<any> {
    try {
      const cache = await caches.open('attendance-data');
      const response = await cache.match('/api/attendance/offline');
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get cached attendance data:', error);
    }
    return null;
  }
}

export const pwaService = new PWAService();