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
            const mtime = await fsp.stat(name.path).then(stat => stat.mtime);
            // ...try get cached contents
            if (this.contentCache[name.path] && this.contentCache[name.path].mtime >= mtime) {
                return encoding ? this.contentCache[name.path].data.toString(encoding) : this.contentCache[name.path];
            }
            // ...or load and store file contents
            const contents = await fsp.readFile(name.path);
            this.contentCache[name.path] = { mtime, data: contents };
            return encoding ? contents.toString(encoding) : contents;
        }
        const taskContents = task.state.contents;
        if (taskContents instanceof Buffer) {
            return encoding ? taskContents.toString(encoding) : taskContents;
        }
        // fail of task is not a file and has no stored contents
        throw new Error(`unable to get contents for ${task.name}`);
    }
    async saveContents(task, data, persist) {
        const taskName = task.name;
        let key;
        let mtime;
        if (taskName instanceof task_1.FileName) {
            // const key = taskName instanceof FileName ? taskName.path : taskName.name;
            key = taskName.path;
            if (persist) {
                await mkdirrec(fspath.dirname(taskName.path));
                await fsp.writeFile(taskName.path, data);
                const mtime0 = await fsp.stat(taskName.path).then(stats => stats.mtime, () => null);
                if (mtime0) {
                    mtime = mtime0;
                    await Helpers.setMtime(task, mtime0, this);
                }
                else {
                    mtime = new Date();
                }
            }
            else {
                mtime = new Date();
            }
        }
        else {
            key = taskName.name;
            mtime = new Date();
        }
        this.contentCache[key] = { mtime, data };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvY2hhaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLHlDQUF5QztBQW1RdkMsOEJBQVM7QUFsUVgscURBQW9IO0FBaVFsSCx1QkFqUU8sNkJBQVksQ0FpUVA7QUFBRSw4QkFqUU8sb0NBQW1CLENBaVFQO0FBaFFuQyxpQ0FBNkY7QUErUDNGLGVBL1BPLFdBQUksQ0ErUFA7QUFBWSxtQkEvUE8sZUFBUSxDQStQUDtBQUFFLHNCQS9QTyxrQkFBVyxDQStQUDtBQUFxQixvQkEvUE8sZ0JBQVMsQ0ErUFA7QUE5UHJFLHVDQUFtRDtBQUNuRCxpQ0FBaUM7QUFDakMsc0NBQXNDO0FBQ3RDLHdDQUF3QztBQUN4QyxxQ0FBcUM7QUE2UG5DLDBCQUFPO0FBNVBULGlDQUFpQztBQTZQL0Isc0JBQUs7QUEzUFAsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQXdCLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4SixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBd0J4QixNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBMkIsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFFN0gsTUFBYSxjQUFj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