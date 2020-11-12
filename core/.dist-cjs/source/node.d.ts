import { Scheduler, Sink, Stream, Time } from '@most/types';
import { $ChildNode, $Node, NodeChild, NodeContainer, NodeContainerType, NodeType, Op } from '../types';
import { Pipe } from '../utils';
export interface NodeComposeFn<TChildren, A extends NodeContainerType = NodeContainerType, B = {}, C = {}> {
    <BB1, CC1>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1, C & CC1>;
    <BB1, CC1, BB2, CC2>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2, C & CC1 & CC2>;
    <BB1, CC1, BB2, CC2, BB3, CC3>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3, C & CC1 & CC2 & CC3>;
    <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o4: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4, C & CC1 & CC2 & CC3 & CC4>;
    <BB1, CC1, BB2, CC2, BB3, BB4, CC3, CC4, BB5, CC5>(o1: Op<NodeContainer<A, B>, NodeContainer<A, BB1>>, o2: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o3: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, o4: Op<NodeContainer<A, BB1>, NodeContainer<A, BB1>>, ...o5: Op<NodeContainer<A, unknown>, NodeContainer<A, BB1>>[]): NodeComposeFn<TChildren, A, B & BB1 & BB2 & BB3 & BB4 & BB5, C & CC1 & CC2 & CC3 & CC4 & CC5>;
    (...childrenSegment: TChildren[]): $Node<A>;
}
export declare class NodeRenderSink<T extends NodeContainerType> extends Pipe<NodeContainer<T>, NodeContainer<T>> {
    private node;
    private stylesheet;
    private scheduler;
    private csIndex;
    disposable: import("@most/types").Disposable;
    childrenSegmentSink: NodeRenderSink<T>[];
    effectsDisposable: import("@most/types").Disposable;
    constructor(node: NodeContainer, stylesheet: CSSStyleSheet, scheduler: Scheduler, csIndex: number, sink: Sink<NodeContainer<T>>);
    event(time: Time, child: NodeContainer<T>): void;
    end(t: Time): void;
    error(t: Time, err: Error): void;
    dispose(): void;
}
export declare const createNodeSource: <A extends NodeType, B extends NodeChild<A>>(source: Stream<B>) => $ChildNode<A>;
export declare function createNodeContainer(parent: NodeContainer<NodeContainerType>, stylesheet: CSSStyleSheet): {
    run(sink: Sink<NodeContainer<HTMLElement>>, scheduler: Scheduler): NodeRenderSink<HTMLElement>;
};
export declare const create: <A, B extends NodeContainerType>(sourceOp: Op<A, B>, postOp?: Op<NodeContainer<B, {}>, NodeContainer<B, {}>>) => (sourceOpValue: A) => NodeComposeFn<$ChildNode<NodeType>, B, {}, {}>;
export declare const $textFn: <A extends HTMLElement>(postOp?: Op<NodeContainer<A, {}>, NodeContainer<A, {}>>) => NodeComposeFn<string | Stream<string>, A, {}, {}>;
export declare const $svg: <K extends "symbol" | "a" | "script" | "style" | "title" | "circle" | "clipPath" | "defs" | "desc" | "ellipse" | "feBlend" | "feColorMatrix" | "feComponentTransfer" | "feComposite" | "feConvolveMatrix" | "feDiffuseLighting" | "feDisplacementMap" | "feDistantLight" | "feFlood" | "feFuncA" | "feFuncB" | "feFuncG" | "feFuncR" | "feGaussianBlur" | "feImage" | "feMerge" | "feMergeNode" | "feMorphology" | "feOffset" | "fePointLight" | "feSpecularLighting" | "feSpotLight" | "feTile" | "feTurbulence" | "filter" | "foreignObject" | "g" | "image" | "line" | "linearGradient" | "marker" | "mask" | "metadata" | "path" | "pattern" | "polygon" | "polyline" | "radialGradient" | "rect" | "stop" | "svg" | "switch" | "text" | "textPath" | "tspan" | "use" | "view">(sourceOpValue: K) => NodeComposeFn<$ChildNode<NodeType>, SVGElementTagNameMap[K], {}, {}>;
export declare const $element: <K extends "object" | "link" | "small" | "sub" | "sup" | "track" | "progress" | "a" | "abbr" | "address" | "applet" | "area" | "article" | "aside" | "audio" | "b" | "base" | "basefont" | "bdi" | "bdo" | "blockquote" | "body" | "br" | "button" | "canvas" | "caption" | "cite" | "code" | "col" | "colgroup" | "data" | "datalist" | "dd" | "del" | "details" | "dfn" | "dialog" | "dir" | "div" | "dl" | "dt" | "em" | "embed" | "fieldset" | "figcaption" | "figure" | "font" | "footer" | "form" | "frame" | "frameset" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "head" | "header" | "hgroup" | "hr" | "html" | "i" | "iframe" | "img" | "input" | "ins" | "kbd" | "label" | "legend" | "li" | "main" | "map" | "mark" | "marquee" | "menu" | "meta" | "meter" | "nav" | "noscript" | "ol" | "optgroup" | "option" | "output" | "p" | "param" | "picture" | "pre" | "q" | "rp" | "rt" | "ruby" | "s" | "samp" | "script" | "section" | "select" | "slot" | "source" | "span" | "strong" | "style" | "summary" | "table" | "tbody" | "td" | "template" | "textarea" | "tfoot" | "th" | "thead" | "time" | "title" | "tr" | "u" | "ul" | "var" | "video" | "wbr">(sourceOpValue: K) => NodeComposeFn<$ChildNode<NodeType>, HTMLElementTagNameMap[K], {}, {}>;
export declare const $custom: (sourceOpValue: string) => NodeComposeFn<$ChildNode<NodeType>, HTMLElement, {}, {}>;
export declare const $node: NodeComposeFn<$ChildNode<NodeType>, HTMLElement, {}, {}>;
export declare const $text: NodeComposeFn<string | Stream<string>, HTMLElement, {}, {}>;
export declare const $wrapNativeElement: <A extends NodeContainerType>(sourceOpValue: A) => NodeComposeFn<$ChildNode<NodeType>, A, {}, {}>;
//# sourceMappingURL=node.d.ts.map