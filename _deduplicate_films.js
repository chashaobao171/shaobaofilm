const fs = require('fs');

function deduplicateFilms() {
  console.log('=== Film Deduplication Tool ===\n');
  
  // Read films-data.js which uses window.CINE format
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  
  let cineData;
  try {
    const match = rawData.match(/window\.CINE\s*=\s*({.*});?\s*$/s);
    if (match) {
      cineData = JSON.parse(match[1]);
    } else {
      console.error('Error: Could not parse window.CINE format');
      return;
    }
  } catch (error) {
    console.error('Error parsing films data:', error.message);
    return;
  }
  
  const films = cineData.films || [];
  console.log(`Total films before deduplication: ${films.length}`);
  
  // Load quality report to find duplicates
  const report = JSON.parse(fs.readFileSync('.quality_report.json', 'utf8'));
  console.log(`Duplicates found: ${report.duplicates.length}\n`);
  
  if (report.duplicates.length === 0) {
    console.log('No duplicates to remove. Exiting.');
    return;
  }
  
  // Collect indices to remove (keep the first occurrence, remove the second)
  const indicesToRemove = new Set();
  
  report.duplicates.forEach(dup => {
    console.log(`Duplicate: ${dup.title} (${dup.year})`);
    console.log(`  - Index ${dup.index1}: ${JSON.stringify(films[dup.index1].t)}`);
    console.log(`  - Index ${dup.index2}: ${JSON.stringify(films[dup.index2].t)}`);
    
    // Compare which one to keep (prefer the one with more complete data)
    const film1 = films[dup.index1];
    const film2 = films[dup.index2];
    
    let keepIndex = dup.index1;
    let removeIndex = dup.index2;
    
    // Prefer the one with rating
    if (!film1.r && film2.r) {
      keepIndex = dup.index2;
      removeIndex = dup.index1;
    }
    // Prefer the one with poster
    else if (!film1.p && film2.p) {
      keepIndex = dup.index2;
      removeIndex = dup.index1;
    }
    // Prefer the one with more genres
    else if ((film1.g?.length || 0) < (film2.g?.length || 0)) {
      keepIndex = dup.index2;
      removeIndex = dup.index1;
    }
    
    indicesToRemove.add(removeIndex);
    console.log(`  -> Keeping index ${keepIndex}, removing index ${removeIndex}\n`);
  });
  
  // Create backup
  const backupPath = `films-data.backup.${Date.now()}.js`;
  fs.writeFileSync(backupPath, rawData);
  console.log(`Backup created: ${backupPath}`);
  
  // Remove duplicates
  const deduplicatedFilms = films.filter((_, index) => !indicesToRemove.has(index));
  
  console.log(`\nFilms after deduplication: ${deduplicatedFilms.length}`);
  console.log(`Removed: ${indicesToRemove.size} duplicates`);
  
  // Write back to file
  cineData.films = deduplicatedFilms;
  const output = `window.CINE=${JSON.stringify(cineData)};`;
  fs.writeFileSync('films-data.js', output, 'utf8');
  
  console.log('\n--- Deduplication complete!');
  console.log('Run quality check again to verify: node _quality_check.js');
}

deduplicateFilms();
