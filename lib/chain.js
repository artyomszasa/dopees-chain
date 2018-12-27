"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fspath = require("path");
const executors = require("./executors");
exports.executors = executors;
const path_resolvers_1 = require("./path-resolvers");
exports.PathResolver = path_resolvers_1.PathResolver;
exports.ReversePathResolver = path_resolvers_1.ReversePathResolver;
const task_1 = require("./task");
exports.Task = task_1.Task;
exports.FileName = task_1.FileName;
exports.LogicalName = task_1.LogicalName;
exports.Executors = task_1.Executors;
const storage_1 = require("./storage");
const mkdirp = require("mkdirp");
const colors = require("colors/safe");
const nodeWatch = require("node-watch");
const derived = require("./derived");
exports.derived = derived;
const mutex = require("./mutex");
exports.mutex = mutex;
const mkdirrec = (path) => new Promise((resolve, reject) => mkdirp(path, (err, res) => err ? reject(err) : resolve(res)));
const fsp = fs.promises;
const durationToString = (duration) => String(duration[0] * 1000 + Math.round(duration[1] / 1000) / 1000);
class DefaultContext {
    constructor(basePath, executors, storage) {
        this.contentCache = {};
        this.times = new WeakMap();
        this.initTs = [0, 0];
        this.basePath = basePath;
        this.executors = executors;
        this.storage = storage;
    }
    resetCounters() {
        this.initTs = process.hrtime();
    }
    log(op, task, message) {
        let duration = null;
        let startTs = this.times.get(task);
        if (startTs) {
            duration = process.hrtime(startTs);
        }
        const totalDuration = process.hrtime(this.initTs);
        const sTotal = `${durationToString(totalDuration).padEnd(5)}ms`;
        const sTask = duration ? `${durationToString(duration).padEnd(5)}ms` : '--   ms';
        console.log(`[${op.padEnd(12)}]`, colors.grey(`[${sTask}/${sTotal}][${task.name}]`), message);
    }
    async execute(task) {
        let t = task;
        const startTs = process.hrtime();
        this.times.set(t, startTs);
        for (const executor of this.executors) {
            const result = await executor(t, this);
            t = result || t;
            this.times.set(t, startTs);
        }
        return t;
    }
    async getContents(task, encoding) {
        const name = task.name;
        if (name instanceof task_1.FileName) {
            // ...try get cached contents
            if (this.contentCache[name.path]) {
                return encoding ? this.contentCache[name.path].toString(encoding) : this.contentCache[name.path];
            }
        }
        // ...check if task has stored contents...
        const taskContents = task.state.contents;
        if (taskContents instanceof Buffer) {
            return encoding ? taskContents.toString(encoding) : taskContents;
        }
        if (name instanceof task_1.FileName) {
            // ...or load and store file contents
            const contents = await fsp.readFile(name.path);
            this.contentCache[name.path] = contents;
            return encoding ? contents.toString(encoding) : contents;
        }
        // fail of task is not a file and has no stored contents
        throw new Error(`unable to get contents for ${task.name}`);
    }
    async saveContents(task, data, persist) {
        const taskName = task.name;
        const key = taskName instanceof task_1.FileName ? taskName.path : taskName.name;
        this.contentCache[key] = data;
        if (persist) {
            if (taskName instanceof task_1.FileName) {
                await mkdirrec(fspath.dirname(taskName.path));
                await fsp.writeFile(taskName.path, data);
                const mtime = await fsp.stat(taskName.path).then(stats => stats.mtime, () => null);
                if (mtime) {
                    await Helpers.setMtime(task, mtime, this);
                }
            }
            else {
                throw new Error(`unable to persist task contents for ${taskName}: not a file`);
            }
        }
        return task.updateState({
            ...task.state,
            contents: data
        });
    }
}
exports.DefaultContext = DefaultContext;
class Runner {
    static from(executors, storage) {
        return new DefaultRunner(executors, storage);
    }
    async execute(name, basePath) {
        const base = basePath || process.cwd();
        let taskName;
        if ('string' === typeof name) {
            if (name.includes(fspath.sep)) {
                taskName = new task_1.FileName(name, base);
            }
            else {
                taskName = new task_1.LogicalName(name);
            }
        }
        else {
            taskName = name;
        }
        const context = this.createContext(base);
        context.resetCounters();
        return await context.execute(new task_1.Task(taskName));
    }
    watch(name, basePath, watchPath) {
        const base = basePath || process.cwd();
        let taskName;
        if ('string' === typeof name) {
            if (name.includes(fspath.sep)) {
                taskName = new task_1.FileName(name, base);
            }
            else {
                taskName = new task_1.LogicalName(name);
            }
        }
        else {
            taskName = name;
        }
        const context = this.createContext(base);
        let wpath = watchPath || context.basePath;
        if (!fspath.isAbsolute(wpath)) {
            wpath = fspath.normalize(fspath.join(context.basePath, wpath));
        }
        console.log(`watching ${wpath}`);
        const watch = nodeWatch(wpath, {
            persistent: true,
            recursive: true
        }, (_, filename) => {
            console.log(`${filename} changed`);
            context.resetCounters();
            return context.execute(new task_1.Task(taskName));
        });
        return new Promise((resolve, reject) => {
            watch.on('error', (_, err) => reject(err));
            watch.on('close', () => resolve());
        });
    }
}
exports.Runner = Runner;
class DefaultRunner extends Runner {
    constructor(executors, storage) {
        super();
        this.executors = executors;
        this.storage = storage || new storage_1.MemoryStorage();
    }
    createContext(basePath) {
        return new DefaultContext(basePath, this.executors, this.storage);
    }
}
exports.DefaultRunner = DefaultRunner;
const keyMtime = Symbol('mtime');
class Helpers {
    static async getMtime(task, context) {
        const value = task.state && task.state[keyMtime];
        if (value instanceof Date) {
            return value;
        }
        const name = task.name;
        if (name instanceof task_1.FileName) {
            const mtime = await fsp.stat(name.path).then(stats => stats.mtime, () => null);
            if (mtime) {
                return mtime;
            }
            if (context) {
                const mtime = await context.storage.getObject(`!mtime!${name.path}`);
                if (mtime) {
                    return mtime;
                }
            }
        }
        return null;
    }
    static setMtime(task, mtime, context) {
        const res = task.updateState({
            ...task.state,
            [keyMtime]: mtime
        });
        const name = task.name;
        if (context) {
            if (name instanceof task_1.FileName) {
                return context.storage.setObject(`!mtime!${name.path}`, mtime)
                    .then(() => res);
            }
            return Promise.resolve(res);
        }
        return res;
    }
}
exports.Helpers = Helpers;
function task(name, action) {
    return (task, context) => {
        if (task.name instanceof task_1.LogicalName && task.name.name === name) {
            return action(task, context);
        }
    };
}
exports.task = task;
function subtask(name, action) {
    return task(name, async (_, context) => {
        const tasks = await action(context);
        if (tasks instanceof task_1.Task) {
            await context.execute(tasks);
        }
        else {
            await Promise.all(tasks.map(task => context.execute(task)));
        }
    });
}
exports.subtask = subtask;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY2hhaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLHlDQUF5QztBQTRQdkMsOEJBQVM7QUEzUFgscURBQW9IO0FBMFBsSCx1QkExUE8sNkJBQVksQ0EwUFA7QUFBRSw4QkExUE8sb0NBQW1CLENBMFBQO0FBelBuQyxpQ0FBNkY7QUF3UDNGLGVBeFBPLFdBQUksQ0F3UFA7QUFBWSxtQkF4UE8sZUFBUSxDQXdQUDtBQUFFLHNCQXhQTyxrQkFBVyxDQXdQUDtBQUFxQixvQkF4UE8sZ0JBQVMsQ0F3UFA7QUF2UHJFLHVDQUFtRDtBQUNuRCxpQ0FBaUM7QUFDakMsc0NBQXNDO0FBQ3RDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFzUG5DLDBCQUFPO0FBclBULGlDQUFpQztBQXNQL0Isc0JBQUs7QUFwUFAsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQXdCLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4SixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBd0J4QixNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBMkIsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFFN0gsTUFBYSxjQUFj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