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
    p: tmdbFilm.poster_path ? `tmdb${tmdbFilm.poster_path}` : '',
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
  const existingIds = new Set(existingData.films.map(f => f.id));
  const newFilms = [];
  const collections = new Set();
  
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
    if (existingIds.has(tmdbId)) {
      console.log(`Skip existing: ${film.title}`);
      continue;
    }
    
    try {
      const details = await getFilmDetails(film.id);
      const converted = convertTMDBFilm(film, details);
      newFilms.push(converted);
      
      if (converted.collection) {
        collections.add(converted.collection);
      }
      
      console.log(`Added: ${film.title} (${film.release_date?.split('-')[0] || 'N/A'})`);
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
    if (existingIds.has(tmdbId)) {
      console.log(`Skip existing: ${film.title}`);
      continue;
    }
    
    try {
      const details = await getFilmDetails(film.id);
      const converted = convertTMDBFilm(film, details);
      newFilms.push(converted);
      
      if (converted.collection) {
        collections.add(converted.collection);
      }
      
      console.log(`Added: ${film.title} (${film.release_date?.split('-')[0] || 'N/A'})`);
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
        if (existingIds.has(tmdbId) || newFilms.some(f => f.id === tmdbId)) {
          continue;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        const details = await getFilmDetails(film.id);
        const converted = convertTMDBFilm(film, details);
        newFilms.push(converted);
        
        console.log(`  + ${film.title} (${film.release_date?.split('-')[0] || 'N/A'})`);
      }
    } catch (e) {
      console.error(`Failed to fetch collection ${collectionId}:`, e.message);
    }
  }
  
  // Step 3: Save discovered films
  console.log(`\n=== Summary ===`);
  console.log(`New films discovered: ${newFilms.length}`);
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
