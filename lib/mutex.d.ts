export interface Disposable {
    dispose(): void;
}
export declare function using<T extends Disposable, R>(disposable: T, action: (arg: T) => R): R;
export declare function asyncUsing<T extends Disposable, R>(disposable: T, action: (arg: T) => Promise<R>): Promise<R>;
export declare class Mutex implements Disposable {
    private readonly queue;
    private active;
    dispose(): void;
    lock(): Promise<{}>;
    release(): void;
}
