import { $Node } from './types';
import { Scheduler } from '@most/types';
declare global {
    interface Document {
        adoptedStyleSheets: CSSStyleSheet[];
    }
}
export declare function runAt<T extends $Node>(rootNode: T, scheduler: Scheduler): import("@most/types").Disposable;
//# sourceMappingURL=run.d.ts.map