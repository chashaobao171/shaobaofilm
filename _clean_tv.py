import json, re, io

raw = io.open('films-data.js', encoding='utf-8').read()
j = json.loads(raw[raw.index('{'):raw.rindex(';')])
films = j['films']
print('before:', len(films))

DROP = re.compile(r'特辑|特别篇|现场版')
removed = [f['t'] for f in films if DROP.search(f['t'])]
print('removed', len(removed))
for t in removed:
    print('  -', t)
films = [f for f in films if not DROP.search(f['t'])]
j['films'] = films
print('after:', len(films))

docs = [f for f in films if '纪录片' in (f.get('g') or [])]
print('docs in library:', len(docs))
gkr = next((f for f in films if f['t'] == '冈仁波齐'), None)
print('冈仁波齐:', gkr['y'], gkr['g'] if gkr else 'MISSING')

tset = {(f['t'], str(f['y'])) for f in films}
aw = j.get('awardLinks', {})
bad = [(a, t, y) for a, pairs in aw.items() for t, y in pairs if (t, str(y)) not in tset]
print('awardLinks unresolved after removal:', len(bad))

out = 'window.CINE=' + json.dumps(j, ensure_ascii=False, separators=(',', ':')) + ';'
io.open('films-data.js', 'w', encoding='utf-8').write(out)
print('written chars:', len(out))
