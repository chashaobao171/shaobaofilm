const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DEPLOY = path.join(ROOT, '_deploy');

if (fs.existsSync(DEPLOY)) {
  fs.rmSync(DEPLOY, { recursive: true, force: true });
}
fs.mkdirSync(path.join(DEPLOY, 'posters'), { recursive: true });

// 1. html -> index.html
fs.copyFileSync(path.join(ROOT, '电影类型全图谱.html'), path.join(DEPLOY, 'index.html'));

// 2. data
fs.copyFileSync(path.join(ROOT, 'films-data.js'), path.join(DEPLOY, 'films-data.js'));

// 3. referenced posters only
const c = fs.readFileSync(path.join(ROOT, 'films-data.js'), 'utf8');
const refs = [...new Set((c.match(/"p":"([^"]+)"/g) || []).map(x => x.match(/"p":"([^"]+)"/)[1]))];
let copied = 0, missing = 0;
refs.forEach(p => {
  const src = path.join(ROOT, p);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DEPLOY, p));
    copied++;
  } else {
    missing++;
  }
});

let total = 0;
const walk = d => fs.readdirSync(d).forEach(f => {
  const fp = path.join(d, f);
  if (fs.statSync(fp).isDirectory()) walk(fp); else total += fs.statSync(fp).size;
});
walk(DEPLOY);

console.log('refs:', refs.length, 'copied:', copied, 'missing:', missing);
console.log('deploy size MB:', (total / 1024 / 1024).toFixed(1));
console.log('files:', 2 + copied);
