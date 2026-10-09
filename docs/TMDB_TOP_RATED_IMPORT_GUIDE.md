# TMDB Top Rated Import - Usage Guide

## Prerequisites

You need a TMDB API key to run this import script.

1. Get your API key from: https://www.themoviedb.org/settings/api
2. Create a TMDB account if you don't have one
3. Request an API key (free for non-commercial use)

## Step-by-Step Usage

### Step 1: Set Environment Variables

```powershell
# Windows PowerShell
$env:TMDB_API_KEY="your_actual_api_key_here"
$env:MAX_PAGES=10  # Start with 10 pages for testing
```

### Step 2: Run Top Rated Import (Test with 10 pages)

```powershell
node _tmdb_top_rated_import.js
```

Expected output:
- Processes 10 pages (~200 movies)
- Filters: rating >= 7.0, votes >= 500
- Saves progress to `.tmdb_toprated_progress.json`
- Shows real-time import status

### Step 3: Check Import Results

```powershell
# View progress file summary
node -e "const p = require('./.tmdb_toprated_progress.json'); console.log('New films:', p.newFilms.length); console.log('Stats:', p.stats);"

# View first few films
node -e "const p = require('./.tmdb_toprated_progress.json'); p.newFilms.slice(0, 5).forEach(f => console.log(f.t, f.y, f.r));"
```

### Step 4: Merge New Films

```powershell
node _merge_new_films.js .tmdb_toprated_progress.json
```

This will:
- Read existing films from `films-data.js`
- Add new films from progress file
- Update `films-data.js` with merged data
- Show statistics (total, added, growth %)

### Step 5: Verify Merge Results

```powershell
# Check total film count
node -e "const fs = require('fs'); const raw = fs.readFileSync('films-data.js', 'utf8'); const match = raw.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/); const data = eval('(' + match[1] + ')'); console.log('Total films:', data.films.length);"
```

Open `index.html` in browser to verify new films display correctly.

### Step 6: Full Import (if test passes)

```powershell
# Set MAX_PAGES to 150 for full import (~3000 movies)
$env:MAX_PAGES=150
node _tmdb_top_rated_import.js
```

### Step 7: Merge Again

```powershell
node _merge_new_films.js .tmdb_toprated_progress.json
```

### Step 8: Commit Changes

```powershell
git add films-data.js _tmdb_top_rated_import.js _merge_new_films.js .tmdb_toprated_progress.json
git commit -m "feat: import TMDB Top Rated movies (rating>=7.0, votes>=500)"
```

## Filters

- **Rating Threshold**: 7.0 (configurable in script)
- **Vote Threshold**: 500 votes (configurable in script)
- **Endpoint**: `/movie/top_rated` from TMDB API
- **Language**: en-US (to get original titles)

## Features

- **Duplicate Detection**: Checks against existing films by tmdbId, id, and title+year
- **Progress Tracking**: Resume from last page if interrupted
- **Statistics**: Real-time stats on added/duplicate/skipped films
- **Genre Mapping**: Converts TMDB genre IDs to Chinese names
- **Link System**: Creates primary (TMDB) and secondary (Douban search) links

## Troubleshooting

### "API Error: 401"
- Your API key is invalid or not set
- Check: `echo $env:TMDB_API_KEY`

### "API Error: 429"
- Rate limit exceeded
- Increase DELAY_MS in script (currently 250ms)

### Network timeout
- Check internet connection
- TMDB API might be temporarily unavailable
- Script will save progress and can be resumed

### "Cannot parse films-data.js"
- Backup your films-data.js first
- Check file format: should be `window.CINE={...};`

## Progress File Format

`.tmdb_toprated_progress.json` structure:

```json
{
  "lastPage": 10,
  "newFilms": [...],
  "stats": {
    "total": 200,
    "added": 50,
    "skipped": 100,
    "duplicate": 50
  }
}
```

## Expected Results

### Test Run (10 pages)
- Total processed: ~200 movies
- New films: 30-80 (depends on duplicates)
- Time: ~1-2 minutes

### Full Run (150 pages)
- Total processed: ~3000 movies  
- New films: 500-1500 (depends on duplicates)
- Time: ~10-15 minutes

## Next Steps

After successful import:
- Run quality check: `node _quality_check.js`
- Test in browser
- Deploy to production
