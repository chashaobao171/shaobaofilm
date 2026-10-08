/**
 * Merge Backfilled Films into films-data.js
 * 
 * Reads _tmdb_backfilled.json and merges new films into films-data.js
 * with deduplication by title + year
 */

const fs = require('fs');

function mergeBackfilledFilms() {
  console.log('Starting merge of backfilled films...\n');
  
  // Load existing films-data.js
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) {
    throw new Error('Cannot parse films-data.js');
  }
  
  const data = eval('(' + match[1] + ')');
  console.log(`Current film count: ${data.films.length}`);
  
  // Load backfilled films
  if (!fs.existsSync('./_tmdb_backfilled.json')) {
    console.error('Error: _tmdb_backfilled.json not found');
    console.log('Please run: node _tmdb_backfill.js first');
    process.exit(1);
  }
  
  const backfilled = JSON.parse(fs.readFileSync('./_tmdb_backfilled.json', 'utf8'));
  console.log(`Backfilled films found: ${backfilled.count}`);
  
  // Deduplication: check by ID and by title+year
  const existingIds = new Set(data.films.map(f => f.id));
  const existingTitleYear = new Set(data.films.map(f => `${f.t}_${f.y}`));
  
  const newFilms = backfilled.films.filter(f => {
    if (existingIds.has(f.id)) {
      console.log(`  Skip (ID exists): ${f.t} (${f.y})`);
      return false;
    }
    
    const key = `${f.t}_${f.y}`;
    if (existingTitleYear.has(key)) {
      console.log(`  Skip (title+year exists): ${f.t} (${f.y})`);
      return false;
    }
    
    return true;
  });
  
  console.log(`\nNew films to add: ${newFilms.length}`);
  
  if (newFilms.length === 0) {
    console.log('No new films to merge.');
    return;
  }
  
  // Add new films
  data.films.push(...newFilms);
  
  // Sort by year (descending) then by rating (descending)
  data.films.sort((a, b) => {
    if (b.y !== a.y) return b.y - a.y;
    return (b.r || 0) - (a.r || 0);
  });
  
  // Write back to films-data.js
  const newContent = content.replace(
    /window\.CINE\s*=\s*\{[\s\S]+\};/,
    'window.CINE=' + JSON.stringify(data, null, 0) + ';'
  );
  
  fs.writeFileSync('films-data.js', newContent);
  
  console.log(`\n=== Merge Complete ===`);
  console.log(`Previous count: ${data.films.length - newFilms.length}`);
  console.log(`New films added: ${newFilms.length}`);
  console.log(`Total count: ${data.films.length}`);
  console.log(`\nfilms-data.js has been updated.`);
}

mergeBackfilledFilms();
