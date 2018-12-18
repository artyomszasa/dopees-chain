const dummy = {};

export interface Disposable {
  dispose(): void
}

export function using<T extends Disposable, R>(disposable: T, action: (arg: T) => R) {
  try {
    return action(disposable);
  } finally {
    disposable.dispose();
  }
}

export async function asyncUsing<T extends Disposable, R>(disposable: T, action: (arg: T) => Promise<R>) {
  try {
    return await action(disposable);
  } finally {
    disposable.dispose();
  }
}

export class Mutex implements Disposable {
  private readonly queue : Array<{ resolve: Function, reject: Function }> = [];
  private active = false;
  dispose () {
    for (let triggers = this.queue.shift(); triggers; triggers = this.queue.shift()) {
      triggers.reject('cancelled');
    }
  }
  lock () {
    return new Promise((resolve, reject) => {
      // this runs syncronously...
      if (this.active || this.queue.length) {
        this.queue.push({ resolve, reject });
      } else {
        this.active = true;
        resolve();
      }
    });
  }
  release () {
    // this runs syncronously...
    const triggers = this.queue.shift();
    if (triggers) {
      setTimeout(() => triggers.resolve(), 0);
    } else {
      this.active = false;
    }
  }
}