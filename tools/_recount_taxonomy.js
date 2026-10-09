// _recount_taxonomy.js
// 重新精确统计 taxonomy 数据：直接按每个子类型的 tags + mode 计算"去重影片数"，
// 与 index.html 的筛选逻辑（data-g / data-go / data-gs）保持完全一致：
//   mode === "one"  → 影片 g 数组包含 tags[0]
//   mode === "any"  → 影片 g 数组包含 tags 中任意一个
//   mode === "all"  → 影片 g 数组包含 tags 全部
// 分类 count = 该分类下所有【非 all 子类型】tags 的并集命中数（= index.html 的 CAT_TAGS 点击结果）。
const fs = require('fs');
const path = require('path');
const {taxonomyTree} = require(path.join(__dirname, '..', 'taxonomy-data.js'));

// 1. 读取影片数据（window.CINE 格式）
const raw = fs.readFileSync(path.join(__dirname, '..', 'films-data.js'), 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!m) { console.error('无法解析 films-data.js'); process.exit(1); }
const CINE = eval('(' + m[1] + ')');
const films = CINE.films;
console.log('影片总数:', films.length);

// 2. 子类型命中判定（与前端一致）
function subMatch(sub, gs) {
  const tags = sub.tags || [];
  if (sub.mode === 'all') return tags.every(t => gs.indexOf(t) >= 0);
  if (sub.mode === 'any') return tags.some(t => gs.indexOf(t) >= 0);
  return gs.indexOf(tags[0]) >= 0;
}

// 3. 逐片统计
const mainSets = {}, subSets = {}, tagCounts = {};
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  mainSets[mid] = new Set();
  Object.entries(mc.children).forEach(([sid, sc]) => {
    subSets[mid + ':' + sid] = new Set();
    tagCounts[mid + ':' + sid] = {};
    (sc.tags || []).forEach(t => tagCounts[mid + ':' + sid][t] = 0);
  });
});

films.forEach((f, idx) => {
  const gs = f.g || [];
  Object.entries(taxonomyTree).forEach(([mid, mc]) => {
    Object.entries(mc.children).forEach(([sid, sc]) => {
      if (subMatch(sc, gs)) subSets[mid + ':' + sid].add(idx);
      (sc.tags || []).forEach(t => { if (gs.indexOf(t) >= 0) tagCounts[mid + ':' + sid][t]++; });
    });
  });
});

// 4. 分类 count = 非 all 子类型 tags 并集的命中数（与前端 CAT_TAGS 一致）
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  const catTags = new Set();
  Object.values(mc.children).forEach(sc => {
    if (sc.mode === 'all') return;
    (sc.tags || []).forEach(t => catTags.add(t));
  });
  films.forEach((f, idx) => {
    const gs = f.g || [];
    for (const t of catTags) { if (gs.indexOf(t) >= 0) { mainSets[mid].add(idx); break; } }
  });
});

// 5. 回写计数
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  mc.count = mainSets[mid].size;
  Object.entries(mc.children).forEach(([sid, sc]) => {
    sc.count = subSets[mid + ':' + sid].size;
    sc.tagCounts = tagCounts[mid + ':' + sid];
  });
});

const subCount = Object.values(taxonomyTree).reduce((n, mc) => n + Object.keys(mc.children).length, 0);
const meta = {
  films: films.length,
  categories: Object.keys(taxonomyTree).length,
  subcategories: subCount,
  updated: new Date().toISOString().slice(0, 10)
};

// 6. 写回文件
const out =
  '// taxonomy-data.js — 计数由 _recount_taxonomy.js 精确统计（去重影片数）\n' +
  'const taxonomyTree = ' + JSON.stringify(taxonomyTree, null, 2) + ';\n\n' +
  'const taxonomyMeta = ' + JSON.stringify(meta, null, 2) + ';\n\n' +
  '// 导出\n' +
  "if (typeof module !== 'undefined' && module.exports) {\n" +
  '  module.exports = {taxonomyTree, taxonomyMeta};\n' +
  '} else {\n' +
  '  window.taxonomyTree = taxonomyTree;\n' +
  '  window.taxonomyMeta = taxonomyMeta;\n' +
  '}\n';
fs.writeFileSync(path.join(__dirname, '..', 'taxonomy-data.js'), out);
console.log('已写入 taxonomy-data.js\n');

// 7. 输出统计摘要
console.log('=== 主类型 / 子类型（去重影片数）===');
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  console.log(`  ${mc.name} (${mid}): ${mc.count} 部`);
  Object.entries(mc.children).forEach(([sid, sc]) => {
    const tc = Object.entries(sc.tagCounts).map(([t, c]) => `${t}:${c}`).join(' ');
    console.log(`    - ${sc.name}: ${sc.count} 部  [${tc}]`);
  });
});
console.log(`\nmeta: ${JSON.stringify(meta)}`);
