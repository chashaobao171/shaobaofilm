// _list_all_genres.js — 列出 films-data.js 中全部 genre 及精确数量
const fs = require('fs');
const raw = fs.readFileSync('films-data.js', 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
const CINE = eval('(' + m[1] + ')');
const GEN = {};
CINE.films.forEach(f => (f.g || []).forEach(g => GEN[g] = (GEN[g] || 0) + 1));
const sorted = Object.entries(GEN).sort((a, b) => b[1] - a[1]);
console.log('全部 genre 数量:', sorted.length, '\n');
sorted.forEach(([g, c], i) => console.log(String(i + 1).padStart(3), g.padEnd(14), c));