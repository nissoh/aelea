import { Stream } from "@most/types";
export declare type Path = string;
export declare type Fragment = string | RegExp;
export declare type PathEvent = {
    fragments: Fragment[];
    target: Path[];
    remaining: Path[];
};
export declare type Route = {
    create: (newPath: Fragment) => Route;
    match: Stream<PathEvent>;
    miss: Stream<PathEvent>;
    fragments: Fragment[];
};
//# sourceMappingURL=types.d.ts.map