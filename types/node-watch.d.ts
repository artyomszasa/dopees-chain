export = watch;
declare interface Watcher {
  on(eventName: string, listener: Function): void;
  close(): void;
}

declare function watch(fpath: string, options: { recursive?: boolean, persistent?: boolean }, fn: (eventName: string, filename: string) => void): Watcher;
declare namespace watch { }