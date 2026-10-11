/**
 * _dirs_fill.js — 按「导演谱系」补齐 74 位导演的院线长片（TMDB）
 *
 * 用法（本地或 GitHub Actions）：
 *   TMDB_API_KEY=xxx node tools/_dirs_fill.js collect   # 只生成待审清单 dirs-fill-candidates.json
 *   TMDB_API_KEY=xxx node tools/_dirs_fill.js apply     # 按清单合并进 films-data.js（可用清单里的 exclude 剔除）
 *
 * 口径（与用户确认一致）：
 *   - 只收院线长片：排除纪录片(99)、电视电影(10770)、短片(runtime<40)、TMDB 标记 video=true 的幕后/花絮
 *   - 质量门槛：TMDB 评分 >= 6.5 且 票数 >= 20
 *   - 与现有影库三重去重：tmdbId / 中文名+年份 / 原名+年份（含标点归一化）
 */
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.TMDB_API_KEY || '';
const MODE = (process.argv[2] || 'collect').replace(/^--/, '');
const RATING_THRESHOLD = 6.5;
const VOTE_THRESHOLD = 20;
const MIN_RUNTIME = 40;
const EXCLUDE_GENRES = [99, 10770];        // 纪录片、电视电影
const CAND_FILE = 'dirs-fill-candidates.json';
const DELAY_MS = 120;

const GENRE_MAP = {
  28: '动作', 12: '冒险', 16: '动画', 35: '喜剧', 80: '犯罪',
  99: '纪录片', 18: '剧情', 10751: '家庭', 14: '奇幻', 36: '历史',
  27: '恐怖', 10402: '音乐', 9648: '悬疑', 10749: '爱情', 878: '科幻',
  10770: '电视电影', 53: '惊悚', 10752: '战争', 37: '西部'
};
const COUNTRY_MAP = {
  US: '美国', CN: '中国大陆', HK: '中国香港', TW: '中国台湾', JP: '日本', KR: '韩国', GB: '英国', FR: '法国',
  DE: '德国', IT: '意大利', ES: '西班牙', RU: '俄罗斯', SU: '苏联', IN: '印度', CA: '加拿大', AU: '澳大利亚',
  BR: '巴西', MX: '墨西哥', SE: '瑞典', DK: '丹麦', NO: '挪威', FI: '芬兰', PL: '波兰', CZ: '捷克',
  HU: '匈牙利', IR: '伊朗', TR: '土耳其', TH: '泰国', VN: '越南', NZ: '新西兰', BE: '比利时', NL: '荷兰',
  AT: '奥地利', CH: '瑞士', GR: '希腊', PT: '葡萄牙', IE: '爱尔兰', IL: '以色列', EG: '埃及', ZA: '南非',
  AR: '阿根廷', CL: '智利', PE: '秘鲁', CO: '哥伦比亚', CU: '古巴', UA: '乌克兰', RO: '罗马尼亚',
  BG: '保加利亚', RS: '塞尔维亚', HR: '克罗地亚', SI: '斯洛文尼亚', SK: '斯洛伐克', IS: '冰岛', PH: '菲律宾',
  MY: '马来西亚', SG: '新加坡', ID: '印度尼西亚', KP: '朝鲜', MN: '蒙古', YU: '南斯拉夫', CS: '捷克斯洛伐克'
};

const norm = s => String(s || '').replace(/[。．.、,，：:·\-—－_\s《》()（）"'']/g, '').toLowerCase();
const delay = ms => new Promise(r => setTimeout(r, ms));

function loadCine() {
  const raw = fs.readFileSync('films-data.js', 'utf8');
  const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!m) throw new Error('无法解析 films-data.js');
  return eval('(' + m[1] + ')');
}
function saveCine(cine) {
  fs.writeFileSync('films-data.js', 'window.CINE=' + JSON.stringify(cine) + ';', 'utf8');
}
function tmdb(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const q = new URLSearchParams(Object.assign({ api_key: API_KEY, language: 'zh-CN' }, params)).toString();
    https.get('https://api.themoviedb.org/3' + endpoint + '?' + q, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode === 429) return resolve(tmdb(endpoint, params));   // 限流重试
        if (res.statusCode >= 400) return reject(new Error('API ' + res.statusCode + ' ' + endpoint));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function findPerson(dir) {
  const queries = [dir.e, dir.n].filter(Boolean);
  for (const q of queries) {
    const r = await tmdb('/search/person', { query: q });
    const list = (r.results || []).filter(p => p.known_for_department === 'Directing');
    if (list.length) {
      list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      return list[0];
    }
    await delay(DELAY_MS);
  }
  return null;
}

function buildIndex(films) {
  const ids = new Set(), keys = new Set();
  films.forEach(f => {
    if (f.tmdbId) ids.add(f.tmdbId);
    if (f.t) keys.add(norm(f.t) + '|' + String(f.y));
    if (f.e) keys.add(norm(f.e) + '|' + String(f.y));
  });
  return { ids, keys };
}

function buildRecord(mv, dirName) {
  const c = (mv.production_countries || [])[0];
  const codes = (mv.production_countries || []).map(x => COUNTRY_MAP[x.iso_3166_1] || x.iso_3166_1).filter(Boolean);
  const cast = ((mv.credits && mv.credits.cast) || []).slice(0, 6).map(x => x.name).join(' / ');
  return {
    t: mv.title || mv.original_title,
    y: +String(mv.release_date || '').slice(0, 4) || 0,
    d: dirName,
    r: Math.round((mv.vote_average || 0) * 10) / 10,
    c: codes.slice(0, 2).join('/'),
    dur: mv.runtime || 0,
    g: (mv.genres || []).map(x => GENRE_MAP[x.id]).filter(Boolean),
    s: mv.overview || '',
    acts: cast,
    p: mv.poster_path ? 'https://image.tmdb.org/t/p/w500' + mv.poster_path : '',
    e: mv.original_title || '',
    votes: mv.vote_count || 0,
    tmdbId: mv.id,
    id: 'tmdb' + mv.id,          // 与库内既有约定一致：TMDB 来源片 id = tmdb<id>
    source: 'dirs',
    links: {
      primary: 'https://www.themoviedb.org/movie/' + mv.id,
      secondary: 'https://www.douban.com/search?q=' + encodeURIComponent(mv.title || mv.original_title || '')
    }
  };
}

/* 海报本地化：把仍是远程 TMDB 地址的 p 下载到 posters/ 并改写为相对路径
   （本地 TMDB 图片被墙，必须在 Actions 里跑） */
function downloadImage(file, url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        fs.writeFileSync('posters/' + file, Buffer.concat(chunks));
        resolve();
      });
    }).on('error', reject);
  });
}

async function posters() {
  const cine = loadCine();
  const films = cine.films || [];
  const targets = films.filter(f => f.p && /^https?:\/\//.test(f.p));
  console.log('远程海报待本地化：' + targets.length + ' 张');
  let ok = 0, fail = 0;
  const failed = [];
  for (let i = 0; i < targets.length; i += 8) {
    const batch = targets.slice(i, i + 8);
    await Promise.all(batch.map(async f => {
      const file = String(f.p).split('/').pop();
      const rel = 'posters/' + file;
      try {
        if (!fs.existsSync(rel)) await downloadImage(file, 'https://image.tmdb.org/t/p/w342/' + file);
        f.p = rel; ok++;
      } catch (e) { fail++; failed.push(file); }
    }));
    await delay(DELAY_MS);
    if (i % 80 === 0) console.log('  进度 ' + Math.min(i + 8, targets.length) + '/' + targets.length);
  }
  saveCine(cine);
  if (failed.length) fs.writeFileSync('.poster_failed.txt', failed.join('\n'), 'utf8');
  console.log('海报本地化完成：成功 ' + ok + '，失败 ' + fail + (fail ? '（见 .poster_failed.txt）' : ''));
}

async function collect() {
  const cine = loadCine();
  const films = cine.films || [], dirs = cine.dirs || [];
  const idx = buildIndex(films);
  const cands = [], stats = { dirs: 0, noPerson: [], noNew: [], checked: 0 };

  for (const dir of dirs) {
    const person = await findPerson(dir);
    stats.dirs++;
    if (!person) { stats.noPerson.push(dir.n); continue; }
    await delay(DELAY_MS);
    let credits;
    try { credits = await tmdb('/person/' + person.id + '/movie_credits'); }
    catch (e) { stats.noPerson.push(dir.n + '(credits失败)'); continue; }
    await delay(DELAY_MS);

    const owned = (credits.crew || []).filter(x => x.job === 'Director');
    const before = cands.length;
    for (const cr of owned) {
      if (!cr.release_date) continue;
      if ((cr.vote_average || 0) < RATING_THRESHOLD || (cr.vote_count || 0) < VOTE_THRESHOLD) continue;
      if (cr.video === true) continue;
      const y = +cr.release_date.slice(0, 4) || 0;
      if (idx.ids.has(cr.id)) continue;
      if (idx.keys.has(norm(cr.title) + '|' + y) || idx.keys.has(norm(cr.original_title) + '|' + y)) continue;
      const gids = cr.genre_ids || [];
      if (gids.some(g => EXCLUDE_GENRES.indexOf(g) >= 0)) continue;
      stats.checked++;
      // 取详情补 中文简介/时长/制片国/主演
      let detail = null;
      try { detail = await tmdb('/movie/' + cr.id, { append_to_response: 'credits' }); } catch (e) { }
      await delay(DELAY_MS);
      if (detail && detail.runtime && detail.runtime < MIN_RUNTIME) continue;
      if (detail && (detail.genres || []).some(g => EXCLUDE_GENRES.indexOf(g.id) >= 0)) continue;
      const mv = detail || cr;
      if (!mv.title && !mv.original_title) continue;
      const rec = buildRecord(mv, dir.n);
      if (!rec.t || !rec.y) continue;
      // 记录内去重（同一部片被多位导演命中时只留一条）
      if (cands.some(x => x.tmdbId === rec.tmdbId)) continue;
      idx.ids.add(rec.tmdbId);
      idx.keys.add(norm(rec.t) + '|' + rec.y);
      cands.push(rec);
    }
    if (cands.length === before) stats.noNew.push(dir.n);
  }

  cands.sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      mode: 'collect',
      rule: '院线长片 / 排除纪录片·电视电影·短片·幕后 / TMDB >=6.5 且票数 >=20',
      dirsTotal: dirs.length,
      candidates: cands.length,
      noPerson: stats.noPerson,
      noNew: stats.noNew
    },
    exclude: [],
    films: cands
  };
  fs.writeFileSync(CAND_FILE, JSON.stringify(out, null, 1), 'utf8');
  console.log('导演 ' + stats.dirs + ' 位；未匹配到人物 ' + stats.noPerson.length + ' 位；候选新片 ' + cands.length + ' 部 → ' + CAND_FILE);
  if (stats.noPerson.length) console.log('未匹配人物: ' + stats.noPerson.join('、'));
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));   // 兼容手工编辑时写入的 BOM
}
function apply() {
  if (!fs.existsSync(CAND_FILE)) { console.error('缺少 ' + CAND_FILE + '，先跑 collect'); process.exit(1); }
  const data = readJSON(CAND_FILE);
  const drop = new Set(data.exclude || []);
  const cine = loadCine();
  const films = cine.films || [];
  const idx = buildIndex(films);
  let added = 0, skipped = 0;
  (data.films || []).forEach(f => {
    if (drop.has(f.tmdbId)) { skipped++; return; }
    if (idx.ids.has(f.tmdbId)) { skipped++; return; }
    if (idx.keys.has(norm(f.t) + '|' + f.y) || idx.keys.has(norm(f.e) + '|' + f.y)) { skipped++; return; }
    films.push(f);
    idx.ids.add(f.tmdbId);
    idx.keys.add(norm(f.t) + '|' + f.y);
    added++;
  });
  cine.films = films;
  if (cine.meta) cine.meta.films = films.length;
  saveCine(cine);
  fs.writeFileSync('.last_merge_count.txt', String(films.length), 'utf8');
  console.log('合并完成：新增 ' + added + ' 部，跳过 ' + skipped + ' 部，影库共 ' + films.length + ' 部');
}

(async () => {
  if (!API_KEY) { console.error('缺少 TMDB_API_KEY 环境变量（本地可写入 .env 后 export，或走 GitHub Actions）'); process.exit(1); }
  try {
    if (MODE === 'apply') apply();
    else if (MODE === 'posters') await posters();
    else await collect();
  } catch (e) {
    console.error('执行失败: ' + e.message);
    process.exit(1);
  }
})();