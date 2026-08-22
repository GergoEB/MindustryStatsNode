import {EventEmitter} from 'events';

/**
 * In-memory queue implementation using EventEmitter
 * Replaces Redis-based ValkeyQueue
 */
export class InMemoryQueue<T = any> {
  private queue: T[] = [];
  private emitter = new EventEmitter();
  private readonly ITEM_AVAILABLE = 'item-available';

  constructor(private queueName: string) {}

  /**
   * Push an item to the queue
   */
  async push(data: T): Promise<void> {
    this.queue.push(data);
    this.emitter.emit(this.ITEM_AVAILABLE);
  }

  /**
   * Pop an item from the queue with optional timeout
   * Returns null if timeout expires without an item
   */
  async pop(timeoutSeconds: number = 0): Promise<T | null> {
    // If there's an item available, return it immediately
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    // If no timeout specified, return null
    if (timeoutSeconds === 0) {
      return null;
    }

    // Wait for an item to become available or timeout
    return new Promise<T | null>((resolve) => {
      let settled = false;
      const onItemAvailable = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.emitter.removeListener(this.ITEM_AVAILABLE, onItemAvailable);
        // Check if queue still has items (race condition protection)
        const item = this.queue.shift();
        resolve(item !== undefined ? item : null);
      };
      this.emitter.once(this.ITEM_AVAILABLE, onItemAvailable);
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.emitter.removeListener(this.ITEM_AVAILABLE, onItemAvailable);
        resolve(null);
      }, timeoutSeconds * 1000);
    });
  }

  /**
   * Pop all items currently in the queue, waiting for at least one item if the queue is empty
   * Returns an empty array if timeout expires without any items
   * @param timeoutSeconds
   */
  async popAll(timeoutSeconds: number = 0): Promise<T[]> {
    // If there are items available, drain and return them immediately
    if (this.queue.length > 0) {
      return this.queue.splice(0);
    }

    // If no timeout specified, return null
    if (timeoutSeconds === 0) {
      return [];
    }

    // Wait for an item to become available or timeout
    return new Promise<T[]>((resolve) => {
      this.pop(timeoutSeconds).then((item) => {
        if (item === null) {
          resolve([]);
        } else {
          // Drain any additional items that may have arrived
          const items = [item, ...this.queue.splice(0)];
          resolve(items);
        }
      });
    });
  }

  /**
   * Get the current length of the queue
   */
  async length(): Promise<number> {
    return this.queue.length;
  }

  /**
   * Clear all items from the queue
   */
  clear(): void {
    this.queue = [];
  }
}
