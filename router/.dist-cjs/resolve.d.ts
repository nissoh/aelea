import { Fragment, PathEvent, Path } from './types';
export declare const isMatched: (frag: Fragment, path: Path) => boolean;
export declare const match: (frag: Fragment) => (s: import("@most/types").Stream<PathEvent>) => import("@most/types").Stream<PathEvent>;
export declare const modelPath: (frag: Fragment) => (s: import("@most/types").Stream<PathEvent>) => import("@most/types").Stream<PathEvent>;
export declare const skipRepeatedPath: (s: import("@most/types").Stream<PathEvent>) => import("@most/types").Stream<PathEvent>;
//# sourceMappingURL=resolve.d.ts.map