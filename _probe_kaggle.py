# -*- coding: utf-8 -*-
"""探测 kaggle douban_movies_2021.json 各字段真实结构"""
import json, collections

KAGGLE = r'C:\Users\59634\.cache\kagglehub\datasets\william18652\douban-movies\versions\1\douban_movies_2021.json'
print('loading...')
movies = json.load(open(KAGGLE, encoding='utf-8'))
print('total', len(movies))

def probe_field(name, n=5):
    types = collections.Counter()
    samples = []
    for m in movies:
        v = m.get(name)
        types[type(v).__name__] += 1
        if len(samples) < n:
            r = repr(v)
            if len(r) > 260: r = r[:260] + '...CUT'
            if r not in samples: samples.append(r)
    print('==', name, dict(types))
    for s in samples: print('   ', s)

for f in ['genres', 'directors', 'actors', 'countries', 'durations', 'images', 'rating', 'movie_id', 'year', 'original_title', 'pubdates']:
    probe_field(f)

# 找 V字仇杀队 与 冈仁波齐 看完整记录
for m in movies:
    if m.get('title') in ('V字仇杀队', '冈仁波齐'):
        print('=====', m.get('title'))
        for k in ('movie_id', 'title', 'year', 'genres', 'directors', 'actors', 'countries', 'durations', 'images', 'rating', 'summary'):
            v = repr(m.get(k))
            print('  ', k, ':', v[:400])
