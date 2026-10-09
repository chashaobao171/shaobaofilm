// _build_award_links.js
// 为缺失的展示奖项补齐 awardLinks（只保留库内命中影片）。
// 用法：
//   node tools/_build_award_links.js          仅校验并打印报告（不写文件）
//   node tools/_build_award_links.js --write  合并进 films-data.js 的 awardLinks
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'films-data.js'), 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
const CINE = eval('(' + m[1] + ')');
const films = CINE.films;

// 库内索引
const byKey = new Map();          // t|y → film
const byTitle = new Map();        // t → [films]
films.forEach(f => {
  byKey.set(f.t + '|' + String(f.y), f);
  if (!byTitle.has(f.t)) byTitle.set(f.t, []);
  byTitle.get(f.t).push(f);
});

// 候选获奖影片：奖项名 → [[片名, 年份], ...]（来自公开获奖名单）
const CANDIDATES = require(path.join(__dirname, '_award_candidates.js'));

function strictHit(t, y) { return byKey.get(t + '|' + String(y)) || null; }
function looseHit(t, y) {
  const s = strictHit(t, y); if (s) return {f: s, y: s.y, exact: true};
  const arr = byTitle.get(t); if (!arr) return null;
  let best = null;
  arr.forEach(f => {
    const d = Math.abs((+f.y || 0) - (+y || 0));
    if (d <= 1 && (!best || d < best.d)) best = {f, y: f.y, d, exact: false};
  });
  return best;
}

const report = {};
const merged = {};
let awardsWithHits = 0;
Object.entries(CANDIDATES).forEach(([award, list]) => {
  const hits = [];
  const miss = [];
  list.forEach(([t, y]) => {
    const h = looseHit(t, y);
    if (h) hits.push([h.f.t, String(h.f.y)]);
    else miss.push([t, y]);
  });
  // 去重
  const seen = new Set();
  const uniq = hits.filter(p => { const k = p[0] + '|' + p[1]; if (seen.has(k)) return false; seen.add(k); return true; });
  report[award] = {hit: uniq.length, miss};
  if (uniq.length) { merged[award] = uniq; awardsWithHits++; }
});

console.log('=== 候选奖项命中报告 ===');
Object.entries(report).sort((a, b) => b[1].hit - a[1].hit).forEach(([award, r]) => {
  console.log(`\n【${award}】命中 ${r.hit} 部` + (r.miss.length ? `（未命中 ${r.miss.length}）` : ''));
  if (merged[award]) console.log('   命中: ' + merged[award].map(p => p[0] + '(' + p[1] + ')').join('、'));
  if (r.miss.length) console.log('   未命中: ' + r.miss.map(p => p[0] + '(' + p[1] + ')').join('、'));
});
console.log(`\n合计：${Object.keys(CANDIDATES).length} 个候选奖项中，${awardsWithHits} 个有库内命中`);

if (process.argv.includes('--write')) {
  const newLinks = Object.assign({}, CINE.awardLinks);
  Object.entries(merged).forEach(([k, v]) => { newLinks[k] = v; });
  CINE.awardLinks = newLinks;

  // 安全替换 films-data.js 里的 awardLinks 对象
  const keyTok = '"awardLinks":{';
  const ki = raw.indexOf(keyTok);
  if (ki < 0) { console.error('未找到 awardLinks 块'); process.exit(1); }
  const start = raw.indexOf('{', ki + keyTok.length - 1);
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let j = start; j < raw.length; j++) {
    const ch = raw[j];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) { console.error('awardLinks 块括号不匹配'); process.exit(1); }
  const out = raw.slice(0, start) + JSON.stringify(newLinks) + raw.slice(end);
  fs.writeFileSync(path.join(__dirname, '..', 'films-data.js'), out);
  console.log('\n已写入 films-data.js，awardLinks 键数: ' + Object.keys(newLinks).length);
}
