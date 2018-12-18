/// <reference types="node" />
import { Storage } from './storage';
export interface TaskName {
    readonly name: string;
    toString(): string;
}
export declare class FileName implements TaskName {
    readonly name: string;
    readonly path: string;
    readonly basePath: string | undefined;
    constructor(path: string, root?: string);
    toString(): string;
}
export declare class LogicalName implements TaskName {
    readonly name: string;
    constructor(name: string);
    toString(): string;
}
export declare class Task {
    static file(path: string, root?: string, state?: any): Task;
    static logical(name: string, state?: any): Task;
    name: TaskName;
    state: any;
    constructor(name: TaskName, state?: any);
    updateState(state: any): Task;
}
export interface Context {
    readonly basePath: string;
    readonly storage: Storage;
    log(op: string, task: Task, message: string, duration?: number): void;
    execute(task: Task): Promise<Task>;
    getContents(task: Task): Promise<Buffer>;
    getContents(task: Task, encoding: string): Promise<string>;
    saveContents(task: Task, data: Buffer, persist?: boolean): Promise<Task>;
    resetCounters(): void;
}
export interface Executor {
    (task: Task, context: Context): Task | undefined | Promise<Task | void>;
}
export declare class Executors {
    static combine(first: Executor, second: Executor): Executor;
    static combine(executors: Executor[]): Executor;
}
