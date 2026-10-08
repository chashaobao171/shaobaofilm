const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY || 'YOUR_API_KEY';
const DELAY_MS = 250; // API请求间隔
const PROGRESS_FILE = '.tmdb_progress.json';

// Genre ID到中文名称映射
const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};

// 配置矩阵（测试模式：1 decade + 1 region）
const config = {
  decades: [
    {start: 2010, end: 2020}  // 仅测试一个年代
  ],
  regions: ['US'],  // 仅测试美国地区
  genres: [18, 878, 9648, 16, 27, 53, 80, 10752, 37, 10402], // Drama, Sci-Fi, Mystery...
  voteThreshold: 500,
  ratingThreshold: 7.0
};

// 完整配置（待测试通过后启用）
// const config = {
//   decades: [
//     {start: 1920, end: 1940},
//     {start: 1940, end: 1960},
//     {start: 1960, end: 1980},
//     {start: 1980, end: 2000},
//     {start: 2000, end: 2010},
//     {start: 2010, end: 2020},
//     {start: 2020, end: 2025}
//   ],
//   regions: ['US', 'GB', 'FR', 'JP', 'KR', 'TW', 'HK', 'IN', 'DE', 'IT', 'ES'],
//   genres: [18, 878, 9648, 16, 27, 53, 80, 10752, 37, 10402],
//   voteThreshold: 500,
//   ratingThreshold: 7.0
// };

// 加载现有数据
function loadExistingFilms() {
  try {
    const rawData = fs.readFileSync('films-data.js', 'utf8');
    // 适配 window.CINE 格式
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
  return {completed: [], pending: [], newFilms: []};
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

// TMDB API请求（带重试）
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

// 生成查询任务队列
function generateTasks(progress) {
  const tasks = [];
  for (const decade of config.decades) {
    for (const region of config.regions) {
      for (const genre of config.genres) {
        const taskId = `${decade.start}-${decade.end}_${region}_${genre}`;
        if (!progress.completed.includes(taskId)) {
          tasks.push({
            id: taskId,
            decade,
            region,
            genre
          });
        }
      }
    }
  }
  return tasks;
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
    d: '', // 导演信息需要额外API调用
    c: '', // Douban评分为空
    dur: 0, // 时长需要额外API调用
    s: movie.overview || '',
    acts: '',
    votes: movie.vote_count || 0,
    e: movie.original_title || ''
  };
}

async function main() {
  console.log('Starting TMDB Discover Enhanced...');
  console.log(`API Key: ${API_KEY.substring(0, 8)}...`);
  
  const existingFilms = loadExistingFilms();
  const progress = loadProgress();
  
  console.log(`Existing films: ${existingFilms.length}`);
  console.log(`Progress: ${progress.completed.length} completed, ${progress.pending.length} pending`);
  console.log(`New films found so far: ${progress.newFilms.length}`);
  
  // 生成任务队列
  const tasks = generateTasks(progress);
  console.log(`Total tasks to process: ${tasks.length}`);
  console.log(`Total possible combinations: ${config.decades.length} x ${config.regions.length} x ${config.genres.length} = ${config.decades.length * config.regions.length * config.genres.length}`);
  
  // 执行任务
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n[${i+1}/${tasks.length}] Processing: ${task.id}`);
    
    try {
      const results = await tmdbRequest('/discover/movie', {
        'primary_release_date.gte': `${task.decade.start}-01-01`,
        'primary_release_date.lte': `${task.decade.end}-12-31`,
        'with_origin_country': task.region,
        'with_genres': task.genre,
        'vote_count.gte': config.voteThreshold,
        'vote_average.gte': config.ratingThreshold,
        'sort_by': 'vote_average.desc',
        'page': 1
      });
      
      // 处理结果
      let addedCount = 0;
      for (const movie of results.results || []) {
        const filmData = processMovieData(movie);
        
        if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, progress.newFilms)) {
          progress.newFilms.push(filmData);
          addedCount++;
          console.log(`  + Added: ${filmData.t} (${filmData.y}) - ${filmData.r}`);
        }
      }
      
      if (addedCount === 0) {
        console.log(`  No new films found`);
      } else {
        console.log(`  Total added from this query: ${addedCount}`);
      }
      
      progress.completed.push(task.id);
      saveProgress(progress);
      
    } catch (error) {
      console.error(`  Error: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
      progress.pending.push(task.id);
      saveProgress(progress);
    }
    
    await delay(DELAY_MS);
  }
  
  console.log(`\n=== Discovery Complete ===`);
  console.log(`New films found: ${progress.newFilms.length}`);
  console.log(`Tasks completed: ${progress.completed.length}`);
  console.log(`Tasks pending: ${progress.pending.length}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {loadExistingFilms, isDuplicate, tmdbRequest, delay, GENRE_MAP};
