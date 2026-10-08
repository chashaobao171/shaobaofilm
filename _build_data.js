/* Merge curated + douban-harvested + wmdb films into films-data.js */
const fs = require('fs');

const content = JSON.parse(fs.readFileSync('_content.json', 'utf8'));
const raw = fs.existsSync('_films_raw.json') ? JSON.parse(fs.readFileSync('_films_raw.json', 'utf8')) : [];
const pool = JSON.parse(fs.readFileSync('_pool.json', 'utf8')).all;
const wmdb = fs.existsSync('_films_wmdb.json') ? JSON.parse(fs.readFileSync('_films_wmdb.json', 'utf8')) : [];
const enrich = fs.existsSync('_wmdb_enrich.json') ? JSON.parse(fs.readFileSync('_wmdb_enrich.json', 'utf8')) : {};

const norm = s => String(s || '').replace(/[\s·：:·、,，.。!！?？'"“”‘’《》()（）\-—~]/g, '').toLowerCase();

// title -> region[] from the chart pool (enriches curated entries)
const regionByTitle = {};
Object.values(pool).forEach(p => { if (p.title && !regionByTitle[p.title]) regionByTitle[p.title] = p.regions || []; });

const CUR_C = {
  '教父': '美国', '2001太空漫游': '美国 / 英国', '肖申克的救赎': '美国', '七武士': '日本',
  '八部半': '意大利 / 法国', '精疲力尽': '法国', '镜子': '苏联', '花样年华': '中国香港',
  '牯岭街少年杀人事件': '中国台湾', '重庆森林': '中国香港', '千与千寻': '日本', '攻壳机动队': '日本',
  '银翼杀手': '美国 / 中国香港', '城市之光': '美国', '战舰波将金号': '苏联', '公民凯恩': '美国',
  '迷魂记': '美国', '日落大道': '美国', '罗生门': '日本', '假面': '瑞典',
  '甜蜜的生活': '意大利 / 法国', '四百击': '法国', '现代启示录': '美国', '出租车司机': '美国',
  '好家伙': '美国', '低俗小说': '美国', '搏击俱乐部': '美国 / 德国', '穆赫兰道': '美国 / 法国',
  '一一': '中国台湾 / 日本', '悲情城市': '中国台湾', '卧虎藏龙': '中国台湾 / 中国大陆 / 美国',
  '霸王别姬': '中国大陆 / 中国香港', '活着': '中国大陆 / 中国香港', '杀人回忆': '韩国',
  '老男孩': '韩国', '燃烧': '韩国', '爱乐之城': '美国', '疯狂的麦克斯4': '澳大利亚 / 美国',
  '星际穿越': '美国 / 英国', '降临': '美国', '寄生虫': '韩国',
  '都灵之马': '匈牙利 / 法国 / 德国 / 瑞士', '冈仁波齐': '中国大陆', '小森林': '日本'
};

const rawByTitle = {};
raw.forEach(f => { if (f.t && !rawByTitle[f.t]) rawByTitle[f.t] = f; });
const wmdbByTitle = {};
wmdb.forEach(f => { if (f.t && !wmdbByTitle[f.t]) wmdbByTitle[f.t] = f; });

function pick(...vals) { for (const v of vals) { if (v !== undefined && v !== null && String(v).trim() !== '') return v; } return ''; }

const films = [];
const seen = new Set();

/* 1) curated — keeps hand-written tone/motif, enriched with harvested metadata */
content.FILMS.forEach(f => {
  const k = norm(f.t);
  if (seen.has(k)) return;
  seen.add(k);
  const r = rawByTitle[f.t] || {};
  const w = wmdbByTitle[f.t] || {};
  films.push({
    t: f.t, e: pick(f.e, r.e, w.e), y: String(pick(f.y, r.y, w.y)),
    d: pick(f.d, r.d, w.d, (enrich[k] || {}).d), r: pick(f.r, r.r, w.r),
    c: pick(r.c, w.c, (regionByTitle[f.t] || []).join(' / '), CUR_C[f.t]),
    dur: pick(r.dur, w.dur), g: f.g || w.g || [],
    s: pick(f.s, r.s, w.s), acts: pick((r.acts || []).join(' / '), ((enrich[k] || {}).acts || []).join(' / ')),
    p: pick(f.p, r.p, w.p), id: pick(r.id, w.id),
    votes: pick(r.votes, w.votes, 0), curated: 1,
    tone: f.tone, motif: f.motif
  });
});

/* 2) douban harvested */
raw.forEach(f => {
  if (!f.t || !f.s) return;
  const k = norm(f.t);
  if (seen.has(k)) return;
  seen.add(k);
  const en = enrich[k] || {};
  films.push({
    t: f.t, e: f.e || '', y: f.y || '', d: pick(f.d, en.d), r: f.r || '',
    c: f.c || '', dur: f.dur || '', g: f.g || [], s: f.s,
    acts: (f.acts || []).join(' / ') || (en.acts || []).join(' / '),
    p: f.p || '', id: f.id, votes: f.votes || 0
  });
});

/* 3) wmdb */
wmdb.forEach(f => {
  if (!f.t || !f.s) return;
  const k = norm(f.t);
  if (seen.has(k)) return;
  seen.add(k);
  const en = enrich[k] || {};
  films.push({
    t: f.t, e: f.e || '', y: f.y || '', d: pick(en.d, f.d), r: f.r || '',
    c: f.c || '', dur: f.dur || '', g: f.g || [], s: f.s,
    acts: (en.acts || []).join(' / '), p: f.p || '', id: f.id,
    imdb: f.imdb || '', votes: f.votes || 0
  });
});

const countries = new Set(), decades = new Set(), genres = new Set();
films.forEach(f => {
  if (f.c) f.c.split('/').map(s => s.trim()).filter(Boolean).forEach(x => countries.add(x));
  if (f.y) decades.add(Math.floor(+f.y / 10) * 10);
  (f.g || []).forEach(g => genres.add(g));
});

const out = {
  films,
  dirs: content.DIRS,
  dregion: content.DREGION,
  awards: content.AWARDS,
  ranks: content.RANKS,
  tax: content.TAX,
  meta: {
    films: films.length,
    curated: films.filter(f => f.curated).length,
    posters: films.filter(f => f.p).length,
    directors: films.filter(f => f.d).length,
    synopsis: films.filter(f => f.s && f.s.length > 15).length,
    countries: countries.size,
    decades: decades.size,
    genres: genres.size,
    dirs: content.DIRS.length,
    awards: content.AWARDS.reduce((s, g) => s + g.items.length, 0),
    ranks: content.RANKS.reduce((s, g) => s + g.items.length, 0),
    types: content.TAX.reduce((s, g) => s + g.items.length, 0)
  }
};

const js = 'window.CINE=' + JSON.stringify(out) + ';\n';
fs.writeFileSync('films-data.js', js);
console.log('films', films.length, '(curated', out.meta.curated, '+ douban', raw.length, '+ wmdb', wmdb.length + ')');
console.log('posters', out.meta.posters, '| directors', out.meta.directors, '| synopsis', out.meta.synopsis);
console.log('size', (js.length / 1024).toFixed(0) + 'KB');
console.log('meta', JSON.stringify(out.meta));
const noPoster = films.filter(f => !f.p).map(f => f.t);
if (noPoster.length) console.log('NO POSTER(' + noPoster.length + '):', noPoster.slice(0, 20).join(', '));