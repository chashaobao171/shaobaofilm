/* 合并 _ds_repo 数据集到 films-data.js：
   1) 数据集质量子集(r>=7.5, votes>=2000, 简介完整) 为主体
   2) 现有影片按豆瓣id合并(保留本地海报/curated/英文名)，不在数据集的按质量阈值保留
   3) 生成海报下载清单 _poster_manifest.json
   输出 _merged_films.json（供最终 build） */
const fs = require('fs');
const path = require('path');

const dsAll = JSON.parse(fs.readFileSync(path.join(__dirname, '_ds_repo/data/douban_all_movies.json'), 'utf8'));
const src = fs.readFileSync(path.join(__dirname, 'films-data.js'), 'utf8');
const cur = JSON.parse(src.slice(src.indexOf('=') + 1, src.lastIndexOf(';')));

/* 英文名映射 */
const EN = {};
const topD = JSON.parse(fs.readFileSync(path.join(__dirname, '_top_Douban.json'), 'utf8'));
topD.forEach(e => { if (e.doubanId && e.originalName) EN[String(e.doubanId)] = e.originalName; });
try {
  const bulk = JSON.parse(fs.readFileSync(path.join(__dirname, '_bulk.json'), 'utf8'));
  (bulk.data || []).forEach(e => { if (e.type === 'Movie' && e.doubanId && e.originalName && (e.doubanVotes || 0) >= 3000 && !EN[String(e.doubanId)]) EN[String(e.doubanId)] = e.originalName; });
} catch (e) { }

/* 数据集质量子集 */
const clean = s => String(s || '').replace(/\s*\n\s*/g, ' ').trim();
const normDur = s => { s = String(s || '').trim(); if (!s) return ''; return /分钟/.test(s) ? s.replace(/(\d)\s*分钟/, '$1 分钟') : (s + ' 分钟'); };
const quality = dsAll.filter(m =>
  (m.rating || 0) >= 7.5 && (m.total_ratings || 0) >= 2000 &&
  m.summary && clean(m.summary).length >= 20 && m.poster && m.movie_id && m.title
);
console.log('dataset quality films:', quality.length);

const dsById = new Map(quality.map(m => [String(m.movie_id), m]));
const curById = new Map(cur.films.filter(f => f.id).map(f => [String(f.id), f]));

/* 标题匹配：无 id 的现有影片（curated）按 规范标题+年份±1/导演 匹配数据集，避免同名双卡 */
const norm = s => String(s || '').replace(/[\s·：:、,，.。!！?？'"“”‘’《》()（）\-—~]/g, '').toLowerCase();
const yearOf = m => +((String(m.release_date || '').match(/\d{4}/) || ['0'])[0]);
const dsQualByTitle = new Map();
quality.forEach(m => { const k = norm(m.title); if (!dsQualByTitle.has(k)) dsQualByTitle.set(k, m); });
const titleMatch = new Map();
cur.films.forEach(f => {
  if (f.id) return;
  const m = dsQualByTitle.get(norm(f.t));
  if (!m) return;
  const dirOk = f.d && String(m.directors || '').indexOf(f.d) >= 0;
  if ((f.y && Math.abs(yearOf(m) - +f.y) <= 1) || dirOk) titleMatch.set(String(m.movie_id), f);
});
console.log('title-matched (no-id curated):', titleMatch.size);

/* 手动排除：纪录片之外混入的 TV 特辑等（合并前再核一遍） */
const BLACKLIST = new Set(['老友记重聚特辑', '黑镜：圣诞特别篇', '超感猎杀：完结特别篇', '神探夏洛克：福至如归', '神探夏洛克：最后的誓言', '葫芦兄弟']);

const merged = [];
const usedIds = new Set();

/* 1) 数据集影片 */
for (const m of quality) {
  const id = String(m.movie_id);
  if (BLACKLIST.has(m.title) || usedIds.has(id)) continue;
  const old = curById.get(id) || titleMatch.get(id);
  const f = {
    t: clean(m.title),
    y: (String(m.release_date || '').match(/\d{4}/) || [''])[0],
    d: clean((m.directors || '').split(',')[0]),
    r: m.rating ? String(m.rating) : '',
    c: clean(m.countries || ''),
    dur: normDur(m.runtime),
    g: String(m.genres || '').split(/,\s*/).filter(Boolean),
    s: clean(m.summary),
    acts: String(m.actors || '').split(/,\s*/).filter(Boolean).slice(0, 5).join(' / '),
    p: 'posters/d' + id + '.webp',
    id,
    votes: m.total_ratings || 0
  };
  if (EN[id]) f.e = EN[id];
  if (old) {
    usedIds.add(id);
    if (old.y) f.y = String(old.y);
    if (old.p && fs.existsSync(path.join(__dirname, old.p)) && fs.statSync(path.join(__dirname, old.p)).size > 3000) f.p = old.p;
    if (old.e) f.e = old.e;
    if (old.curated) f.curated = 1;
    if (old.tone) f.tone = old.tone;
    if (old.motif) f.motif = old.motif;
    if (old.imdb) f.imdb = old.imdb;
    if (!f.d && old.d) f.d = old.d;
    if (!f.acts && old.acts) f.acts = old.acts;
    if (old.s && old.s.length > f.s.length) f.s = old.s;
  }
  merged.push(f);
}
console.log('dataset films (incl. matched existing):', merged.length, '| matched existing:', usedIds.size);

/* 2) 现有影片不在数据集质量子集的保留判断 */
const KEEP_VOTES = 50000, KEEP_R = 8.0;
const keptOld = [], droppedOld = [];
const mergedByTitle = new Set([...titleMatch.values()].map(f => f));
for (const f of cur.films) {
  if (f.id && usedIds.has(String(f.id))) continue;
  if (mergedByTitle.has(f)) continue;
  if (dsById.has(String(f.id || ''))) { droppedOld.push(f.t + ' [in-ds-low-q]'); continue; }
  const keep = f.curated || (parseFloat(f.r) >= KEEP_R && (f.votes || 0) >= KEEP_VOTES && !BLACKLIST.has(f.t));
  if (keep) keptOld.push(f); else droppedOld.push(f.t + ' r=' + (f.r || '-') + ' v=' + (f.votes || 0));
}
console.log('existing kept (curated or r>=' + KEEP_R + '&v>=' + KEEP_VOTES + '):', keptOld.length, '| dropped:', droppedOld.length);
console.log('kept old:', keptOld.map(f => f.t + (f.curated ? '*' : '')).join(' | '));

/* 排序：curated 按原顺序在前，其余按 votes 降序（keptOld 即原对象引用，含完整字段） */
const all = [...merged, ...keptOld];
const orderIdx = new Map();
cur.films.forEach((f, i) => { if (f.id) orderIdx.set(String(f.id), i); });
keptOld.forEach((f, i) => { if (!orderIdx.has(String(f.id || ''))) orderIdx.set(String(f.id || 'old' + i), 10000 + i); });
const curatedList = all.filter(f => f.curated).sort((a, b) => (orderIdx.get(String(a.id)) ?? 99999) - (orderIdx.get(String(b.id)) ?? 99999));
const restList = all.filter(f => !f.curated).sort((a, b) => (b.votes || 0) - (a.votes || 0));
const finalFilms = [...curatedList, ...restList];

/* 海报清单：本地不存在或过小的 */
const manifest = [];
for (const f of finalFilms) {
  const fp = path.join(__dirname, f.p || '');
  const m = dsAll.find(x => String(x.movie_id) === String(f.id));
  if (m && m.poster && (!fs.existsSync(fp) || fs.statSync(fp).size < 3000)) manifest.push({ id: f.id, url: m.poster });
}
console.log('\nfinal films:', finalFilms.length, '| posters to download:', manifest.length);

/* meta 重算 */
const ctrySet = new Set(), genSet = new Set(), decSet = new Set(); let dirSet = new Set(), syn = 0;
finalFilms.forEach(f => {
  (f.c || '').split('/').map(s => s.trim()).filter(Boolean).forEach(c => ctrySet.add(c));
  (f.g || []).forEach(g => genSet.add(g));
  if (f.y) decSet.add(Math.floor(+f.y / 10) * 10);
  if (f.d) dirSet.add(f.d);
  if (f.s && f.s.length >= 15) syn++;
});
console.log('countries:', ctrySet.size, 'genres:', genSet.size, 'decades:', decSet.size, 'directors:', dirSet.size, 'synopsis:', syn);

fs.writeFileSync(path.join(__dirname, '_merged_films.json'), JSON.stringify(finalFilms));
fs.writeFileSync(path.join(__dirname, '_poster_manifest.json'), JSON.stringify(manifest));
console.log('wrote _merged_films.json & _poster_manifest.json');
