/**
 * Add Source Field Script
 * 为所有影片添加 source 字段（douban 或 tmdb）
 */

const fs = require('fs');

function loadFilmsData() {
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) throw new Error('Cannot parse films-data.js');
  return {
    fullContent: content,
    data: eval('(' + match[1] + ')')
  };
}

function addSourceField() {
  console.log('Loading films data...');
  const { fullContent, data } = loadFilmsData();
  
  let doubanCount = 0;
  let tmdbCount = 0;
  
  // 为每部影片添加 source 字段
  const updatedFilms = data.films.map(film => {
    if (film.source) {
      // 已有 source 字段，跳过
      return film;
    }
    
    // 根据 id 判断来源
    if (film.id && film.id.toString().startsWith('tmdb')) {
      tmdbCount++;
      return { ...film, source: 'tmdb' };
    } else {
      doubanCount++;
      return { ...film, source: 'douban' };
    }
  });
  
  // 更新数据
  const updatedData = {
    ...data,
    films: updatedFilms
  };
  
  // 生成新的 films-data.js
  const newContent = fullContent.replace(
    /window\.CINE\s*=\s*\{[\s\S]+\};/,
    'window.CINE=' + JSON.stringify(updatedData, null, 0) + ';'
  );
  
  // 备份旧文件
  const backupName = `films-data.backup.${Date.now()}.js`;
  fs.writeFileSync(backupName, fullContent);
  console.log(`Backup saved: ${backupName}`);
  
  // 写入新文件
  fs.writeFileSync('films-data.js', newContent);
  
  console.log('\n=== Summary ===');
  console.log(`Douban films: ${doubanCount}`);
  console.log(`TMDB films: ${tmdbCount}`);
  console.log(`Total: ${updatedFilms.length}`);
  console.log('\nSource field added successfully!');
}

addSourceField();
