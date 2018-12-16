export interface Storage {
  get(key: string): Promise<string|undefined>;
  set(key: string, value: string): Promise<void>;
  getObject<T>(key: string): Promise<T|undefined>;
  setObject(key: string, value: any): Promise<void>;
  clear(key: string): Promise<void>;
}

interface StringMap {
  [key: string]: string|undefined
}

export class MemoryStorage implements Storage {
  private readonly data : StringMap = {}
  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.data[key]);
  }
  getObject(key: string): Promise<any> {
    return Promise.resolve(this.data[key]);
  }
  set(key: string, value: string): Promise<void> {
    this.data[key] = value;
    return Promise.resolve();
  }
  setObject(key: string, value: any): Promise<void> {
    this.data[key] = value;
    return Promise.resolve();
  }
  clear(key: string): Promise<void> {
    delete this.data[key];
    return Promise.resolve();
  }
}