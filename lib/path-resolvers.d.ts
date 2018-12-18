export declare type PathResolver = (path: string, base?: string) => string | null;
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
export declare namespace PathResolver {
    /**
     * Determines whether the given path is subpath of the goven ancestor.
     * @param path path to check.
     * @param ancestor ancestor path.
     * @param subfolders whether to accept subfolders of the ancestor path.
     */
    function match(path: string, ancestor: string, subfolders?: boolean): boolean;
    function from(config: PathResolverConfig): PathResolver;
}
export declare namespace ReversePathResolver {
    function from(config: ReversePathResolverConfig): PathResolver;
}
