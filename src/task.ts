import * as fspath from 'path';
import { Storage } from './storage';

export interface TaskName {
  readonly name: string
  toString(): string
}

export class FileName implements TaskName {
  readonly name: string
  readonly path: string
  readonly basePath: string|undefined
  constructor (path: string, root?: string) {
    this.name = path;
    this.path = fspath.normalize(fspath.isAbsolute(path) ? path : fspath.join(root || process.cwd(), path));
    this.basePath = root;
  }
  toString() {
    if (this.basePath) {
      return fspath.relative(this.basePath, this.path)
    }
    return `.../${this.name}`;
  }
}

export class LogicalName implements TaskName {
  readonly name: string
  constructor (name: string) {
    this.name = name;
  }
  toString() {
    return `${this.name}`;
  }
}

export class Task {
  static file(path: string, root?: string, state?: any) {
    return new Task(new FileName(path, root), state);
  }
  name: TaskName
  state: any
  constructor(name: TaskName, state?: any) {
    this.name = name;
    this.state = state || {};
  }
  updateState(state: any) {
    return new Task(this.name, state || {});
  }
}

export interface Context {
  readonly basePath: string
  readonly storage: Storage
  log(op: string, task: Task, message: string, duration?: number): void;
  execute(task: Task): Promise<Task>
  getContents(task: Task): Promise<Buffer>
  getContents(task: Task, encoding: string): Promise<string>
  saveContents(task: Task, data: Buffer, persist?: boolean): Promise<Task>
  resetCounters(): void;
}

export interface Executor {
  (task: Task, context: Context): Task|undefined|Promise<Task|void>
}

export class Executors {
  static combine(first: Executor, second: Executor): Executor;
  static combine(executors: Executor[]): Executor;
  static combine(firstOrMany: Executor | Executor[], second?: Executor) {
    if (Array.isArray(firstOrMany)) {
      return firstOrMany.reduce((a, b) => Executors.combine(a, b));
    } else if (!second) {
      throw new TypeError('invalid usage');
    } else {
      const first = firstOrMany;
      return async (task: Task, context: Context) => {
        const next = await first(task, context);
        const result = await second(next || task, context);
        return result || next || task;
      };
    }
  }
}

