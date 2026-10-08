/* 验证新功能渲染产物: 奖项跳转按钮/导演翻转卡/类型可点卡数量 */
const fs = require('fs'), vm = require('vm');
function mkEl(sel) {
  const el = {
    _sel: sel, innerHTML: '', textContent: '', value: '', hidden: false, dataset: {}, style: {},
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { f ? this._s.add(c) : this._s.delete(c); } }
    },
    setAttribute() { }, getAttribute() { return null; },
    addEventListener() { }, removeEventListener() { },
    appendChild() { }, closest() { return null; },
    querySelector() { return mkEl('q'); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0 }; }, scrollIntoView() { }, focus() { }
  };
  return el;
}
const store = {};
const doc = {
  querySelector(s) { return store[s] || (store[s] = mkEl(s)); },
  querySelectorAll() { return []; },
  addEventListener() { }, createElement() { return mkEl('c'); },
  body: { style: {}, innerHTML: '' }
};
const win = {
  CINE: null, scrollY: 0, addEventListener() { }, scrollTo() { },
  document: doc, setTimeout, console,
  matchMedia(q) { return { matches: /reduce/.test(q) }; },
  requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); }
};
const html = fs.readFileSync('电影类型全图谱.html', 'utf8');
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])[0];
const ctx = { window: win, document: doc, console, setTimeout, Math, JSON, Array, Object, String, Number, RegExp, Date, parseInt, parseFloat, isNaN };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('films-data.js', 'utf8'), ctx);
vm.runInContext(code, ctx);
const A = store['#awardsBox'].innerHTML, D = store['#dirsBox'].innerHTML, T = store['#taxBox'].innerHTML;
const c = (s, re) => (s.match(re) || []).length;
console.log('奖项跳转按钮 awf-go :', c(A, /awf-go/g));
console.log('导演翻转卡 dwf      :', c(D, /class="dwf"/g));
console.log('导演代表作行 dfrow  :', c(D, /class="dfrow"/g));
console.log('导演查看按钮 dlk    :', c(D, /class="dlk"/g));
console.log('导演海报正面 dgrad  :', c(D, /class="dgrad"/g), ' 无海报占位:', c(D, /class="dnoph"/g));
console.log('类型可点卡 tg pick  :', c(T, /tg pick/g), ' 总类型卡:', c(T, /class="tg/g));
