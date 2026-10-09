import re
import json

print("读取 films-data.js...")
with open('films-data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the entire CINE object
match = re.search(r'window\.CINE\s*=\s*(\{.+\});', content, re.DOTALL)
if not match:
    print("无法找到 window.CINE 对象")
    exit(1)

print("解析电影数据...")
cine_obj = json.loads(match.group(1))
films = cine_obj['films']
print(f"总电影数: {len(films)}\n")

# Find duplicates
title_year_map = {}
for idx, film in enumerate(films):
    key = f"{film['t']}|{film.get('y', '')}"
    if key not in title_year_map:
        title_year_map[key] = []
    title_year_map[key].append(idx)

duplicates = [(k, v) for k, v in title_year_map.items() if len(v) > 1]
duplicates.sort(key=lambda x: len(x[1]), reverse=True)

print(f"=== 发现 {len(duplicates)} 组重复电影 ===\n")

# Collect indices to remove
to_remove = []
for key, indices in duplicates[:20]:  # Top 20
    title, year = key.split('|')
    print(f"{len(indices)}x \"{title}\" ({year})")
    
    # Keep the best one (prefer douban > with poster > higher rating)
    best_idx = indices[0]
    best_film = films[best_idx]
    
    for idx in indices:
        f = films[idx]
        source = f.get('source', 'douban')
        print(f"  [索引{idx}] ID:{f.get('id', 'N/A')} 来源:{source} 海报:{'Y' if f.get('p') else 'N'} 评分:{f.get('r', 'N/A')}")
        
        # Prefer douban > poster > higher rating
        if source == 'douban' and best_film.get('source', 'douban') != 'douban':
            best_idx = idx
            best_film = f
        elif source == best_film.get('source', 'douban'):
            if f.get('p') and not best_film.get('p'):
                best_idx = idx
                best_film = f
            elif (f.get('p') == best_film.get('p')) and (f.get('r', 0) > best_film.get('r', 0)):
                best_idx = idx
                best_film = f
    
    print(f"  -> 保留索引 {best_idx}")
    to_remove.extend([i for i in indices if i != best_idx])
    print()

print(f"\n=== 查找 Untitled 和 Two-Body 无海报电影 ===\n")
no_poster_targets = [(i, f) for i, f in enumerate(films) 
                     if not f.get('p') and ('Untitled' in f['t'] or 'Two-Body' in f['t'])]

if no_poster_targets:
    for idx, f in no_poster_targets:
        print(f"标题: {f['t']}")
        print(f"年份: {f.get('y', 'N/A')}")
        print(f"索引: {idx}")
        print(f"ID: {f.get('id', 'N/A')}")
        to_remove.append(idx)
        print("-> 标记删除")
        print()
else:
    print("未找到匹配的无海报电影\n")

# Remove duplicates and no-poster films
to_remove = sorted(set(to_remove), reverse=True)
print(f"\n=== 准备删除 {len(to_remove)} 部电影 ===")
if len(to_remove) <= 30:
    print(f"删除索引: {to_remove}\n")
else:
    print(f"删除索引(前30): {to_remove[:30]}...\n")

for idx in to_remove:
    del films[idx]

print(f"删除后电影数: {len(films)}")

# Update CINE object
cine_obj['films'] = films

# Write back
print("\n正在写回 films-data.js...")
new_cine_json = json.dumps(cine_obj, ensure_ascii=False, separators=(',', ':'))
new_content = content.replace(match.group(1), new_cine_json)

with open('films-data.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("完成！")
