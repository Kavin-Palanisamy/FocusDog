export interface ITimeProvider {
  /** Returns current monotonic time in milliseconds */
  now(): number;
}

export class SystemTimeProvider implements ITimeProvider {
  public now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

export class MockTimeProvider implements ITimeProvider {
  private currentTimeMs: number;

  constructor(initialTimeMs: number = 0) {
    this.currentTimeMs = initialTimeMs;
  }

  public now(): number {
    return this.currentTimeMs;
  }

  public advanceSeconds(seconds: number): void {
    this.currentTimeMs += seconds * 1000;
  }

  public advanceMs(ms: number): void {
    this.currentTimeMs += ms;
  }

  public setTime(timeMs: number): void {
    this.currentTimeMs = timeMs;
  }
}
