"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$wrapNativeElement = exports.$text = exports.$node = exports.$custom = exports.$element = exports.$svg = exports.$textFn = exports.create = exports.createNodeContainer = exports.createNodeSource = exports.NodeRenderSink = void 0;
const core_1 = require("@most/core");
const disposable_1 = require("@most/disposable");
const prelude_1 = require("@most/prelude");
const attribute_1 = require("../combinators/attribute");
const utils_1 = require("../utils");
function appendToSlot(parent, child, insertAt) {
    if (insertAt === 0) {
        parent.element.prepend(child.element);
        return;
    }
    parent.element.insertBefore(child.element, parent.element.children[insertAt]);
}
class NodeSource {
    constructor(source) {
        this.source = source;
    }
    run(sink, scheduler) {
        const nodeSink = new NodeSourceSink(sink);
        const disposable = this.source.run(nodeSink, scheduler);
        return {
            dispose() {
                disposable_1.disposeBoth(disposable, nodeSink).dispose();
            }
        };
    }
}
class NodeSourceSink extends utils_1.Pipe {
    constructor() {
        super(...arguments);
        this.disposable = disposable_1.disposeNone();
    }
    event(t, node) {
        this.disposable = disposable_1.disposeWith(n => n.remove(), node.element);
        this.sink.event(t, node);
    }
    end(t) {
        this.sink.end(t);
    }
    dispose() {
        this.disposable.dispose();
    }
}
class NodeRenderSink extends utils_1.Pipe {
    constructor(node, stylesheet, scheduler, csIndex, sink) {
        super(sink);
        this.node = node;
        this.stylesheet = stylesheet;
        this.scheduler = scheduler;
        this.csIndex = csIndex;
        this.disposable = disposable_1.disposeNone();
        this.childrenSegmentSink = [];
        this.effectsDisposable = disposable_1.disposeNone();
    }
    event(time, child) {
        this.disposable = disposable_1.disposeWith(n => n.remove(), child.element);
        let insertAt = 0; // node.slot // asc order
        for (let i = 0; i < this.csIndex; i++) {
            insertAt = insertAt + this.node.segmentsChildrenCount[i];
        }
        appendToSlot(this.node, child, insertAt);
        this.node.segmentsChildrenCount[this.csIndex]++;
        if (child.childrenSegment) {
            this.childrenSegmentSink = child.childrenSegment.map(($child, csIndex) => {
                const csink = new NodeRenderSink(child, this.stylesheet, this.scheduler, csIndex, this.sink);
                const disp = $child.run(csink, this.scheduler);
                csink.disposable = disp;
                return csink;
            });
            this.effectsDisposable = core_1.mergeArray([
                ...child.style,
                ...child.attributes.map(s => core_1.map(attrs => attribute_1.applyAttrFn(attrs, child.element), s)),
            ])
                .run(utils_1.nullSink, this.scheduler);
        }
        this.sink.event(time, child);
    }
    end(t) {
        this.childrenSegmentSink.forEach(s => {
            s.end(t);
        });
        this.sink.end(t);
        this.dispose();
    }
    error(t, err) {
        this.sink.error(t, err);
    }
    dispose() {
        this.node.segmentsChildrenCount[this.csIndex]--;
        this.effectsDisposable.dispose();
        this.disposable.dispose();
    }
}
exports.NodeRenderSink = NodeRenderSink;
exports.createNodeSource = (source) => new NodeSource(source);
function createNodeContainer(parent, stylesheet) {
    return {
        run(sink, scheduler) {
            const nodeSink = new NodeRenderSink(parent, stylesheet, scheduler, 0, sink);
            nodeSink.disposable = core_1.mergeArray(parent.childrenSegment).run(nodeSink, scheduler);
            return nodeSink;
        }
    };
}
exports.createNodeContainer = createNodeContainer;
const createTextNodeSource = prelude_1.curry2((slot, text) => exports.createNodeSource(utils_1.xForver({ element: document.createTextNode(text) })));
exports.create = (sourceOp, postOp = prelude_1.id) => (sourceOpValue) => {
    return function nodeComposeFn(...input) {
        if (input.some(utils_1.isFunction)) {
            // @ts-ignore
            const inputFinalOp = utils_1.O(...input);
            return exports.create(sourceOp, prelude_1.compose(inputFinalOp, postOp))(sourceOpValue);
        }
        const childrenSegment = input.length ? input : [core_1.never()];
        const segmentsChildrenCount = Array(childrenSegment.length).fill(0);
        const createNodeOp = utils_1.O(sourceOp, core_1.map(element => {
            return {
                element,
                childrenSegment,
                segmentsChildrenCount,
                slot: 0,
                style: [],
                disposable: disposable_1.disposeNone(),
                attributes: []
            };
        }));
        return postOp(exports.createNodeSource(createNodeOp(utils_1.xForver(sourceOpValue))));
    };
};
exports.$textFn = (postOp = utils_1.O(x => x)) => {
    return function textComp(...input) {
        if (input.some(utils_1.isFunction)) {
            // @ts-ignore
            const inputFinalOp = utils_1.O(...input);
            return exports.$textFn(prelude_1.compose(inputFinalOp, postOp));
        }
        const children = input.map((x, slot) => {
            const strStream = typeof x === 'string' ? core_1.now(x) : x;
            return core_1.switchLatest(core_1.map(createTextNodeSource(slot), strStream));
        });
        return exports.create(core_1.map(() => document.createElement('text')), postOp)(null)(...children);
    };
};
exports.$svg = exports.create(core_1.map((a) => document.createElementNS('http://www.w3.org/2000/svg', a)));
exports.$element = exports.create(core_1.map((a) => document.createElement(a)));
exports.$custom = exports.create(core_1.map((a) => document.createElement(a)));
exports.$node = exports.$custom('node');
exports.$text = exports.$textFn(prelude_1.id);
exports.$wrapNativeElement = exports.create(core_1.map((rootNode) => rootNode));
//# sourceMappingURL=node.js.map