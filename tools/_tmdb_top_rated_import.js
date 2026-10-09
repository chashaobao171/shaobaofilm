const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY || 'YOUR_API_KEY';
const DELAY_MS = 250;
const PROGRESS_FILE = '.tmdb_toprated_progress.json';
const RATING_THRESHOLD = 7.0;
const VOTE_THRESHOLD = 500;
const MAX_PAGES = parseInt(process.env.MAX_PAGES || '10');

// Genre ID到中文名称映射
const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};

// 加载现有数据
function loadExistingFilms() {
  try {
    const rawData = fs.readFileSync('films-data.js', 'utf8');
    const match = rawData.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
    if (match) {
      const cineData = eval('(' + match[1] + ')');
      return cineData.films || [];
    }
    throw new Error('Cannot parse films-data.js');
  } catch (error) {
    console.error('Error loading existing films:', error.message);
    return [];
  }
}

// 加载进度
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return {lastPage: 0, newFilms: [], stats: {total: 0, added: 0, skipped: 0, duplicate: 0}};
}

// 保存进度
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// 去重检查
function isDuplicate(film, existingFilms) {
  return existingFilms.some(f => 
    (f.tmdbId && f.tmdbId === film.tmdbId) || 
    (f.id && f.id === film.id) ||
    (f.t === film.t && f.y === film.y)
  );
}

// TMDB API请求
async function tmdbRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams({api_key: API_KEY, ...params}).toString();
    const url = `https://api.themoviedb.org/3${endpoint}?${query}`;
    
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 处理单个电影数据
function processMovieData(movie) {
  return {
    t: movie.title,
    y: parseInt(movie.release_date?.substring(0, 4) || '0'),
    r: parseFloat(movie.vote_average?.toFixed(1) || '0'),
    p: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    g: (movie.genre_ids || []).map(id => GENRE_MAP[id] || '其他').filter(g => g !== '其他'),
    source: 'tmdb',
    tmdbId: movie.id,
    doubanId: null,
    links: {
      primary: `https://www.themoviedb.org/movie/${movie.id}`,
      secondary: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movie.title)}`
    },
    id: `tmdb${movie.id}`,
    d: '',
    c: '',
    dur: 0,
    s: movie.overview || '',
    acts: '',
    votes: movie.vote_count || 0,
    e: movie.original_title || ''
  };
}

async function importTopRated() {
  console.log('=== TMDB Top Rated Import ===');
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  console.log(`MAX_PAGES: ${MAX_PAGES}`);
  console.log(`Filters: rating >= ${RATING_THRESHOLD}, votes >= ${VOTE_THRESHOLD}\n`);
  
  const existingFilms = loadExistingFilms();
  const progress = loadProgress();
  
  console.log(`Existing films: ${existingFilms.length}`);
  console.log(`Resume from page: ${progress.lastPage + 1}`);
  console.log(`New films found so far: ${progress.newFilms.length}\n`);
  
  for (let page = progress.lastPage + 1; page <= MAX_PAGES; page++) {
    console.log(`[Page ${page}/${MAX_PAGES}]`);
    
    try {
      const data = await tmdbRequest('/movie/top_rated', {page, language: 'en-US'});
      
      let pageAdded = 0;
      let pageSkipped = 0;
      
      for (const movie of data.results || []) {
        progress.stats.total++;
        
        // 过滤条件
        if (movie.vote_average < RATING_THRESHOLD || movie.vote_count < VOTE_THRESHOLD) {
          pageSkipped++;
          continue;
        }
        
        const filmData = processMovieData(movie);
        
        if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, progress.newFilms)) {
          progress.newFilms.push(filmData);
          progress.stats.added++;
          pageAdded++;
          console.log(`  + ${filmData.t} (${filmData.y}) - ${filmData.r} [${filmData.votes} votes]`);
        } else {
          progress.stats.duplicate++;
        }
      }
      
      if (pageAdded === 0) {
        console.log(`  No new films added from this page (${pageSkipped} skipped by filter)`);
      } else {
        console.log(`  Page summary: ${pageAdded} added, ${pageSkipped} skipped`);
      }
      
      progress.lastPage = page;
      saveProgress(progress);
      
      await delay(DELAY_MS);
      
    } catch (error) {
      console.error(`Error on page ${page}: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
      saveProgress(progress);
      break;
    }
  }
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Total processed: ${progress.stats.total}`);
  console.log(`New films: ${progress.newFilms.length}`);
  console.log(`Added: ${progress.stats.added}`);
  console.log(`Duplicates: ${progress.stats.duplicate}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);
}

if (require.main === module) {
  importTopRated().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {loadExistingFilms, isDuplicate, processMovieData};
