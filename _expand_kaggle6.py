# -*- coding: utf-8 -*-
"""从 Kaggle douban_movies_2021.json (67,132部) 以 6.0 阈值扩充片库

与 _expand_kaggle2.py 同解析逻辑，仅放宽评分阈值 7.5/7.2 -> 6.0/6.0，
输出到 _kaggle_new6.json / _kaggle_posters6.json（不改动原脚本产物）。
准入: 普通 r>=6.0 & votes>=2000 & 简介>=20字 | 纪录片 r>=6.0 & votes>=200
"""
import json, io, ast, re

KAGGLE = r'C:\Users\59634\.cache\kagglehub\datasets\william18652\douban-movies\versions\1\douban_movies_2021.json'
DATA = 'films-data.js'
OUT_NEW = '_kaggle_new6.json'
OUT_POSTERS = '_kaggle_posters6.json'

GEN_OK = set('剧情 喜剧 动作 爱情 科幻 动画 悬疑 惊悚 恐怖 犯罪 同性 音乐 歌舞 运动 战争 西部 奇幻 冒险 灾难 武侠 古装 情色 家庭 儿童 传记 历史 纪录片 短片 黑色电影 舞台艺术 戏曲'.split())
TR_MAP = {'動畫':'动画','劇情':'剧情','紀錄片':'纪录片','驚悚':'惊悚','音樂':'音乐','愛情':'爱情','懸疑':'悬疑','喜劇':'喜剧','兒童':'儿童','恐怖':'恐怖','動作':'动作','科幻':'科幻','戰爭':'战争','犯罪':'犯罪','冒險':'冒险','奇幻':'奇幻','傳記':'传记','歷史':'历史','家庭':'家庭','古裝':'古装','運動':'运动','同性':'同性','災難':'灾难','歌舞':'歌舞','武俠':'武侠','西部':'西部','短片':'短片','黑色電影':'黑色电影','情色':'情色'}
BLACK_TITLE = ['老友记重聚特辑', '黑镜：潘达斯奈基', '神探夏洛克', '生活大爆炸', '权力的游戏', '切尔诺贝利']
TV_RE = re.compile(r'特辑|特别篇|现场版')

def unfrag(v):
    if isinstance(v, list):
        return ','.join(x for x in v if isinstance(x, str))
    return v if isinstance(v, str) else ''

ZH_PREFIX = re.compile(r'^([\u4e00-\u9fff]+)')
NAME_RE = re.compile(r"'name':\s*'([^']*)'")

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
    cleaned = []
    for g in parse_list_str(m.get('genres')):
        if not g:
            continue
        hit = ZH_PREFIX.match(g)
        if not hit:
            continue
        zh = TR_MAP.get(hit.group(1), hit.group(1))
        if zh in GEN_OK and zh not in cleaned:
            cleaned.append(zh)
    return cleaned

def parse_names(m, key, cap):
    v = m.get(key)
    if not isinstance(v, list) or not v:
        return ''
    def clean_str(x):
        return isinstance(x, str) and x.strip() and not any(t in x for t in ("'", '{', '[', '://'))
    if all(clean_str(x) for x in v):
        names = [x.strip() for x in v]
    else:
        names = [n.strip() for n in NAME_RE.findall(unfrag(v))]
    names = [n for n in names if n and 'http' not in n and '{' not in n]
    return ' / '.join(names[:cap])

def parse_dur(m):
    for dd in parse_list_str(m.get('durations')):
        hit = re.search(r'(\d+)\s*分钟', str(dd))
        if hit:
            return hit.group(1) + ' 分钟'
    return ''

def main():
    d = io.open(DATA, encoding='utf-8').read()
    eq = d.index('{', d.index('window.CINE'))
    cur, _ = json.JSONDecoder().raw_decode(d[eq:])
    exist_ids = {str(f.get('id')) for f in cur['films'] if f.get('id')}
    exist_keys = {(f['t'], str(f.get('y'))) for f in cur['films']}
    print('现有库:', len(cur['films']))

    print('loading kaggle ...')
    movies = json.load(open(KAGGLE, encoding='utf-8'))
    print('loaded', len(movies))

    new, posters = [], {}
    seen_keys = set()
    doc_count = tv_skip = no_dir = 0
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
        if not title or any(b in title for b in BLACK_TITLE) or TV_RE.search(title):
            continue
        mid = str(m.get('movie_id') or '')
        year = str(m.get('year') or '')
        if (mid and mid in exist_ids) or (title, year) in exist_keys or (title, year) in seen_keys:
            continue
        dur = parse_dur(m)
        dm = re.match(r'(\d+)', dur)
        if dm and int(dm.group(1)) < 60 and '短片' not in g:
            tv_skip += 1
            continue
        d_name = parse_names(m, 'directors', 3)
        if not d_name:
            no_dir += 1
        seen_keys.add((title, year))
        new.append({
            't': title, 'y': year, 'd': d_name,
            'r': ('%g' % r) if r else '',
            'c': ' / '.join([c for c in parse_list_str(m.get('countries')) if c][:3]),
            'dur': dur, 'g': g, 's': s,
            'acts': parse_names(m, 'actors', 5),
            'p': 'posters/%s.jpg' % mid, 'id': mid, 'votes': votes,
            'e': (m.get('original_title') or '') if m.get('original_title') != m.get('title') else '',
        })
        posters[mid] = img
        if is_doc:
            doc_count += 1

    json.dump(new, io.open(OUT_NEW, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(posters, io.open(OUT_POSTERS, 'w', encoding='utf-8'), ensure_ascii=False)
    print('新增影片:', len(new), ' 纪录片:', doc_count, ' TV剔除:', tv_skip, ' 无导演(仍收):', no_dir)
    yrs = {}
    for f in new:
        y = str(f['y'])[:4]
        if y.isdigit():
            yrs[y] = yrs.get(y, 0) + 1
    print('年代分布(近12):', sorted(yrs.items())[-12:])

if __name__ == '__main__':
    main()