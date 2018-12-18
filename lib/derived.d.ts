/// <reference types="node" />
import { Executor, Task, Context, PathResolver } from "./chain";
export declare const implementation: unique symbol;
export declare abstract class StructuredExecutor<TOptions, TState> {
    abstract readonly name: string;
    protected abstract execute(state: TState, task: Task, context: Context): Task | undefined | Promise<Task | void>;
    protected abstract init(options: TOptions): TState;
    createExecutor(options: TOptions): Executor;
}
export interface FileMapperState {
    readonly sourceResolver: PathResolver;
    readonly selector: (path: string, context: Context) => boolean;
    innerStateKey?: string;
}
export declare abstract class FileMapper<TOptions, TInnerState, TState extends FileMapperState> extends StructuredExecutor<TOptions, TState> {
    protected createSourceTask(state: TState, task: Task, sourcePath: string, context: Context): Task;
    protected abstract generate(state: TState, task: Task, innerState: TInnerState, context: Context): Buffer | Promise<Buffer>;
    protected abstract readSource(state: TState, task: Task, context: Context): TInnerState | Promise<TInnerState>;
    protected postProcess(state: TState, task: Task, innerState: TInnerState, contents: Buffer, context: Context): Buffer | Promise<Buffer>;
    protected process(state: TState, task: Task, sourceTask: Task, innerState: TInnerState, context: Context): TInnerState | Promise<TInnerState>;
    protected execute(state: TState, task: Task, context: Context): Promise<Task | undefined>;
}
export interface FileDependencyResolverState {
    readonly selector: (path: string, context: Context) => boolean;
    innerStateKey?: string;
    dependenciesKey?: string;
}
export declare abstract class FileDependencyResolver<TOptions, TInnerState, TState extends FileDependencyResolverState> extends StructuredExecutor<TOptions, TState> {
    protected abstract readSource(state: TState, task: Task, context: Context): TInnerState | Promise<TInnerState>;
    protected abstract readDependencies(state: TState, task: Task, innerState: TInnerState, context: Context): string[] | Promise<string[]>;
    protected execute(state: TState, task: Task, context: Context): Promise<Task | undefined>;
}
