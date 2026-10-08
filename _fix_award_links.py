# -*- coding: utf-8 -*-
"""修复 awardLinks: 模糊匹配(片名规范化+年份±2)救回因标点/上映年差异漏掉的条目;
更新 tax 纪录片条目代表作; 确保 meta 与数据一致"""
import json, io, re, unicodedata

DATA = 'films-data.js'

def norm(s):
    s = unicodedata.normalize('NFKC', str(s))
    s = re.sub(r'[^\w\u4e00-\u9fff]+', '', s).lower()
    return s

def main():
    d = io.open(DATA, encoding='utf-8').read()
    start = d.index('window.CINE')
    eq = d.index('{', start)
    head = d[:eq]
    j, tail_end = json.JSONDecoder().raw_decode(d[eq:])
    tail = d[eq + tail_end:]
    films = j['films']
    def num(v):
        try: return float(v or 0)
        except: return 0

    # 索引: 规范化名 -> [(y, film), ...]
    idx = {}
    for f in films:
        idx.setdefault(norm(f['t']), []).append((int(f['y'] or 0), f))

    aw = json.load(io.open('_award_link.json', encoding='utf-8'))
    aw.pop('_comment', None)
    links, miss = {}, []
    for name, pairs in aw.items():
        hit = []
        for t, y in pairs:
            f = None
            for cand in idx.get(norm(t), []):
                if abs(cand[0] - int(y)) <= 2:
                    f = cand[1]; break
            if f: hit.append([f['t'], str(f['y'])])
            else: miss.append('%s:%s(%s)' % (name, t, y))
        if hit: links[name] = hit
    j['awardLinks'] = links
    print('奖项链接:', len(links), '/', len(aw), ' 未命中:', len(miss))
    if miss: print('仍未命中:', '; '.join(miss))

    # tax 纪录片条目代表作刷新
    gA = j['tax'][0]
    doc = [f for f in films if '纪录片' in (f.get('g') or [])]
    doc.sort(key=lambda f: (-num(f.get('r')), -(f.get('votes') or 0)))
    picks = ['《%s》%s' % (f['t'], f['y']) for f in doc[:3]]
    for item in gA['items']:
        if item['n'] == '纪录片':
            item['f'] = ' · '.join(picks)
            print('纪录片代表作更新:', item['f'], ' 库内纪录片:', len(doc))

    m = j['meta']
    m['types'] = sum(len(g['items']) for g in j['tax'])
    io.open(DATA, 'w', encoding='utf-8').write(head + json.dumps(j, ensure_ascii=False, separators=(',', ':')) + tail)
    print('meta.types =', m['types'], ' films =', len(films), ' awardLinks 覆盖奖项 =', len(links))

if __name__ == '__main__':
    main()
