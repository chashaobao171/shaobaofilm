/**
 * _verify_data.js — 合并后数据完整性验证（云端/本地通用）
 * 1) films-data.js 语法 + window.CINE 解析
 * 2) 影片总数 / meta 一致性
 * 3) 必填字段抽查（t/y/id/links 缺失统计）
 * 4) 与 .last_merge_count.txt 比对，输出是否发生变化
 * 5) 站点级不变量自检：meta 计数、(片名|年份) 唯一性、taxonomy 计数、维度/导演/海报引用
 */
const fs = require('fs');
const base = require('./_tmdb_top_rated_import.js');

const {loadExistingFilms} = base;

const BASELINE = 5854; // 扩充前影库基线

/* ---------- 站点级不变量自检 ---------- */
function loadCine() {
  try {
    const rawData = fs.readFileSync('films-data.js', 'utf8');
    const match = rawData.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
    return match ? eval('(' + match[1] + ')') : null;
  } catch (e) {
    return null;
  }
}

function checkInvariants(films) {
  console.log('');
  console.log('=== 站点级不变量自检 ===');
  const problems = [];
  const warn = [];
  const cine = loadCine();
  const key = f => f.t + '|' + String(f.y);

  if (!cine) {
    problems.push('films-data.js 解析失败（无法取得 window.CINE）');
  } else {
    if (cine.meta && cine.meta.films !== films.length) {
      problems.push('meta.films=' + cine.meta.films + ' 与实际影片数 ' + films.length + ' 不一致');
    }
    if (!cine.meta || !cine.meta.films) warn.push('meta.films 缺失');
  }

  // 1) (片名|年份) 唯一性：全站标记/筛选/榜单都以此为键
  const seen = new Set();
  const dups = [];
  for (const f of films) {
    const k = key(f);
    if (seen.has(k)) { if (dups.length < 8) dups.push(k); }
    seen.add(k);
  }
  if (dups.length) problems.push('(片名|年份) 重复 ' + dups.length + '+ 例：' + dups.join('; '));

  // 2) taxonomy 计数与真实数据一致（口径与 _recount_taxonomy.js 相同：
  //    one → 含 tags[0]；any → 含任一 tag；all → 含全部 tag（且不计入上层并集））
  try {
    const {taxonomyTree, taxonomyMeta} = require('../taxonomy-data.js');
    const cnt = {};
    for (const f of films) for (const g of (f.g || [])) cnt[g] = (cnt[g] || 0) + 1;
    const hits = (f, tags, mode) => {
      const gs = f.g || [];
      if (!tags.length) return false;
      if (mode === 'all') return tags.every(t => gs.indexOf(t) >= 0);
      if (mode === 'any') return tags.some(t => gs.indexOf(t) >= 0);
      return gs.indexOf(tags[0]) >= 0;
    };
    let badTags = 0, badChildren = 0, badCats = 0;
    const firstBad = [];
    for (const ck of Object.keys(taxonomyTree)) {
      const cat = taxonomyTree[ck];
      const catSet = new Set();
      for (const sk of Object.keys(cat.children || {})) {
        const ch = cat.children[sk];
        const chSet = new Set();
        for (const tag of (ch.tags || [])) {
          const real = cnt[tag] || 0;
          if (ch.tagCounts && ch.tagCounts[tag] !== undefined && ch.tagCounts[tag] !== real) {
            badTags++; if (firstBad.length < 5) firstBad.push(ck + '.' + sk + '.' + tag + ' 记 ' + ch.tagCounts[tag] + ' 实 ' + real);
          }
        }
        for (const f of films) if (hits(f, ch.tags, ch.mode)) chSet.add(f.t + '|' + f.y);
        if (ch.count !== undefined && ch.count !== chSet.size) {
          badChildren++; if (firstBad.length < 8) firstBad.push(ck + '.' + sk + ' 记 ' + ch.count + ' 实 ' + chSet.size);
        }
        if (ch.mode !== 'all') chSet.forEach(k => catSet.add(k));
      }
      if (cat.count !== undefined && cat.count !== catSet.size) {
        badCats++; if (firstBad.length < 11) firstBad.push(ck + ' 记 ' + cat.count + ' 实 ' + catSet.size);
      }
    }
    if (badTags) problems.push('taxonomy 标签计数不符 ' + badTags + ' 处');
    if (badChildren) problems.push('taxonomy 子类型计数不符 ' + badChildren + ' 处');
    if (badCats) problems.push('taxonomy 主类型计数不符 ' + badCats + ' 处');
    if (firstBad.length) console.log('  计数不符示例: ' + firstBad.join('; '));
    if (taxonomyMeta && taxonomyMeta.films !== films.length) {
      warn.push('taxonomyMeta.films=' + taxonomyMeta.films + ' 与实际 ' + films.length + ' 不一致（图谱页展示口径）');
    }
    if (!problems.length) console.log('  taxonomy 计数与影库一致 ✅');
  } catch (e) {
    warn.push('taxonomy-data.js 校验跳过: ' + e.message);
  }

  // 3) dim-data 的榜单/奖项/公司键能否解析到影库
  try {
    global.window = global.window || {};
    require('../dim-data.js');
    const dim = global.window.CINE_DIM || {};
    const universe = new Set(films.map(key));
    let dangling = 0, total = 0;
    for (const dimName of Object.keys(dim)) {
      for (const setName of Object.keys(dim[dimName] || {})) {
        for (const pair of dim[dimName][setName]) {
          total++;
          if (!universe.has(pair[0] + '|' + String(pair[1]))) dangling++;
        }
      }
    }
    if (dangling) warn.push('dim-data 有 ' + dangling + '/' + total + ' 条键在影库中找不到（不影响功能，会自然跳过）');
    else console.log('  dim-data ' + total + ' 条键全部可解析 ✅');
  } catch (e) {
    warn.push('dim-data.js 校验跳过: ' + e.message);
  }

  // 4) 导演：代表作是否在库、是否有库内影片
  if (cine && cine.dirs) {
    const titles = new Set(films.map(f => f.t));
    let noFilm = 0, missRef = 0;
    const missSample = [];
    for (const d of cine.dirs) {
      if (!films.some(f => (f.d || '').indexOf(d.n) >= 0)) { noFilm++; if (missSample.length < 5) missSample.push('无作品:' + d.n); }
      for (const t of (d.f || [])) {
        if (!titles.has(t)) { missRef++; if (missSample.length < 10) missSample.push(d.n + ' 代表作缺:' + t); }
      }
    }
    if (noFilm) warn.push('导演库内无作品 ' + noFilm + ' 位');
    if (missRef) warn.push('导演代表作名不在影库 ' + missRef + ' 条');
    if (missSample.length) console.log('  导演问题示例: ' + missSample.join('; '));
    if (!noFilm && !missRef) console.log('  ' + cine.dirs.length + ' 位导演引用全部有效 ✅');
  }

  // 5) 海报文件是否落地
  let missPoster = 0;
  const posterSample = [];
  for (const f of films) {
    if (!f.p) continue;
    if (!fs.existsSync(f.p)) { missPoster++; if (posterSample.length < 5) posterSample.push(f.p); }
  }
  if (missPoster) warn.push('海报文件缺失 ' + missPoster + ' 张（页面会走字母兜底）');
  else console.log('  海报文件全部存在 ✅');
  if (posterSample.length) console.log('  缺失示例: ' + posterSample.join('; '));

  // 6) 非电影条目排查：幕后制作 / 预告片 / 综艺晚会 / TV 特别集（导入时容易混入，需人工确认后删除）
  const NONFILM_RE = /幕后|花絮|预告片|Making of|Behind the Scenes|联欢|晚会|演唱会$|音乐会|真人秀|脱口秀|综艺|特别集|特别篇|特辑/i;
  const KEEP_WHITELIST = /制造伍德斯托克音乐节|访谈录|滚雷巡演/;   // 片名含关键词但确为电影
  const suspects = films.filter(f => NONFILM_RE.test(String(f.t)) && !KEEP_WHITELIST.test(String(f.t)));
  if (suspects.length) {
    warn.push('疑似非电影条目 ' + suspects.length + ' 条（幕后/预告片/综艺类，请人工确认）');
    suspects.slice(0, 8).forEach(f => console.log('   ? ' + f.t + ' (' + f.y + ') ' + (f.source || '')));
    if (suspects.length > 8) console.log('   …… 其余 ' + (suspects.length - 8) + ' 条');
  } else {
    console.log('  非电影条目检查通过 ✅');
  }

  console.log('');
  if (problems.length) {
    console.log('不变量检查: FAIL');
    problems.forEach(p => console.log('  ❌ ' + p));
  } else {
    console.log('不变量检查: OK' + (warn.length ? '（有 ' + warn.length + ' 项提醒）' : ''));
  }
  warn.forEach(p => console.log('  ⚠️  ' + p));
  return problems.length === 0;
}

function checkFilms(films, label) {
  let missingT = 0, missingId = 0, missingLinks = 0, missingY = 0;
  const bad = [];
  for (const f of films) {
    if (!f.t) { missingT++; if (bad.length < 5) bad.push('缺t:' + (f.id || f.tmdbId || '?')); }
    if (!f.id) { missingId++; if (bad.length < 5) bad.push('缺id:' + (f.t || '?')); }
    if (!f.links || !f.links.primary) { missingLinks++; if (bad.length < 5) bad.push('缺links:' + (f.t || '?')); }
    if (!f.y) missingY++;
  }
  console.log('[' + label + '] 缺 t: ' + missingT + '，缺 id: ' + missingId + '，缺 links.primary: ' + missingLinks + '，缺 y: ' + missingY);
  if (bad.length) console.log('  示例: ' + bad.join('; '));
  return missingT + missingId + missingLinks;
}

function main() {
  console.log('=== 数据完整性验证 ===');
  let changed = false;
  let films = [];
  try {
    films = loadExistingFilms();
  } catch (e) {
    console.error('解析 films-data.js 失败: ' + e.stack);
    process.exit(1);
  }

  let expect = null;
  if (fs.existsSync('.last_merge_count.txt')) {
    expect = parseInt(fs.readFileSync('.last_merge_count.txt', 'utf8').trim());
    if (films.length !== expect) {
      console.log('[WARN] 数量与合并标记不一致: 期望 ' + expect + '，实际 ' + films.length);
    } else {
      changed = films.length > BASELINE;
      console.log('影片总数: ' + films.length + (changed ? ' (较基线增加 ' + (films.length - BASELINE) + ')' : ' (与基线一致)'));
    }
  } else {
    console.log('[WARN] 未找到 .last_merge_count.txt');
  }

  // 全量统计（历史遗留缺字段仅警告，不阻断）
  checkFilms(films, '全量');

  // 本次新增部分（尾部 concat 区段）严格校验必填字段
  const addedFilms = films.slice(BASELINE);
  if (addedFilms.length) {
    const fail = checkFilms(addedFilms, '本次新增');
    fs.writeFileSync('.verify_changed.txt', changed ? 'true' : 'false', 'utf8');
    if (fail) {
      console.log('验证结果: FAIL (新增影片存在缺失字段)');
      process.exit(1);
    }
  }

  // 各 source 统计（用于汇报扩充来源）
  const src = {};
  for (const f of films) src[f.source || 'unknown'] = (src[f.source || 'unknown'] || 0) + 1;
  console.log('来源分布: ' + JSON.stringify(src));

  // 站点级不变量自检（metadata / 唯一键 / taxonomy 计数 / 维度·导演·海报引用）
  const ok = checkInvariants(films);
  if (!ok) {
    console.log('验证结果: FAIL (不变量被破坏，先修数据再合并)');
    process.exit(1);
  }
  console.log('验证结果: OK');
}

main();
