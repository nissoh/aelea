"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attr = exports.applyAttrFn = void 0;
const prelude_1 = require("@most/prelude");
const core_1 = require("@most/core");
const utils_1 = require("../utils");
function applyAttrFn(attrs, node) {
    if (attrs) {
        Object.entries(attrs).forEach(([attrKey, value]) => {
            if (value) {
                node.setAttribute(attrKey, String(value));
            }
            else {
                node.removeAttribute(attrKey);
            }
        });
    }
    return node;
}
exports.applyAttrFn = applyAttrFn;
class AttributeSource {
    constructor(attrs, source) {
        this.attrs = attrs;
        this.source = source;
    }
    run(sink, scheduler) {
        const attrsStream = utils_1.isStream(this.attrs) ? this.attrs : core_1.now(this.attrs);
        return core_1.map(ns => ({ ...ns, attributes: [...ns.attributes, attrsStream] }), this.source).run(sink, scheduler);
    }
}
exports.attr = prelude_1.curry2((attrsInput, source) => {
    if (utils_1.isStream(attrsInput)) {
        return new AttributeSource(attrsInput, source);
    }
    if (source instanceof AttributeSource) {
        return new AttributeSource({ ...source.attrs, ...attrsInput }, source.source);
    }
    return new AttributeSource(attrsInput, source);
});
//# sourceMappingURL=attribute.js.map