/**
 * _merge_all_progress.js — 合并各阶段进度文件中的新片进 films-data.js（云端/本地通用）
 *
 * 输入: .canon_import_progress.json(P1) + .expansion_progress.json(P2~P8)
 * 顺序: P1 优先 → P2~P8；对已入库/已排队对象做去重。
 * 用法: node tools/_merge_all_progress.js
 */
const fs = require('fs');
const base = require('./_tmdb_top_rated_import.js');

const {loadExistingFilms, isDuplicate} = base;

const PROGRESS_FILES = ['.canon_import_progress.json', '.expansion_progress.json'];

function collectNewFilms() {
  const films = [];
  const seen = new Set();
  for (const pf of PROGRESS_FILES) {
    if (!fs.existsSync(pf)) { console.log('跳过(不存在): ' + pf); continue; }
    const prog = JSON.parse(fs.readFileSync(pf, 'utf8'));
    let list = [];
    if (pf.includes('canon')) {
      // P1: resolved 候选里带 film 的
      for (const c of (prog.candidates || [])) {
        if (c.status === 'resolved' && c.film) list.push(c.film);
      }
    } else {
      // P2~P8: newFilms 数组
      list = prog.newFilms || [];
    }
    let added = 0;
    for (const f of list) {
      const key = (f.tmdbId && 'id:' + f.tmdbId) || (f.t + '|' + f.y).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      films.push(f);
      added++;
    }
    console.log(pf + ': 收集 ' + list.length + ' 条，去重后 ' + added + ' 条');
  }
  return films;
}

function main() {
  console.log('=== 合并各阶段新片 → films-data.js ===');
  const existing = loadExistingFilms();
  console.log('现有影库: ' + existing.length + ' 部');

  const raw = fs.readFileSync('films-data.js', 'utf8');
  const m = raw.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!m) { console.error('无法解析 films-data.js'); process.exit(1); }
  const cine = eval('(' + m[1] + ')');

  const newFilms = collectNewFilms();
  const kept = [];
  for (const f of newFilms) {
    if (isDuplicate(f, existing) || isDuplicate(f, kept)) continue;
    kept.push(f);
  }
  console.log('过滤已入库后，实际新增: ' + kept.length + ' 部');

  // 来源统计
  const src = {};
  for (const f of kept) src[f.source || 'unknown'] = (src[f.source || 'unknown'] || 0) + 1;
  console.log('按来源: ' + JSON.stringify(src));

  const merged = existing.concat(kept);
  const out = 'window.CINE=' + JSON.stringify({...cine, films: merged}) + ';';
  fs.writeFileSync('films-data.js', out, 'utf8');
  console.log('已写回 films-data.js: ' + existing.length + ' → ' + merged.length + ' 部');

  // 备份备份名字写个标记供 workflow 判断是否有变化
  fs.writeFileSync('.last_merge_count.txt', String(merged.length), 'utf8');
}

if (require.main === module) main();
