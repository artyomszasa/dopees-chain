export interface Storage {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    getObject<T>(key: string): Promise<T | undefined>;
    setObject(key: string, value: any): Promise<void>;
    clear(key: string): Promise<void>;
}
export declare class MemoryStorage implements Storage {
    private readonly data;
    get(key: string): Promise<string | undefined>;
    getObject(key: string): Promise<any>;
    set(key: string, value: string): Promise<void>;
    setObject(key: string, value: any): Promise<void>;
    clear(key: string): Promise<void>;
}
