/**
 * _expansion_orchestrator.js — 影库扩充 P2~P8 阶段编排器（GitHub Actions 云端执行）
 *
 * P2 奖项/电影节  P3 导演作品  P4 制作公司  P5 小众关键词  P6 国别  P7 系列  P8 纪录片
 * 复用 tools/_tmdb_top_rated_import.js 的 tmdbRequest / processMovieData / isDuplicate / delay。
 * 输出 .expansion_progress.json，供 _merge_all_progress.js 合并进 films-data.js。
 *
 * 用法:
 *   node tools/_expansion_orchestrator.js            # 跑全部 P2~P8
 *   node tools/_expansion_orchestrator.js --phases p3,p4   # 只跑指定阶段
 *   node tools/_expansion_orchestrator.js --max-calls 400  # 每阶段 API 调用上限(默认400)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const base = require('./_tmdb_top_rated_import.js');

const {loadExistingFilms, isDuplicate, processMovieData, tmdbRequest, delay} = base;

const PROGRESS_FILE = '.expansion_progress.json';
const DOC_GENRE_ID = 99;
const RATING_THRESHOLD = 7.0;
const VOTE_THRESHOLD = 300;
const DELAY_MS = 250;

// ---------- 工具函数 ----------

function hasArg(args, name) { return args.includes('--' + name); }
function argValue(args, name, def) {
  for (const a of args) {
    if (a.startsWith('--' + name + '=')) return a.slice(name.length + 3);
  }
  return def;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  return {phases: {}, newFilms: [], stats: {added: 0, skipped: 0}};
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }

function phaseProgress(p, name) {
  if (!p.phases[name]) p.phases[name] = {done: false, count: 0, films: []};
  return p.phases[name];
}

/** 解析一个 TMDB 电影对象为影片结构并入队（去重）。返回是否新增。 */
function enqueueFilm(p, phaseName, movie, existing, extra) {
  const f = processMovieData(movie);
  if (extra && typeof extra === 'object') Object.assign(f, extra);
  if (!f.t || !f.y) return false;
  if (isDuplicate(f, existing) || isDuplicate(f, p.newFilms)) {
    p.stats.skipped++;
    return false;
  }
  p.newFilms.push(f);
  p.stats.added++;
  phaseProgress(p, phaseName).count++;
  phaseProgress(p, phaseName).films.push(f.t + ' (' + f.y + ')');
  return true;
}

/** 网络抓取（用于 SPARQL / 榜单页），返回文本或抛错。 */
function fetchText(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {timeout: timeoutMs || 20000}, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
  });
}

/** 通用解析循环：从列表接口分页拉取，按过滤条件入队。 */
async function runListPhase(p, name, endpoint, params, existing, opts, maxCalls) {
  const pgr = phaseProgress(p, name);
  if (pgr.done) { console.log('[' + name + '] 已完成，跳过'); return; }
  console.log('\n=== P' + (opts.label || name) + ' ===');
  let page = 1, calls = 0;
  while (page <= (opts.maxPages || 5)) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限(' + maxCalls + ')，暂停'); break; }
    try {
      const data = await tmdbRequest(endpoint, Object.assign({page, language: 'en-US'}, params));
      calls++;
      const results = data.results || [];
      if (!results.length) break;
      for (const m of results) {
        if (opts.minVotes && (m.vote_count || 0) < opts.minVotes) continue;
        if (opts.minRating && (m.vote_average || 0) < opts.minRating) continue;
        // 类型兜底：确保指定类型出现在 g 中
        let mm = m;
        if (opts.forceGenreId) {
          const gids = m.genre_ids || [];
          if (!gids.includes(opts.forceGenreId)) {
            mm = Object.assign({}, m, {genre_ids: gids.concat(opts.forceGenreId)});
          }
        }
        enqueueFilm(p, name, mm, existing, opts.extra);
      }
      console.log('  第' + page + '页: ' + results.length + ' 条');
      if (page >= (data.total_pages || 1)) break;
      page++;
      await delay(DELAY_MS);
    } catch (e) {
      console.log('  [ERROR] 第' + page + '页失败: ' + e.message);
      break;
    }
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[' + name + '] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P2 奖项/电影节（Wikidata SPARQL 获奖片单 + TMDB 解析） ----------

const AWARD_QUERIES = [
  {label: '奥斯卡最佳影片', q: 'SELECT ?film ?year WHERE { ?film wdt:P31 wd:Q11424; p:P166 ?st. ?st ps:P166 wd:Q103360; pq:P585 ?date. BIND(YEAR(?date) AS ?year) }'},
  {label: '戛纳金棕榈', q: 'SELECT ?film ?year WHERE { ?film wdt:P31 wd:Q11424; p:P166 ?st. ?st ps:P166 wd:Q173636; pq:P585 ?date. BIND(YEAR(?date) AS ?year) }'},
  {label: '威尼斯金狮', q: 'SELECT ?film ?year WHERE { ?film wdt:P31 wd:Q11424; p:P166 ?st. ?st ps:P166 wd:Q207433; pq:P585 ?date. BIND(YEAR(?date) AS ?year) }'},
  {label: '柏林金熊', q: 'SELECT ?film ?year WHERE { ?film wdt:P31 wd:Q11424; p:P166 ?st. ?st ps:P166 wd:Q154079; pq:P585 ?date. BIND(YEAR(?date) AS ?year) }'}
];

async function phaseP2(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p2');
  if (pgr.done) { console.log('[p2] 已完成，跳过'); return; }
  console.log('\n=== P2 奖项/电影节（Wikidata SPARQL + TMDB）===');
  let candidates = [];
  for (const aw of AWARD_QUERIES) {
    const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(aw.q);
    try {
      const text = await fetchText(url, 30000);
      const json = JSON.parse(text);
      const rows = ((json.results || {}).bindings || []).slice(0, 400);
      for (const r of rows) {
        if (!r.film || !r.film.value) continue;
        const m = r.film.value.match(/Q(\d+)$/);
        const title = (r.filmLabel ? r.filmLabel.value : null);
        const year = r.year ? parseInt(r.year.value) : 0;
        if (m && title) candidates.push({qid: m[1], title, year, award: aw.label});
      }
      console.log('  ' + aw.label + ': SPARQL 返回 ' + rows.length + ' 条');
    } catch (e) {
      console.log('  [ERROR] ' + aw.label + ' SPARQL 失败: ' + e.message + '（跳过该奖项）');
    }
  }
  console.log('  共收集候选 ' + candidates.length + ' 条，开始 TMDB 解析...');
  let calls = 0;
  for (const c of candidates) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    try {
      const data = await tmdbRequest('/search/movie', {query: c.title, year: c.year, language: 'en-US'});
      calls++;
      const hit = (data.results || []).find(r => parseInt((r.release_date || '').substring(0, 4) || '0') === c.year) || (data.results || [])[0];
      if (hit) {
        const f = processMovieData(hit);
        f.source = 'awards';
        if (!f.lists) f.lists = [];
        f.lists.push(c.award);
        if (isDuplicate(f, existing) || isDuplicate(f, p.newFilms)) { p.stats.skipped++; }
        else {
          p.newFilms.push(f); p.stats.added++; pgr.count++;
          pgr.films.push(f.t + ' (' + f.y + ')');
        }
      }
    } catch (e) { console.log('  [ERROR] ' + c.title + ': ' + e.message); }
    await delay(DELAY_MS);
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p2] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P3 导演作品补全 ----------

const DIRECTOR_SEEDS = [
  '周星驰', '岩井俊二', '姜文', '王家卫', '侯孝贤', '李安', '张艺谋', '陈凯歌', '贾樟柯', '娄烨',
  '宫崎骏', '是枝裕和', '黑泽明', '小津安二郎', '北野武', '是枝裕和',
  '昆汀·塔伦蒂诺', '克里斯托弗·诺兰', '马丁·斯科塞斯', '斯坦利·库布里克', '阿尔弗雷德·希区柯克',
  '弗朗西斯·福特·科波拉', '史蒂文·斯皮尔伯格', '大卫·芬奇', '韦斯·安德森', '奉俊昊', '朴赞郁',
  '阿方索·卡隆', '保罗·托马斯·安德森', '泰伦斯·马力克', '维姆·文德斯', '费德里科·费里尼',
  '英格玛·伯格曼', '安德烈·塔可夫斯基', '弗朗索瓦·特吕弗', '让-吕克·戈达尔', '大卫·林奇',
  '科恩兄弟', '大卫·柯南伯格', '迈克尔·哈内克', '拉斯·冯·提尔', '佩德罗·阿莫多瓦', '吉姆·贾木许'
];

async function phaseP3(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p3');
  if (pgr.done) { console.log('[p3] 已完成，跳过'); return; }
  console.log('\n=== P3 导演作品补全（' + DIRECTOR_SEEDS.length + ' 位导演）===');
  let calls = 0;
  for (const name of DIRECTOR_SEEDS) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    try {
      const data = await tmdbRequest('/search/person', {query: name, language: 'zh-CN'});
      calls++;
      const person = (data.results || [])[0];
      if (!person) { console.log('  [P3] 未找到人物: ' + name); continue; }
      const credits = await tmdbRequest('/person/' + person.id + '/movie_credits', {language: 'zh-CN'});
      calls++;
      const crew = credits.crew || [];
      const directed = crew.filter(c => c.job === 'Director' && c.title);
      let added = 0;
      for (const m of directed) {
        const f = processMovieData(m);
        f.source = 'filmography';
        f.d = name;
        if (!f.dur && m.runtime) f.dur = m.runtime;
        if (isDuplicate(f, existing) || isDuplicate(f, p.newFilms)) continue;
        p.newFilms.push(f); p.stats.added++; pgr.count++; added++;
        pgr.films.push(f.t + ' (' + f.y + ')');
      }
      console.log('  ' + name + ': 导演作品 ' + directed.length + ' 部，净增 ' + added + ' 部');
    } catch (e) { console.log('  [ERROR] ' + name + ': ' + e.message); }
    await delay(DELAY_MS);
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p3] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P4 制作公司 ----------

const COMPANY_IDS = {
  'A24': 41077, '焦点影业': 10163, '皮克斯': 3, '梦工厂': 521, '吉卜力': 10342,
  '华纳兄弟': 174, '环球影业': 33, '派拉蒙': 4, '迪士尼': 2, '索尼哥伦比亚': 5,
  '二十世纪福斯': 25, '米高梅': 8411, '米拉麦克斯': 14, '新线': 12, '狮门': 134137,
  '索尼经典': 34446, 'IFC': 3287, 'Magnolia': 12000
};

async function phaseP4(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p4');
  if (pgr.done) { console.log('[p4] 已完成，跳过'); return; }
  console.log('\n=== P4 制作公司（' + Object.keys(COMPANY_IDS).length + ' 家）===');
  let calls = 0;
  for (const [label, id] of Object.entries(COMPANY_IDS)) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    let page = 1, cnt = 0;
    while (page <= 3 && calls < maxCalls) {
      try {
        const data = await tmdbRequest('/discover/movie', {
          with_companies: id, page, language: 'en-US',
          'vote_count.gte': 200, 'vote_average.gte': 6.5, sort_by: 'vote_count.desc'
        });
        calls++;
        const results = data.results || [];
        if (!results.length) break;
        for (const m of results) {
          if (enqueueFilm(p, 'p4', m, existing, {source: 'studio', studio: label})) cnt++;
        }
        if (page >= (data.total_pages || 1)) break;
        page++;
        await delay(DELAY_MS);
      } catch (e) { console.log('  [ERROR] ' + label + ' 第' + page + '页: ' + e.message); break; }
    }
    console.log('  ' + label + ': 净增 ' + cnt + ' 部');
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p4] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P5 小众关键词 ----------

const KEYWORDS = [
  'cult film', 'avant-garde', 'neo-noir', 'surrealism', 'folk horror', 'giallo',
  'slow cinema', 'independent film', 'experimental', 'arthouse', 'found footage',
  'black comedy', 'psychological thriller', 'dystopia', 'film noir'
];

async function phaseP5(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p5');
  if (pgr.done) { console.log('[p5] 已完成，跳过'); return; }
  console.log('\n=== P5 小众关键词（' + KEYWORDS.length + ' 个）===');
  let calls = 0;
  for (const kw of KEYWORDS) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    try {
      const kd = await tmdbRequest('/search/keyword', {query: kw});
      calls++;
      const kid = (kd.results || []).find(r => r.name && r.name.toLowerCase() === kw.toLowerCase());
      const id = kid ? kid.id : (kd.results || [])[0] && (kd.results || [])[0].id;
      if (!id) { console.log('  [P5] 未找到关键词: ' + kw); continue; }
      const data = await tmdbRequest('/discover/movie', {
        with_keywords: id, page: 1, language: 'en-US',
        'vote_count.gte': 200, 'vote_average.gte': 7.0, sort_by: 'vote_count.desc'
      });
      calls++;
      let cnt = 0;
      for (const m of (data.results || [])) {
        if (enqueueFilm(p, 'p5', m, existing, {source: 'niche', keywords: kw})) cnt++;
      }
      console.log('  [' + kw + '] 净增 ' + cnt + ' 部');
    } catch (e) { console.log('  [ERROR] ' + kw + ': ' + e.message); }
    await delay(DELAY_MS);
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p5] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P6 国别补全 ----------

const COUNTRIES = {
  '印度': {lang: 'hi', ctry: 'IN'}, '韩国': {lang: 'ko', ctry: 'KR'}, '墨西哥': {lang: 'es', ctry: 'MX'},
  '巴西': {lang: 'pt', ctry: 'BR'}, '阿根廷': {lang: 'es', ctry: 'AR'}, '伊朗': {lang: 'fa', ctry: 'IR'},
  '土耳其': {lang: 'tr', ctry: 'TR'}, '埃及': {lang: 'ar', ctry: 'EG'}, '丹麦': {lang: 'da', ctry: 'DK'},
  '瑞典': {lang: 'sv', ctry: 'SE'}, '挪威': {lang: 'no', ctry: 'NO'}, '波兰': {lang: 'pl', ctry: 'PL'},
  '罗马尼亚': {lang: 'ro', ctry: 'RO'}, '希腊': {lang: 'el', ctry: 'GR'}, '泰国': {lang: 'th', ctry: 'TH'}
};

async function phaseP6(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p6');
  if (pgr.done) { console.log('[p6] 已完成，跳过'); return; }
  console.log('\n=== P6 国别补全（' + Object.keys(COUNTRIES).length + ' 国）===');
  let calls = 0;
  for (const [label, cfg] of Object.entries(COUNTRIES)) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    let page = 1, cnt = 0;
    while (page <= 3 && calls < maxCalls) {
      try {
        const data = await tmdbRequest('/discover/movie', {
          with_original_language: cfg.lang, page, language: 'en-US',
          'vote_count.gte': 150, 'vote_average.gte': 6.8, sort_by: 'vote_count.desc'
        });
        calls++;
        const results = data.results || [];
        if (!results.length) break;
        for (const m of results) {
          if (enqueueFilm(p, 'p6', m, existing, {source: 'country', c: label})) cnt++;
        }
        if (page >= (data.total_pages || 1)) break;
        page++;
        await delay(DELAY_MS);
      } catch (e) { console.log('  [ERROR] ' + label + ' 第' + page + '页: ' + e.message); break; }
    }
    console.log('  ' + label + ': 净增 ' + cnt + ' 部');
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p6] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P7 系列片 ----------

const COLLECTIONS = [
  ['詹姆斯·邦德', '007'], ['漫威电影宇宙', 'MCU'], ['星球大战', '星球大战'], ['哈利·波特', '哈利波特'],
  ['指环王', '指环王'], ['哥斯拉', '哥斯拉'], ['速度与激情', '速度与激情'], ['碟中谍', '碟中谍'],
  ['变形金刚', '变形金刚'], ['侏罗纪公园', '侏罗纪']
];

async function phaseP7(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p7');
  if (pgr.done) { console.log('[p7] 已完成，跳过'); return; }
  console.log('\n=== P7 系列片 ===');
  let calls = 0;
  for (const [cnName, tag] of COLLECTIONS) {
    if (calls >= maxCalls) { console.log('  达到 API 调用上限，暂停'); break; }
    try {
      const s = await tmdbRequest('/search/collection', {query: cnName, language: 'en-US'});
      calls++;
      const col = (s.results || [])[0];
      if (!col) { console.log('  [P7] 未找到系列: ' + cnName); continue; }
      const colData = await tmdbRequest('/collection/' + col.id, {language: 'en-US'});
      calls++;
      let cnt = 0;
      for (const m of (colData.parts || [])) {
        if (enqueueFilm(p, 'p7', m, existing, {source: 'collection', collection: tag})) cnt++;
      }
      console.log('  ' + cnName + ': 共 ' + (colData.parts || []).length + ' 部，净增 ' + cnt + ' 部');
    } catch (e) { console.log('  [ERROR] ' + cnName + ': ' + e.message); }
    await delay(DELAY_MS);
  }
  pgr.done = true;
  saveProgress(p);
  console.log('[p7] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- P8 纪录片 ----------

async function phaseP8(p, existing, maxCalls) {
  const pgr = phaseProgress(p, 'p8');
  if (pgr.done) { console.log('[p8] 已完成，跳过'); return; }
  console.log('\n=== P8 纪录片（genre 99）===');
  await runListPhase(p, 'p8', '/discover/movie', {
    with_genres: DOC_GENRE_ID, 'vote_count.gte': VOTE_THRESHOLD, 'vote_average.gte': RATING_THRESHOLD,
    sort_by: 'vote_count.desc'
  }, existing, {label: '纪录片', minVotes: VOTE_THRESHOLD, minRating: RATING_THRESHOLD, forceGenreId: DOC_GENRE_ID}, maxCalls);
  pgr.done = true;
  saveProgress(p);
  console.log('[p8] 净增 ' + pgr.count + ' 部，累计 ' + p.newFilms.length + ' 部');
}

// ---------- 入口 ----------

async function main() {
  const args = process.argv.slice(2);
  const phasesArg = argValue(args, 'phases', 'p2,p3,p4,p5,p6,p7,p8').split(',').map(s => s.trim().toLowerCase());
  const maxCalls = parseInt(argValue(args, 'max-calls', '400')) || 400;

  console.log('=== 影库扩充编排器 (P2~P8) ===');
  const existing = loadExistingFilms();
  const p = loadProgress();
  console.log('现有影库: ' + existing.length + ' 部，已累积 ' + p.newFilms.length + ' 部');
  console.log('阶段: ' + phasesArg.join(', ') + '，每阶段 API 上限: ' + maxCalls);

  for (const ph of phasesArg) {
    if (ph === 'p2') await phaseP2(p, existing, maxCalls);
    else if (ph === 'p3') await phaseP3(p, existing, maxCalls);
    else if (ph === 'p4') await phaseP4(p, existing, maxCalls);
    else if (ph === 'p5') await phaseP5(p, existing, maxCalls);
    else if (ph === 'p6') await phaseP6(p, existing, maxCalls);
    else if (ph === 'p7') await phaseP7(p, existing, maxCalls);
    else if (ph === 'p8') await phaseP8(p, existing, maxCalls);
    else console.log('未知阶段: ' + ph);
  }

  saveProgress(p);
  console.log('\n=== 编排完成 ===');
  console.log('各阶段净增:');
  for (const [k, v] of Object.entries(p.phases)) {
    console.log('  ' + k + ': ' + (v.count || 0) + ' 部' + (v.done ? ' (完成)' : ' (未完成)'));
  }
  console.log('累计净增: ' + p.newFilms.length + ' 部');
  console.log('进度文件: ' + PROGRESS_FILE);
}

if (require.main === module) {
  main().catch(e => { console.error('致命错误:', e); process.exit(1); });
}

module.exports = {enqueueFilm, loadProgress, saveProgress};
