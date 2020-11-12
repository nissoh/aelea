import { Stream } from '@most/types';
import { $Node, NodeContainerType } from '@aelea/core';
import { Route } from './types';
export declare const router: (pathChange: Stream<string>, options?: {
    splitUrlPattern: RegExp;
    rootFragment: string;
}) => Route;
export declare const path: <A extends NodeContainerType, B extends $Node<A, {}>>(route: Route) => (ns: B) => Stream<import("@aelea/core").NodeContainer<A, {}>>;
//# sourceMappingURL=resolveUrl.d.ts.map