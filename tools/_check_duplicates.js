const fs = require('fs');

// Read and extract just the FILMS array using simple string operations
const content = fs.readFileSync('./films-data.js', 'utf-8');

// Find where FILMS array starts - it's assigned directly as a huge array literal
const startMatch = content.match(/FILMS\s*=\s*(\[)/);
if (!startMatch) {
  console.log('无法找到 FILMS 数组起始位置');
  process.exit(1);
}

const startPos = startMatch.index + startMatch[0].length - 1;

// Find the matching closing bracket - count bracket depth
let depth = 0;
let endPos = -1;
for (let i = startPos; i < content.length; i++) {
  if (content[i] === '[') depth++;
  else if (content[i] === ']') {
    depth--;
    if (depth === 0) {
      endPos = i + 1;
      break;
    }
  }
}

if (endPos === -1) {
  console.log('无法找到 FILMS 数组结束位置');
  process.exit(1);
}

const filmsJson = content.substring(startPos, endPos);
console.log('正在解析电影数据...');
const FILMS = JSON.parse(filmsJson);

console.log(`总电影数: ${FILMS.length}\n`);

// Find duplicates
const titleYearMap = new Map();
FILMS.forEach((film, index) => {
  const key = `${film.t}|${film.y}`;
  if (!titleYearMap.has(key)) {
    titleYearMap.set(key, []);
  }
  titleYearMap.get(key).push(index);
});

const duplicates = [];
titleYearMap.forEach((indices, key) => {
  if (indices.length > 1) {
    const [title, year] = key.split('|');
    duplicates.push({ title, year, indices, count: indices.length });
  }
});

console.log(`=== 发现 ${duplicates.length} 组重复电影 ===\n`);

duplicates.sort((a, b) => b.count - a.count).slice(0, 20).forEach((dup, i) => {
  console.log(`${i + 1}. "${dup.title}" (${dup.year}) - 重复 ${dup.count} 次`);
  dup.indices.forEach(idx => {
    const f = FILMS[idx];
    console.log(`   [索引${idx}] ID:${f.id || 'N/A'} 来源:${f.source || 'douban'} 海报:${f.p ? 'Y' : 'N'} 评分:${f.r || 'N/A'}`);
  });
  console.log('');
});

// Find no-poster films matching user's screenshot
console.log('\n=== 查找 Untitled 和 Two-Body 无海报电影 ===\n');
const noPosterTargets = FILMS
  .map((f, i) => ({ ...f, _index: i }))
  .filter(f => !f.p && (f.t.includes('Untitled') || f.t.includes('Two-Body')));

if (noPosterTargets.length > 0) {
  noPosterTargets.forEach(f => {
    console.log(`标题: ${f.t}`);
    console.log(`年份: ${f.y}`);
    console.log(`索引: ${f._index}`);
    console.log(`ID: ${f.id}`);
    console.log(`来源: ${f.source || 'douban'}`);
    console.log('---');
  });
} else {
  console.log('未找到匹配的无海报电影\n');
}
