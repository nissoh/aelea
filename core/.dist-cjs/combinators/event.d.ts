import { Stream } from '@most/types';
import { NodeType, $ChildNode } from '../types';
declare type PickEvent<A, B> = A extends keyof B ? B[A] : Event;
declare type ElementEventList = DocumentEventMap & SVGElementEventMap & HTMLElementEventMap & WindowEventMap;
declare type ElementEventNameList = keyof ElementEventList;
declare type GuessByName<A extends ElementEventNameList> = ElementEventList[A];
declare type ElementEventTypeMap<A extends ElementEventNameList, B> = B extends Window ? PickEvent<A, WindowEventMap> : B extends HTMLElement ? PickEvent<A, DocumentEventMap> : B extends SVGAElement ? PickEvent<A, SVGElementEventMap> : GuessByName<A>;
export declare function eventElementTarget<A extends ElementEventNameList, B extends EventTarget>(eventType: A, node: B, options?: boolean | AddEventListenerOptions): Stream<ElementEventTypeMap<A, B>>;
export interface NodeEvent {
    <A extends ElementEventNameList, B extends NodeType>(eventType: A, node: $ChildNode<B>): Stream<ElementEventTypeMap<A, B>>;
    <A extends ElementEventNameList, B extends NodeType>(eventType: A): (node: $ChildNode<B>) => Stream<ElementEventTypeMap<A, B>>;
}
export declare const event: NodeEvent;
export {};
//# sourceMappingURL=event.d.ts.map