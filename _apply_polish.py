#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
烧包影视 - 设计优化脚本
1. 移除导航标签中的"类型"字样（为导航栏腾出空间）
2. 简化 logo SVG（去掉热气，只保留包子本体）
3. 优化页面设计与交互体验
"""
import sys, re

P = r'D:\59634\Downloads\TRAEworkspace\question\film\电影类型全图谱.html'
with open(P, 'r', encoding='utf-8') as f:
    h = f.read()

def sub(old, new, expect, tag):
    global h
    c = h.count(old)
    if c != expect:
        print(f'FAIL {tag}: expect {expect} occurrences, found {c}')
        sys.exit(1)
    h = h.replace(old, new)
    print(f'OK {tag}: {expect} replacements')

# ========================================
# 1. 移除导航标签中的"类型"
# ========================================
sub('{v:"genres",n:"类型图谱",c:D.meta.types}',
    '{v:"genres",n:"图谱",c:D.meta.types}', 1, 'nav-genres')

sub('{v:"films",n:"影史名片",c:D.meta.films}',
    '{v:"films",n:"影史名片",c:D.meta.films}', 1, 'nav-films-keep')

sub('{v:"awards",n:"权威奖项",c:D.meta.awards}',
    '{v:"awards",n:"奖项",c:D.meta.awards}', 1, 'nav-awards')

sub('{v:"ranks",n:"权威榜单",c:D.meta.ranks}',
    '{v:"ranks",n:"榜单",c:D.meta.ranks}', 1, 'nav-ranks')

sub('{v:"dirs",n:"导演谱系",c:D.meta.dirs}',
    '{v:"dirs",n:"导演",c:D.meta.dirs}', 1, 'nav-dirs')

# ========================================
# 2. 简化 logo SVG - 移除热气（前两条 path）
# ========================================
OLD_LOGO = '<svg class="lgm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.6 2.0 C 8.7 2.9, 8.7 3.7, 9.6 4.6 C 10.5 5.5, 10.5 6.3, 9.6 7.2" stroke-width="1.15"/><path d="M14.4 2.0 C 15.3 2.9, 15.3 3.7, 14.4 4.6 C 13.5 5.5, 13.5 6.3, 14.4 7.2" stroke-width="1.15"/><path d="M4.6 15.4 C 4.6 11.6, 7.9 9.0, 12 9.0 C 16.1 9.0, 19.4 11.6, 19.4 15.4 C 19.4 18.6, 16.1 20.6, 12 20.6 C 7.9 20.6, 4.6 18.6, 4.6 15.4 Z"/><path d="M10.3 9.9 C 10.6 8.2, 13.4 8.2, 13.7 9.9"/><path d="M12 9.4 V 12.4"/><path d="M11.2 9.8 C 10.3 10.7, 9.5 11.6, 8.9 12.6"/><path d="M12.8 9.8 C 13.7 10.7, 14.5 11.6, 15.1 12.6"/></svg>'

NEW_LOGO = '<svg class="lgm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.6 15.4 C 4.6 11.6, 7.9 9.0, 12 9.0 C 16.1 9.0, 19.4 11.6, 19.4 15.4 C 19.4 18.6, 16.1 20.6, 12 20.6 C 7.9 20.6, 4.6 18.6, 4.6 15.4 Z"/><path d="M10.3 9.9 C 10.6 8.2, 13.4 8.2, 13.7 9.9"/><path d="M12 9.4 V 12.4"/><path d="M11.2 9.8 C 10.3 10.7, 9.5 11.6, 8.9 12.6"/><path d="M12.8 9.8 C 13.7 10.7, 14.5 11.6, 15.1 12.6"/></svg>'

sub(OLD_LOGO, NEW_LOGO, 1, 'logo-main')

# Favicon - 也需要更新（去掉热气）
OLD_FAV = '''<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a843' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9.6 2.0 C 8.7 2.9, 8.7 3.7, 9.6 4.6 C 10.5 5.5, 10.5 6.3, 9.6 7.2' stroke-width='1.15'/%3E%3Cpath d='M14.4 2.0 C 15.3 2.9, 15.3 3.7, 14.4 4.6 C 13.5 5.5, 13.5 6.3, 14.4 7.2' stroke-width='1.15'/%3E%3Cpath d='M4.6 15.4 C 4.6 11.6, 7.9 9.0, 12 9.0 C 16.1 9.0, 19.4 11.6, 19.4 15.4 C 19.4 18.6, 16.1 20.6, 12 20.6 C 7.9 20.6, 4.6 18.6, 4.6 15.4 Z'/%3E%3Cpath d='M10.3 9.9 C 10.6 8.2, 13.4 8.2, 13.7 9.9'/%3E%3Cpath d='M12 9.4 V 12.4'/%3E%3Cpath d='M11.2 9.8 C 10.3 10.7, 9.5 11.6, 8.9 12.6'/%3E%3Cpath d='M12.8 9.8 C 13.7 10.7, 14.5 11.6, 15.1 12.6'/%3E%3C/svg%3E">'''

NEW_FAV = '''<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a843' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.6 15.4 C 4.6 11.6, 7.9 9.0, 12 9.0 C 16.1 9.0, 19.4 11.6, 19.4 15.4 C 19.4 18.6, 16.1 20.6, 12 20.6 C 7.9 20.6, 4.6 18.6, 4.6 15.4 Z'/%3E%3Cpath d='M10.3 9.9 C 10.6 8.2, 13.4 8.2, 13.7 9.9'/%3E%3Cpath d='M12 9.4 V 12.4'/%3E%3Cpath d='M11.2 9.8 C 10.3 10.7, 9.5 11.6, 8.9 12.6'/%3E%3Cpath d='M12.8 9.8 C 13.7 10.7, 14.5 11.6, 15.1 12.6'/%3E%3C/svg%3E">'''

sub(OLD_FAV, NEW_FAV, 1, 'favicon')

# ========================================
# 3. 设计优化 - 改进交互与视觉质感
# ========================================

# 3.1 增加导航按钮间距，优化排版
sub('.nav button{\n  display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:7px;\n  font-size:13.5px;color:var(--ink2);white-space:nowrap;transition:color .16s,background .16s;\n}',
    '.nav button{\n  display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:7px;\n  font-size:13.5px;font-weight:500;color:var(--ink2);white-space:nowrap;transition:color .16s,background .16s;\n}', 1, 'nav-btn-spacing')

# 3.2 增强卡片悬停效果
sub('.fc:hover{transform:translateY(-4px);border-color:var(--brand-line);box-shadow:var(--sh2)}',
    '.fc:hover{transform:translateY(-3px);border-color:var(--brand-line);box-shadow:0 12px 40px -12px rgba(0,0,0,.65),0 0 0 1px var(--brand-line)}', 1, 'card-hover')

# 3.3 优化评分标签样式（更精致）
sub('.fcp .rate{\n  position:absolute;top:8px;right:8px;z-index:2;padding:2px 7px;border-radius:5px;\n  background:rgba(10,10,14,.74);backdrop-filter:blur(4px);color:var(--brand);\n  font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.01em;\n}',
    '.fcp .rate{\n  position:absolute;top:8px;right:8px;z-index:2;padding:3px 8px;border-radius:6px;\n  background:rgba(10,10,14,.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:var(--brand);\n  font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.02em;\n  box-shadow:0 2px 8px rgba(0,0,0,.4);\n}', 1, 'rate-badge')

# 3.4 增强搜索框交互
sub('.hsearch input:focus{border-color:var(--brand)}',
    '.hsearch input:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-dim)}', 1, 'search-focus')

# 3.5 优化按钮样式
sub('.btn-p:hover{transform:translateY(-1px)}',
    '.btn-p:hover{transform:translateY(-1px);box-shadow:0 6px 20px -6px rgba(212,168,67,.5)}', 1, 'btn-primary-hover')

# 最终断言检查
checks = [
    ('图谱', 1),  # 类型图谱 -> 图谱
    ('奖项', 1),  # 权威奖项 -> 奖项
    ('榜单', 1),  # 权威榜单 -> 榜单
    ('导演', 2),  # 导演谱系 -> 导演 (注意"导演"二字在别处也可能出现)
]

for need, n in checks:
    c = h.count(need)
    if c < n:
        print(f'WARN check {need}: expect at least {n}, got {c}')

# 写回文件
with open(P, 'w', encoding='utf-8', newline='\n') as f:
    f.write(h)

print('\n=== 优化完成 ===')
print('1. 导航标签已精简（类型图谱→图谱，权威奖项→奖项等）')
print('2. Logo 已简化（移除热气，仅保留包子本体）')
print('3. 设计优化完成（导航间距、卡片悬停、评分标签、搜索框、按钮等）')
