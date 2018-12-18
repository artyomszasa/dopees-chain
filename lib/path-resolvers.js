"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fspath = require("path");
var PathResolver;
(function (PathResolver) {
    /**
     * Determines whether the given path is subpath of the goven ancestor.
     * @param path path to check.
     * @param ancestor ancestor path.
     * @param subfolders whether to accept subfolders of the ancestor path.
     */
    function match(path, ancestor, subfolders) {
        if (!path) {
            throw new TypeError('path must be defined');
        }
        const sub = undefined === subfolders ? true : subfolders;
        const relative = fspath.normalize(fspath.relative(ancestor, path));
        if (!relative || relative.startsWith('..') || fspath.isAbsolute(relative)) {
            return false;
        }
        return sub || !relative.includes(fspath.sep);
    }
    PathResolver.match = match;
    function from(config) {
        return (path, base) => {
            if (!path || !path.endsWith(config.sourceExt)) {
                return null;
            }
            // normalize path...
            let absolutePath;
            if (fspath.isAbsolute(path)) {
                absolutePath = fspath.normalize(path);
            }
            else {
                if (base) {
                    absolutePath = fspath.normalize(fspath.join(base, path));
                }
                else {
                    absolutePath = fspath.normalize(fspath.join(config.sourceRoot, path));
                }
            }
            if (!fspath.isAbsolute(absolutePath) && config.commonRoot) {
                absolutePath = fspath.normalize(fspath.join(config.commonRoot, absolutePath));
            }
            // map to target
            const relative = fspath.relative(config.sourceRoot, absolutePath);
            if (!relative || relative.startsWith('..') || fspath.isAbsolute(relative)) {
                // not within the source root...
                return null;
            }
            let targetPath = fspath.normalize(fspath.join(config.targetRoot, relative));
            if (!fspath.isAbsolute(targetPath) && config.commonRoot) {
                targetPath = fspath.normalize(fspath.join(config.commonRoot, targetPath));
            }
            // change ext
            return targetPath.substr(0, targetPath.length - config.sourceExt.length) + config.targetExt;
        };
    }
    PathResolver.from = from;
})(PathResolver = exports.PathResolver || (exports.PathResolver = {}));
var ReversePathResolver;
(function (ReversePathResolver) {
    function from(config) {
        if (config.sourceResolver) {
            return config.sourceResolver;
        }
        if (!config.targetRoot) {
            throw new Error('either sourceResolver or targetRoot must be defined');
        }
        if (!config.sourceRoot) {
            throw new Error('either sourceResolver or sourceRoot must be defined');
        }
        if (!config.targetExt) {
            throw new Error('either sourceResolver or targetExt must be defined');
        }
        if (!config.sourceExt) {
            throw new Error('either sourceResolver or sourceExt must be defined');
        }
        return PathResolver.from({
            sourceRoot: config.targetRoot,
            targetRoot: config.sourceRoot,
            commonRoot: config.commonRoot,
            sourceExt: config.targetExt,
            targetExt: config.sourceExt
        });
    }
    ReversePathResolver.from = from;
})(ReversePathResolver = exports.ReversePathResolver || (exports.ReversePathResolver = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC1yZXNvbHZlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcGF0aC1yZXNvbHZlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwrQkFBK0I7QUFxQi9CLElBQWlCLFlBQVksQ0FvRDVCO0FBcERELFdBQWlCLFlBQVk7SUFDM0I7Ozs7O09BS0c7SUFDSCxTQUFnQixLQUFLLENBQUMsSUFBWSxFQUFFLFFBQWdCLEVBQUUsVUFBb0I7UUFDeEUsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sSUFBSSxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztTQUM3QztRQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN6RSxPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBVmUsa0JBQUssUUFVcEIsQ0FBQTtJQUVELFNBQWdCLElBQUksQ0FBQyxNQUEwQjtRQUM3QyxPQUFPLENBQUMsSUFBWSxFQUFFLElBQWEsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELG9CQUFvQjtZQUNwQixJQUFJ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