import { FocusEventType, FocusEventMap } from '../models/FocusEvents';

export type FocusEventHandler<T extends FocusEventType> = (payload: FocusEventMap[T]) => void;

export class FocusEventBus {
  private handlers: Map<FocusEventType, Set<FocusEventHandler<any>>> = new Map();

  public on<T extends FocusEventType>(type: T, handler: FocusEventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      const set = this.handlers.get(type);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  public emit<T extends FocusEventType>(type: T, payload: FocusEventMap[T]): void {
    const set = this.handlers.get(type);
    if (set) {
      for (const handler of set) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[FocusEventBus] Error handling event "${type}":`, err);
        }
      }
    }
  }

  public removeAllListeners(): void {
    this.handlers.clear();
  }
}
