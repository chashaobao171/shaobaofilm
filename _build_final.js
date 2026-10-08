/* 最终构建：_merged_films.json + _poster_dl_map.json -> films-data.js
   保留原 tax/awards/ranks/dirs/dregion，重算 meta */
const fs = require('fs');
const path = require('path');

const films = JSON.parse(fs.readFileSync(path.join(__dirname, '_merged_films.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(__dirname, '_poster_dl_map.json'), 'utf8'));
const src = fs.readFileSync(path.join(__dirname, 'films-data.js'), 'utf8');
const old = JSON.parse(src.slice(src.indexOf('=') + 1, src.lastIndexOf(';')));

let posterOk = 0, posterFail = [];
for (const f of films) {
  if (f.id && map[f.id] !== undefined) {
    f.p = map[f.id] || '';
  }
  if (f.p && fs.existsSync(path.join(__dirname, f.p)) && fs.statSync(path.join(__dirname, f.p)).size > 3000) posterOk++;
  else { if (f.p) posterFail.push(f.t); f.p = f.p && fs.existsSync(path.join(__dirname, f.p)) ? f.p : ''; if (f.p && fs.statSync(path.join(__dirname, f.p)).size <= 3000) f.p = ''; }
}

const uniq = arr => [...new Set(arr)];
const meta = {
  films: films.length,
  curated: films.filter(f => f.curated).length,
  posters: films.filter(f => f.p).length,
  directors: uniq(films.map(f => f.d).filter(Boolean)).length,
  synopsis: films.filter(f => f.s && f.s.length >= 15).length,
  countries: uniq(films.flatMap(f => (f.c || '').split('/').map(s => s.trim()).filter(Boolean))).length,
  decades: uniq(films.filter(f => f.y).map(f => Math.floor(+f.y / 10) * 10)).length,
  genres: uniq(films.flatMap(f => f.g || [])).length,
  dirs: old.dirs.length,
  awards: old.awards.reduce((n, g) => n + g.items.length, 0),
  ranks: old.ranks.reduce((n, g) => n + g.items.length, 0),
  types: old.tax.reduce((n, g) => n + g.items.length, 0)
};

const CINE = { films, dirs: old.dirs, dregion: old.dregion, awards: old.awards, ranks: old.ranks, tax: old.tax, meta };
fs.writeFileSync(path.join(__dirname, 'films-data.js'), 'window.CINE=' + JSON.stringify(CINE) + ';\n');

console.log('films:', films.length, '| posters ok:', posterOk, '| poster fail:', posterFail.length, posterFail.slice(0, 10).join(', '));
console.log('meta:', JSON.stringify(meta));
console.log('file size:', (fs.statSync(path.join(__dirname, 'films-data.js')).size / 1024).toFixed(0) + 'KB');
