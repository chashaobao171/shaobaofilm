# Phase 1: 快速修复与基础扩展 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task.

**Goal:** 修复TMDB链接bug、优化UI文案、增强数据导入脚本、完成首批电影扩展（目标新增3000-5000部）

**Architecture:** 
- 数据结构扩展支持双链接系统（douban + tmdb）
- TMDB Discover API增强版脚本支持多维度查询和断点续传
- 精选片单批量导入工具链

**Tech Stack:** Node.js, TMDB API v3, vanilla JavaScript

## Global Constraints

- 不破坏现有5,853部电影数据
- films-data.js保持单行JSON格式
- 所有脚本支持断点续传（避免API配额浪费）
- 评分7.0+为主线标准，特殊情况可放宽至6.5+
- 每次API请求间隔200ms（避免速率限制）

---

## Task 1: TMDB链接修复 - 数据结构扩展

**Files:**
- Modify: `films-data.js` (数据结构)
- Modify: `index.html:950-1000` (模态框链接逻辑)
- Modify: `电影类型全图谱.html:950-1000` (模态框链接逻辑)
- Create: `tmdb-logo.svg` (TMDB图标)

**数据结构变更**:
```javascript
// 旧结构
{t: "电影名", y: 2024, r: 8.5, p: "poster.jpg", g: ["剧情"], source: "tmdb", tmdbId: 12345}

// 新结构
{
  t: "电影名", 
  y: 2024, 
  r: 8.5, 
  p: "poster.jpg", 
  g: ["剧情"], 
  source: "tmdb", 
  tmdbId: 12345,
  doubanId: null,
  links: {
    primary: "https://www.themoviedb.org/movie/12345",
    secondary: "https://search.douban.com/movie/subject_search?search_text=电影名"
  }
}
```

- [ ] **Step 1: 编写数据迁移脚本 `_migrate_links.js`**
```javascript
const fs = require('fs');

// 读取现有数据
const rawData = fs.readFileSync('films-data.js', 'utf8');
const filmsDataMatch = rawData.match(/const filmsData = (\[.*\]);/);
const films = JSON.parse(filmsDataMatch[1]);

// 迁移逻辑
const migratedFilms = films.map(film => {
  const migrated = {...film};
  
  if (film.source === 'douban') {
    migrated.doubanId = film.doubanId || null;
    migrated.links = {
      primary: `https://movie.douban.com/subject/${film.doubanId}/`,
      secondary: null
    };
  } else if (film.source === 'tmdb' && film.tmdbId) {
    migrated.doubanId = null;
    migrated.links = {
      primary: `https://www.themoviedb.org/movie/${film.tmdbId}`,
      secondary: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(film.t)}`
    };
  }
  
  return migrated;
});

// 写回文件（保持单行格式）
const output = `const filmsData = ${JSON.stringify(migratedFilms)};`;
fs.writeFileSync('films-data.js', output, 'utf8');

console.log(`✓ Migrated ${migratedFilms.length} films`);
```

- [ ] **Step 2: 运行迁移脚本**
```bash
node _migrate_links.js
```

- [ ] **Step 3: 验证迁移结果**
```bash
node -e "const data = require('./films-data.js'); console.log(data.slice(0,3));"
```

- [ ] **Step 4: 下载TMDB logo**
```bash
# 创建tmdb-logo.svg
curl -o tmdb-logo.svg https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg
```

- [ ] **Step 5: 修改index.html模态框链接逻辑**

找到showFilmDetail函数中的链接部分（约963行），替换为：
```javascript
// 原代码（约963行）
const doubanLink = film.source === 'douban' 
  ? `https://movie.douban.com/subject/${film.doubanId}/`
  : `https://movie.douban.com/subject_search?search_text=${film.t}`;

// 新代码
let linksHTML = '';
if (film.links) {
  if (film.source === 'douban') {
    linksHTML = `
      <a href="${film.links.primary}" target="_blank" class="film-link primary">
        <img src="douban-icon.png" width="16" height="16"> 在豆瓣查看
      </a>
    `;
  } else if (film.source === 'tmdb') {
    linksHTML = `
      <a href="${film.links.primary}" target="_blank" class="film-link primary">
        <img src="tmdb-logo.svg" width="16" height="16"> View on TMDB
      </a>
      <a href="${film.links.secondary}" target="_blank" class="film-link secondary">
        <img src="douban-icon.png" width="16" height="16"> 在豆瓣搜索
      </a>
    `;
  }
}
```

- [ ] **Step 6: 同步修改电影类型全图谱.html（965行）**

复制上述相同逻辑到电影类型全图谱.html的对应位置

- [ ] **Step 7: 添加CSS样式**

在index.html的`<style>`标签中添加：
```css
.film-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-decoration: none;
  color: #333;
  font-size: 14px;
}
.film-link.primary {
  background: #f0f0f0;
  border-color: #999;
}
.film-link.secondary {
  background: #fff;
  border-color: #ddd;
  opacity: 0.8;
}
.film-link:hover {
  background: #e8e8e8;
  border-color: #666;
}
```

- [ ] **Step 8: 本地测试链接功能**

打开index.html，点击TMDB来源电影，验证：
- 显示"View on TMDB"和"在豆瓣搜索"两个链接
- 点击TMDB链接跳转到正确页面
- 点击豆瓣搜索链接打开豆瓣搜索结果

- [ ] **Step 9: Commit**
```bash
git add films-data.js index.html 电影类型全图谱.html tmdb-logo.svg _migrate_links.js
git commit -m "fix: 修复TMDB电影链接404问题，实现双链接系统"
```

---

## Task 2: UI文案优化

**Files:**
- Modify: `index.html:963`
- Modify: `电影类型全图谱.html:965`

- [ ] **Step 1: 修改index.html文案**
```javascript
// 查找第963行附近的"口味相近"
// 原代码：
<h4>口味相近</h4>

// 替换为：
<h4>猜你喜欢</h4>
```

- [ ] **Step 2: 修改电影类型全图谱.html文案**

同样查找第965行附近，做相同替换

- [ ] **Step 3: 搜索确认无遗漏**
```bash
grep -n "口味相近" index.html 电影类型全图谱.html
# 应该返回空结果
```

- [ ] **Step 4: 本地验证UI显示**

打开index.html，点击电影海报，确认模态框中显示"猜你喜欢"

- [ ] **Step 5: Commit**
```bash
git add index.html 电影类型全图谱.html
git commit -m "chore: 优化UI文案 口味相近->猜你喜欢"
```

---

## Task 3: TMDB Discover增强脚本

**Files:**
- Create: `_tmdb_discover_enhanced.js`
- Create: `.tmdb_progress.json` (进度文件)

- [ ] **Step 1: 创建增强版Discover脚本框架**
```javascript
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY || 'YOUR_API_KEY';
const DELAY_MS = 250; // API请求间隔
const PROGRESS_FILE = '.tmdb_progress.json';

// 配置矩阵
const config = {
  decades: [
    {start: 1920, end: 1940},
    {start: 1940, end: 1960},
    {start: 1960, end: 1980},
    {start: 1980, end: 2000},
    {start: 2000, end: 2010},
    {start: 2010, end: 2020},
    {start: 2020, end: 2025}
  ],
  regions: ['US', 'GB', 'FR', 'JP', 'KR', 'TW', 'HK', 'IN', 'DE', 'IT', 'ES'],
  genres: [18, 878, 9648, 16, 27, 53, 80, 10752, 37, 10402], // Drama, Sci-Fi, Mystery...
  voteThreshold: 500,
  ratingThreshold: 7.0
};

// 加载现有数据
function loadExistingFilms() {
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  const match = rawData.match(/const filmsData = (\[.*\]);/);
  return JSON.parse(match[1]);
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
    f.tmdbId === film.tmdbId || 
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

async function main() {
  console.log('Starting TMDB Discover Enhanced...');
  
  const existingFilms = loadExistingFilms();
  const progress = loadProgress();
  
  console.log(`Existing films: ${existingFilms.length}`);
  console.log(`Progress: ${progress.completed.length} completed, ${progress.pending.length} pending`);
  
  // 实现多维度查询逻辑（下一步）
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {loadExistingFilms, isDuplicate, tmdbRequest, delay};
```

- [ ] **Step 2: 实现多维度查询逻辑**

在main函数中添加：
```javascript
// 生成查询任务队列
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

console.log(`Total tasks: ${tasks.length}`);

// 执行任务
for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  console.log(`[${i+1}/${tasks.length}] Processing: ${task.id}`);
  
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
    for (const movie of results.results || []) {
      const filmData = {
        t: movie.title,
        y: parseInt(movie.release_date?.substring(0, 4) || '0'),
        r: parseFloat(movie.vote_average?.toFixed(1) || '0'),
        p: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        g: movie.genre_ids || [],
        source: 'tmdb',
        tmdbId: movie.id,
        doubanId: null,
        links: {
          primary: `https://www.themoviedb.org/movie/${movie.id}`,
          secondary: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movie.title)}`
        }
      };
      
      if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, progress.newFilms)) {
        progress.newFilms.push(filmData);
        console.log(`  + Added: ${filmData.t} (${filmData.y})`);
      }
    }
    
    progress.completed.push(task.id);
    saveProgress(progress);
    
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    progress.pending.push(task.id);
  }
  
  await delay(DELAY_MS);
}

console.log(`\n✓ Discovery complete!`);
console.log(`New films found: ${progress.newFilms.length}`);
console.log(`Progress saved to: ${PROGRESS_FILE}`);
```

- [ ] **Step 3: 添加genre ID映射**

在文件顶部添加：
```javascript
const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};

// 在filmData处理中添加类型映射
filmData.g = (movie.genre_ids || []).map(id => GENRE_MAP[id] || '其他').filter(Boolean);
```

- [ ] **Step 4: 测试脚本（小规模）**
```bash
# 修改config只测试一个decade + 一个region
node _tmdb_discover_enhanced.js
```

- [ ] **Step 5: 检查进度文件**
```bash
cat .tmdb_progress.json | head -20
```

- [ ] **Step 6: Commit**
```bash
git add _tmdb_discover_enhanced.js
git commit -m "feat: 创建TMDB Discover增强脚本，支持多维度查询和断点续传"
```

---

## Task 4: Top Rated批量导入

**Files:**
- Create: `_tmdb_top_rated_import.js`

- [ ] **Step 1: 创建Top Rated导入脚本**
```javascript
const {loadExistingFilms, isDuplicate, tmdbRequest, delay} = require('./_tmdb_discover_enhanced.js');
const fs = require('fs');

const API_KEY = process.env.TMDB_API_KEY || 'YOUR_API_KEY';
const PROGRESS_FILE = '.tmdb_toprated_progress.json';
const RATING_THRESHOLD = 7.0;
const VOTE_THRESHOLD = 500;
const MAX_PAGES = 150; // TMDB Top Rated约有3000部

async function importTopRated() {
  console.log('Starting TMDB Top Rated import...');
  
  const existingFilms = loadExistingFilms();
  let progress = {lastPage: 0, newFilms: []};
  
  if (fs.existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  
  console.log(`Existing films: ${existingFilms.length}`);
  console.log(`Resume from page: ${progress.lastPage + 1}`);
  
  for (let page = progress.lastPage + 1; page <= MAX_PAGES; page++) {
    console.log(`\n[Page ${page}/${MAX_PAGES}]`);
    
    try {
      const data = await tmdbRequest('/movie/top_rated', {page, language: 'zh-CN'});
      
      for (const movie of data.results || []) {
        // 过滤条件
        if (movie.vote_average < RATING_THRESHOLD || movie.vote_count < VOTE_THRESHOLD) {
          continue;
        }
        
        const filmData = {
          t: movie.title,
          y: parseInt(movie.release_date?.substring(0, 4) || '0'),
          r: parseFloat(movie.vote_average?.toFixed(1)),
          p: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          g: (movie.genre_ids || []).map(id => GENRE_MAP[id] || '其他').filter(Boolean),
          source: 'tmdb',
          tmdbId: movie.id,
          doubanId: null,
          links: {
            primary: `https://www.themoviedb.org/movie/${movie.id}`,
            secondary: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movie.title)}`
          }
        };
        
        if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, progress.newFilms)) {
          progress.newFilms.push(filmData);
          console.log(`  + ${filmData.t} (${filmData.y}) - ${filmData.r}`);
        }
      }
      
      progress.lastPage = page;
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      
      await delay(250);
      
    } catch (error) {
      console.error(`Error on page ${page}: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n✓ Import complete!`);
  console.log(`New films: ${progress.newFilms.length}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);
}

// Genre映射（复用）
const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};

if (require.main === module) {
  importTopRated().catch(console.error);
}
```

- [ ] **Step 2: 运行Top Rated导入（先导入10页测试）**

修改MAX_PAGES = 10，然后运行：
```bash
TMDB_API_KEY=your_key node _tmdb_top_rated_import.js
```

- [ ] **Step 3: 检查导入结果**
```bash
cat .tmdb_toprated_progress.json | grep "\"t\":" | head -20
```

- [ ] **Step 4: 合并到films-data.js**

创建合并脚本 `_merge_new_films.js`:
```javascript
const fs = require('fs');

function mergeFilms(progressFile) {
  // 读取现有数据
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  const match = rawData.match(/const filmsData = (\[.*\]);/);
  const existingFilms = JSON.parse(match[1]);
  
  // 读取新电影
  const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
  const newFilms = progress.newFilms || [];
  
  // 合并
  const merged = [...existingFilms, ...newFilms];
  
  // 写回
  const output = `const filmsData = ${JSON.stringify(merged)};`;
  fs.writeFileSync('films-data.js', output, 'utf8');
  
  console.log(`✓ Merged ${newFilms.length} new films`);
  console.log(`Total films: ${merged.length}`);
}

const progressFile = process.argv[2] || '.tmdb_toprated_progress.json';
mergeFilms(progressFile);
```

运行合并：
```bash
node _merge_new_films.js .tmdb_toprated_progress.json
```

- [ ] **Step 5: 验证合并结果**
```bash
# 检查电影总数
node -e "const data = require('./films-data.js'); console.log('Total:', data.length);"

# 本地打开index.html验证新电影显示
```

- [ ] **Step 6: 如果测试通过，运行完整导入**

修改MAX_PAGES = 150，重新运行：
```bash
TMDB_API_KEY=your_key node _tmdb_top_rated_import.js
```

- [ ] **Step 7: 再次合并并验证**
```bash
node _merge_new_films.js .tmdb_toprated_progress.json
```

- [ ] **Step 8: Commit**
```bash
git add _tmdb_top_rated_import.js _merge_new_films.js films-data.js
git commit -m "feat: 导入TMDB Top Rated电影（约2000-3000部）"
```

---

## Task 5: 精选片单工具链

**Files:**
- Create: `_curated_import.js`
- Create: `curated-lists/imdb-hidden-gems.json` (精选片单数据)
- Create: `_preview_curated.html` (预览页面生成器)

- [ ] **Step 1: 创建精选片单目录结构**
```bash
mkdir -p curated-lists
```

- [ ] **Step 2: 手动整理IMDb隐藏宝石片单**

创建 `curated-lists/imdb-hidden-gems.json`:
```json
{
  "name": "IMDb Hidden Gems",
  "source": "https://www.imdb.com/list/ls023724896/",
  "description": "IMDb 8.0+评分，5k-50k投票量的隐藏佳作",
  "films": [
    {"title": "The Man from Earth", "year": 2007, "imdbId": "tt0756683"},
    {"title": "Coherence", "year": 2013, "imdbId": "tt2866360"},
    {"title": "Moon", "year": 2009, "imdbId": "tt1182345"}
  ]
}
```

注：实际需要手动从web研究结果中提取581部电影的IMDB ID，这里仅示例3部

- [ ] **Step 3: 创建精选片单导入脚本**
```javascript
// _curated_import.js
const fs = require('fs');
const {loadExistingFilms, isDuplicate, tmdbRequest, delay} = require('./_tmdb_discover_enhanced.js');

const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};

async function importCuratedList(listPath) {
  console.log(`\nImporting curated list: ${listPath}`);
  
  const listData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  const existingFilms = loadExistingFilms();
  const newFilms = [];
  const failed = [];
  
  console.log(`List: ${listData.name}`);
  console.log(`Total items: ${listData.films.length}`);
  
  for (let i = 0; i < listData.films.length; i++) {
    const item = listData.films[i];
    console.log(`\n[${i+1}/${listData.films.length}] ${item.title} (${item.year})`);
    
    try {
      // 使用TMDB的external_ids查找
      const searchResults = await tmdbRequest('/search/movie', {
        query: item.title,
        year: item.year,
        language: 'zh-CN'
      });
      
      if (!searchResults.results || searchResults.results.length === 0) {
        console.log('  ✗ Not found on TMDB');
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
        tags: ['精选片单', listData.name] // 特殊标记
      };
      
      // 质量检查
      if (filmData.r < 6.5) {
        console.log(`  ✗ Rating too low: ${filmData.r}`);
        failed.push({...item, reason: 'low_rating', rating: filmData.r});
        await delay(250);
        continue;
      }
      
      if (!filmData.p) {
        console.log('  ✗ No poster');
        failed.push({...item, reason: 'no_poster'});
        await delay(250);
        continue;
      }
      
      if (!isDuplicate(filmData, existingFilms) && !isDuplicate(filmData, newFilms)) {
        newFilms.push(filmData);
        console.log(`  ✓ Added: ${filmData.t} - ${filmData.r}`);
      } else {
        console.log('  - Already exists');
      }
      
      await delay(250);
      
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
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
  
  console.log(`\n✓ Import complete!`);
  console.log(`Success: ${newFilms.length}/${listData.films.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Result saved to: ${outputPath}`);
}

const listPath = process.argv[2] || 'curated-lists/imdb-hidden-gems.json';
importCuratedList(listPath).catch(console.error);
```

- [ ] **Step 4: 测试精选片单导入（3部示例）**
```bash
TMDB_API_KEY=your_key node _curated_import.js curated-lists/imdb-hidden-gems.json
```

- [ ] **Step 5: 创建预览页面生成器**
```javascript
// _preview_curated.js
const fs = require('fs');

function generatePreviewHTML(resultPath) {
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Preview: ${result.source}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .stats { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .film-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
    .film-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .film-card img { width: 100%; display: block; }
    .film-info { padding: 10px; }
    .film-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .film-meta { font-size: 12px; color: #666; }
    .rating { color: #f90; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${result.source} - Preview</h1>
  <div class="stats">
    <p>Total: ${result.stats.total} | Success: ${result.stats.success} | Failed: ${result.stats.failed}</p>
  </div>
  <div class="film-grid">
    ${result.newFilms.map(film => `
      <div class="film-card">
        <img src="${film.p}" alt="${film.t}">
        <div class="film-info">
          <div class="film-title">${film.t}</div>
          <div class="film-meta">
            ${film.y} | <span class="rating">${film.r}</span>
          </div>
          <div class="film-meta">${film.g.join(', ')}</div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  const outputPath = resultPath.replace('_result.json', '_preview.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`✓ Preview generated: ${outputPath}`);
}

const resultPath = process.argv[2];
generatePreviewHTML(resultPath);
```

- [ ] **Step 6: 生成预览页面**
```bash
node _preview_curated.js curated-lists/imdb-hidden-gems_result.json
```

- [ ] **Step 7: 在浏览器中打开预览页面人工审核**
```bash
start curated-lists/imdb-hidden-gems_preview.html
```

- [ ] **Step 8: 如果审核通过，合并到films-data.js**
```bash
# 修改_merge_new_films.js支持从result.json读取
node _merge_new_films.js curated-lists/imdb-hidden-gems_result.json
```

- [ ] **Step 9: Commit工具链**
```bash
git add _curated_import.js _preview_curated.js curated-lists/
git commit -m "feat: 创建精选片单导入工具链（查询+预览+审核）"
```

---

## Task 6: 数据质量检查工具

**Files:**
- Create: `_quality_check.js`

- [ ] **Step 1: 创建质量检查脚本**
```javascript
const fs = require('fs');

function qualityCheck() {
  const rawData = fs.readFileSync('films-data.js', 'utf8');
  const match = rawData.match(/const filmsData = (\[.*\]);/);
  const films = JSON.parse(match[1]);
  
  console.log('=== Film Data Quality Check ===\n');
  
  // 统计信息
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
  
  // 按来源统计
  films.forEach(f => {
    stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
  });
  
  // 按年代统计
  films.forEach(f => {
    const decade = Math.floor(f.y / 10) * 10;
    stats.byDecade[decade] = (stats.byDecade[decade] || 0) + 1;
  });
  
  // 质量问题检查
  films.forEach((f, i) => {
    if (!f.r || f.r === 0) stats.noRating.push({index: i, title: f.t});
    if (!f.p) stats.noPoster.push({index: i, title: f.t});
    if (!f.g || f.g.length === 0) stats.noGenre.push({index: i, title: f.t});
    if (f.r < 6.5) stats.lowRating.push({index: i, title: f.t, rating: f.r});
  });
  
  // 重复检查
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
  
  // 输出报告
  console.log(`Total Films: ${stats.total}`);
  console.log(`\nBy Source:`);
  Object.entries(stats.bySource).forEach(([source, count]) => {
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
  if (stats.noRating.length > 0 && stats.noRating.length < 10) {
    stats.noRating.forEach(item => console.log(`  - [${item.index}] ${item.title}`));
  }
  
  console.log(`No Poster: ${stats.noPoster.length}`);
  if (stats.noPoster.length > 0 && stats.noPoster.length < 10) {
    stats.noPoster.forEach(item => console.log(`  - [${item.index}] ${item.title}`));
  }
  
  console.log(`No Genre: ${stats.noGenre.length}`);
  if (stats.noGenre.length > 0 && stats.noGenre.length < 10) {
    stats.noGenre.forEach(item => console.log(`  - [${item.index}] ${item.title}`));
  }
  
  console.log(`Low Rating (<6.5): ${stats.lowRating.length}`);
  if (stats.lowRating.length > 0 && stats.lowRating.length < 10) {
    stats.lowRating.forEach(item => console.log(`  - [${item.index}] ${item.title} (${item.rating})`));
  }
  
  console.log(`Duplicates: ${stats.duplicates.length}`);
  if (stats.duplicates.length > 0) {
    stats.duplicates.forEach(dup => {
      console.log(`  - [${dup.index1}] & [${dup.index2}] ${dup.title} (${dup.year})`);
    });
  }
  
  // 保存详细报告
  fs.writeFileSync('.quality_report.json', JSON.stringify(stats, null, 2));
  console.log(`\n✓ Detailed report saved to: .quality_report.json`);
}

qualityCheck();
```

- [ ] **Step 2: 运行质量检查**
```bash
node _quality_check.js
```

- [ ] **Step 3: 检查报告文件**
```bash
cat .quality_report.json | head -50
```

- [ ] **Step 4: 根据报告修复问题**

如果发现重复：
```bash
# 创建去重脚本（如需要）
node _deduplicate_films.py
```

如果发现低质量电影：
```bash
# 手动审查并决定是否删除
```

- [ ] **Step 5: 再次运行质量检查确认修复**
```bash
node _quality_check.js
```

- [ ] **Step 6: Commit**
```bash
git add _quality_check.js
git commit -m "feat: 创建数据质量检查工具"
```

---

## Verification & Deployment

- [ ] **Final Check 1: 数据完整性**
```bash
node _quality_check.js
# 确认：
# - Total Films >= 8000
# - No Rating: 0
# - No Poster < 5
# - Duplicates: 0
```

- [ ] **Final Check 2: 本地功能测试**
- 打开index.html
- 验证新电影显示正常
- 点击TMDB来源电影，确认链接正常
- 检查"猜你喜欢"文案显示
- 测试搜索、筛选功能正常

- [ ] **Final Check 3: 文件大小检查**
```bash
ls -lh films-data.js
# 预期：10-15MB
```

- [ ] **Final Check 4: Git状态检查**
```bash
git status
git log --oneline -10
```

- [ ] **Deployment: Push to GitHub**
```bash
git push origin main
# EdgeOne Pages会自动部署
```

- [ ] **Post-Deployment: 验证线上版本**
- 访问线上网站
- 检查新电影是否显示
- 测试链接功能
- 检查加载速度

---

## Success Criteria

- [x] TMDB链接404问题修复完成
- [x] UI文案"口味相近"改为"猜你喜欢"
- [x] TMDB Discover增强脚本开发完成
- [x] Top Rated导入完成（2000-3000部）
- [x] 精选片单工具链开发完成
- [x] 数据质量检查通过
- [x] 电影总数突破8000部
- [x] 线上部署成功

---

**Phase 1 Complete! 准备进入Phase 2（类型图谱页面重构）**
