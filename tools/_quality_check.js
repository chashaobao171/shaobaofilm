const fs = require('fs');

function qualityCheck() {
  // Read films-data.js which uses window.CINE format
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  
  // Parse window.CINE format
  let films = [];
  try {
    // Extract the JSON data from window.CINE
    const match = rawData.match(/window\.CINE\s*=\s*({.*});?\s*$/s);
    if (match) {
      const cineData = JSON.parse(match[1]);
      films = cineData.films || [];
    } else {
      console.error('Error: Could not parse window.CINE format');
      return;
    }
  } catch (error) {
    console.error('Error parsing films data:', error.message);
    return;
  }
  
  console.log('=== Film Data Quality Check ===\n');
  
  // Statistics
  const stats = {
    total: films.length,
    bySource: {},
    byDecade: {},
    noRating: [],
    noPoster: [],
    noGenre: [],
    lowRating: [],
    duplicates: []
  };
  
  // By source statistics
  films.forEach(f => {
    const source = f.id ? f.id.substring(0, 4) : 'unknown'; // tmdb, doub, etc.
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
  });
  
  // By decade statistics
  films.forEach(f => {
    if (f.y && f.y > 0) {
      const decade = Math.floor(f.y / 10) * 10;
      stats.byDecade[decade] = (stats.byDecade[decade] || 0) + 1;
    }
  });
  
  // Quality issue checks
  films.forEach((f, i) => {
    // No rating or rating is 0
    if (!f.r || f.r === 0) {
      stats.noRating.push({index: i, title: f.t, year: f.y});
    }
    
    // No poster
    if (!f.p || f.p === '') {
      stats.noPoster.push({index: i, title: f.t, year: f.y});
    }
    
    // No genre or empty genre array
    if (!f.g || f.g.length === 0) {
      stats.noGenre.push({index: i, title: f.t, year: f.y});
    }
    
    // Low rating (< 6.5)
    if (f.r && f.r < 6.5) {
      stats.lowRating.push({index: i, title: f.t, year: f.y, rating: f.r});
    }
  });
  
  // Duplicate check (same title + year)
  const seen = new Map();
  films.forEach((f, i) => {
    const key = `${f.t}_${f.y}`;
    if (seen.has(key)) {
      stats.duplicates.push({
        index1: seen.get(key),
        index2: i,
        title: f.t,
        year: f.y
      });
    } else {
      seen.set(key, i);
    }
  });
  
  // Output report
  console.log(`Total Films: ${stats.total}`);
  console.log(`\nBy Source:`);
  Object.entries(stats.bySource)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count} (${(count/stats.total*100).toFixed(1)}%)`);
    });
  
  console.log(`\nBy Decade:`);
  Object.entries(stats.byDecade)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([decade, count]) => {
      console.log(`  ${decade}s: ${count}`);
    });
  
  console.log(`\n=== Quality Issues ===`);
  console.log(`No Rating: ${stats.noRating.length}`);
  if (stats.noRating.length > 0 && stats.noRating.length <= 10) {
    stats.noRating.forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
  } else if (stats.noRating.length > 10) {
    stats.noRating.slice(0, 10).forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
    console.log(`  ... and ${stats.noRating.length - 10} more`);
  }
  
  console.log(`\nNo Poster: ${stats.noPoster.length}`);
  if (stats.noPoster.length > 0 && stats.noPoster.length <= 10) {
    stats.noPoster.forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
  } else if (stats.noPoster.length > 10) {
    stats.noPoster.slice(0, 10).forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
    console.log(`  ... and ${stats.noPoster.length - 10} more`);
  }
  
  console.log(`\nNo Genre: ${stats.noGenre.length}`);
  if (stats.noGenre.length > 0 && stats.noGenre.length <= 10) {
    stats.noGenre.forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
  } else if (stats.noGenre.length > 10) {
    stats.noGenre.slice(0, 10).forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year})`));
    console.log(`  ... and ${stats.noGenre.length - 10} more`);
  }
  
  console.log(`\nLow Rating (<6.5): ${stats.lowRating.length}`);
  if (stats.lowRating.length > 0 && stats.lowRating.length <= 10) {
    stats.lowRating.forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year}) - ${item.rating}`));
  } else if (stats.lowRating.length > 10) {
    stats.lowRating.slice(0, 10).forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.year}) - ${item.rating}`));
    console.log(`  ... and ${stats.lowRating.length - 10} more`);
  }
  
  console.log(`\nDuplicates: ${stats.duplicates.length}`);
  if (stats.duplicates.length > 0) {
    stats.duplicates.forEach(dup => {
      console.log(`  - [${dup.index1}] & [${dup.index2}] ${dup.title} (${dup.year})`);
    });
  }
  
  // Save detailed report
  const reportPath = '.quality_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n--- Detailed report saved to: ${reportPath}`);
  
  // Summary
  console.log(`\n=== Summary ===`);
  const issueCount = stats.noRating.length + stats.noPoster.length + 
                     stats.noGenre.length + stats.lowRating.length + 
                     stats.duplicates.length;
  console.log(`Total Issues Found: ${issueCount}`);
  
  if (issueCount === 0) {
    console.log('Status: PASS - All quality checks passed!');
  } else {
    console.log('Status: ISSUES FOUND - Review report for details');
  }
}

qualityCheck();
