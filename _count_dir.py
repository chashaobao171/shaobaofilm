# -*- coding: utf-8 -*-
"""统计 films-data.js 中指定导演的收录情况"""
import io, json

d = io.open('films-data.js', encoding='utf-8').read()
j = json.JSONDecoder().raw_decode(d[d.index('{'):])[0]
films = j['films']
print('库内总数:', len(films), '| meta 声明:', j['meta']['films'])

TARGETS = ['姜文', '岩井俊二', '王家卫', '是枝裕和', '侯孝贤', '贾樟柯',
           'Christopher Nolan', 'Quentin Tarantino', 'Wes Anderson', 'Wong Kar-wai']

for name in TARGETS:
    hits = [f for f in films if name.lower() in (f.get('d') or '').lower()]
    print('\n== %s : %d 部 ==' % (name, len(hits)))
    for f in hits:
        print('   %-28s %s  ★%s  %s' % (f['t'], f.get('y', ''), f.get('r', '—'), f.get('d', '')))