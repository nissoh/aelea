import { NodeContainerType, IAttrProperties, $Node } from '../types';
import { Stream } from '@most/types';
interface Attr {
    <A, B, C extends NodeContainerType>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>, ns: $Node<C, B>): $Node<C, A & B>;
    <A, B, C extends NodeContainerType>(attrs: Stream<IAttrProperties<A> | null> | IAttrProperties<A>): (ns: $Node<C, B>) => $Node<C, A & B>;
}
export declare function applyAttrFn(attrs: IAttrProperties<unknown>, node: NodeContainerType): NodeContainerType;
export declare const attr: Attr;
export {};
//# sourceMappingURL=attribute.d.ts.map