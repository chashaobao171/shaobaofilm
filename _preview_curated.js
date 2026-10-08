const fs = require('fs');

function generatePreviewHTML(resultPath) {
  console.log(`\nGenerating preview from: ${resultPath}`);
  
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${result.source}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      margin: 20px; 
      background: #f5f5f5;
      color: #333;
    }
    h1 { 
      color: #333; 
      margin-bottom: 20px;
      font-size: 28px;
    }
    .stats { 
      background: #fff; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .stats p { 
      font-size: 16px; 
      line-height: 1.8;
      margin-bottom: 8px;
    }
    .stats .highlight {
      font-weight: bold;
      color: #2196F3;
    }
    .film-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
      gap: 20px;
      margin-bottom: 40px;
    }
    .film-card { 
      background: #fff; 
      border-radius: 8px; 
      overflow: hidden; 
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .film-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .film-card img { 
      width: 100%; 
      display: block;
      aspect-ratio: 2/3;
      object-fit: cover;
      background: #eee;
    }
    .film-info { 
      padding: 12px; 
    }
    .film-title { 
      font-weight: bold; 
      font-size: 14px; 
      margin-bottom: 6px;
      line-height: 1.3;
      min-height: 36px;
    }
    .film-meta { 
      font-size: 12px; 
      color: #666;
      margin-bottom: 4px;
    }
    .rating { 
      color: #f90; 
      font-weight: bold;
      font-size: 14px;
    }
    .genres {
      font-size: 11px;
      color: #999;
      margin-top: 6px;
      line-height: 1.4;
    }
    .failed-section {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      border-left: 4px solid #ffc107;
    }
    .failed-section h2 {
      color: #856404;
      margin-bottom: 15px;
      font-size: 20px;
    }
    .failed-list {
      list-style: none;
    }
    .failed-item {
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .failed-item:last-child {
      border-bottom: none;
    }
    .reason {
      color: #d32f2f;
      font-size: 12px;
      margin-left: 10px;
    }
  </style>
</head>
<body>
  <h1>${result.source} - Preview</h1>
  
  <div class="stats">
    <p>Total Films: <span class="highlight">${result.stats.total}</span></p>
    <p>Success: <span class="highlight" style="color: #4CAF50;">${result.stats.success}</span></p>
    <p>Failed: <span class="highlight" style="color: #f44336;">${result.stats.failed}</span></p>
    <p>Success Rate: <span class="highlight">${((result.stats.success / result.stats.total) * 100).toFixed(1)}%</span></p>
  </div>
  
  <div class="film-grid">
    ${result.newFilms.map(film => `
      <div class="film-card">
        <img src="${film.p}" alt="${film.t}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="film-info">
          <div class="film-title">${film.t}</div>
          <div class="film-meta">
            ${film.y} | <span class="rating">${film.r}</span>
          </div>
          <div class="genres">${film.g.join(', ')}</div>
        </div>
      </div>
    `).join('')}
  </div>
  
  ${result.failed.length > 0 ? `
  <div class="failed-section">
    <h2>Failed Imports (${result.failed.length})</h2>
    <ul class="failed-list">
      ${result.failed.map(item => `
        <li class="failed-item">
          <strong>${item.title}</strong> (${item.year})
          <span class="reason">${item.reason}${item.rating ? ': ' + item.rating : ''}</span>
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}
  
</body>
</html>
  `;
  
  const outputPath = resultPath.replace('_result.json', '_preview.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`\n=== Preview Generated ===`);
  console.log(`Output: ${outputPath}`);
  console.log(`\nOpen this file in your browser to review the imported films.`);
}

const resultPath = process.argv[2];

if (!resultPath) {
  console.error('Usage: node _preview_curated.js <result.json>');
  console.error('Example: node _preview_curated.js curated-lists/imdb-hidden-gems_result.json');
  process.exit(1);
}

if (!fs.existsSync(resultPath)) {
  console.error(`Error: File not found: ${resultPath}`);
  process.exit(1);
}

generatePreviewHTML(resultPath);
