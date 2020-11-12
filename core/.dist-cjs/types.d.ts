import * as CSS from 'csstype';
import { Disposable, Stream } from '@most/types';
export declare type StyleCSS = CSS.Properties;
export declare type IAttrProperties<T> = {
    [P in keyof T]: T[P];
};
export declare type TextStream = Stream<Text>;
export declare type NodeType = Node & ChildNode;
export declare type NodeContainerType = HTMLElement | SVGElement;
export interface NodeChild<A extends NodeType = NodeType> {
    element: A;
    slot: number;
    disposable: Disposable;
}
export interface NodeContainer<A extends NodeContainerType = NodeContainerType, B = {}> extends NodeChild<A> {
    childrenSegment: $ChildNode[];
    segmentsChildrenCount: number[];
    style: Stream<string>[];
    attributes: Stream<IAttrProperties<B>>[];
}
export interface Sample<A, B> {
    (): Sampler<A>;
    (o1: Op<A, B>): Sampler<A>;
    <B1>(o1: Op<A, B1>, o2: Op<B1, B>): Sampler<A>;
    <B1, B2>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B>): Sampler<A>;
    <B1, B2, B3>(o1: Op<A, B1>, o2: Op<B1, B2>, o3: Op<B2, B3>, ...oos: Op<unknown, B>[]): Sampler<A>;
}
export declare type $Node<A extends NodeContainerType = NodeContainerType, B = {}> = Stream<NodeContainer<A, B>>;
export declare type $ChildNode<A extends NodeType = NodeType> = Stream<NodeChild<A>>;
export declare type Op<T, R> = (o: Stream<T>) => Stream<R>;
export declare type Sampler<A> = Op<A, A>;
export declare type Behavior<A, B> = [Sample<A, B>, Stream<B>];
export declare type StateBehavior<A, B> = [Sample<A, B>, Stream<B>];
//# sourceMappingURL=types.d.ts.map