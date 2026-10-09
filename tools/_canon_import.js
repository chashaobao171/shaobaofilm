const fs = require('fs');
const https = require('https');
const base = require('./_tmdb_top_rated_import.js');

const API_KEY = process.env.TMDB_API_KEY || '';
const PROGRESS_FILE = '.canon_import_progress.json';
const DELAY_MS = 300;
const SAVE_EVERY = 10;

const TSPDT_URL = 'https://theyshootpictures.com/gf1000_all1000films.htm';
const SS_URL = 'https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time';

const {loadExistingFilms, isDuplicate, tmdbRequest} = base;

function hasArg(args, name) {
  return args.includes('--' + name);
}

function argValue(args, name, def) {
  for (const a of args) {
    if (a.startsWith('--' + name + '=')) return a.slice(name.length + 3);
  }
  return def;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {timeout: 30000}, res => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('timeout', () => req.destroy(new Error('抓取超时(30s): ' + url)));
    req.on('error', reject);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function firstYear(s) {
  const re = /(18\d{2}|19\d{2}|20\d{2})/g;
  let m;
  while ((m = re.exec(s))) {
    const y = parseInt(m[1]);
    if (y >= 1880 && y <= 2026) return y;
  }
  return 0;
}

function normalizeSearchTitle(title) {
  let t = String(title || '').trim().replace(/\s+/g, ' ');
  const m = t.match(/^(.*),\s*(The|A|An|L'|La|Les|Le|Los|Las|Un|Une|Una|El|Der|Die|Das|Il|Ein|Eine|Een)$/i);
  if (m) {
    const article = m[2];
    const rest = m[1];
    t = article.endsWith("'") ? article + rest : article + ' ' + rest;
  }
  return t;
}

const LATIN1_ENTITIES = {
  aacute:'á', agrave:'à', acirc:'â', auml:'ä', atilde:'ã', aring:'å', aelig:'æ', ccedil:'ç',
  eacute:'é', egrave:'è', ecirc:'ê', euml:'ë', eth:'ð',
  iacute:'í', igrave:'ì', icirc:'î', iuml:'ï',
  ntilde:'ñ', oacute:'ó', ograve:'ò', ocirc:'ô', otilde:'õ', ouml:'ö', oslash:'ø', oe:'œ',
  uacute:'ú', ugrave:'ù', ucirc:'û', uuml:'ü', yacute:'ý', yuml:'ÿ', szlig:'ß',
  Aacute:'Á', Agrave:'À', Acirc:'Â', Auml:'Ä', Atilde:'Ã', Aring:'Å', AElig:'Æ', Ccedil:'Ç',
  Eacute:'É', Egrave:'È', Ecirc:'Ê', Euml:'Ë', ETH:'Ð',
  Iacute:'Í', Igrave:'Ì', Icirc:'Î', Iuml:'Ï',
  Ntilde:'Ñ', Oacute:'Ó', Ograve:'Ò', Ocirc:'Ô', Otilde:'Õ', Ouml:'Ö', Oslash:'Ø', OE:'Œ',
  Uacute:'Ú', Ugrave:'Ù', Ucirc:'Û', Uuml:'Ü', Yacute:'Ý', THORN:'Þ',
  hellip:'…', copy:'©', middot:'·', deg:'°', plusmn:'±', laquo:'«', raquo:'»',
  rsquo:"'", lsquo:"'", ldquo:'"', rdquo:'"', apos:"'"
};

function htmlToText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, d) => String.fromCharCode(parseInt(d, 16)))
    .replace(/&(\w+);/g, (m, n) => Object.prototype.hasOwnProperty.call(LATIN1_ENTITIES, n) ? LATIN1_ENTITIES[n] : m)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '--')
    .replace(/&ndash;/g, '-');
}

function parseTSPDT(html) {
  const text = htmlToText(html);
  const films = [];
  const re = /^\s*(\d+)\.\s*\(([\d-]+)\)\s*(.*?)\s*\(([^()]*?),\s*((?:1[89]\d{2}|20\d{2})(?:-\d{2,4})?),\s*([^()]*?),\s*(\d{1,4})m,\s*(BW|Col[^()]*?)\)\s*$/gm;
  let m;
  while ((m = re.exec(text))) {
    const rank = parseInt(m[1]);
    const title = m[3].trim();
    const director = m[4].trim();
    const year = parseInt(m[5].substring(0, 4));
    const country = m[6].trim();
    if (!title || isNaN(rank) || !year) continue;
    films.push({rank, title, searchTitle: normalizeSearchTitle(title), director, year, country});
  }
  return films;
}

function parseBFI(html) {
  const films = [];
  const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g;
  let m;
  while ((m = re.exec(html))) {
    const text = stripTags(m[1]).trim().replace(/\s+/g, ' ');
    if (!text || text.length > 120) continue;
    const win = html.slice(m.index, m.index + 5000);
    const rankM = win.match(/=\s*(\d{1,3})/);
    const year = firstYear(win);
    if (!year) continue;
    const dirM = win.match(/Directed by\s+([^<]+?)(?:<|\n)/i);
    films.push({
      rank: rankM ? parseInt(rankM[1]) : 0,
      title: text,
      searchTitle: normalizeSearchTitle(text),
      year,
      director: dirM ? dirM[1].trim().replace(/,\s*$/, '') : '',
      country: ''
    });
  }
  return films;
}

function candidateKey(c) {
  return (c.searchTitle + '|' + c.year).toLowerCase();
}

function combinedRank(c) {
  const a = c.tspdtRank || 1001;
  const b = c.ssRank || 1001;
  return Math.min(a, b);
}

function mergeCandidates(progress, newOnes) {
  for (const c of newOnes) {
    const key = candidateKey(c);
    const prev = progress.candidates.find(x => candidateKey(x) === key);
    if (prev) {
      if (!prev.sources.includes(c.source)) prev.sources.push(c.source);
      if (c.source === 'TSPDT' && (!prev.tspdtRank || c.rank < prev.tspdtRank)) prev.tspdtRank = c.rank;
      if (c.source === 'S&S2022' && (!prev.ssRank || c.rank < prev.ssRank)) prev.ssRank = c.rank;
      prev.director = prev.director || c.director;
      prev.country = prev.country || c.country;
    } else {
      progress.candidates.push({
        tspdtRank: c.source === 'TSPDT' ? c.rank : 0,
        ssRank: c.source === 'S&S2022' ? c.rank : 0,
        title: c.title,
        searchTitle: c.searchTitle || normalizeSearchTitle(c.title),
        director: c.director || '',
        year: c.year,
        country: c.country || '',
        sources: [c.source],
        status: 'pending',
        tmdbId: 0,
        film: null
      });
    }
  }
}

function isDuplicateByMeta(c, films) {
  return films.some(f =>
    (f.tmdbId && c.tmdbId && f.tmdbId === c.tmdbId) ||
    (f.t === c.searchTitle && f.y === c.year) ||
    (f.t === c.title && f.y === c.year)
  );
}

function buildFilm(movie, c) {
  const f = base.processMovieData(movie);
  f.source = 'canon';
  f.lists = [];
  if (c.tspdtRank) f.lists.push('TSPDT#' + c.tspdtRank);
  if (c.ssRank) f.lists.push('S&S2022#' + c.ssRank);
  f.d = c.director || '';
  f.c = c.country || '';
  return f;
}

async function resolveCandidate(c) {
  const data = await tmdbRequest('/search/movie', {
    query: c.searchTitle,
    year: c.year,
    language: 'en-US',
    include_adult: false
  });
  const results = data.results || [];
  if (!results.length) return null;
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9\u00c0-\u00ff]/g, '');
  const tn = norm(c.searchTitle);
  const yearPool = results.filter(r => parseInt((r.release_date || '').substring(0, 4) || '0') === c.year);
  const pool = yearPool.length ? yearPool : results;
  return pool.find(r => norm(r.title) === tn) ||
    pool.find(r => norm(r.original_title) === tn) ||
    pool[0];
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return null;
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const reset = hasArg(args, 'reset');
  const offline = hasArg(args, 'offline');
  const dryRun = hasArg(args, 'dry-run');
  const top = parseInt(argValue(args, 'top', '0')) || 0;
  const limit = parseInt(argValue(args, 'limit', '0')) || 0;
  const sourcesArg = String(argValue(args, 'sources', 'tspdt,ss2022'))
    .split(',').map(s => s.trim().toLowerCase());

  const existing = loadExistingFilms();
  let progress = reset ? null : loadProgress();
  if (!progress) {
    progress = {
      fetchedAt: null,
      lists: {},
      candidates: [],
      newFilms: [],
      stats: {candidates: 0, alreadyInLibrary: 0, queued: 0, added: 0, notfound: 0, apiCalls: 0}
    };
  }

  console.log('=== 经典正典导入器 (Canon Import) ===');
  console.log('数据源: TSPDT Top 1000 + BFI Sight & Sound 2022');
  console.log('现有影库: ' + existing.length);
  console.log('进度文件: ' + PROGRESS_FILE);
  console.log('');

  if (!offline) {
    if (sourcesArg.includes('tspdt')) {
      console.log('[1/2] 抓取 TSPDT Top 1000 ...');
      try {
        const buf = await fetchBuffer(TSPDT_URL);
        const list = parseTSPDT(buf.toString('utf8'));
        console.log('  TSPDT 解析到 ' + list.length + ' 部');
        progress.lists.tspdt = TSPDT_URL;
        mergeCandidates(progress, list.map(x => Object.assign({source: 'TSPDT'}, x)));
      } catch (e) {
        console.error('  TSPDT 抓取失败: ' + e.message);
      }
    }
    if (sourcesArg.includes('ss2022') || sourcesArg.includes('bfi')) {
      console.log('[2/2] 抓取 BFI Sight & Sound 2022 ...');
      try {
        const buf = await fetchBuffer(SS_URL);
        const list = parseBFI(buf.toString('utf8'));
        console.log('  S&S2022 解析到 ' + list.length + ' 部');
        progress.lists.ss2022 = SS_URL;
        mergeCandidates(progress, list.map(x => Object.assign({source: 'S&S2022'}, x)));
      } catch (e) {
        console.error('  S&S2022 抓取失败: ' + e.message);
      }
    }
    progress.fetchedAt = new Date().toISOString();
  } else {
    console.log('离线模式: 使用进度文件中的候选名单 (candidates=' + progress.candidates.length + ')');
  }

  progress.stats.candidates = progress.candidates.length;

  let pending = progress.candidates.filter(c => c.status === 'pending');
  pending.sort((x, y) => combinedRank(x) - combinedRank(y));
  if (top > 0) pending = pending.slice(0, top);

  let already = 0;
  let queued = 0;
  for (const c of pending) {
    if (isDuplicateByMeta(c, existing)) already++;
    else if (isDuplicateByMeta(c, progress.newFilms)) queued++;
  }

  if (!API_KEY || dryRun) {
    console.log('');
    console.log(!API_KEY
      ? '未检测到 TMDB_API_KEY，仅执行候选名单解析与去重（dry-run）:'
      : 'dry-run 模式，不调用 TMDB API:');
    console.log('  待处理候选: ' + pending.length);
    console.log('  已存在于影库: ' + already);
    console.log('  已在本次队列: ' + queued);
    console.log('  预计新增: ' + (pending.length - already - queued));
    saveProgress(progress);
    console.log('进度已保存: ' + PROGRESS_FILE);
    return;
  }

  console.log('');
  console.log('开始 TMDB 解析 (本批次 ' + (limit > 0 ? Math.min(limit, pending.length) : pending.length) + ' 部)...');

  let apiCalls = 0;
  let consecutiveFails = 0;
  for (const c of pending) {
    if (limit > 0 && apiCalls >= limit) break;
    try {
      const movie = await resolveCandidate(c);
      apiCalls++;
      consecutiveFails = 0;
      if (!movie) {
        c.status = 'notfound';
        progress.stats.notfound++;
        console.log('  ? ' + c.title + ' (' + c.year + ') 未找到');
      } else {
        const film = buildFilm(movie, c);
        if (isDuplicate(film, existing) || isDuplicate(film, progress.newFilms)) {
          c.status = 'duplicate';
          c.tmdbId = movie.id;
          progress.stats.alreadyInLibrary++;
          console.log('  - ' + film.t + ' (' + film.y + ') 已在影库');
        } else {
          c.status = 'resolved';
          c.tmdbId = movie.id;
          c.film = film;
          progress.newFilms.push(film);
          progress.stats.added++;
          console.log('  + [' + c.sources.join('+') + '] ' + film.t + ' (' + film.y + ') ★' + film.r);
        }
      }
    } catch (e) {
      c.status = 'error';
      consecutiveFails++;
      console.error('  ! ' + c.title + ' 解析出错: ' + e.message);
      if (consecutiveFails >= 5) {
        console.error('  连续失败 ' + consecutiveFails + ' 次，中止本批次');
        break;
      }
    }
    if (apiCalls % SAVE_EVERY === 0) saveProgress(progress);
    await delay(DELAY_MS);
  }

  progress.stats.apiCalls += apiCalls;
  saveProgress(progress);

  console.log('');
  console.log('=== 完成 ===');
  console.log('候选总数: ' + progress.candidates.length);
  console.log('本次新增: ' + progress.stats.added);
  console.log('已入库/去重: ' + progress.stats.alreadyInLibrary);
  console.log('未找到: ' + progress.stats.notfound);
  console.log('累计队列: ' + progress.newFilms.length);
  console.log('');
  console.log('下一步:');
  console.log('  node tools/_merge_new_films.js ' + PROGRESS_FILE);
  console.log('  node tools/_recount_taxonomy.js');
}

if (require.main === module) {
  main().catch(e => {
    console.error('致命错误:', e);
    process.exit(1);
  });
}
