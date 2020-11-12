"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAt = void 0;
const core_1 = require("@most/core");
const style_1 = require("./combinators/style");
const node_1 = require("./source/node");
function runAt(rootNode, scheduler) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, style_1.StyleRule.stylesheet];
    const effectsSink = {
        event() { },
        error(_, err) {
            // tslint:disable-next-line: no-console
            console.error(err);
        },
        end() { }
    };
    return core_1.chain(root => node_1.createNodeContainer(root, style_1.StyleRule.stylesheet), rootNode)
        .run(effectsSink, scheduler);
}
exports.runAt = runAt;
//# sourceMappingURL=run.js.map