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

function main() {
  console.log('=== 数据完整性验证 ===');
  let changed = false;
  if (fs.existsSync('.last_merge_count.txt')) {
    const expect = parseInt(fs.readFileSync('.last_merge_count.txt', 'utf8').trim());
    const films = loadExistingFilms();
    if (films.length !== expect) {
      console.log('[WARN] 数量与合并标记不一致: 期望 ' + expect + '，实际 ' + films.length);
    } else {
      changed = films.length > 5854; // 初始基线 5854
      console.log('影片总数: ' + films.length + (changed ? ' (较基线增加 ' + (films.length - 5854) + ')' : ' (与基线一致)'));
    }
    fs.writeFileSync('.verify_changed.txt', changed ? 'true' : 'false', 'utf8');
  } else {
    console.log('[WARN] 未找到 .last_merge_count.txt');
  }

  const films = loadExistingFilms();
  let missingT = 0, missingId = 0, missingLinks = 0, missingY = 0;
  for (const f of films) {
    if (!f.t) missingT++;
    if (!f.id) missingId++;
    if (!f.links || !f.links.primary) missingLinks++;
    if (!f.y) missingY++;
  }
  console.log('缺 t: ' + missingT + '，缺 id: ' + missingId + '，缺 links.primary: ' + missingLinks + '，缺 y: ' + missingY);
  if (missingT || missingId || missingLinks) { console.log('验证结果: FAIL'); process.exit(1); }

  // 各 source 统计（用于汇报扩充来源）
  const src = {};
  for (const f of films) src[f.source || 'unknown'] = (src[f.source || 'unknown'] || 0) + 1;
  console.log('来源分布: ' + JSON.stringify(src));
  console.log('验证结果: OK');
}

main();
