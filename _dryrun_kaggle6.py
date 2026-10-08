# -*- coding: utf-8 -*-
"""只读 dry-run：统计 Kaggle 豆瓣数据集在 6.0 阈值下的可扩容规模（不写任何文件）"""
import json, io, ast, re, sys

KAGGLE = r'C:\Users\59634\.cache\kagglehub\datasets\william18652\douban-movies\versions\1\douban_movies_2021.json'
DATA = 'films-data.js'

GEN_OK = set('剧情 喜剧 动作 爱情 科幻 动画 悬疑 惊悚 恐怖 犯罪 同性 音乐 歌舞 运动 战争 西部 奇幻 冒险 灾难 武侠 古装 情色 家庭 儿童 传记 历史 纪录片 短片 黑色电影 舞台艺术 戏曲'.split())
BLACK_TITLE = ['老友记重聚特辑', '黑镜：潘达斯奈基', '神探夏洛克', '生活大爆炸', '权力的游戏', '切尔诺贝利']
NAME_RE = re.compile(r"'name':\s*'([^']*)'")

def unfrag(v):
    if isinstance(v, list):
        return ','.join(x for x in v if isinstance(x, str))
    return v if isinstance(v, str) else ''

def parse_list_str(v):
    s = unfrag(v)
    if not s:
        return []
    if s.startswith('['):
        try:
            r = ast.literal_eval(s)
            return [str(x).strip() for x in r] if isinstance(r, (list, tuple)) else [str(r)]
        except Exception:
            return [x.strip().strip("'\"[] ") for x in s.split(',') if x.strip().strip("'\"[] ")]
    return [s]

def parse_genres(m):
    out = []
    for g in parse_list_str(m.get('genres')):
        if not g:
            continue
        hit = re.match(r'^([\u4e00-\u9fff]+)', g)
        if not hit:
            continue
        zh = hit.group(1)
        if zh in GEN_OK and zh not in out:
            out.append(zh)
    return out

def parse_dur(m):
    for dd in parse_list_str(m.get('durations')):
        h = re.search(r'(\d+)\s*分钟', str(dd))
        if h:
            return int(h.group(1))
    return 0

def main():
    d = io.open(DATA, encoding='utf-8').read()
    eq = d.index('{', d.index('window.CINE'))
    cur, _ = json.JSONDecoder().raw_decode(d[eq:])
    exist_ids = {str(f.get('id')) for f in cur['films'] if f.get('id')}
    exist_keys = {(f['t'], str(f.get('y'))) for f in cur['films']}
    print('现有库:', len(cur['films']))

    print('loading kaggle ...')
    movies = json.load(open(KAGGLE, encoding='utf-8'))
    print('数据集总量:', len(movies))

    buckets = {'6.0-6.9': 0, '7.0-7.4': 0, '7.5+': 0}
    new_60 = 0
    seen = set()
    for m in movies:
        try:
            r = float((m.get('rating') or {}).get('score') or 0)
            votes = int((m.get('rating') or {}).get('count') or 0)
        except Exception:
            continue
        if r < 6.0:
            continue
        g = parse_genres(m)
        s = re.sub(r'©豆瓣\s*$', '', (m.get('summary') or '').strip()).strip()
        img = ((m.get('images') or {}).get('large') or '').strip()
        if not img.startswith('http'):
            continue
        is_doc = '纪录片' in g
        if is_doc:
            if votes < 200:
                continue
        else:
            if not g or votes < 2000 or len(s) < 20:
                continue
        title = (m.get('title') or '').strip()
        if not title or any(b in title for b in BLACK_TITLE):
            continue
        mid = str(m.get('movie_id') or '')
        year = str(m.get('year') or '')
        if (mid and mid in exist_ids) or (title, year) in exist_keys or (title, year) in seen:
            continue
        dur = parse_dur(m)
        if dur and dur < 60 and '短片' not in g:
            continue
        seen.add((title, year))
        new_60 += 1
        if r >= 7.5:
            buckets['7.5+'] += 1
        elif r >= 7.0:
            buckets['7.0-7.4'] += 1
        else:
            buckets['6.0-6.9'] += 1

    print('\n=== 6.0 阈值下可新增（已排除现有库）===')
    print('合计新增:', new_60)
    for k, v in buckets.items():
        print('  %s : %d' % (k, v))
    print('\n预计扩容后总量: %d' % (len(cur['films']) + new_60))

if __name__ == '__main__':
    main()