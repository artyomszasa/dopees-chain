import * as fs from 'fs';
import * as fspath from 'path';
import * as executors from './executors';
import { PathResolver, ReversePathResolver, PathResolverConfig, ReversePathResolverConfig } from './path-resolvers';
import { Task, TaskName, FileName, LogicalName, Context, Executor, Executors } from './task';
import { Storage, MemoryStorage } from './storage';
import * as mkdirp from 'mkdirp';
import * as colors from 'colors/safe';
import * as nodeWatch from 'node-watch';
import * as derived from './derived';
import * as mutex from './mutex';

const mkdirrec = (path: string): Promise<mkdirp.Made> => new Promise((resolve, reject) => mkdirp(path, (err, res) => err ? reject(err) : resolve(res)));
const fsp = fs.promises;

// const fileRead = (path: string) : Promise<Buffer> => new Promise((resolve, reject) => fs.readFile(path, (err, data) => {
//   if (err) {
//     reject(err);
//   } else {
//     resolve(data);
//   }
// }));
//
// const fileWrite = (path: string, data:Buffer) => new Promise((resolve, reject) => fs.writeFile(path, data, err => {
//   if (err) {
//     reject(err);
//   } else {
//     resolve();
//   }
// }))



interface ContentCache {
  [path: string]: Buffer
}

const durationToString = (duration : [number, number]) => String(duration[0] * 1000 + Math.round(duration[1] / 1000) / 1000);

export class DefaultContext implements Context {
  private readonly contentCache: ContentCache = {};
  private readonly executors: Executor[];
  private readonly times: WeakMap<Task, [number, number]> = new WeakMap();
  private initTs: [number, number] = [0, 0];
  readonly basePath: string;
  readonly storage: Storage;
  constructor (basePath: string, executors: Executor[], storage: Storage) {
    this.basePath = basePath;
    this.executors = executors;
    this.storage = storage;
  }
  resetCounters() {
    this.initTs = process.hrtime();
  }
  log(op: string, task: Task, message: string) {
    let duration : [number, number] | null = null;
    let startTs = this.times.get(task);
    if (startTs) {
      duration = process.hrtime(startTs);
    }
    const totalDuration = process.hrtime(this.initTs);
    const sTotal = `${durationToString(totalDuration).padEnd(5)}ms`;
    const sTask  = duration ? `${durationToString(duration).padEnd(5)}ms` : '--   ms';
    console.log(`[${op.padEnd(12)}]`, colors.grey(`[${sTask}/${sTotal}][${task.name}]`), message);
  }
  async execute(task: Task): Promise<Task> {
    let t = task;
    const startTs = process.hrtime();
    this.times.set(t, startTs);
    for (const executor of this.executors) {
      const result = await executor(t, this);
      t = result || t;
      this.times.set(t, startTs);
    }
    return t;
  }
  getContents(task: Task): Promise<Buffer>;
  getContents(task: Task, encoding: string): Promise<string>;
  async getContents(task: Task, encoding?: string) {
    const name = task.name;
    if (name instanceof FileName) {
      // ...try get cached contents
      if (this.contentCache[name.path]) {
        return encoding ? this.contentCache[name.path].toString(encoding) : this.contentCache[name.path];
      }
    }
    // ...check if task has stored contents...
    const taskContents = task.state.contents;
    if (taskContents instanceof Buffer) {
      return encoding ? taskContents.toString(encoding) : taskContents;
    }
    if (name instanceof FileName) {
      // ...or load and store file contents
      const contents = await fsp.readFile(name.path);
      this.contentCache[name.path] = contents;
      return encoding ? contents.toString(encoding) : contents;
    }
    // fail of task is not a file and has no stored contents
    throw new Error(`unable to get contents for ${task.name}`);
  }
  async saveContents(task: Task, data: Buffer, persist?: boolean) {
    const taskName = task.name;
    const key = taskName instanceof FileName ? taskName.path : taskName.name;
    this.contentCache[key] = data;
    if (persist) {
      if (taskName instanceof FileName) {
        await mkdirrec(fspath.dirname(taskName.path));
        await fsp.writeFile(taskName.path, data);
        const mtime = await fsp.stat(taskName.path).then(stats => stats.mtime, () => null);
        if (mtime) {
          await Helpers.setMtime(task, mtime, this);
        }
      } else {
        throw new Error(`unable to persist task contents for ${taskName}: not a file`);
      }
    }
    return task.updateState({
      ...task.state,
      contents: data
    });
  }
}

export abstract class Runner {
  static from(executors: Executor[], storage?: Storage) {
    return new DefaultRunner(executors, storage);
  }
  abstract createContext(basePath: string): Context
  async execute(name: string|TaskName, basePath?: string) {
    const base = basePath || process.cwd();
    let taskName : TaskName;
    if ('string' === typeof name) {
      if (name.includes(fspath.sep)) {
        taskName = new FileName(name, base);
      } else {
        taskName = new LogicalName(name);
      }
    } else {
      taskName = name;
    }
    const context = this.createContext(base);
    context.resetCounters();
    return await context.execute(new Task(taskName));
  }
  watch(name: string|TaskName, basePath?: string, watchPath?: string) {
    const base = basePath || process.cwd();
    let taskName : TaskName;
    if ('string' === typeof name) {
      if (name.includes(fspath.sep)) {
        taskName = new FileName(name, base);
      } else {
        taskName = new LogicalName(name);
      }
    } else {
      taskName = name;
    }
    const context = this.createContext(base);
    let wpath = watchPath || context.basePath;
    if (!fspath.isAbsolute(wpath)) {
      wpath = fspath.normalize(fspath.join(context.basePath, wpath));
    }
    console.log(`watching ${wpath}`);
    const watch = nodeWatch(wpath, {
      persistent: true,
      recursive: true
    }, (_, filename) => {
      console.log(`${filename} changed`);
      context.resetCounters();
      return context.execute(new Task(taskName));
    });
    return new Promise((resolve, reject) => {
      watch.on('error', (_: string, err: Error) => reject(err));
      watch.on('close', () => resolve());
    });
  }
}

export class DefaultRunner extends Runner {
  readonly executors: Executor[];
  readonly storage: Storage;
  constructor(executors: Executor[], storage?: Storage) {
    super();
    this.executors = executors;
    this.storage = storage || new MemoryStorage();
  }
  createContext(basePath: string): Context {
    return new DefaultContext(basePath, this.executors, this.storage);
  }
}

const keyMtime = Symbol('mtime');

export class Helpers {
  static async getMtime (task: Task, context: Context) {
    const value = task.state && task.state[keyMtime];
    if (value instanceof Date) {
      return value;
    }
    const name = task.name;
    if (name instanceof FileName) {
      const mtime = await fsp.stat(name.path).then(stats => stats.mtime, () => null);
      if (mtime) {
        return mtime;
      }
      if (context) {
        const mtime = await context.storage.getObject<Date>(`!mtime!${name.path}`);
        if (mtime) {
          return mtime;
        }
      }
    }
    return null;
  }
  static setMtime(task: Task, mtime: Date, context: Context): Promise<Task>;
  static setMtime(task: Task, mtime: Date): Task;
  static setMtime(task: Task, mtime: Date, context?: Context) {
    const res = task.updateState({
      ...task.state,
      [keyMtime]: mtime
    });
    const name = task.name;
    if (context) {
      if (name instanceof FileName) {
        return context.storage.setObject(`!mtime!${name.path}`, mtime)
          .then(() => res);
      }
      return Promise.resolve(res);
    }
    return res;
  }
}

export function task(name: string, action: Executor): Executor {
  return (task: Task, context: Context) => {
    if (task.name instanceof LogicalName && task.name.name === name) {
      return action(task, context);
    }
  };
}

export function subtask(name: string, action: (context: Context) => Task|Task[]|Promise<Task|Task[]>): Executor {
  return task(name, async (_, context) => {
    const tasks = await action(context);
    if (tasks instanceof Task) {
      await context.execute(tasks);
    } else {
      await Promise.all(tasks.map(task => context.execute(task)));
    }
  })
}

export {
  Task, TaskName, FileName, LogicalName, Context, Executor, Executors,
  PathResolver, ReversePathResolver, PathResolverConfig, ReversePathResolverConfig,
  executors,
  derived,
  mutex
}