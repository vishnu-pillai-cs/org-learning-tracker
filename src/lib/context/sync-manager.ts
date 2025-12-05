/**
 * DataSyncManager - Abstraction for data fetching and real-time updates
 * 
 * Current implementation: HTTP polling
 * Future: Can be swapped to WebSocket/SSE without changing consumer code
 */

export type SyncCallback<T = unknown> = (data: T) => void;
export type UnsubscribeFn = () => void;

interface PollConfig {
  interval: number;
  endpoint: string;
  callback: SyncCallback;
}

interface DataSyncManager {
  /**
   * Subscribe to data updates from a channel
   * Returns an unsubscribe function
   */
  subscribe: <T>(channel: string, callback: SyncCallback<T>) => UnsubscribeFn;

  /**
   * Fetch data from an endpoint
   */
  fetch: <T>(endpoint: string, options?: RequestInit) => Promise<T>;

  /**
   * Start polling a channel at the specified interval
   */
  startPolling: (channel: string, endpoint: string, interval: number) => void;

  /**
   * Stop polling a channel
   */
  stopPolling: (channel: string) => void;

  /**
   * Stop all polling
   */
  stopAllPolling: () => void;

  /**
   * Check if a channel is being polled
   */
  isPolling: (channel: string) => boolean;
}

class HttpSyncManager implements DataSyncManager {
  private subscribers: Map<string, Set<SyncCallback>> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pollConfigs: Map<string, PollConfig> = new Map();

  subscribe<T>(channel: string, callback: SyncCallback<T>): UnsubscribeFn {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    const callbacks = this.subscribers.get(channel)!;
    callbacks.add(callback as SyncCallback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback as SyncCallback);
      if (callbacks.size === 0) {
        this.subscribers.delete(channel);
        // Stop polling if no subscribers
        this.stopPolling(channel);
      }
    };
  }

  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(endpoint, {
      credentials: "include",
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  startPolling(channel: string, endpoint: string, interval: number): void {
    // Don't start if already polling
    if (this.pollingIntervals.has(channel)) {
      return;
    }

    const poll = async () => {
      try {
        const data = await this.fetch(endpoint);
        this.notifySubscribers(channel, data);
      } catch (error) {
        console.error(`[SyncManager] Polling error for ${channel}:`, error);
      }
    };

    // Store config for potential restart
    this.pollConfigs.set(channel, { interval, endpoint, callback: () => poll() });

    // Start polling
    const intervalId = setInterval(poll, interval);
    this.pollingIntervals.set(channel, intervalId);

    // Also fetch immediately
    poll();
  }

  stopPolling(channel: string): void {
    const intervalId = this.pollingIntervals.get(channel);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(channel);
      this.pollConfigs.delete(channel);
    }
  }

  stopAllPolling(): void {
    for (const [channel] of this.pollingIntervals) {
      this.stopPolling(channel);
    }
  }

  isPolling(channel: string): boolean {
    return this.pollingIntervals.has(channel);
  }

  private notifySubscribers(channel: string, data: unknown): void {
    const callbacks = this.subscribers.get(channel);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SyncManager] Subscriber error for ${channel}:`, error);
        }
      }
    }
  }
}

// Singleton instance
let syncManagerInstance: DataSyncManager | null = null;

export function getSyncManager(): DataSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new HttpSyncManager();
  }
  return syncManagerInstance;
}

// Export type for consumers
export type { DataSyncManager };

