import { Executor, Task, Context, PathResolver, FileName, Helpers as h } from "./chain";

export const implementation = Symbol('implementation');

export abstract class StructuredExecutor<TOptions, TState> {
  protected abstract get name(): string;
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
  readonly selector: (path: string) => boolean;
  innerStateKey?: string
}

interface CachedState<T> {
  readonly mtime: Date;
  readonly value: T;
}

export abstract class FileMapper<TOptions, TInnerState, TState extends FileMapperState> extends StructuredExecutor<TOptions, TState> {
  protected abstract generate(state: TState, task: Task, innerState: TInnerState, context: Context): Buffer|Promise<Buffer>;
  protected abstract readSource(state: TState, task: Task, context: Context): Promise<TInnerState>;
  protected postProcess(state: TState, task: Task, innerState: TInnerState, contents: Buffer, context: Context): Buffer|Promise<Buffer> {
    return contents;
  }
  protected process(state: TState, task: Task, innerState: TInnerState, context: Context): TInnerState|Promise<TInnerState> {
    return innerState;
  }
  protected async execute(state: TState, task: Task, context: Context) {
    const name = task.name;
    if (name instanceof FileName) {
      if (state.selector(name.path)) {
        // ---------------------- resolve source ----------------------------
        const sourcePath = state.sourceResolver(name.path, name.basePath);
        if (!sourcePath) {
          throw new Error(`unable to resolve source for ${name.path} (basePath = ${name.basePath || context.basePath})`);
        }
        // ---------------------- execute source ----------------------------
        // create source task
        let sourceTask = Task.file(sourcePath, context.basePath);
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
        if (sourceMtime && (cached = await context.storage.getObject<CachedState<TInnerState>>(`!${innerStateKey}!${sourceName.path}`))) {
          context.log(this.name, task, 'reusing cached state');
          innerState = cached.value;
        } else {
          context.log(this.name, task, 'reading input...');
          innerState = await this.readSource(state, sourceTask, context);
          context.log(this.name, task, 'done reading input');
          await context.storage.setObject(`!${innerStateKey}!${sourceName.path}`, { mtime: sourceMtime, value: innerState })
        }
        // -------------------- process inner state -------------------------
        innerState = await this.process(state, task, innerState, context);
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