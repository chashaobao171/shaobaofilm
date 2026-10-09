/**
 * TMDB Auto Discovery Script - Phase 1
 * 
 * Functions:
 * 1. Discover new popular/trending films from TMDB
 * 2. Complete film series using TMDB Collections
 * 3. Merge with existing films-data.js (Douban data)
 * 4. Extract keywords for future taxonomy mapping
 */

const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// ===== 拉取门槛（可用环境变量覆盖）=====
const MIN_RATING = parseFloat(process.env.TMDB_MIN_RATING || '7.0'); // 最低 TMDB 评分
const MIN_VOTES = parseInt(process.env.TMDB_MIN_VOTES || '100', 10); // 最低评价人数

// 标题归一化 + 去重键（跨来源按 片名|年份 判重）
function normTitle(t) {
  return String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function filmKey(t, y) {
  return `${normTitle(t)}|${y === null || y === undefined || y === '' ? '' : Number(y)}`;
}
// 是否达到拉取门槛（评分 + 票数双达标）
function passesThreshold(film) {
  const rating = Number(film.vote_average) || 0;
  const votes = Number(film.vote_count) || 0;
  return rating >= MIN_RATING && votes >= MIN_VOTES;
}

// Load existing films data
function loadExistingFilms() {
  const content = fs.readFileSync('./films-data.js', 'utf8');
  const match = content.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) throw new Error('Cannot parse films-data.js');
  return eval('(' + match[1] + ')');
}

// HTTP GET helper with error handling
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for API errors
          if (res.statusCode !== 200) {
            console.error(`API Error: Status ${res.statusCode}`);
            console.error(`Response: ${data}`);
            reject(new Error(`API returned status ${res.statusCode}`));
            return;
          }
          
          resolve(json);
        } catch (e) {
          console.error(`JSON parse error: ${e.message}`);
          console.error(`Raw data: ${data}`);
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Discover trending films (last 7 days)
async function discoverTrending() {
  const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=zh-CN`;
  return fetchJSON(url);
}

// Discover popular films
async function discoverPopular() {
  const url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=zh-CN&page=1`;
  return fetchJSON(url);
}

// Get film details including keywords, credits, and collection info
async function getFilmDetails(tmdbId) {
  const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=zh-CN&append_to_response=keywords,credits,belongs_to_collection`;
  return fetchJSON(url);
}

// Get collection details
async function getCollection(collectionId) {
  const url = `${BASE_URL}/collection/${collectionId}?api_key=${API_KEY}&language=zh-CN`;
  return fetchJSON(url);
}

// Convert TMDB film to our data format
function convertTMDBFilm(tmdbFilm, details) {
  const year = tmdbFilm.release_date ? parseInt(tmdbFilm.release_date.split('-')[0]) : null;
  
  // Map TMDB genres to Douban-style genre names
  const genreMap = {
    28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
    99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
    27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
    10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
  };
  
  const genres = tmdbFilm.genre_ids ? 
    tmdbFilm.genre_ids.map(id => genreMap[id]).filter(Boolean) :
    details?.genres?.map(g => genreMap[g.id]).filter(Boolean) || [];
  
  // Extract keywords
  const keywords = details?.keywords?.keywords?.map(k => k.name) || [];
  
  // Extract director
  const director = details?.credits?.crew?.find(c => c.job === 'Director')?.name || '';
  
  // Extract main actors (top 3)
  const actors = details?.credits?.cast?.slice(0, 3).map(a => a.name).join(' / ') || '';
  
  return {
    t: tmdbFilm.title || '',
    y: year,
    d: director,
    r: Math.round(tmdbFilm.vote_average * 10) / 10, // TMDB uses 0-10 scale
    c: '', // No Douban rating for TMDB films
    dur: details?.runtime || 0,
    g: genres,
    s: tmdbFilm.overview || '',
    acts: actors,
    p: tmdbFilm.poster_path ? `${IMAGE_BASE}${tmdbFilm.poster_path}` : '',
    id: `tmdb${tmdbFilm.id}`,
    votes: tmdbFilm.vote_count || 0,
    e: tmdbFilm.original_title || '',
    tmdbId: tmdbFilm.id,
    keywords: keywords,
    collection: details?.belongs_to_collection?.id || null
  };
}

// Main discovery logic
async function main() {
  console.log('Starting TMDB discovery...');
  
  const existingData = loadExistingFilms();

  // 建立多重去重索引：库内 id / 库内 tmdbId / 库内 片名|年份
  const existingIds = new Set();
  const existingTmdbIds = new Set();
  const existingKeys = new Set();
  existingData.films.forEach(f => {
    if (f.id) existingIds.add(f.id);
    if (f.tmdbId !== null && f.tmdbId !== undefined) existingTmdbIds.add(Number(f.tmdbId));
    if (f.t) existingKeys.add(filmKey(f.t, f.y));
  });

  const newFilms = [];
  const newIds = new Set();
  const newTmdbIds = new Set();
  const newKeys = new Set();
  const collections = new Set();
  let skippedDup = 0;
  let skippedLow = 0;

  // 统一判重：命中「库内已有」或「本次已加入」任一维度即视为重复
  const isDuplicate = (filmId, tmdbId, title, year) => {
    if (filmId && (existingIds.has(filmId) || newIds.has(filmId))) return true;
    if (tmdbId !== null && tmdbId !== undefined &&
        (existingTmdbIds.has(Number(tmdbId)) || newTmdbIds.has(Number(tmdbId)))) return true;
    const key = filmKey(title, year);
    if (key && key !== '|' && (existingKeys.has(key) || newKeys.has(key))) return true;
    return false;
  };
  const remember = (film) => {
    if (film.id) newIds.add(film.id);
    if (film.tmdbId !== null && film.tmdbId !== undefined) newTmdbIds.add(Number(film.tmdbId));
    if (film.t) newKeys.add(filmKey(film.t, film.y));
  };
  
  // Step 1: Discover trending films
  console.log('Fetching trending films...');
  const trending = await discoverTrending();
  
  // Validate response structure
  if (!trending || !trending.results || !Array.isArray(trending.results)) {
    console.error('Invalid trending response:', JSON.stringify(trending, null, 2));
    throw new Error('TMDB API returned invalid trending data structure');
  }
  
  console.log(`Found ${trending.results.length} trending films`);
  
  for (const film of trending.results.slice(0, 20)) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    
    const tmdbId = `tmdb${film.id}`;
    const year = film.release_date ? parseInt(film.release_date.split('-')[0]) : null;

    if (isDuplicate(tmdbId, film.id, film.title, year)) {
      console.log(`Skip duplicate: ${film.title}`);
      skippedDup++;
      continue;
    }
    if (!passesThreshold(film)) {
      console.log(`Skip low-quality: ${film.title} (rating=${(Number(film.vote_average) || 0).toFixed(1)}, votes=${film.vote_count || 0})`);
      skippedLow++;
      continue;
    }

    try {
      const details = await getFilmDetails(film.id);
      const converted = convertTMDBFilm(film, details);
      newFilms.push(converted);
      remember(converted);
      
      if (converted.collection) {
        collections.add(converted.collection);
      }
      
      console.log(`Added: ${film.title} (${year || 'N/A'})`);
    } catch (e) {
      console.error(`Failed to fetch details for ${film.title}:`, e.message);
    }
  }
  
  // Step 2: Discover popular films
  console.log('Fetching popular films...');
  const popular = await discoverPopular();
  
  // Validate response structure
  if (!popular || !popular.results || !Array.isArray(popular.results)) {
    console.error('Invalid popular response:', JSON.stringify(popular, null, 2));
    throw new Error('TMDB API returned invalid popular data structure');
  }
  
  console.log(`Found ${popular.results.length} popular films`);
  
  for (const film of popular.results.slice(0, 20)) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    
    const tmdbId = `tmdb${film.id}`;
    const year = film.release_date ? parseInt(film.release_date.split('-')[0]) : null;

    if (isDuplicate(tmdbId, film.id, film.title, year)) {
      console.log(`Skip duplicate: ${film.title}`);
      skippedDup++;
      continue;
    }
    if (!passesThreshold(film)) {
      console.log(`Skip low-quality: ${film.title} (rating=${(Number(film.vote_average) || 0).toFixed(1)}, votes=${film.vote_count || 0})`);
      skippedLow++;
      continue;
    }

    try {
      const details = await getFilmDetails(film.id);
      const converted = convertTMDBFilm(film, details);
      newFilms.push(converted);
      remember(converted);
      
      if (converted.collection) {
        collections.add(converted.collection);
      }
      
      console.log(`Added: ${film.title} (${year || 'N/A'})`);
    } catch (e) {
      console.error(`Failed to fetch details for ${film.title}:`, e.message);
    }
  }
  
  // Step 3: Complete collections
  console.log(`\nProcessing ${collections.size} collections...`);
  
  for (const collectionId of collections) {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const collection = await getCollection(collectionId);
      console.log(`Collection: ${collection.name}`);
      
      for (const film of collection.parts) {
        const tmdbId = `tmdb${film.id}`;
        const year = film.release_date ? parseInt(film.release_date.split('-')[0]) : null;

        // 系列补全不做质量门槛，以保证系列完整；但仍严格去重
        if (isDuplicate(tmdbId, film.id, film.title, year)) {
          skippedDup++;
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        const details = await getFilmDetails(film.id);
        const converted = convertTMDBFilm(film, details);
        newFilms.push(converted);
        remember(converted);
        
        console.log(`  + ${film.title} (${year || 'N/A'})`);
      }
    } catch (e) {
      console.error(`Failed to fetch collection ${collectionId}:`, e.message);
    }
  }
  
  // Step 3: Save discovered films
  console.log(`\n=== Summary ===`);
  console.log(`Threshold: rating >= ${MIN_RATING}, votes >= ${MIN_VOTES}`);
  console.log(`New films discovered: ${newFilms.length}`);
  console.log(`Skipped (duplicate): ${skippedDup}`);
  console.log(`Skipped (low-quality): ${skippedLow}`);
  console.log(`Collections completed: ${collections.size}`);
  
  if (newFilms.length > 0) {
    fs.writeFileSync('_tmdb_discovered.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      count: newFilms.length,
      films: newFilms
    }, null, 2));
    
    console.log('\nSaved to _tmdb_discovered.json');
    console.log('Run merge script to integrate into films-data.js');
  } else {
    console.log('No new films to add.');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
