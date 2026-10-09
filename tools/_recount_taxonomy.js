// _recount_taxonomy.js
// 重新精确统计 taxonomy 数据：按"去重影片数"计算主类型/子类型计数，
// 并为每个标签统计精确命中数（tagCounts），写入 taxonomy-data.js
const fs = require('fs');
const path = require('path');
const {taxonomyTree} = require(path.join(__dirname, '..', 'taxonomy-data.js'));
const {taxonomyConfig} = require(path.join(__dirname, 'taxonomy-config.js'));

// 1. 读取影片数据（window.CINE 格式）
const raw = fs.readFileSync(path.join(__dirname, '..', 'films-data.js'), 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
if (!m) { console.error('无法解析 films-data.js'); process.exit(1); }
const CINE = eval('(' + m[1] + ')');
const films = CINE.films;
console.log('影片总数:', films.length);

// 2. 构建 genre -> [main, sub] 反查表
const rev = {};
for (const [g, [a, b]] of Object.entries(taxonomyConfig.genreMapping)) rev[g] = [a, b];

// 3. 初始化统计容器
const mainSets = {}, subSets = {}, tagCounts = {};
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  mainSets[mid] = new Set();
  Object.entries(mc.children).forEach(([sid, sc]) => {
    subSets[mid + ':' + sid] = new Set();
    tagCounts[mid + ':' + sid] = {};
    sc.tags.forEach(t => tagCounts[mid + ':' + sid][t] = 0);
  });
});

// 4. 遍历影片（每部影片对同一类型只计一次）
films.forEach((f, idx) => {
  const gs = f.g || [];
  const seenMain = new Set(), seenSub = new Set();
  gs.forEach(g => {
    const r = rev[g];
    if (r) {
      const [a, b] = r;
      seenMain.add(a);                     // 同片多标签只算一次
      if (b && taxonomyTree[a] && taxonomyTree[a].children[b]) seenSub.add(a + ':' + b);
    }
  });
  seenMain.forEach(a => mainSets[a].add(idx));
  seenSub.forEach(k => subSets[k].add(idx));
  // 标签精确命中数
  Object.entries(taxonomyTree).forEach(([mid, mc]) => {
    Object.entries(mc.children).forEach(([sid, sc]) => {
      sc.tags.forEach(t => { if (gs.includes(t)) tagCounts[mid + ':' + sid][t]++; });
    });
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
console.log('=== 主类型（去重影片数）===');
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  console.log(`  ${mc.name} (${mid}): ${mc.count} 部`);
  Object.entries(mc.children).forEach(([sid, sc]) => {
    const tc = Object.entries(sc.tagCounts).map(([t, c]) => `${t}:${c}`).join(' ');
    console.log(`    - ${sc.name}: ${sc.count} 部  [${tc}]`);
  });
});
console.log(`\nmeta: ${JSON.stringify(meta)}`);