(()=>{"use strict";const e={name:"light",pallete:{primary:"#f00",message:"#000000",description:"#616058",background:"#e8dab4",horizon:"#ded7cb",middleground:"#fff5de",foreground:"#80600d",positive:"#6bc36b",negative:"#e07070",indeterminate:"#c5bd61"}},a={name:"dark",pallete:{primary:"#ea607e",message:"#ffffff",description:"#a5b6bd",background:"#2b3437",horizon:"#89989e",middleground:"#3b464a",foreground:"#a5b6bd",positive:"#a6f5a6",negative:"#ff9393",indeterminate:"#dccb07"}},d="!!THEME_PALLETE_SELECTED_KEY";if(null===localStorage.getItem(d)){const i=[a,e][(null===self||void 0===self?void 0:self.matchMedia("(prefers-color-scheme: dark)").matches)?0:1];localStorage.setItem(d,JSON.stringify(i))}})();
//# sourceMappingURL=theme.js.map