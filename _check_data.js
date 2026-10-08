const fs = require('fs');
const d = fs.readFileSync('films-data.js', 'utf8');

function extractJSON(d) {
  const s = d.indexOf('window.CINE');
  const start = d.indexOf('{', s);
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < d.length; i++) {
    const c = d[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return d.slice(start, i + 1); }
  }
  return null;
}

const j = JSON.parse(extractJSON(d));
console.log('meta =', JSON.stringify(j.meta));

const films = j.films || [];
console.log('films total =', films.length);
console.log('sample film keys =', JSON.stringify(Object.keys(films[0])));
console.log('sample film =', JSON.stringify(films[0]).slice(0, 600));

const genreCount = {};
let docCount = 0;
for (const f of films) {
  for (const g of (f.g || [])) genreCount[g] = (genreCount[g] || 0) + 1;
  if ((f.g || []).includes('纪录片')) docCount++;
}
console.log('纪录片 films =', docCount);
console.log('genres =', JSON.stringify(Object.keys(genreCount).sort()));

// 是否有奖项/其他顶层结构
console.log('top-level keys =', JSON.stringify(Object.keys(j)));

// 纪录片样例
const docs = films.filter(f => (f.g || []).includes('纪录片')).slice(0, 5);
console.log('纪录片样例 =', JSON.stringify(docs.map(f => f.t + '(' + f.y + ') r=' + f.r)));

// 检查冈仁波齐
const kp = films.filter(f => (f.t || '').includes('冈仁波齐'));
console.log('冈仁波齐 =', JSON.stringify(kp.map(f => f.t + '|' + f.y + '|p=' + (f.p ? 'yes' : 'no'))));

// 海报缺失统计
const noPoster = films.filter(f => !f.p);
console.log('无海报 =', noPoster.length);
// 海报文件存在性抽查
let missingFile = 0, checked = 0;
for (const f of films) {
  if (!f.p) continue;
  checked++;
  if (!fs.existsSync(f.p)) { missingFile++; if (missingFile <= 5) console.log('  文件缺失:', f.p, f.t); }
}
console.log('海报文件检查: checked=' + checked + ' missing=' + missingFile);
