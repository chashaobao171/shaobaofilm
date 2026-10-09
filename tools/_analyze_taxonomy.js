// 临时分析脚本：统计真实 genre 分布、分类/子类型实际命中数、孤儿标签、奖项命中
const fs = require('fs');
const path = require('path');
const {taxonomyTree} = require(path.join(__dirname, '..', 'taxonomy-data.js'));

const raw = fs.readFileSync(path.join(__dirname, '..', 'films-data.js'), 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
const CINE = eval('(' + m[1] + ')');
const films = CINE.films;
console.log('影片总数:', films.length);

// 1. 所有 genre 标签计数
const genreCount = {};
films.forEach(f => (f.g || []).forEach(g => genreCount[g] = (genreCount[g] || 0) + 1));
console.log('\n=== 全部 genre 标签（按数量降序）===');
Object.entries(genreCount).sort((a, b) => b[1] - a[1]).forEach(([g, c]) => console.log(`  ${g}: ${c}`));

// 2. 按 index.html 的逻辑计算每个子类型/分类的实际命中
function hit(sub, f) {
  const gs = f.g || [];
  const tags = sub.tags || [];
  if (sub.mode === 'all') return tags.every(t => gs.includes(t));
  if (sub.mode === 'any') return tags.some(t => gs.includes(t));
  return gs.includes(tags[0]);
}
console.log('\n=== 子类型实际命中（按 tags + mode）===');
const usedTags = new Set();
Object.entries(taxonomyTree).forEach(([mid, mc]) => {
  const catTags = new Set();
  Object.entries(mc.children).forEach(([sid, sc]) => {
    (sc.tags || []).forEach(t => { if (sc.mode !== 'all') catTags.add(t); usedTags.add(t); });
  });
  const catHit = films.filter(f => (f.g || []).some(t => catTags.has(t))).length;
  console.log(`\n[${mc.name} ${mid}] 当前count=${mc.count}  实际点击命中=${catHit}`);
  Object.entries(mc.children).forEach(([sid, sc]) => {
    const c = films.filter(f => hit(sc, f)).length;
    console.log(`   - ${sc.name}(${sc.id}) mode=${sc.mode} 当前count=${sc.count} 实际=${c}   tags=[${(sc.tags || []).join(',')}]`);
  });
});

// 3. 孤儿标签：出现在影片里但没有被任何子类型使用
console.log('\n=== 未被任何子类型引用的 genre 标签（孤儿，按数量降序）===');
Object.entries(genreCount).sort((a, b) => b[1] - a[1])
  .filter(([g]) => !usedTags.has(g))
  .forEach(([g, c]) => console.log(`  ${g}: ${c}`));

// 4. 奖项命中检查
console.log('\n=== awardLinks 命中检查 ===');
const key = new Set(films.map(f => f.t + '|' + String(f.y)));
if (CINE.awardLinks) {
  Object.entries(CINE.awardLinks).forEach(([n, arr]) => {
    let miss = 0;
    arr.forEach(p => { if (!key.has(p[0] + '|' + String(p[1]))) miss++; });
    console.log(`  ${n}: 共${arr.length} 未命中${miss}`);
  });
} else {
  console.log('  无 awardLinks');
}
// awards 展示卡里的奖项名
if (CINE.awards) {
  console.log('\n=== awards 展示卡奖项名 vs awardLinks 键 ===');
  CINE.awards.forEach(g => g.items.forEach(a => {
    const has = CINE.awardLinks && CINE.awardLinks[a.n];
    console.log(`  ${a.n} -> awardLinks: ${has ? has.length + ' 部' : '缺失'}`);
  }));
}

// 5. dirs 数量、meta
console.log('\n=== meta ===');
console.log(JSON.stringify(CINE.meta));
