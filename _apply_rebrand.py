# -*- coding: utf-8 -*-
"""烧包影视 rebrand + 榜单瘦身 + 片源查找视图 + 弹层找片源按钮。
每步替换都断言命中次数，任何一步不匹配则报错退出、不写文件。"""
import io, re, sys

P = '电影类型全图谱.html'
h = io.open(P, encoding='utf-8').read()
orig = len(h)

def sub(old, new, n=1, label=''):
    global h
    c = h.count(old)
    if c != n:
        print('FAIL %s: expect %d got %d' % (label, n, c)); sys.exit(1)
    h = h.replace(old, new)
    print('ok %-18s x%d' % (label, c))

APERTURE = '<circle cx="12" cy="12" r="10"/><line x1="14.31" y1="8" x2="20.05" y2="17.94"/><line x1="9.69" y1="8" x2="21.17" y2="8"/><line x1="7.38" y1="12" x2="13.12" y2="2.06"/><line x1="9.69" y1="16" x2="3.95" y2="6.06"/><line x1="14.31" y1="16" x2="2.83" y2="16"/><line x1="16.62" y1="12" x2="10.88" y2="21.94"/>'
BAO = '<path d="M12 5.1c-4.4 0-7.9 3-7.9 7.2 0 2.7 1.5 5 3.8 6.2h8.2c2.3-1.2 3.8-3.5 3.8-6.2 0-4.2-3.5-7.2-7.9-7.2Z"/><path d="M12 5.3c-.8 1.4-2.2 2.4-4.1 2.5M12 5.3c.8 1.4 2.2 2.4 4.1 2.5"/><path d="M9.2 2.4c.4-.5.4-1.1 0-1.6M14.8 2.4c.4-.5.4-1.1 0-1.6"/>'
FAVICON = "<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23d4a843' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 5.1c-4.4 0-7.9 3-7.9 7.2 0 2.7 1.5 5 3.8 6.2h8.2c2.3-1.2 3.8-3.5 3.8-6.2 0-4.2-3.5-7.2-7.9-7.2Z'/%3E%3Cpath d='M12 5.3c-.8 1.4-2.2 2.4-4.1 2.5M12 5.3c.8 1.4 2.2 2.4 4.1 2.5'/%3E%3Cpath d='M9.2 2.4c.4-.5.4-1.1 0-1.6M14.8 2.4c.4-.5.4-1.1 0-1.6'/%3E%3C/svg%3E\">"

# ---- 1. 品牌 ----
sub('<title>影志 Cinephile — 电影全图谱</title>',
    '<title>烧包影视 shaofilm — 电影全图谱</title>', 1, 'title')
sub('影志 Cinephile — cinematic dark + gold',
    '烧包影视 shaofilm — cinematic dark + gold', 1, 'css-comment')
sub('aria-label="影志 首页"', 'aria-label="烧包影视 首页"', 1, 'aria-logo')
sub('<span class="lgs">影志</span><small>CINEPHILE</small>',
    '<span class="lgs">烧包影视</span><small>SHAOFILM</small>', 1, 'logo-text')
sub('<b>影志 Cinephile</b>', '<b>烧包影视 shaofilm</b>', 1, 'footer-brand')
sub(APERTURE, BAO, 2, 'bao-svg')
m = re.search(r'<link rel="icon" href="[^"]*">', h)
if not m: print('FAIL favicon'); sys.exit(1)
h = h[:m.start()] + FAVICON + h[m.end():]; print('ok %-18s x1' % 'favicon')

# ---- 2. 权威榜单：只留外部榜单 ----
sub('<p>先从本库实时算出的榜单开始——<b>评分、热度、年代、地区</b>四个切面；下面是 <b id="rkCount">—</b> 个外部权威榜单入口，分五类。想自己挖片单，从这些地方开始。</p>',
    '<p><b id="rkCount">—</b> 个外部权威榜单入口，分五类。想自己挖片单，从这些地方开始。</p>', 1, 'ranks-vhead')
sub('      <div id="boardsBox"></div>\n', '', 1, 'boards-div')

SOURCES_JS = '''  /* ============ 片源查找 ============ */
  var SOURCES=[
    {n:"维C搜搜",h:"vcsoso.com",u:"https://vcsoso.com/",d:"免登录、无广告，主打 1080P / 4K 原盘，站内可直接按片名搜索。"},
    {n:"KK122",h:"kk122.seesee.sbs",u:"https://kk122.seesee.sbs/",d:"网盘资源站，站内搜索片名即可。"},
    {n:"VV3nwjk",h:"www.vv3nwjk.com",u:"https://www.vv3nwjk.com/",d:"网盘资源站，域名更换频繁，失效请换用其他入口。"},
    {n:"1080影视",h:"tvv.movie1080.online",u:"https://tvv.movie1080.online/?ref=qiandh.com",d:"1080P 片源聚合入口，适合收藏做高画质备用。"}
  ];
  $("#sourcesBox").innerHTML='<div class="sgrid rv-kids">'+SOURCES.map(function(s,i){
    return '<a class="srccard" href="'+s.u+'" target="_blank" rel="noopener" aria-label="在新窗口打开 '+esc(s.n)+'">'
      +'<div class="sc-hd"><span class="sc-i">'+(i+1)+'</span><div><h3>'+esc(s.n)+'</h3><span class="sc-h">'+esc(s.h)+'</span></div></div>'
      +'<p class="sc-d">'+esc(s.d)+'</p>'
      +'<span class="sc-go">'+IC.out+'打开网站</span></a>';
  }).join("")+'</div>';

'''
js_a = h.index('  /* ============ 实时榜单 ============ */')
js_b = h.index('  /* ============ 详情弹层 ============ */')
if not (0 < js_a < js_b): print('FAIL boards-js-range'); sys.exit(1)
h = h[:js_a] + SOURCES_JS + h[js_b:]
print('ok %-18s (js %d chars -> sources)' % ('boards-js', js_b - js_a))

SOURCES_CSS = '''/* sources 片源查找 */
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.srccard{display:flex;flex-direction:column;gap:12px;padding:20px 18px 16px;border:1px solid var(--line);border-radius:var(--r-m);background:var(--surface);color:var(--ink);text-decoration:none;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.srccard:hover{transform:translateY(-3px);border-color:var(--brand-line);box-shadow:var(--sh2)}
.srccard:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.sc-hd{display:flex;align-items:center;gap:12px}
.sc-i{flex:0 0 34px;height:34px;border:1px solid var(--brand-line);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--sans);font-size:13px;font-weight:700;color:var(--brand)}
.sc-hd h3{font-family:var(--serif);font-size:17px;font-weight:700;margin:0;line-height:1.2}
.sc-h{display:block;font-family:var(--sans);font-size:11px;color:var(--ink3);letter-spacing:.06em;margin-top:2px}
.sc-d{font-size:12.5px;line-height:1.65;color:var(--ink2);margin:0;flex:1}
.sc-go{display:inline-flex;align-items:center;gap:6px;align-self:flex-start;font-size:11.5px;font-weight:600;letter-spacing:.04em;color:var(--brand);border:1px solid var(--brand-line);border-radius:7px;padding:7px 12px;background:var(--brand-dim);transition:background .16s,color .16s}
.sc-go svg{width:13px;height:13px}
.srccard:hover .sc-go{background:var(--brand);color:var(--brand-ink)}

'''
cs_a = h.index('/* ---------- boards (computed rankings) ---------- */')
cs_b = h.index('/* directors */')
if not (0 < cs_a < cs_b): print('FAIL boards-css-range'); sys.exit(1)
h = h[:cs_a] + SOURCES_CSS + h[cs_b:]
print('ok %-18s (css %d chars -> sources)' % ('boards-css', cs_b - cs_a))

sub('.fcp img,.mc-p img,.brow img,.hero-bg img',
    '.fcp img,.mc-p img,.hero-bg img', 1, 'brow-img-fade')

# ---- 3. 导航 + 新视图 ----
sub('{v:"dirs",n:"导演谱系",c:D.meta.dirs}\n  ];',
    '{v:"dirs",n:"导演谱系",c:D.meta.dirs},\n    {v:"sources",n:"片源查找",c:4}\n  ];', 1, 'nav-tab')
sub('  </section>\n</main>',
    '''  </section>

  <!-- ============ 片源查找 ============ -->
  <section class="view" id="view-sources">
    <div class="wrap">
      <div class="vhead" data-rv>
        <h2>片源查找 <span>Sources</span></h2>
        <p>本库只做资料与片单检索，正片请到以下站点搜索观看。第三方站点域名更换频繁，打不开就换下一个。</p>
      </div>
      <div id="sourcesBox"></div>
    </div>
  </section>
</main>''', 1, 'sources-section')

# ---- 4. 详情弹层找片源按钮 ----
DICE = '''    dice:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>','''
sub(DICE, DICE + '''
    play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M10 8.6l6 3.4-6 3.4z" fill="currentColor" stroke="none"/></svg>',''', 1, 'ic-play')

OLD_MOD = '''      +(db?'<a class="mod-a" href="'+db+'" target="_blank" rel="noopener">'+IC.out+(f.id?'在豆瓣查看':'在 IMDb 查看')+'</a>':'')
      +'</div>' '''.rstrip()
NEW_MOD = '''      +(db?'<a class="mod-a" href="'+db+'" target="_blank" rel="noopener">'+IC.out+(f.id?'在豆瓣查看':'在 IMDb 查看')+'</a>':'')
      +'<a class="mod-a" href="https://vcsoso.com/s/'+encodeURIComponent(f.t)+'" target="_blank" rel="noopener" title="在维C搜搜搜索《'+esc(f.t)+'》的片源">'+IC.play+'找片源</a>'
      +'</div>' '''.rstrip()
sub(OLD_MOD, NEW_MOD, 1, 'mod-source-btn')

# ---- 校验 ----
for bad, name in [('影志', 'brand-leak'), ('boardsBox', 'boards-leak'), ('function board(', 'board-fn-leak'), ('.brow', 'brow-leak'), ('本库实时榜单', 'liveboard-leak')]:
    c = h.count(bad)
    if c: print('FAIL %s: %d remains' % (name, c)); sys.exit(1)
for need, n in [('烧包影视', 5), ('shaofilm', 3), ('sourcesBox', 2), ('srccard', 5), ('片源查找', 5), ('view-sources', 1), ('找片源', 1)]:
    c = h.count(need)
    if c != n: print('FAIL check %s: expect %d got %d' % (need, n, c)); sys.exit(1)
    print('chk %-14s x%d' % (need, c))

io.open(P, 'w', encoding='utf-8').write(h)
print('written: %d -> %d chars' % (orig, len(h)))
