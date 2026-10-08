# -*- coding: utf-8 -*-
"""纪录片漏斗诊断：kaggle 里纪录片各阶段数量"""
import json, re, ast

KAGGLE = r'C:\Users\59634\.cache\kagglehub\datasets\william18652\douban-movies\versions\1\douban_movies_2021.json'

GEN_OK = set('剧情 喜剧 动作 爱情 科幻 动画 悬疑 惊悚 恐怖 犯罪 同性 音乐 歌舞 运动 战争 西部 奇幻 冒险 灾难 武侠 古装 情色 家庭 儿童 传记 历史 纪录片 短片 黑色电影 舞台艺术 戏曲'.split())
TR_MAP = {'動畫':'动画','劇情':'剧情','紀錄片':'纪录片','驚悚':'惊悚','音樂':'音乐','愛情':'爱情','懸疑':'悬疑','喜劇':'喜剧','兒童':'儿童','恐怖':'恐怖','動作':'动作','科幻':'科幻','戰爭':'战争','犯罪':'犯罪','冒險':'冒险','奇幻':'奇幻','傳記':'传记','歷史':'历史','家庭':'家庭','古裝':'古装','運動':'运动','同性':'同性','災難':'灾难','歌舞':'歌舞','武俠':'武侠','西部':'西部','短片':'短片','黑色電影':'黑色电影','情色':'情色'}

def unfrag(v):
    if isinstance(v, list):
        return ','.join(x for x in v if isinstance(x, str))
    return v if isinstance(v, str) else ''

ZH_PREFIX = re.compile(r'^([\u4e00-\u9fff]+)')

def parse_genres(m):
    cleaned = []
    s = unfrag(m.get('genres'))
    if s.startswith('['):
        try:
            lst = ast.literal_eval(s)
        except Exception:
            lst = [x.strip().strip("'\"[] ") for x in s.split(',')]
    else:
        lst = [s] if s else []
    for g in lst:
        if not g:
            continue
        hit = ZH_PREFIX.match(str(g).strip())
        if not hit:
            continue
        zh = TR_MAP.get(hit.group(1), hit.group(1))
        if zh in GEN_OK and zh not in cleaned:
            cleaned.append(zh)
    return cleaned

def parse_dur_min(m):
    s = unfrag(m.get('durations'))
    for seg in (s.split(',') if s else []):
        h = re.search(r'(\d+)\s*分钟', seg)
        if h:
            return int(h.group(1))
    return None

print('loading...')
movies = json.load(open(KAGGLE, encoding='utf-8'))
n_doc = n_img = n_rate = n_tv = 0
loose = []
for m in movies:
    g = parse_genres(m)
    if '纪录片' not in g:
        continue
    n_doc += 1
    img = ((m.get('images') or {}).get('large') or '').strip()
    if not img.startswith('http'):
        continue
    n_img += 1
    r = float((m.get('rating') or {}).get('score') or 0)
    votes = int((m.get('rating') or {}).get('count') or 0)
    if r >= 7.2 and votes >= 200:
        n_rate += 1
        mins = parse_dur_min(m)
        if mins is not None and mins < 60:
            n_tv += 1
    if r >= 7.0 and votes >= 100:
        loose.append((m.get('title'), m.get('year'), r, votes))

print('纪录片总数:', n_doc, ' 有海报URL:', n_img, ' 过r7.2&v200:', n_rate, ' 其中<60分钟(TV):', n_tv)
loose.sort(key=lambda x: (-x[2], -x[3]))
print('r>=7.0&votes>=100 样例30:', loose[:30])
