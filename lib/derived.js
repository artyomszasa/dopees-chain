"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chain_1 = require("./chain");
const fs = require("fs");
const fsp = fs.promises;
exports.implementation = Symbol('implementation');
class StructuredExecutor {
    createExecutor(options) {
        const state = this.init(options);
        const executor = async (task, context) => this.execute(state, task, context);
        executor[exports.implementation] = this;
        return executor;
    }
}
exports.StructuredExecutor = StructuredExecutor;
class FileMapper extends StructuredExecutor {
    createSourceTask(state, task, sourcePath, context) {
        return chain_1.Task.file(sourcePath, context.basePath);
    }
    postProcess(state, task, innerState, contents, context) {
        return contents;
    }
    process(state, task, sourceTask, innerState, context) {
        return innerState;
    }
    async execute(state, task, context) {
        const name = task.name;
        if (name instanceof chain_1.FileName) {
            if (state.selector(name.path, context)) {
                // ---------------------- resolve source ----------------------------
                const sourcePath = state.sourceResolver(name.path, name.basePath);
                if (!sourcePath) {
                    throw new Error(`unable to resolve source for ${name.path} (basePath = ${name.basePath || context.basePath})`);
                }
                // ---------------------- execute source ----------------------------
                // create source task
                let sourceTask = this.createSourceTask(state, task, sourcePath, context);
                context.log(this.name, task, `resolved source => ${sourceTask.name}`);
                // execute source, possibly triggering subdependencies....
                sourceTask = await context.execute(sourceTask);
                const sourceName = sourceTask.name;
                // ----------------------- check cached -----------------------------
                // check if file already exists...
                const mtime = await chain_1.Helpers.getMtime(task, context);
                // check if source if older (no direct mtime as some dependency of the source could have changed instead of
                // the source itself)...
                const sourceMtime = await chain_1.Helpers.getMtime(sourceTask, context);
                if (mtime) {
                    if (sourceMtime && sourceMtime <= mtime) {
                        // no need to recompile, contents will be loaded on demand
                        context.log(this.name, task, 'up to date');
                        return;
                    }
                }
                // -------------------- popuate inner state -------------------------
                // handle inner state key not beeing set
                const innerStateKey = state.innerStateKey || `${this.name}.innerState`;
                let innerState;
                let cached;
                if (sourceMtime && (cached = await context.storage.getObject(`!${innerStateKey}!${sourceName.path}`)) && cached.mtime <= sourceMtime) {
                    context.log(this.name, task, `reusing cached state ${cached.mtime} <= ${sourceMtime}`);
                    innerState = cached.value;
                }
                else {
                    context.log(this.name, task, 'reading input...');
                    innerState = await this.readSource(state, sourceTask, context);
                    context.log(this.name, task, 'done reading input');
                    await context.storage.setObject(`!${innerStateKey}!${sourceName.path}`, { mtime: sourceMtime, value: innerState });
                }
                // -------------------- process inner state -------------------------
                innerState = await this.process(state, task, sourceTask, innerState, context);
                // --------------------- generate contents --------------------------
                context.log(this.name, task, 'generating output...');
                let contents = await this.generate(state, task, innerState, context);
                context.log(this.name, task, 'done generating');
                // ------------------- post-process contents ------------------------
                contents = await this.postProcess(state, task, innerState, contents, context);
                // -------------------- save final contents -------------------------
                context.log(this.name, task, 'saving...');
                const res = await context.saveContents(task, contents, true);
                context.log(this.name, task, 'done');
                // ---------------------------- done --------------------------------
                return res;
            }
        }
    }
}
exports.FileMapper = FileMapper;
class FileDependencyResolver extends StructuredExecutor {
    async execute(state, task, context) {
        const name = task.name;
        if (name instanceof chain_1.FileName) {
            if (state.selector(name.path, context)) {
                // --------------------- get actual mtime ---------------------------
                let mtime = await fsp.stat(name.path)
                    .then(stats => stats.mtime, err => {
                    throw new Error(`unable to stat file: ${err.message || err}`);
                });
                // ------------------- populate dependencies ------------------------
                let deps;
                let innerState;
                const dependenciesKey = state.dependenciesKey || `${this.name}.dependencies`;
                const entry = await context.storage.getObject(`!${dependenciesKey}!${name.path}`);
                if (entry && entry.mtime <= mtime) {
                    // dependencies did not change
                    context.log(this.name, task, 'using cached dependencies');
                    deps = entry.deps;
                    innerState = entry.innerState;
                }
                else {
                    // -------------------- popuate inner state -------------------------
                    // handle inner state key not beeing set
                    const innerStateKey = state.innerStateKey || `${this.name}.innerState`;
                    let cached;
                    if (mtime && (cached = await context.storage.getObject(`!${innerStateKey}!${name.path}`)) && cached.mtime <= mtime) {
                        context.log(this.name, task, 'reusing cached state');
                        innerState = cached.value;
                    }
                    else {
                        context.log(this.name, task, 'reading input...');
                        innerState = await this.readSource(state, task, context);
                        context.log(this.name, task, 'done reading input');
                        await context.storage.setObject(`!${innerStateKey}!${name.path}`, { mtime: mtime, value: innerState });
                    }
                    context.log(this.name, task, 'reading dependencies...');
                    deps = await this.readDependencies(state, task, innerState, context);
                    context.log(this.name, task, 'done reading dependencies');
                    await context.storage.setObject(`!${dependenciesKey}!${name.path}`, {
                        mtime,
                        deps,
                        innerState
                    });
                }
                // -------------------- process dependencies ------------------------
                if (deps.length) {
                    const depTasks = deps.map(dep => chain_1.Task.file(dep, context.basePath));
                    context.log(this.name, task, `processing dependencies => ${depTasks.map(t => name).join(',')}`);
                    const mtimes = [mtime];
                    await Promise.all(depTasks.map(async (t) => {
                        const depTask = await context.execute(t);
                        mtimes.push(await chain_1.Helpers.getMtime(depTask, context) || mtime);
                    }));
                    const mtimeMilliseconds = Math.max.apply(Math, mtimes.map(date => date.getTime()));
                    mtime = new Date();
                    mtime.setTime(mtimeMilliseconds);
                    context.log(this.name, task, 'done processing dependencies');
                }
                else {
                    context.log(this.name, task, 'no dependencies');
                }
                // ----------------------- update mtime -----------------------------
                const res = await chain_1.Helpers.setMtime(task, mtime, context);
                context.log(this.name, task, 'done');
                return res;
            }
        }
    }
}
exports.FileDependencyResolver = FileDependencyResolver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9kZXJpdmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBQXdGO0FBQ3hGLHlCQUF5QjtBQUV6QixNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBRVgsUUFBQSxjQUFjLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFFdkQsTUFBc0Isa0JBQWtCO0lBSXRDLGNBQWMsQ0FBQyxPQUFpQjtRQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sUUFBUSxHQUFhLEtBQUssRUFBRSxJQUFVLEVBQUUsT0FBZ0IsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hHLFFBQVMsQ0FBQyxzQkFBYyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQVZELGdEQVVDO0FBYUQsTUFBc0IsVUFBa0UsU0FBUSxrQkFBb0M7SUFDeEgsZ0JBQWdCLENBQUMsS0FBYSxFQUFFLElBQVUsRUFBRSxVQUFrQixFQUFFLE9BQWdCO1FBQ3hGLE9BQU8sWUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFHUyxXQUFXLENBQUMsS0FBYSxFQUFFLElBQVUsRUFBRSxVQUF1QixFQUFFLFFBQWdCLEVBQUUsT0FBZ0I7UUFDMUcsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUNTLE9BQU8sQ0FBQyxLQUFhLEVBQUUsSUFBVSxFQUFFLFVBQWdCLEVBQUUsVUFBdUIsRUFBRSxPQUFnQjtRQUN0RyxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0lBQ1MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxL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