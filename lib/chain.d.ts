/// <reference types="node" />
import * as executors from './executors';
import { PathResolver, ReversePathResolver, PathResolverConfig, ReversePathResolverConfig } from './path-resolvers';
import { Task, TaskName, FileName, LogicalName, Context, Executor, Executors } from './task';
import { Storage } from './storage';
import * as derived from './derived';
import * as mutex from './mutex';
export declare class DefaultContext implements Context {
    private readonly contentCache;
    private readonly executors;
    private readonly times;
    private initTs;
    readonly basePath: string;
    readonly storage: Storage;
    constructor(basePath: string, executors: Executor[], storage: Storage);
    resetCounters(): void;
    log(op: string, task: Task, message: string): void;
    execute(task: Task): Promise<Task>;
    getContents(task: Task): Promise<Buffer>;
    getContents(task: Task, encoding: string): Promise<string>;
    saveContents(task: Task, data: Buffer, persist?: boolean): Promise<Task>;
}
export declare abstract class Runner {
    static from(executors: Executor[], storage?: Storage): DefaultRunner;
    abstract createContext(basePath: string): Context;
    execute(name: string | TaskName, basePath?: string): Promise<Task>;
    watch(name: string | TaskName, basePath?: string, watchPath?: string): Promise<{}>;
}
export declare class DefaultRunner extends Runner {
    readonly executors: Executor[];
    readonly storage: Storage;
    constructor(executors: Executor[], storage?: Storage);
    createContext(basePath: string): Context;
}
export declare class Helpers {
    static getMtime(task: Task, context: Context): Promise<Date | null>;
    static setMtime(task: Task, mtime: Date, context: Context): Promise<Task>;
    static setMtime(task: Task, mtime: Date): Task;
}
export declare function task(name: string, action: Executor): Executor;
export declare function subtask(name: string, action: (context: Context) => Task | Task[] | Promise<Task | Task[]>): Executor;
export { Task, TaskName, FileName, LogicalName, Context, Executor, Executors, PathResolver, ReversePathResolver, PathResolverConfig, ReversePathResolverConfig, executors, derived, mutex };
