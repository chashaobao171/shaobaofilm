# -*- coding: utf-8 -*-
"""合并 _kaggle_new6.json (6.0 阈值清洗后) 进 films-data.js

与 _merge_kaggle_final.py 同逻辑，输入换成 6.0 版片单。
- 剔除演唱会/歌会/红白/TV特辑
- (t,y) 去重, 只收海报已下载的
- 合并 _award_link.json -> j['awardLinks']
"""
import json, io, os, re

DATA = 'films-data.js'
SRC = '_kaggle_new6.json'
DROP_RE = re.compile(r'演唱会|音乐会|歌会|现场表演|红白')
DROP_TITLE = {'芭比梦幻仙境之魔法彩虹', '芭比之森林公主', '极道鲜师2 同窗会SP', '王菲：幻乐一场'}

def main():
    d = io.open(DATA, encoding='utf-8').read()
    start = d.index('window.CINE')
    eq = d.index('{', start)
    head = d[:eq]
    j, tail_end = json.JSONDecoder().raw_decode(d[eq:])
    tail = d[eq + tail_end:]
    print('当前库实际影片:', len(j['films']))

    new = json.load(io.open(SRC, encoding='utf-8'))
    new = [f for f in new if f['t'] not in DROP_TITLE and not DROP_RE.search(f['t'])]
    keep = [f for f in new if os.path.exists(f['p']) and os.path.getsize(f['p']) > 2000]
    print('候选:', len(new), ' 海报齐备:', len(keep))

    exist_keys = {(f['t'], str(f.get('y'))) for f in j['films']}
    keep = [f for f in keep if (f['t'], str(f.get('y'))) not in exist_keys]
    print('去重后新增:', len(keep))

    films = j['films'] + keep
    def num(v):
        try: return float(v or 0)
        except: return 0
    films.sort(key=lambda f: (-num(f.get('r')), -(f.get('votes') or 0)))

    m = j['meta']
    m['films'] = len(films)
    m['posters'] = sum(1 for f in films if f.get('p'))
    m['synopsis'] = sum(1 for f in films if (f.get('s') or '').strip())
    gens, dirs = set(), set()
    for f in films:
        gens.update(f.get('g') or [])
        if f.get('d'): dirs.add(f['d'])
    m['genres'] = len(gens)
    m['directors'] = len(dirs)
    j['films'] = films

    gA = j['tax'][0]
    if not any(i['n'] == '纪录片' for i in gA['items']):
        doc = [f for f in films if '纪录片' in (f.get('g') or [])]
        doc.sort(key=lambda f: (-num(f.get('r')), -(f.get('votes') or 0)))
        picks = ['《%s》%s' % (f['t'], f['y']) for f in doc[:3]]
        gA['items'].append({
            'i': '%02d' % (len(gA['items']) + 1), 'n': '纪录片', 'e': 'Documentary',
            'd': '以真实为材料的电影：自然、社会、人物与时间本身。',
            'f': ' · '.join(picks)
        })
        print('tax A 组新增纪录片条目, 库内纪录片:', len(doc))

    aw = json.load(io.open('_award_link.json', encoding='utf-8'))
    aw.pop('_comment', None)
    idx = {(f['t'], str(f['y'])) for f in films}
    links, miss = {}, []
    for name, pairs in aw.items():
        hit = [[t, y] for t, y in pairs if (t, str(y)) in idx]
        if hit:
            links[name] = hit
        miss.extend('%s:%s(%s)' % (name, t, y) for t, y in pairs if (t, str(y)) not in idx)
    j['awardLinks'] = links
    print('奖项链接入库:', len(links), '/', len(aw), ' 未命中条目:', len(miss))

    out = head + json.dumps(j, ensure_ascii=False, separators=(',', ':')) + tail
    io.open(DATA, 'w', encoding='utf-8').write(out)
    print('meta:', json.dumps(m, ensure_ascii=False))
    print('验证: films =', len(j['films']))

if __name__ == '__main__':
    main()