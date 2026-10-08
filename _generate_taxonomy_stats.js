// _generate_taxonomy_stats.js
const fs = require('fs');
const {taxonomyTree} = require('./taxonomy-data.js');
const {taxonomyConfig} = require('./taxonomy-config.js');

// 读取电影数据
const rawData = fs.readFileSync('films-data.js', 'utf8');
// 匹配 window.CINE = {...} 格式
const match = rawData.match(/window\.CINE\s*=\s*(\{[\s\S]*?\});?\s*$/m);
if (!match) {
  console.error('无法解析films-data.js中的window.CINE数据');
  process.exit(1);
}

const cineData = JSON.parse(match[1]);
const films = cineData.films || [];

console.log(`读取到 ${films.length} 部电影`);

// 统计每个类型的电影数量
const stats = {};

// 初始化统计结构
Object.keys(taxonomyTree).forEach(mainId => {
  stats[mainId] = {count: 0, children: {}};
  Object.keys(taxonomyTree[mainId].children).forEach(subId => {
    stats[mainId].children[subId] = {count: 0, tags: {}};
    taxonomyTree[mainId].children[subId].tags.forEach(tag => {
      stats[mainId].children[subId].tags[tag] = 0;
    });
  });
});

// 遍历电影并统计
let processedCount = 0;
films.forEach(film => {
  if (!film.g || !Array.isArray(film.g)) return;
  
  const filmGenres = new Set();
  
  film.g.forEach(genre => {
    const mapping = taxonomyConfig.genreMapping[genre];
    if (mapping && mapping.length >= 2) {
      const [mainId, subId] = mapping;
      const key = `${mainId}:${subId}`;
      
      // 避免同一部电影重复计入同一分类
      if (!filmGenres.has(key)) {
        filmGenres.add(key);
        
        if (stats[mainId] && stats[mainId].children[subId]) {
          stats[mainId].count++;
          stats[mainId].children[subId].count++;
          
          // 标签统计（如果genre本身在tags中）
          if (stats[mainId].children[subId].tags.hasOwnProperty(genre)) {
            stats[mainId].children[subId].tags[genre]++;
          }
        }
      }
    }
  });
  
  if (filmGenres.size > 0) processedCount++;
});

console.log(`处理了 ${processedCount} 部有类型映射的电影\n`);

// 将统计数据注入taxonomyTree
Object.keys(taxonomyTree).forEach(mainId => {
  taxonomyTree[mainId].count = stats[mainId].count;
  Object.keys(taxonomyTree[mainId].children).forEach(subId => {
    taxonomyTree[mainId].children[subId].count = stats[mainId].children[subId].count;
    
    // 过滤掉计数为0的标签
    const filteredTags = taxonomyTree[mainId].children[subId].tags.filter(tag => {
      const count = stats[mainId].children[subId].tags[tag];
      return count > 0;
    });
    
    // 如果过滤后标签为空，保留原始标签
    if (filteredTags.length > 0) {
      taxonomyTree[mainId].children[subId].tags = filteredTags;
    }
  });
});

// 重新写入taxonomy-data.js
const output = `// taxonomy-data.js
const taxonomyTree = ${JSON.stringify(taxonomyTree, null, 2)};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyTree};
} else {
  window.taxonomyTree = taxonomyTree;
}
`;

fs.writeFileSync('taxonomy-data.js', output, 'utf8');
console.log('✓ Taxonomy stats generated and saved to taxonomy-data.js\n');

// 打印统计结果
console.log('=== 各主类型电影数量统计 ===');
Object.entries(stats)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([mainId, data]) => {
    const category = taxonomyTree[mainId];
    console.log(`  ${category.icon} ${category.name} (${mainId}): ${data.count} 部电影`);
    
    Object.entries(data.children)
      .filter(([_, subData]) => subData.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([subId, subData]) => {
        const subCategory = taxonomyTree[mainId].children[subId];
        console.log(`    - ${subCategory.name}: ${subData.count} 部`);
      });
  });

console.log('\n=== 统计完成 ===');
