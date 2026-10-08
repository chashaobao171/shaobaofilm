const fs = require('fs');
const d = fs.readFileSync('films-data.js', 'utf8');
const s = d.indexOf('window.CINE');
const eq = d.indexOf('{', s);
let depth = 0, inStr = false, esc = false, end = -1;
for (let i = eq; i < d.length; i++) {
  const c = d[i];
  if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
  if (c === '"') { inStr = true; continue; }
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (!depth) { end = i + 1; break; } }
}
const J = JSON.parse(d.slice(eq, end));
console.log('dirs sample:', JSON.stringify(J.dirs.slice(0, 3), null, 1));
console.log('dregion:', JSON.stringify(J.dregion));
console.log('tax组列表:', JSON.stringify(J.tax.map(g => g.k + '/' + g.t + '/' + g.items.length)));
console.log('tax A组前3:', JSON.stringify(J.tax[0].items.slice(0, 3)));
console.log('ranks sample:', JSON.stringify(J.ranks[0].items[0]));
