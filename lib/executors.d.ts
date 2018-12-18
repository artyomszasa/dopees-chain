import { Task, Executor } from "./chain";
export interface PathSelector {
    (task: Task): string | undefined | Promise<string | undefined>;
}
export declare function preloadContents(pathSelector: PathSelector): Executor;
export declare function saveContents(pathSelector: PathSelector): Executor;
export declare function storeMtime(pathSelector?: PathSelector): Executor;
