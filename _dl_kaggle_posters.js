/* 下载 _kaggle_posters.json 中的海报到 posters/{id}.jpg，8 并发 */
const fs = require('fs');
const path = require('path');

const posters = JSON.parse(fs.readFileSync('_kaggle_posters.json', 'utf8'));
const ids = Object.keys(posters);
let done = 0, fail = [];
const CONC = 8;

function fetchOne(id, retries) {
  return new Promise((resolve) => {
    const file = path.join('posters', id + '.jpg');
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) { resolve(1); return; }
    const req = require('https').request(posters[id], {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/'
      },
      timeout: 20000
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        if (retries > 0) return setTimeout(() => fetchOne(id, retries - 1).then(resolve), 1500);
        fail.push(id + ':' + res.statusCode); resolve(0); return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 1000) { fail.push(id + ':small'); resolve(0); return; }
        fs.writeFileSync(file, buf); resolve(1);
      });
    });
    req.on('error', () => {
      if (retries > 0) return setTimeout(() => fetchOne(id, retries - 1).then(resolve), 1500);
      fail.push(id + ':err'); resolve(0);
    });
    req.on('timeout', () => { req.destroy(); fail.push(id + ':timeout'); resolve(0); });
    req.end();
  });
}

async function main() {
  const t0 = Date.now();
  let idx = 0;
  async function worker() {
    while (idx < ids.length) {
      const i = idx++;
      await fetchOne(ids[i], 2);
      done++;
      if (done % 300 === 0) console.log(done + '/' + ids.length + ' ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  fs.writeFileSync('_dl_kaggle_fail.json', JSON.stringify(fail));
  console.log('完成:', done, '失败:', fail.length, '耗时', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (fail.length) console.log('失败样例:', fail.slice(0, 10));
}
main();
