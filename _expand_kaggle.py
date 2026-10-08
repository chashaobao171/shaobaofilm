# -*- coding: utf-8 -*-
"""从 Kaggle douban_movies_2021.json (67,132部) 扩充片库
输出: _kaggle_new.json (新增影片) + _kaggle_posters.json (id -> 海报URL)
准入: 普通 r>=7.5 & votes>=2000 & 简介>=20字 | 纪录片 r>=7.2 & votes>=200
"""
import json, io, ast, sys, re

KAGGLE = r'C:\Users\59634\.cache\kagglehub\datasets\william18652\douban-movies\versions\1\douban_movies_2021.json'
DATA = 'films-data.js'

GEN_OK = set('剧情 喜剧 动作 爱情 科幻 动画 悬疑 惊悚 恐怖 犯罪 战争 家庭 冒险 奇幻 歌舞 音乐 传记 历史 运动 古装 武侠 西部 纪录片 同性 儿童 灾难 黑色电影 戏曲 舞台艺术 短片'.split())
TR_MAP = {'動畫 Animation': '动画', '劇情 Drama': '剧情', '紀錄片 Documentary': '纪录片',
          '驚悚 Thriller': '惊悚', '音樂 Music': '音乐', '愛情 Romance': '爱情',
          '懸疑 Mystery': '悬疑', '喜劇 Comedy': '喜剧', '兒童 Kids': '儿童'}
BLACK_TITLE = ['老友记重聚特辑', '黑镜：潘达斯奈基', '神探夏洛克', '生活大爆炸', '权力的游戏', '切尔诺贝利']

def parse_genres(m):
    out = []
    for x in (m.get('genres') or []):
        if not isinstance(x, str):
            continue
        if x.startswith('['):
            try:
                v = ast.literal_eval(x)
                out += [str(i).strip() for i in v]
            except Exception:
                pass
        else:
            out.append(x.strip())
    cleaned = []
    for g in out:
        g = TR_MAP.get(g, g)
        if g in GEN_OK and g not in cleaned:
            cleaned.append(g)
    return cleaned

def main():
    d = io.open(DATA, encoding='utf-8').read()
    cur, _ = json.JSONDecoder().raw_decode(d[d.index('window.CINE') + 12:])
    existing = cur['films']
    exist_ids = {str(f.get('id')) for f in existing if f.get('id')}
    exist_keys = {(f['t'], str(f.get('y'))) for f in existing}

    movies = json.load(open(KAGGLE, encoding='utf-8'))
    new, posters, doc_count = [], {}, 0
    for m in movies:
        try:
            r = float((m.get('rating') or {}).get('score') or 0)
            votes = int((m.get('rating') or {}).get('count') or 0)
        except Exception:
            continue
        g = parse_genres(m)
        s = (m.get('summary') or '').strip()
        img = ((m.get('images') or {}).get('large') or '').strip()
        if not img.startswith('http'):
            continue
        if '纪录片' in g:
            if r < 7.2 or votes < 200:
                continue
        else:
            if r < 7.5 or votes < 2000 or len(s) < 20:
                continue
        title = (m.get('title') or '').strip()
        if not title:
            continue
        if any(b in title for b in BLACK_TITLE):
            continue
        mid = str(m.get('movie_id') or '')
        year = m.get('year') or ''
        if mid and mid in exist_ids:
            continue
        if (title, str(year)) in exist_keys:
            continue
        ctry = '/'.join((m.get('countries') or [])[:3])
        dur = ''
        for dd in (m.get('durations') or []):
            if re.search(r'\d+\s*分钟', str(dd)):
                dur = str(dd)
                break
        rec = {
            't': title,
            'y': str(year),
            'd': ' / '.join((m.get('directors') or [])[:2]),
            'r': ('%g' % r) if r else '',
            'c': ctry,
            'dur': dur,
            'g': g,
            's': s,
            'acts': ' / '.join((m.get('actors') or [])[:5]),
            'p': 'posters/%s.jpg' % mid,
            'id': mid,
            'votes': votes,
            'e': (m.get('original_title') or '') if m.get('original_title') != title else '',
        }
        new.append(rec)
        posters[mid] = img
        if '纪录片' in g:
            doc_count += 1

    json.dump(new, io.open('_kaggle_new.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(posters, io.open('_kaggle_posters.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print('新增影片:', len(new), ' 其中纪录片:', doc_count)
    yrs = {}
    for f in new:
        y = str(f['y'])[:4]
        if y.isdigit():
            yrs[y] = yrs.get(y, 0) + 1
    print('年代分布(近10):', sorted(yrs.items())[-10:])
    print('有海报URL:', len(posters))

if __name__ == '__main__':
    main()
