import { Behavior, $ChildNode, NodeType, Op } from '../types';
import { Stream } from '@most/types';
export declare type IComponentOutputBehaviors<T> = {
    [P in keyof T]: Stream<T[P]>;
};
export declare type OutputBehaviors<A> = {
    [P in keyof A]?: Op<A[P], A[P]>;
};
export declare type ComponentFunction<A extends NodeType, B extends $ChildNode<A>, D> = (...args: Behavior<unknown, unknown>[]) => [B, IComponentOutputBehaviors<D>] | [B];
export declare function componentFn<A extends NodeType, B extends $ChildNode<A>, D>(inputComp: ComponentFunction<A, B, D>, projectBehaviors: OutputBehaviors<D>): $ChildNode<A>;
interface ComponentCurry {
    <A extends NodeType, B extends $ChildNode<A>, D>(inputComp: ComponentFunction<A, B, D>, projectBehaviors: OutputBehaviors<D>): B;
    <A extends NodeType, B extends $ChildNode<A>, D>(inputComp: ComponentFunction<A, B, D>): (projectBehaviors: OutputBehaviors<D>) => B;
}
export declare const component: ComponentCurry;
export {};
//# sourceMappingURL=component.d.ts.map