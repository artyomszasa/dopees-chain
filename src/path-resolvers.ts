import * as fspath from 'path';

export type PathResolver = (path: string, base?: string) => string|null;

export interface PathResolverConfig {
  sourceRoot: string;
  targetRoot: string;
  commonRoot?: string;
  sourceExt: string;
  targetExt: string;
}

export interface ReversePathResolverConfig {
  sourceResolver?: PathResolver;
  sourceRoot?: string;
  targetRoot?: string;
  commonRoot?: string;
  sourceExt?: string;
  targetExt?: string;
}

export namespace PathResolver {
  /**
   * Determines whether the given path is subpath of the goven ancestor.
   * @param path path to check.
   * @param ancestor ancestor path.
   * @param subfolders whether to accept subfolders of the ancestor path.
   */
  export function match(path: string, ancestor: string, subfolders?: boolean) {
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

  export function from(config: PathResolverConfig): PathResolver {
    return (path: string, base?: string) => {
      if (!path || !path.endsWith(config.sourceExt)) {
        return null;
      }
      // normalize path...
      let absolutePath: string;
      if (fspath.isAbsolute(path)) {
        absolutePath = fspath.normalize(path);
      } else {
        if (base) {
          absolutePath = fspath.normalize(fspath.join(base, path));
        } else {
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
}

export namespace ReversePathResolver {
  export function from(config: ReversePathResolverConfig) {
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
}