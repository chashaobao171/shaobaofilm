const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY || 'YOUR_API_KEY';

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
  } catch (error) {
    console.error('Error loading existing films:', error.message);
  }
  return [];
}

// 去重检查
function isDuplicate(film, existingFilms) {
  return existingFilms.some(f => 
    f.tmdbId === film.tmdbId || 
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
          resolve(JSON.parse(data));
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

async function importCuratedList(listPath) {
  console.log(`\nImporting curated list: ${listPath}`);
  
  const listData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const existingFilms = loadExistingFilms();
  const newFilms = [];
  const failed = [];
  
  console.log(`List: ${listData.name}`);
  console.log(`Total items: ${listData.films.length}`);
  console.log(`Existing films in database: ${existingFilms.length}\n`);
  
  for (let i = 0; i < listData.films.length; i++) {
    const item = listData.films[i];
    console.log(`[${i+1}/${listData.films.length}] ${item.title} (${item.year})`);
    
    try {
      // 使用TMDB的search API查找
      const searchResults = await tmdbRequest('/search/movie', {
        query: item.title,
        year: item.year,
        language: 'zh-CN'
      });
      
      if (!searchResults.results || searchResults.results.length === 0) {
        console.log('  X Not found on TMDB');
        failed.push({...item, reason: 'not_found'});
        await delay(250);
        continue;
      }
      
      const movie = searchResults.results[0];
      
      // 获取详细信息
      const details = await tmdbRequest(`/movie/${movie.id}`, {language: 'zh-CN'});
      
      const filmData = {
        t: details.title || item.title,
        y: parseInt(details.release_date?.substring(0, 4) || item.year),
        r: parseFloat(details.vote_average?.toFixed(1) || '0'),
        p: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        g: (details.genres || []).map(g => GENRE_MAP[g.id] || g.name).filter(Boolean),
        source: 'tmdb',
        tmdbId: details.id,
        doubanId: null,
        imdbId: item.imdbId || null,
        links: {
          primary: `https://www.themoviedb.org/movie/${details.id}`,
          secondary: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(details.title)}`
        },
        tags: ['精选片单', listData.name]
      };
      
      // 质量检查
      if (filmData.r < 6.5) {
        console.log(`  X Rating too low: ${filmData.r}`);
        failed.push({...item, reason: 'low_rating', rating: filmData.r});
        await delay(250);
        continue;
      }
      
      if (!filmData.p) {
        console.log('  X No poster');
        failed.push({...item, reason: 'no_poster'});
        await delay(250);
        continue;
      }
      
      if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, newFilms)) {
        newFilms.push(filmData);
        console.log(`  + Added: ${filmData.t} - ${filmData.r}`);
      } else {
        console.log('  - Already exists');
      }
      
      await delay(250);
      
    } catch (error) {
      console.error(`  X Error: ${error.message}`);
      failed.push({...item, reason: 'api_error', error: error.message});
    }
  }
  
  // 保存结果
  const outputPath = listPath.replace('.json', '_result.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    source: listData.name,
    newFilms,
    failed,
    stats: {
      total: listData.films.length,
      success: newFilms.length,
      failed: failed.length
    }
  }, null, 2));
  
  console.log(`\n=== Import Complete ===`);
  console.log(`Success: ${newFilms.length}/${listData.films.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Result saved to: ${outputPath}`);
}

const listPath = process.argv[2] || 'curated-lists/imdb-hidden-gems.json';
importCuratedList(listPath).catch(console.error);
