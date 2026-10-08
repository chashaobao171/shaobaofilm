/**
 * TMDB Backfill Script - 回溯补全历史优质电影
 * 
 * 目标：补充豆瓣未收录的历史经典电影、高分外语片、获奖影片
 * 策略：从 TMDB 高质量榜单和条件筛选中拉取已上映的优质电影
 */

const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// 质量标准
const QUALITY_THRESHOLD = {
  minRating: 7.0,        // 最低评分 7.0
  minVotes: 1000,        // 最低投票数 1000（确保不是小众偏差）
  maxYear: 2025,         // 只要已上映的电影
  minYear: 1950          // 从 1950 年开始（太老的片源难找）
};

// Load existing films
function loadExistingFilms() {
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) throw new Error('Cannot parse films-data.js');
  return eval('(' + match[1] + ')');
}

// HTTP GET helper
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            console.error(`API Error: Status ${res.statusCode}`);
            reject(new Error(`API returned status ${res.statusCode}`));
            return;
          }
          resolve(json);
        } catch (e) {
          console.error(`JSON parse error: ${e.message}`);
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Get Top Rated films (high-quality classics)
async function getTopRated(page = 1) {
  const url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=zh-CN&page=${page}`;
  return fetchJSON(url);
}

// Discover films by criteria
async function discoverByCriteria(criteria, page = 1) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: 'zh-CN',
    page: page,
    sort_by: 'vote_average.desc',
    'vote_count.gte': QUALITY_THRESHOLD.minVotes,
    'vote_average.gte': QUALITY_THRESHOLD.minRating,
    'primary_release_date.lte': `${QUALITY_THRESHOLD.maxYear}-12-31`,
    'primary_release_date.gte': `${QUALITY_THRESHOLD.minYear}-01-01`,
    ...criteria
  });
  
  const url = `${BASE_URL}/discover/movie?${params}`;
  return fetchJSON(url);
}

// Get film details
async function getFilmDetails(tmdbId) {
  const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=zh-CN&append_to_response=keywords,credits`;
  return fetchJSON(url);
}

// Convert TMDB film to our format
function convertTMDBFilm(tmdbFilm, details) {
  const year = parseInt(tmdbFilm.release_date?.split('-')[0]) || 0;
  
  // Extract director
  const director = details?.credits?.crew
    ?.find(p => p.job === 'Director')?.name || '';
  
  // Extract top 3 actors
  const actors = details?.credits?.cast
    ?.slice(0, 3)
    .map(a => a.name)
    .join(' / ') || '';
  
  // Extract genres
  const genres = details?.genres?.map(g => g.name) || [];
  
  // Extract keywords
  const keywords = details?.keywords?.keywords?.map(k => k.name) || [];
  
  return {
    t: tmdbFilm.title || '',
    y: year,
    d: director,
    r: Math.round(tmdbFilm.vote_average * 10) / 10,
    c: '',
    dur: details?.runtime || 0,
    g: genres,
    s: tmdbFilm.overview || '',
    acts: actors,
    p: tmdbFilm.poster_path ? `${IMAGE_BASE}${tmdbFilm.poster_path}` : '',
    id: `tmdb${tmdbFilm.id}`,
    votes: tmdbFilm.vote_count || 0,
    e: tmdbFilm.original_title || '',
    source: 'tmdb',
    tmdbId: tmdbFilm.id,
    keywords: keywords,
    collection: null
  };
}

// Main backfill logic
async function main() {
  console.log('Starting TMDB backfill for historical quality films...\n');
  
  const existingData = loadExistingFilms();
  const existingIds = new Set(existingData.films.map(f => f.id));
  const newFilms = [];
  
  const strategies = [
    {
      name: 'Top Rated 全球高分经典',
      pages: 5,  // 前 100 部
      fetcher: (page) => getTopRated(page)
    },
    {
      name: '日本电影 (评分 >= 7.5)',
      pages: 3,  // 前 60 部
      fetcher: (page) => discoverByCriteria({ with_original_language: 'ja' }, page)
    },
    {
      name: '韩国电影 (评分 >= 7.5)',
      pages: 3,
      fetcher: (page) => discoverByCriteria({ with_original_language: 'ko' }, page)
    },
    {
      name: '法国电影 (评分 >= 7.5)',
      pages: 2,
      fetcher: (page) => discoverByCriteria({ with_original_language: 'fr' }, page)
    },
    {
      name: '意大利电影 (评分 >= 7.5)',
      pages: 2,
      fetcher: (page) => discoverByCriteria({ with_original_language: 'it' }, page)
    },
    {
      name: '德国电影 (评分 >= 7.5)',
      pages: 1,
      fetcher: (page) => discoverByCriteria({ with_original_language: 'de' }, page)
    },
    {
      name: '印度电影 (评分 >= 7.5)',
      pages: 2,
      fetcher: (page) => discoverByCriteria({ with_original_language: 'hi' }, page)
    },
    {
      name: '1990s 经典 (评分 >= 8.0)',
      pages: 2,
      fetcher: (page) => discoverByCriteria({ 
        'primary_release_date.gte': '1990-01-01',
        'primary_release_date.lte': '1999-12-31',
        'vote_average.gte': 8.0
      }, page)
    },
    {
      name: '1980s 经典 (评分 >= 8.0)',
      pages: 2,
      fetcher: (page) => discoverByCriteria({ 
        'primary_release_date.gte': '1980-01-01',
        'primary_release_date.lte': '1989-12-31',
        'vote_average.gte': 8.0
      }, page)
    },
    {
      name: '1970s 经典 (评分 >= 8.0)',
      pages: 1,
      fetcher: (page) => discoverByCriteria({ 
        'primary_release_date.gte': '1970-01-01',
        'primary_release_date.lte': '1979-12-31',
        'vote_average.gte': 8.0
      }, page)
    }
  ];
  
  // Execute each strategy
  for (const strategy of strategies) {
    console.log(`\n=== ${strategy.name} ===`);
    
    for (let page = 1; page <= strategy.pages; page++) {
      await new Promise(resolve => setTimeout(resolve, 250)); // Rate limiting
      
      try {
        const response = await strategy.fetcher(page);
        
        if (!response || !response.results || !Array.isArray(response.results)) {
          console.error(`Invalid response for ${strategy.name} page ${page}`);
          continue;
        }
        
        console.log(`Page ${page}: Found ${response.results.length} films`);
        
        for (const film of response.results) {
          const tmdbId = `tmdb${film.id}`;
          
          // Skip if already exists
          if (existingIds.has(tmdbId) || newFilms.some(f => f.id === tmdbId)) {
            continue;
          }
          
          // Apply quality filter
          if (film.vote_average < QUALITY_THRESHOLD.minRating || 
              film.vote_count < QUALITY_THRESHOLD.minVotes) {
            continue;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          try {
            const details = await getFilmDetails(film.id);
            const converted = convertTMDBFilm(film, details);
            newFilms.push(converted);
            
            console.log(`  ✓ ${film.title} (${film.release_date?.split('-')[0]}) - ${film.vote_average}/10`);
          } catch (e) {
            console.error(`  ✗ Failed: ${film.title} - ${e.message}`);
          }
        }
      } catch (e) {
        console.error(`Error fetching ${strategy.name} page ${page}:`, e.message);
      }
    }
  }
  
  // Save results
  const output = {
    timestamp: new Date().toISOString(),
    count: newFilms.length,
    qualityThreshold: QUALITY_THRESHOLD,
    films: newFilms
  };
  
  fs.writeFileSync('./_tmdb_backfilled.json', JSON.stringify(output, null, 2));
  
  console.log(`\n=== Backfill Complete ===`);
  console.log(`Total new films discovered: ${newFilms.length}`);
  console.log(`Saved to: _tmdb_backfilled.json`);
  console.log(`\nNext step: Run 'node _tmdb_merge_backfill.js' to merge into films-data.js`);
}

main().catch(console.error);
