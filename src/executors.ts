import { Task, Executor, Context, FileName } from "./chain";
import * as fs from 'fs';

const fileStat = (path: string): Promise<fs.Stats> => new Promise((resolve, reject) => fs.stat(path, (err, stats) => err ? reject(err) : resolve(stats)));

export interface PathSelector {
  (task: Task): string|undefined|Promise<string|undefined>
}

const isFile: PathSelector = (task: Task) => {
  const taskName = task.name;
  if (taskName instanceof FileName) {
    return taskName.path;
  }
}

export function preloadContents(pathSelector: PathSelector): Executor {
  return async (task: Task, context: Context) => {
    const path = await pathSelector(task);
    if (path) {
      const contents = (<Buffer>task.state.contents) || await context.getContents(task);
      return task.updateState({
        ...task.state,
        contents
      });
    }
  };
}

export function saveContents(pathSelector: PathSelector) : Executor {
  return async (task: Task, context: Context): Promise<undefined> => {
    const path = await pathSelector(task);
    if (path) {
      const data = await context.getContents(task);
      await context.saveContents(task, data, true); //writeFile(path, data);
    }
    return;
  }
}

export function storeMtime(pathSelector?: PathSelector) : Executor {
  return async (task: Task, context: Context): Promise<undefined> => {
    const select = pathSelector || isFile;
    const path = await select(task);
    if (path) {
      const mtime = await fileStat(path).then(stats => stats.mtime, () => null);
      if (mtime) {
        await context.storage.setObject(`!mime!${path}`, mtime);
      }
    }
    return;
  }
}