import json, io

DATA = 'films-data.js'
d = io.open(DATA, encoding='utf-8').read()
j = json.loads(d[d.index('{'):d.rindex(';')])
films = j['films']
m = j['meta']

m['films'] = len(films)
m['posters'] = sum(1 for f in films if f.get('p'))
m['synopsis'] = sum(1 for f in films if (f.get('s') or '').strip())
gens, dirs, ctry, dec = set(), set(), set(), set()
for f in films:
    gens.update(f.get('g') or [])
    if f.get('d'): dirs.add(f['d'])
    for c in (f.get('c') or '').split('/'):
        c = c.strip()
        if c: ctry.add(c)
    try: dec.add(int(f['y']) // 10 * 10)
    except Exception: pass
m['genres'] = len(gens)
m['directors'] = len(dirs)
m['countries'] = len(ctry)
m['decades'] = len(dec)

out = 'window.CINE=' + json.dumps(j, ensure_ascii=False, separators=(',', ':')) + ';'
io.open(DATA, 'w', encoding='utf-8').write(out)
print('meta:', json.dumps(m, ensure_ascii=False))
print('films:', len(films), ' chars:', len(out))
