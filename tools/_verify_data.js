/**
 * _verify_data.js — 合并后数据完整性验证（云端/本地通用）
 * 1) films-data.js 语法 + window.CINE 解析
 * 2) 影片总数 / meta 一致性
 * 3) 必填字段抽查（t/y/id/links 缺失统计）
 * 4) 与 .last_merge_count.txt 比对，输出是否发生变化
 */
const fs = require('fs');
const base = require('./_tmdb_top_rated_import.js');

const {loadExistingFilms} = base;

const BASELINE = 5854; // 扩充前影库基线

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
  console.log('验证结果: OK');
}

main();
