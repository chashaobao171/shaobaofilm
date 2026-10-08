/* Minimal DOM stub to smoke-test the page script for runtime errors */
const fs = require('fs');
const vm = require('vm');

function mkEl(sel) {
  const el = {
    _sel: sel, innerHTML: '', textContent: '', value: '', hidden: false,
    dataset: {}, style: {},
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
    getBoundingClientRect() { return { top: 0 }; }, scrollIntoView() { },
    focus() { }
  };
  return el;
}

const store = {};
const doc = {
  querySelector(s) { return store[s] || (store[s] = mkEl(s)); },
  querySelectorAll() { return []; },
  addEventListener() { },
  createElement() { return mkEl('created'); },
  body: { style: {}, innerHTML: '' }
};
const win = {
  CINE: null, scrollY: 0, addEventListener() { }, scrollTo() { },
  document: doc, setTimeout, console,
  matchMedia(q) { return { matches: /reduce/.test(q) }; },
  requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); }
};

const html = fs.readFileSync('电影类型全图谱.html', 'utf8');
const rawCode = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])[0];
// inject a test hook before the IIFE closes so we can exercise the modal render
const code = rawCode.replace(/\}\)\(\);\s*$/, 'window.__T={openFilm:openFilm};\n})();');

const ctx = {
  window: win, document: doc, console,
  setTimeout, Math, JSON, Array, Object, String, Number, RegExp, Date, parseInt, parseFloat, isNaN
};
ctx.globalThis = ctx;
vm.createContext(ctx);

// load data
const dataCode = fs.readFileSync('films-data.js', 'utf8');
vm.runInContext(dataCode, ctx);

try {
  vm.runInContext(code, ctx);
  console.log('SCRIPT RAN OK');
} catch (e) {
  console.log('RUNTIME ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(1);
}

const grid = store['#filmGrid'];
const nav = store['#nav'];
const chips = store['#chips'];
const tax = store['#taxBox'];
console.log('nav len        ', nav.innerHTML.length);
console.log('chips len      ', chips.innerHTML.length);
console.log('filmGrid len   ', grid.innerHTML.length);
console.log('film cards     ', (grid.innerHTML.match(/class="fc"/g) || []).length);
console.log('taxBox len     ', tax.innerHTML.length);
console.log('heroBg len     ', store['#heroBg'].innerHTML.length);
console.log('hero images    ', (store['#heroBg'].innerHTML.match(/<img /g) || []).length);
console.log('awards len     ', store['#awardsBox'].innerHTML.length);
console.log('ranks len      ', store['#ranksBox'].innerHTML.length);
console.log('dirs len       ', store['#dirsBox'].innerHTML.length);
console.log('colls len      ', store['#collsBox'].innerHTML.length);
console.log('coll strips    ', (store['#collsBox'].innerHTML.match(/class="cstrip"/g) || []).length);
console.log('coll minis     ', (store['#collsBox'].innerHTML.match(/class="mc"/g) || []).length);
console.log('collCount      ', store['#collCount'].textContent);
console.log('sources len    ', store['#sourcesBox'].innerHTML.length);
console.log('source cards   ', (store['#sourcesBox'].innerHTML.match(/class="srccard"/g) || []).length);
console.log('nav has sources', /片源查找/.test(nav.innerHTML));
console.log('moreBtn label  ', JSON.stringify(store['#moreBtn'].textContent));
console.log('fcount         ', store['#fcount'].innerHTML.replace(/<[^>]+>/g, ''));
console.log('subnav len     ', store['#subnav'].innerHTML.length);
console.log('s1/s2/s3/s4    ', store['#s1'].textContent, store['#s2'].textContent, store['#s3'].textContent, store['#s4'].textContent);
console.log('heroMq len      ', store['#heroMq'].innerHTML.length);
console.log('mq items        ', (store['#heroMq'].innerHTML.match(/class="mq-item"/g) || []).length);
console.log('flip cards      ', (store['#awardsBox'].innerHTML.match(/class="awf"/g) || []).length);
console.log('rv marks        ', (store['#awardsBox'].innerHTML.match(/data-rv/g) || []).length + (store['#taxBox'].innerHTML.match(/data-rv/g) || []).length + (store['#ranksBox'].innerHTML.match(/data-rv/g) || []).length + (store['#dirsBox'].innerHTML.match(/data-rv/g) || []).length);
console.log('rv-kids marks   ', (store['#taxBox'].innerHTML.match(/rv-kids/g) || []).length + (store['#awardsBox'].innerHTML.match(/rv-kids/g) || []).length + (store['#ranksBox'].innerHTML.match(/rv-kids/g) || []).length + (store['#dirsBox'].innerHTML.match(/rv-kids/g) || []).length);
console.log('onload imgs     ', (grid.innerHTML.match(/onload=/g) || []).length + (store['#heroBg'].innerHTML.match(/onload=/g) || []).length);

if (ctx.window.__T) {
  ctx.window.__T.openFilm(0);
  const mb = store['#modBody'].innerHTML;
  console.log('modal len       ', mb.length);
  console.log('modal watch btn ', (mb.match(/class="mod-a mod-watch"/g) || []).length);
  console.log('modal src panel ', (mb.match(/class="mod-src"/g) || []).length);
  console.log('ikanbot link    ', (mb.match(/ikanbot\.com\/search\?q=/g) || []).length);
  console.log('vcsoso link     ', (mb.match(/vcsoso\.com\/s\//g) || []).length);
  console.log('chip hrefs      ', (mb.match(/https?:\/\/[^"]+/g) || []).slice(0, 5).join(' | '));
} else {
  console.log('modal check      skipped (hook not injected)');
}