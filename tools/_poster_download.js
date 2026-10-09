/**
 * 云端海报下载脚本（仅在 GitHub Actions runner 上运行，本地 TMDB 被墙）
 *
 * 作用：
 *  1. 读取 films-data.js，找出所有 p 为 https:// 开头的影片（TMDB 海报，本地被墙裂图）
 *  2. 并发 8 从 https://image.tmdb.org/t/p/w342/<file> 下载海报到 posters/ 目录
 *  3. 下载成功的影片 p 改写为相对路径 'posters/<file>'（部署 EdgeOne 后同域加载，无墙）
 *  4. 失败保留原 URL 并计数（可重跑续传：已存在且 size>0 的文件跳过，只改路径）
 *  5. 写回 films-data.js（同步 meta.films）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SIZE = process.env.POSTER_SIZE || 'w342';
const CONCURRENCY = parseInt(process.env.POSTER_CONCURRENCY || '8', 10);
const TIMEOUT_MS = 20000;
const POSTER_DIR = 'posters';
const DATA_FILE = 'films-data.js';

// 匹配 TMDB 图片 URL 中的文件名，如 https://image.tmdb.org/t/p/w342/abc.jpg
const FILE_RE = /\/t\/p\/[^\/]+\/([^\/?#]+\.\w+)/;

function loadCine() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const match = raw.match(/window\.CINE\s*=\s*(\{[\s\S]+\});/);
  if (!match) throw new Error('Cannot parse films-data.js');
  return eval('(' + match[1] + ')');
}

function downloadFile(file, destPath) {
  return new Promise((resolve) => {
    const url = `https://image.tmdb.org/t/p/${SIZE}/${file}`;
    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      if (res.statusCode === 200) {
        const tmp = destPath + '.part';
        const ws = fs.createWriteStream(tmp);
        res.pipe(ws);
        ws.on('finish', () => {
          ws.close(() => {
            fs.renameSync(tmp, destPath);
            resolve(true);
          });
        });
        ws.on('error', () => {
          try { fs.unlinkSync(tmp); } catch (e) {}
          resolve(false);
        });
        res.on('error', () => {
          try { fs.unlinkSync(tmp); } catch (e) {}
          resolve(false);
        });
      } else {
        res.resume(); // drain
        resolve(false);
      }
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', () => resolve(false));
  });
}

async function main() {
  const cine = loadCine();
  const films = cine.films;
  console.log(`Total films: ${films.length}`);

  // file -> 引用该文件的影片索引列表
  const byFile = new Map();
  let httpCount = 0;
  for (let i = 0; i < films.length; i++) {
    const p = films[i].p;
    if (typeof p === 'string' && /^https?:\/\//.test(p)) {
      const m = p.match(FILE_RE);
      if (m) {
        httpCount++;
        if (!byFile.has(m[1])) byFile.set(m[1], []);
        byFile.get(m[1]).push(i);
      }
    }
  }
  const files = [...byFile.keys()];
  console.log(`TMDB http posters: ${httpCount}, distinct files: ${files.length}`);

  fs.mkdirSync(POSTER_DIR, { recursive: true });

  let done = 0, ok = 0, skip = 0, fail = 0;
  const failedFiles = [];
  const startTime = Date.now();

  const pool = async () => {
    while (true) {
      const file = queue.shift();
      if (file === undefined) return;
      const destPath = path.join(POSTER_DIR, file);
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        skip++;
      } else {
        const success = await downloadFile(file, destPath);
        if (success) ok++;
        else { fail++; failedFiles.push(file); }
      }
      done++;
      if (done % 100 === 0 || done === files.length) {
        const pct = (done / files.length * 100).toFixed(1);
        const el = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`progress: ${done}/${files.length} (${pct}%) ok=${ok} skip=${skip} fail=${fail} elapsed=${el}s`);
      }
    }
  };

  const queue = [...files];
  await Promise.all(Array.from({ length: CONCURRENCY }, pool));

  // 依据最终可用状态重写 p 字段
  let rewritten = 0;
  for (const file of files) {
    const destPath = path.join(POSTER_DIR, file);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      const idxs = byFile.get(file);
      for (const i of idxs) {
        films[i].p = POSTER_DIR + '/' + file;
        rewritten++;
      }
    }
  }

  // 同步 meta 计数
  if (cine.meta) cine.meta.films = films.length;

  const out = 'window.CINE=' + JSON.stringify(cine) + ';';
  fs.writeFileSync(DATA_FILE, out);

  console.log(`\n== Poster download finished ==`);
  console.log(`downloaded: ${ok}, skipped(existing): ${skip}, failed: ${fail}`);
  console.log(`p fields rewritten to 'posters/...': ${rewritten}`);
  console.log(`meta.films: ${cine.meta ? cine.meta.films : 'n/a'}`);
  if (failedFiles.length) {
    console.log(`failed files (${failedFiles.length}):`);
    console.log(failedFiles.slice(0, 30).join('\n'));
    fs.writeFileSync('.poster_failed.txt', failedFiles.join('\n'));
  } else {
    try { fs.unlinkSync('.poster_failed.txt'); } catch (e) {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
