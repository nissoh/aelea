"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stylePseudo = exports.style = exports.StyleRule = void 0;
const core_1 = require("@most/core");
const prelude_1 = require("@most/prelude");
function useStyleRule(pseudoClass, styles) {
    const properties = styleObjectAsString(styles);
    const cachedRule = StyleRule.cache.get(pseudoClass + properties);
    if (cachedRule) {
        cachedRule.activeUsages++;
        return cachedRule.id;
    }
    const newRule = new StyleRule();
    StyleRule.cache.set(pseudoClass + properties, newRule);
    StyleRule.stylesheet.insertRule(`${newRule.selector + pseudoClass} {${properties}}`, newRule.index);
    return newRule.id;
}
class StyleRule {
    constructor() {
        this.index = StyleRule.stylesheet.cssRules.length;
        this.id = StyleRule.namespace + this.index;
        this.selector = `.${this.id}`;
        this.activeUsages = 1;
    }
}
exports.StyleRule = StyleRule;
StyleRule.stylesheet = new CSSStyleSheet();
StyleRule.cache = new Map();
StyleRule.namespace = '•';
class StyleInlineSource {
    constructor(pseudo, styleInput, source) {
        this.pseudo = pseudo;
        this.styleInput = styleInput;
        this.source = source;
    }
    run(sink, scheduler) {
        const cssClass = useStyleRule(this.pseudo, this.styleInput);
        const disp = core_1.map(node => {
            node.element.classList.add(cssClass);
            return {
                ...node,
                style: [...node.style]
            };
        }, this.source)
            .run(sink, scheduler);
        return disp;
    }
}
class StyleSource {
    constructor(pseudo, styleInput, source) {
        this.pseudo = pseudo;
        this.styleInput = styleInput;
        this.source = source;
    }
    run(sink, scheduler) {
        const applyStyleEffects = core_1.map(node => {
            let latestClass;
            const ss = core_1.loop((previousCssRule, styleObject) => {
                if (previousCssRule) {
                    if (styleObject === null) {
                        node.element.classList.remove(previousCssRule);
                        return { seed: null, value: '' };
                    }
                    else {
                        const cashedCssClas = useStyleRule(this.pseudo, styleObject);
                        if (previousCssRule !== cashedCssClas) {
                            node.element.classList.replace(latestClass, cashedCssClas);
                            latestClass = cashedCssClas;
                            return { seed: cashedCssClas, value: cashedCssClas };
                        }
                    }
                }
                if (styleObject) {
                    const cashedCssClas = useStyleRule(this.pseudo, styleObject);
                    node.element.classList.add(cashedCssClas);
                    latestClass = cashedCssClas;
                    return { seed: cashedCssClas, value: cashedCssClas };
                }
                return { seed: previousCssRule, value: '' };
            }, null, this.styleInput);
            return {
                ...node,
                style: [...node.style, ss]
            };
        }, this.source)
            .run(sink, scheduler);
        return applyStyleEffects;
    }
}
function styleObjectAsString(styleObj) {
    return Object.entries(styleObj)
        .map(([key, val]) => {
        const kebabCaseKey = key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
        return `${kebabCaseKey}:${val};`;
    })
        .join("");
}
// Todo sed
function styleFn(styleInput, source, pseudoClass = '') {
    if (!('run' in styleInput)) {
        if (source instanceof StyleInlineSource && source.pseudo === pseudoClass) {
            return new StyleInlineSource(pseudoClass, { ...source.styleInput, ...styleInput }, source.source);
        }
        else {
            return new StyleInlineSource(pseudoClass, styleInput, source);
        }
    }
    return new StyleSource(pseudoClass, styleInput, source);
}
function stylePseudoFn(pseudoClass, styleInput, source) {
    return styleFn(styleInput, source, pseudoClass);
}
// applyStyle
exports.style = prelude_1.curry2(styleFn);
exports.stylePseudo = prelude_1.curry3(stylePseudoFn);
//# sourceMappingURL=style.js.map