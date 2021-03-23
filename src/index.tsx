/**
 * Copyright (c) 2018-present, heineiuo.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactDOM from "react-dom";
import { JSDOM, DOMWindow } from "jsdom";
import { App } from "./App";

declare const global: NodeJS.Global & { window: DOMWindow; document: Document };

const dom = new JSDOM(`<div id="app"></div>`);
global.window = dom.window;
global.document = window.document;

ReactDOM.render(<App></App>, document.querySelector("#app"));
