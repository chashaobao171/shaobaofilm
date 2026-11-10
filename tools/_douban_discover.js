/**
 * Douban Discover Script
 * 从豆瓣「热门 / 最新」榜单发现新片，补足 TMDB 趋势榜覆盖不到的热门影片。
 * 另设「豆瓣高分」补全通道：按高分榜逐页比对影库，补齐经典老片缺口。
 * 输出 _douban_discovered.json，由 _tmdb_merge.js 合并进 films-data.js。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ROOT = path.join(__dirname, '..');
const POSTER_DIR = path.join(ROOT, 'posters');
const OUTPUT = path.join(ROOT, '_douban_discovered.json');

const MAX_PER_TAG = parseInt(process.env.DOUBAN_MAX_PER_TAG || '20', 10);
const MAX_TOTAL = parseInt(process.env.DOUBAN_MAX_TOTAL || '40', 10);
const MIN_DURATION = parseInt(process.env.DOUBAN_MIN_DURATION || '60', 10);
const REQUEST_GAP = parseInt(process.env.DOUBAN_REQUEST_GAP || '350', 10);

// 高分补全：每页 100 条，默认扫 5 页（约 500 部），单次最多补 30 部，避免一次涌入过多
const TOP_PAGE_SIZE = 100;
const TOP_PAGES = parseInt(process.env.DOUBAN_TOP_PAGES || '5', 10);
const TOP_MAX = parseInt(process.env.DOUBAN_TOP_MAX || '30', 10);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url, headers, binary) {
  return new Promise(resolve => {
    const req = https.get(url, {headers, timeout: 20000}, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buf,
          text: binary ? '' : buf.toString('utf8')
        });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({status: 0, error: 'timeout'}); });
    req.on('error', e => resolve({status: 0, error: e.message}));
  });
}

function filmKey(t, y) {
  return `${String(t || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${y === null || y === undefined || y === '' ? '' : Number(y)}`;
}

function cleanTitle(s) {
  return String(s || '').replace(/\s*\(\d{4}\)\s*$/, '').replace(/[\u200e\u200f]/g, '').trim();
}

function splitAbstractTitle(full, listTitle) {
  const cleaned = cleanTitle(full);
  if (listTitle && cleaned.indexOf(listTitle) === 0) {
    return {title: listTitle, original: cleaned.slice(listTitle.length).trim()};
  }
  const parts = cleaned.split(/\s+/);
  if (parts.length > 1) return {title: parts[0], original: parts.slice(1).join(' ')};
  return {title: cleaned, original: ''};
}

function loadExisting() {
  const raw = fs.readFileSync(path.join(ROOT, 'films-data.js'), 'utf8');
  const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!m) throw new Error('Cannot parse films-data.js');
  const data = eval('(' + m[1] + ')');
  const doubanIds = new Set();
  const keys = new Set();
  data.films.forEach(f => {
    if (f.doubanId !== null && f.doubanId !== undefined) doubanIds.add(String(f.doubanId));
    if (f.id && /^\d+$/.test(String(f.id))) doubanIds.add(String(f.id));
    if (f.t) keys.add(filmKey(f.t, f.y));
  });
  return {films: data.films, doubanIds, keys};
}

async function fetchList(tag) {
  const url = `https://movie.douban.com/j/search_subjects?type=movie&tag=${encodeURIComponent(tag)}&page_limit=${MAX_PER_TAG}&page_start=0`;
  const r = await httpGet(url, {
    'User-Agent': DESKTOP_UA,
    'Referer': 'https://movie.douban.com/'
  }, false);
  if (r.status !== 200) throw new Error(`Douban list "${tag}" HTTP ${r.status || r.error}`);
  const json = JSON.parse(r.text);
  if (!json || !Array.isArray(json.subjects)) throw new Error(`Douban list "${tag}" invalid JSON`);
  return json.subjects;
}

// 豆瓣高分榜逐页抓取（经典补全用）；单页失败不影响整体
async function fetchHighRated() {
  const all = [];
  for (let page = 0; page < TOP_PAGES; page++) {
    const start = page * TOP_PAGE_SIZE;
    const url = `https://movie.douban.com/j/search_subjects?type=movie&tag=${encodeURIComponent('豆瓣高分')}&page_limit=${TOP_PAGE_SIZE}&page_start=${start}`;
    const r = await httpGet(url, {
      'User-Agent': DESKTOP_UA,
      'Referer': 'https://movie.douban.com/'
    }, false);
    if (r.status !== 200) {
      console.log(`高分榜第 ${page + 1} 页失败（HTTP ${r.status || r.error}），已抓 ${all.length} 条`);
      break;
    }
    let subjects = [];
    try {
      subjects = (JSON.parse(r.text) || {}).subjects || [];
    } catch (e) {
      console.log(`高分榜第 ${page + 1} 页解析失败`);
      break;
    }
    all.push(...subjects);
    if (subjects.length < TOP_PAGE_SIZE) break;
    await sleep(REQUEST_GAP);
  }
  return all;
}

function normalizeMobile(j) {
  return {
    id: String(j.id),
    title: String(j.title || '').trim(),
    original: String(j.original_title || '').trim(),
    year: String(j.year || '').trim(),
    rate: j.rating && j.rating.value ? String(j.rating.value) : '',
    votes: j.rating && j.rating.count ? Number(j.rating.count) : 0,
    genres: Array.isArray(j.genres) ? [...new Set(j.genres)] : [],
    countries: Array.isArray(j.countries) ? [...new Set(j.countries)] : [],
    durations: Array.isArray(j.durations) ? j.durations : [],
    directors: Array.isArray(j.directors) ? j.directors.map(x => x && x.name).filter(Boolean) : [],
    actors: Array.isArray(j.actors) ? j.actors.map(x => x && x.name).filter(Boolean) : [],
    intro: String(j.intro || '').trim(),
    cover: j.cover_url || (j.pic && (j.pic.large || j.pic.normal)) || '',
    pubdate: Array.isArray(j.pubdate) ? j.pubdate : (j.pubdate ? [j.pubdate] : []),
    isTv: !!j.is_tv,
    subtype: String(j.type || '').toLowerCase()
  };
}

function normalizeAbstract(s, listTitle, listCover) {
  const t = splitAbstractTitle(s.title, listTitle);
  return {
    id: String(s.id),
    title: t.title,
    original: t.original,
    year: String(s.release_year || '').trim(),
    rate: s.rate ? String(s.rate) : '',
    votes: 0,
    genres: Array.isArray(s.types) ? [...new Set(s.types)] : [],
    countries: s.region ? [s.region] : [],
    durations: s.duration ? [s.duration] : [],
    directors: Array.isArray(s.directors) ? s.directors : [],
    actors: Array.isArray(s.actors) ? s.actors : [],
    intro: '',
    cover: listCover || '',
    pubdate: [],
    isTv: !!s.is_tv,
    subtype: String(s.subtype || '').toLowerCase()
  };
}

async function fetchDetail(id, listTitle, listCover) {
  const mobile = await httpGet(`https://m.douban.com/rexxar/api/v2/movie/${id}`, {
    'User-Agent': MOBILE_UA,
    'Referer': 'https://m.douban.com/'
  }, false);
  if (mobile.status === 200) {
    try {
      const j = JSON.parse(mobile.text);
      if (j && j.id) return normalizeMobile(j);
    } catch (e) { /* fall through */ }
  }
  const abs = await httpGet(`https://movie.douban.com/j/subject_abstract?subject_id=${id}`, {
    'User-Agent': DESKTOP_UA,
    'Referer': 'https://movie.douban.com/'
  }, false);
  if (abs.status === 200) {
    try {
      const j = JSON.parse(abs.text);
      if (j && j.subject && j.subject.id) return normalizeAbstract(j.subject, listTitle, listCover);
    } catch (e) { /* ignore */ }
  }
  return null;
}

async function downloadPoster(id, url) {
  if (!url) return '';
  const rel = `posters/d${id}.jpg`;
  const dest = path.join(ROOT, rel);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) return rel;
  fs.mkdirSync(POSTER_DIR, {recursive: true});
  const r = await httpGet(url, {
    'User-Agent': DESKTOP_UA,
    'Referer': 'https://movie.douban.com/'
  }, true);
  if (r.status !== 200 || !r.buf || r.buf.length < 1024) return '';
  if (!/^image\//.test(String(r.headers['content-type'] || ''))) return '';
  fs.writeFileSync(dest, r.buf);
  return rel;
}

(async () => {
  let existing;
  try {
    existing = loadExisting();
  } catch (e) {
    console.error('读取 films-data.js 失败:', e.message);
    process.exit(1);
  }
  console.log(`Existing films: ${existing.films.length}`);

  let lists;
  try {
    lists = await Promise.all([fetchList('热门'), fetchList('最新')]);
  } catch (e) {
    console.error('豆瓣榜单不可用，跳过本次豆瓣发现:', e.message);
    if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
    process.exit(0);
  }

  const candidates = new Map();
  lists.forEach((subjects, idx) => {
    const tag = idx === 0 ? '热门' : '最新';
    subjects.forEach(s => {
      const id = String(s.id);
      const cur = candidates.get(id) || {
        id,
        title: String(s.title || '').trim(),
        cover: String(s.cover || '').trim(),
        isNew: false,
        tags: []
      };
      if (s.is_new === true) cur.isNew = true;
      if (!cur.cover && s.cover) cur.cover = String(s.cover).trim();
      if (cur.tags.indexOf(tag) < 0) cur.tags.push(tag);
      candidates.set(id, cur);
    });
  });

  const pending = [...candidates.values()]
    .sort((a, b) => (b.tags.indexOf('热门') >= 0 ? 1 : 0) - (a.tags.indexOf('热门') >= 0 ? 1 : 0))
    .slice(0, MAX_TOTAL);

  // 高分补全通道：高分榜里影库尚未收录的经典，单次最多补 TOP_MAX 部
  let highRated = [];
  try {
    highRated = await fetchHighRated();
  } catch (e) {
    console.log('高分榜不可用，跳过经典补全:', e.message);
  }
  const classicPending = highRated
    .filter(s => s && s.id && !existing.doubanIds.has(String(s.id)))
    .filter(s => !candidates.has(String(s.id)))
    .map(s => ({
      id: String(s.id),
      title: String(s.title || '').trim(),
      cover: String(s.cover || '').trim(),
      isNew: false,
      tags: ['高分']
    }))
    .slice(0, TOP_MAX);
  console.log(`High-rated list: ${highRated.length}, classics to check: ${classicPending.length}`);

  const queue = [...pending, ...classicPending];
  console.log(`Candidates: ${candidates.size}, checking ${pending.length} + ${classicPending.length}`);

  const newFilms = [];
  const addedKeys = new Set();
  let skippedKnown = 0, skippedTv = 0, skippedShort = 0, skippedBad = 0, skippedUnreleased = 0;

  for (const c of queue) {
    if (existing.doubanIds.has(c.id)) { skippedKnown++; continue; }

    const d = await fetchDetail(c.id, c.title, c.cover);
    await sleep(REQUEST_GAP);
    if (!d || !d.title || !d.year) { skippedBad++; continue; }
    if (d.isTv || (d.subtype && d.subtype !== 'movie')) { skippedTv++; continue; }

    const durText = d.durations[0] || '';
    const duration = parseInt(String(durText).replace(/[^\d]/g, ''), 10) || 0;
    if (duration && duration < MIN_DURATION) { skippedShort++; continue; }

    // 精确上映日：取 pubdate 首项（形如「2026-11-06(中国大陆)」），供首页按日期排序
    const rdMatch = String((d.pubdate && d.pubdate[0]) || '').match(/\d{4}-\d{1,2}-\d{1,2}/);
    const rd = rdMatch ? rdMatch[0] : '';
    // 未上映影片不入库
    if (rd && rd > new Date().toISOString().slice(0, 10)) { skippedUnreleased++; continue; }

    const key = filmKey(d.title, d.year);
    if (existing.keys.has(key) || addedKeys.has(key)) { skippedKnown++; continue; }

    const poster = await downloadPoster(d.id, d.cover);
    await sleep(REQUEST_GAP);

    newFilms.push({
      t: d.title,
      e: d.original && d.original !== d.title ? d.original : '',
      y: d.year,
      d: d.directors.join(' / '),
      r: d.rate,
      c: d.countries.join(' / '),
      dur: durText,
      g: d.genres,
      s: d.intro,
      acts: d.actors.slice(0, 6).join(' / '),
      p: poster,
      id: d.id,
      votes: d.votes,
      rd: rd,
      doubanId: d.id,
      links: {
        primary: `https://movie.douban.com/subject/${d.id}/`,
        secondary: null
      },
      source: 'douban'
    });
    addedKeys.add(key);
    console.log(`Added: ${d.title} (${d.year}) ${d.rate || '-'}分 ${poster || '无海报'}`);
  }

  if (newFilms.length) {
    fs.writeFileSync(OUTPUT, JSON.stringify({
      timestamp: new Date().toISOString(),
      source: 'douban',
      count: newFilms.length,
      films: newFilms
    }, null, 1));
  } else if (fs.existsSync(OUTPUT)) {
    fs.unlinkSync(OUTPUT);
  }

  console.log('\n=== Summary ===');
  console.log(`New films: ${newFilms.length}`);
  console.log(`Skipped (already in library): ${skippedKnown}`);
  console.log(`Skipped (TV): ${skippedTv}`);
  console.log(`Skipped (short): ${skippedShort}`);
  console.log(`Skipped (bad data): ${skippedBad}`);
  console.log(`Skipped (unreleased): ${skippedUnreleased}`);
})().catch(e => {
  console.error('豆瓣发现脚本异常:', e && e.stack || e);
  process.exit(1);
});
