import { Executor, Task, Context, PathResolver, FileName, Helpers as h } from "./chain";
import * as fs from 'fs';

const fsp = fs.promises;

export const implementation = Symbol('implementation');

export abstract class StructuredExecutor<TOptions, TState> {
  abstract get name(): string;
  protected abstract execute(state: TState, task: Task, context: Context): Task|undefined|Promise<Task|void>;
  protected abstract init(options: TOptions): TState;
  createExecutor(options: TOptions) {
    const state = this.init(options);
    const executor: Executor = async (task: Task, context: Context) => this.execute(state, task, context);
    (<any>executor)[implementation] = this;
    return executor;
  }
}

export interface FileMapperState {
  readonly sourceResolver: PathResolver;
  readonly selector: (path: string, context: Context) => boolean;
  innerStateKey?: string
}

interface CachedState<T> {
  readonly mtime: Date;
  readonly value: T;
}

export abstract class FileMapper<TOptions, TInnerState, TState extends FileMapperState> extends StructuredExecutor<TOptions, TState> {
  protected createSourceTask(state: TState, task: Task, sourcePath: string, context: Context): Task {
    return Task.file(sourcePath, context.basePath);
  }
  protected abstract generate(state: TState, task: Task, innerState: TInnerState, context: Context): Buffer|Promise<Buffer>;
  protected abstract readSource(state: TState, task: Task, context: Context): TInnerState|Promise<TInnerState>;
  protected postProcess(state: TState, task: Task, innerState: TInnerState, contents: Buffer, context: Context): Buffer|Promise<Buffer> {
    return contents;
  }
  protected process(state: TState, task: Task, sourceTask: Task, innerState: TInnerState, context: Context): TInnerState|Promise<TInnerState> {
    return innerState;
  }
  protected async execute(state: TState, task: Task, context: Context) {
    const name = task.name;
    if (name instanceof FileName) {
      if (state.selector(name.path, context)) {
        // ---------------------- resolve source ----------------------------
        const sourcePath = state.sourceResolver(name.path, name.basePath);
        if (!sourcePath) {
          throw new Error(`unable to resolve source for ${name.path} (basePath = ${name.basePath || context.basePath})`);
        }
        // ---------------------- execute source ----------------------------
        // create source task
        let sourceTask = this.createSourceTask(state, task, sourcePath, context);
        context.log(this.name, task, `resolved source => ${sourceTask.name}`);
        // execute source, possibly triggering subdependencies....
        sourceTask = await context.execute(sourceTask);
        const sourceName = <FileName>sourceTask.name;
        // ----------------------- check cached -----------------------------
        // check if file already exists...
        const mtime = await h.getMtime(task, context);
        // check if source if older (no direct mtime as some dependency of the source could have changed instead of
        // the source itself)...
        const sourceMtime = await h.getMtime(sourceTask, context);
        if (mtime) {
          if (sourceMtime && sourceMtime <= mtime) {
            // no need to recompile, contents will be loaded on demand
            context.log(this.name, task, 'up to date');
            return;
          }
        }
        // -------------------- popuate inner state -------------------------
        // handle inner state key not beeing set
        const innerStateKey = state.innerStateKey || `${this.name}.innerState`;
        let innerState: TInnerState;
        let cached: CachedState<TInnerState>|undefined;
        if (sourceMtime && (cached = await context.storage.getObject<CachedState<TInnerState>>(`!${innerStateKey}!${sourceName.path}`)) && cached.mtime <= sourceMtime) {
          context.log(this.name, task, 'reusing cached state');
          innerState = cached.value;
        } else {
          context.log(this.name, task, 'reading input...');
          innerState = await this.readSource(state, sourceTask, context);
          context.log(this.name, task, 'done reading input');
          await context.storage.setObject(`!${innerStateKey}!${sourceName.path}`, { mtime: sourceMtime, value: innerState })
        }
        // -------------------- process inner state -------------------------
        innerState = await this.process(state, task, sourceTask, innerState, context);
        // --------------------- generate contents --------------------------
        context.log(this.name, task, 'generating output...');
        let contents = await this.generate(state, task, innerState, context);
        context.log(this.name, task, 'done generating');
        // ------------------- post-process contents ------------------------
        contents = await this.postProcess(state, task, innerState, contents, context);
        // -------------------- save final contents -------------------------
        context.log(this.name, task, 'saving...');
        const res = await context.saveContents(task, contents, true);
        context.log(this.name, task, 'done');
        // ---------------------------- done --------------------------------
        return res;
      }
    }
  }
}

export interface FileDependencyResolverState {
  readonly selector: (path: string, context: Context) => boolean;
  innerStateKey?: string
  dependenciesKey?: string
}

interface CachedDependencies<T> {
  readonly mtime: Date;
  readonly deps: string[];
  readonly innerState: T;
}

export abstract class FileDependencyResolver<TOptions, TInnerState, TState extends FileDependencyResolverState> extends StructuredExecutor<TOptions, TState> {
  protected abstract readSource(state: TState, task: Task, context: Context): TInnerState|Promise<TInnerState>;
  protected abstract readDependencies(state: TState, task: Task, innerState: TInnerState, context: Context): string[]|Promise<string[]>
  protected async execute(state: TState, task: Task, context: Context) {
    const name = task.name;
    if (name instanceof FileName) {
      if (state.selector(name.path, context)) {
        // --------------------- get actual mtime ---------------------------
        let mtime = await fsp.stat(name.path)
          .then(
            stats => stats.mtime,
            err => { throw new Error(`unable to stat file: ${err.message || err}`);
          });
        // ------------------- populate dependencies ------------------------
        let deps: string[];
        let innerState: TInnerState;
        const dependenciesKey = state.dependenciesKey || `${this.name}.dependencies`;
        const entry = await context.storage.getObject<CachedDependencies<TInnerState>>(`!${dependenciesKey}!${name.path}`);
        if (entry && entry.mtime <= mtime) {
          // dependencies did not change
          context.log(this.name, task, 'using cached dependencies');
          deps = entry.deps;
          innerState = entry.innerState;
        } else {
          // -------------------- popuate inner state -------------------------
          // handle inner state key not beeing set
          const innerStateKey = state.innerStateKey || `${this.name}.innerState`;
          let cached: CachedState<TInnerState>|undefined;
          if (mtime && (cached = await context.storage.getObject<CachedState<TInnerState>>(`!${innerStateKey}!${name.path}`)) && cached.mtime <= mtime) {
            context.log(this.name, task, 'reusing cached state');
            innerState = cached.value;
          } else {
            context.log(this.name, task, 'reading input...');
            innerState = await this.readSource(state, task, context);
            context.log(this.name, task, 'done reading input');
            await context.storage.setObject(`!${innerStateKey}!${name.path}`, { mtime: mtime, value: innerState })
          }
          context.log(this.name, task, 'reading dependencies...');
          deps = await this.readDependencies(state, task, innerState, context);
          context.log(this.name, task, 'done reading dependencies');
          await context.storage.setObject(`!${dependenciesKey}!${name.path}`, <CachedDependencies<TInnerState>>{
            mtime,
            deps,
            innerState
          });
        }
        // -------------------- process dependencies ------------------------
        if (deps.length) {
          const depTasks = deps.map(dep => Task.file(dep, context.basePath));
          context.log(this.name, task, `processing dependencies => ${depTasks.map(t => name).join(',')}`);
          const mtimes = [mtime];
          await Promise.all(depTasks.map(async t => {
            const depTask = await context.execute(t);
            mtimes.push(await h.getMtime(depTask, context) || mtime);
          }))
          const mtimeMilliseconds = Math.max.apply(Math, mtimes.map(date => date.getTime()));
          mtime = new Date();
          mtime.setTime(mtimeMilliseconds);
          context.log(this.name, task, 'done processing dependencies');
        } else {
          context.log(this.name, task, 'no dependencies');
        }
        // ----------------------- update mtime -----------------------------
        const res = await h.setMtime(task, mtime, context);
        context.log(this.name, task, 'done');
        return res;
      }
    }
  }
}