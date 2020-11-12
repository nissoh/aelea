import { Stream } from '@most/types';
import { $Node, NodeContainerType, StyleCSS } from '../types';
import * as CSS from 'csstype';
interface StyleCurry {
    <C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>, node: $Node<C, D>): $Node<C, D>;
    <C extends NodeContainerType, D>(styleInput: StyleCSS | Stream<StyleCSS | null>): (node: $Node<C, D>) => $Node<C, D>;
}
interface StylePseudoCurry {
    <C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>, node: $Node<C, D>): $Node<C, D>;
    <C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E, styleInput: StyleCSS | Stream<StyleCSS | null>): (node: $Node<C, D>) => $Node<C, D>;
    <C extends NodeContainerType, D, E extends string>(pseudoClass: CSS.Pseudos | E): (styleInput: StyleCSS | Stream<StyleCSS | null>) => (node: $Node<C, D>) => $Node<C, D>;
}
export declare class StyleRule {
    static stylesheet: CSSStyleSheet;
    static cache: Map<string, StyleRule>;
    static namespace: string;
    index: number;
    id: string;
    selector: string;
    activeUsages: number;
}
export declare const style: StyleCurry;
export declare const stylePseudo: StylePseudoCurry;
export {};
//# sourceMappingURL=style.d.ts.map