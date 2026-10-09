const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'films-data.js'), 'utf8');
const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
const CINE = eval('(' + m[1] + ')');
console.log('=== awards 展示卡（' + CINE.awards.length + ' 组）===');
CINE.awards.forEach(g => {
  console.log(`\n【${g.g}】 (${g.items.length}) c=${g.c}`);
  g.items.forEach(a => console.log(`   ${a.n} | ${a.e} | ${a.m}`));
});
console.log('\n=== awardLinks 键（' + Object.keys(CINE.awardLinks).length + '）===');
Object.keys(CINE.awardLinks).forEach(k => console.log(`   ${k}: ${CINE.awardLinks[k].length}`));
