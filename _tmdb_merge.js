/**
 * TMDB Merge Script
 * Merge newly discovered TMDB films into films-data.js
 */

const fs = require('fs');

function loadExistingFilms() {
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) throw new Error('Cannot parse films-data.js');
  return {
    fullContent: content,
    data: eval('(' + match[1] + ')')
  };
}

function loadDiscoveredFilms() {
  if (!fs.existsSync('_tmdb_discovered.json')) {
    throw new Error('No _tmdb_discovered.json found. Run _tmdb_discover.js first.');
  }
  return JSON.parse(fs.readFileSync('_tmdb_discovered.json', 'utf8'));
}

function mergeFilms() {
  console.log('Loading existing films...');
  const existing = loadExistingFilms();
  const discovered = loadDiscoveredFilms();
  
  console.log(`Existing films: ${existing.data.films.length}`);
  console.log(`Discovered films: ${discovered.films.length}`);
  
  // Merge films
  const mergedFilms = [...existing.data.films, ...discovered.films];
  
  // Update metadata
  const updatedData = {
    ...existing.data,
    films: mergedFilms,
    meta: {
      ...existing.data.meta,
      films: mergedFilms.length
    }
  };
  
  // Generate new films-data.js
  const newContent = existing.fullContent.replace(
    /window\.CINE\s*=\s*\{[\s\S]+\};/,
    'window.CINE=' + JSON.stringify(updatedData, null, 0) + ';'
  );
  
  // Backup old file
  const backupName = `films-data.backup.${Date.now()}.js`;
  fs.writeFileSync(backupName, existing.fullContent);
  console.log(`Backup saved: ${backupName}`);
  
  // Write new file
  fs.writeFileSync('films-data.js', newContent);
  console.log(`\nMerge complete!`);
  console.log(`Total films: ${mergedFilms.length}`);
  console.log(`New films added: ${discovered.films.length}`);
}

mergeFilms();
