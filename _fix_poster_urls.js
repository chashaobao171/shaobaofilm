/**
 * Fix poster URLs for existing TMDB films
 * Convert tmdb/xxx.jpg -> https://image.tmdb.org/t/p/w500/xxx.jpg
 */

const fs = require('fs');

const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function fixPosterUrls() {
  console.log('Starting poster URL fix...\n');
  
  // Load films-data.js
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) {
    throw new Error('Cannot parse films-data.js');
  }
  
  const data = eval('(' + match[1] + ')');
  console.log(`Total films: ${data.films.length}`);
  
  // Find TMDB films with broken poster URLs
  let fixedCount = 0;
  
  for (const film of data.films) {
    if (film.id && film.id.startsWith('tmdb') && film.p && film.p.startsWith('tmdb/')) {
      // Extract the path part after 'tmdb'
      const posterPath = film.p.substring(4); // Remove 'tmdb' prefix
      film.p = `${IMAGE_BASE}${posterPath}`;
      fixedCount++;
      console.log(`Fixed: ${film.t} (${film.y})`);
    }
  }
  
  console.log(`\nTotal posters fixed: ${fixedCount}`);
  
  if (fixedCount === 0) {
    console.log('No posters needed fixing.');
    return;
  }
  
  // Write back to films-data.js
  const newContent = content.replace(
    /window\.CINE\s*=\s*\{[\s\S]+\};/,
    'window.CINE=' + JSON.stringify(data, null, 0) + ';'
  );
  
  fs.writeFileSync('films-data.js', newContent);
  console.log('\nfilms-data.js has been updated with fixed poster URLs.');
}

fixPosterUrls();
