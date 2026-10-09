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

  // ===== 合并阶段去重防线：id / tmdbId / 片名|年份 =====
  function filmKey(t, y) {
    return `${String(t || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${y === null || y === undefined || y === '' ? '' : Number(y)}`;
  }
  const seenIds = new Set();
  const seenTmdbIds = new Set();
  const seenKeys = new Set();
  const remember = (f) => {
    if (f.id) seenIds.add(f.id);
    if (f.tmdbId !== null && f.tmdbId !== undefined) seenTmdbIds.add(Number(f.tmdbId));
    if (f.t) seenKeys.add(filmKey(f.t, f.y));
  };
  const isDuplicate = (f) => {
    if (f.id && seenIds.has(f.id)) return true;
    if (f.tmdbId !== null && f.tmdbId !== undefined && seenTmdbIds.has(Number(f.tmdbId))) return true;
    const key = filmKey(f.t, f.y);
    if (key && key !== '|' && seenKeys.has(key)) return true;
    return false;
  };

  const mergedFilms = [];
  existing.data.films.forEach(f => { mergedFilms.push(f); remember(f); });

  let added = 0;
  let dropped = 0;
  discovered.films.forEach(f => {
    if (isDuplicate(f)) { dropped++; return; }
    mergedFilms.push(f);
    remember(f);
    added++;
  });
  
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
  console.log(`New films added: ${added}${dropped ? `（去重丢弃 ${dropped} 部）` : ''}`);
}

mergeFilms();
