const fs = require('fs');

function mergeFilms(progressFile) {
  console.log('=== Merging New Films ===\n');
  
  // 读取现有数据
  console.log('Reading films-data.js...');
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  const match = rawData.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  
  if (!match) {
    console.error('Error: Cannot parse films-data.js (window.CINE format not found)');
    process.exit(1);
  }
  
  const cineData = eval('(' + match[1] + ')');
  const existingFilms = cineData.films || [];
  console.log(`Existing films: ${existingFilms.length}`);
  
  // 读取新电影
  console.log(`\nReading progress file: ${progressFile}...`);
  if (!fs.existsSync(progressFile)) {
    console.error(`Error: Progress file not found: ${progressFile}`);
    process.exit(1);
  }
  
  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  const newFilms = progress.newFilms || [];
  console.log(`New films to merge: ${newFilms.length}`);
  
  if (newFilms.length === 0) {
    console.log('\nNo new films to merge. Exiting.');
    process.exit(0);
  }
  
  // 合并
  console.log('\nMerging films...');
  const merged = [...existingFilms, ...newFilms];
  console.log(`Total films after merge: ${merged.length}`);
  
  // 保留原始的 window.CINE 结构，更新其他字段
  const updatedCineData = {
    ...cineData,
    films: merged
  };
  
  // 写回（保持单行格式）
  console.log('\nWriting back to films-data.js...');
  const output = `window.CINE=${JSON.stringify(updatedCineData)};`;
  fs.writeFileSync('films-data.js', output, 'utf8');
  
  console.log('\n=== Merge Complete ===');
  console.log(`Total films: ${merged.length}`);
  console.log(`Added: ${newFilms.length}`);
  console.log(`Growth: +${((newFilms.length / existingFilms.length) * 100).toFixed(1)}%`);
  
  // 统计新增电影的来源和年份分布
  const sourceStats = {};
  const yearStats = {};
  
  newFilms.forEach(film => {
    sourceStats[film.source] = (sourceStats[film.source] || 0) + 1;
    const decade = Math.floor(film.y / 10) * 10;
    yearStats[decade] = (yearStats[decade] || 0) + 1;
  });
  
  console.log('\nNew films by source:');
  Object.entries(sourceStats).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  
  console.log('\nNew films by decade:');
  Object.entries(yearStats)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .forEach(([decade, count]) => {
      console.log(`  ${decade}s: ${count}`);
    });
}

const progressFile = process.argv[2] || '.tmdb_toprated_progress.json';

if (!progressFile) {
  console.error('Usage: node _merge_new_films.js <progress_file.json>');
  console.error('Example: node _merge_new_films.js .tmdb_toprated_progress.json');
  process.exit(1);
}

mergeFilms(progressFile);
