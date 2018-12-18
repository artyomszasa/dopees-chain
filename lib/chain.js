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
        // check if task has stored contents
        const taskContents = task.state.contents;
        if (taskContents instanceof Buffer) {
            return encoding ? taskContents.toString(encoding) : taskContents;
        }
        const name = task.name;
        if (name instanceof task_1.FileName) {
            // if task represents a file...
            // ...try get cached contents
            if (this.contentCache[name.path]) {
                return encoding ? this.contentCache[name.path].toString(encoding) : this.contentCache[name.path];
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY2hhaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLHlDQUF5QztBQTJQdkMsOEJBQVM7QUExUFgscURBQW9IO0FBeVBsSCx1QkF6UE8sNkJBQVksQ0F5UFA7QUFBRSw4QkF6UE8sb0NBQW1CLENBeVBQO0FBeFBuQyxpQ0FBNkY7QUF1UDNGLGVBdlBPLFdBQUksQ0F1UFA7QUFBWSxtQkF2UE8sZUFBUSxDQXVQUDtBQUFFLHNCQXZQTyxrQkFBVyxDQXVQUDtBQUFxQixvQkF2UE8sZ0JBQVMsQ0F1UFA7QUF0UHJFLHVDQUFtRDtBQUNuRCxpQ0FBaUM7QUFDakMsc0NBQXNDO0FBQ3RDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUFxUG5DLDBCQUFPO0FBcFBULGlDQUFpQztBQXFQL0Isc0JBQUs7QUFuUFAsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQXdCLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4SixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBd0J4QixNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBMkIsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFFN0gsTUFBYSxjQUFj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