import { db } from '../db';
import { Network } from '@capacitor/network';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

class NetworkSensorCollector {
  private isRunning = false;
  private listenerHandle: PluginListenerHandle | null = null;

  async start(): Promise<void> {
    if (this.isRunning || typeof window === 'undefined') return;
    this.isRunning = true;

    if (Capacitor.isNativePlatform()) {
      try {
        this.listenerHandle = await Network.addListener('networkStatusChange', () => {
          this.logNetwork();
        });
      } catch (e) {
        console.warn('[NetworkSensor] Native network listener error:', e);
      }
    } else {
      window.addEventListener('online', this.handleNetworkChange);
      window.addEventListener('offline', this.handleNetworkChange);
    }

    await this.logNetwork();
  }

  stop(): void {
    if (!this.isRunning || typeof window === 'undefined') return;
    this.isRunning = false;

    if (this.listenerHandle) {
      this.listenerHandle.remove();
      this.listenerHandle = null;
    }

    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);
  }

  private handleNetworkChange = () => {
    this.logNetwork();
  };

  private async logNetwork(): Promise<void> {
    let isOnline = 1;

    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus();
        isOnline = status.connected ? 1 : 0;
      } catch (e) {
        console.warn('[NetworkSensor] Native network status error:', e);
      }
    } else {
      isOnline = typeof navigator !== 'undefined' ? (navigator.onLine ? 1 : 0) : 1;
    }

    await db.logSensorEvent({
      type: 'network',
      timestamp: Date.now(),
      payload: {
        network_online: isOnline,
      }
    });
  }
}

export const networkSensor = new NetworkSensorCollector();
