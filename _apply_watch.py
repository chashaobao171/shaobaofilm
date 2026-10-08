# -*- coding: utf-8 -*-
"""在详情弹层「找片源」旁新增「在线观看」按钮：展开面板列出其他片源站，点选即在对应站自动搜索片名。
每步替换断言命中次数，任何一步不匹配即报错退出、不写文件。"""
import io, sys

P = '电影类型全图谱.html'
h = io.open(P, encoding='utf-8').read()
orig = len(h)

def sub(old, new, n=1, label=''):
    global h
    c = h.count(old)
    if c != n:
        print('FAIL %s: expect %d got %d' % (label, n, c)); sys.exit(1)
    h = h.replace(old, new)
    print('ok %-16s x%d' % (label, c))

# ---- 1. 电视图标 ----
PLAY = "    play:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M10 8.6l6 3.4-6 3.4z\" fill=\"currentColor\" stroke=\"none\"/></svg>',"
TV = "    tv:'<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2.5\" y=\"6\" width=\"19\" height=\"13\" rx=\"2\"/><path d=\"M8 2.8l4 3.2 4-3.2\"/><path d=\"M10.2 10.4l4.4 2.6-4.4 2.6z\" fill=\"currentColor\" stroke=\"none\"/></svg>',"
sub(PLAY, PLAY + "\n" + TV, 1, 'ic-tv')

# ---- 2. 其他站点数据 + URL 生成 ----
WATCH_JS = '''  /* ============ 在线观看（其他站点） ============ */
  var WATCH=[
    {n:"KK122",h:"网盘资源",s:"https://kk122.seesee.sbs/vodsearch/-------------.html?wd=",q:1},
    {n:"VV3nwjk",h:"在线播放",s:"https://www.vv3nwjk.com/search?q=",q:1},
    {n:"1080影视",h:"多线路聚合",s:"https://tvv.movie1080.online/?ref=qiandh.com",q:0}
  ];
  function watchUrl(w,t){return w.q?w.s+encodeURIComponent(t):w.s;}

'''
sub('  }).join("")+\'</div>\';\n\n  /* ============ 详情弹层 ============ */',
    '  }).join("")+\'</div>\';\n\n' + WATCH_JS + '  /* ============ 详情弹层 ============ */',
    1, 'watch-data')

# ---- 3. 弹层按钮 + 展开面板 ----
OLD_ACT = """      +'<a class="mod-a" href="https://vcsoso.com/s/'+encodeURIComponent(f.t)+'" target="_blank" rel="noopener" title="在维C搜搜搜索《'+esc(f.t)+'》的片源">'+IC.play+'找片源</a>'
      +'</div>'"""
NEW_ACT = """      +'<a class="mod-a" href="https://vcsoso.com/s/'+encodeURIComponent(f.t)+'" target="_blank" rel="noopener" title="在维C搜搜搜索《'+esc(f.t)+'》的片源">'+IC.play+'找片源</a>'
      +'<button class="mod-a mod-watch" type="button" aria-expanded="false" title="在更多站点搜索《'+esc(f.t)+'》">'+IC.tv+'在线观看</button>'
      +'</div>'
      +'<div class="mod-src" hidden><span class="ms-hd">到这些站搜索《'+esc(f.t)+'》</span><div class="ms-row">'
      +WATCH.map(function(w){return '<a class="ms-chip" href="'+esc(watchUrl(w,f.t))+'" target="_blank" rel="noopener">'+esc(w.n)+'<i>'+esc(w.h)+'</i></a>';}).join("")
      +'</div></div>'"""
sub(OLD_ACT, NEW_ACT, 1, 'watch-btn')

# ---- 4. 样式 ----
CSS_ANCHOR = '.mod-acts{display:flex;gap:10px;flex-wrap:wrap;margin:-4px 0 22px}'
CSS_NEW = CSS_ANCHOR + '''
.mod-src{margin:-12px 0 22px;padding:13px 15px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.mod-src[hidden]{display:none}
.ms-hd{display:block;font-size:11.5px;letter-spacing:.06em;color:var(--ink3);margin-bottom:9px}
.ms-row{display:flex;flex-wrap:wrap;gap:8px}
.ms-chip{display:inline-flex;align-items:baseline;gap:7px;padding:7px 12px;border:1px solid var(--brand-line);border-radius:7px;background:var(--brand-dim);color:var(--brand);font-size:12.5px;font-weight:600;text-decoration:none;transition:background .16s,color .16s}
.ms-chip i{font-style:normal;font-size:10.5px;font-weight:500;color:var(--ink3)}
.ms-chip:hover{background:var(--brand);color:var(--brand-ink)}
.ms-chip:hover i{color:var(--brand-ink);opacity:.75}
.ms-chip:focus-visible{outline:2px solid var(--brand);outline-offset:2px}'''
sub(CSS_ANCHOR, CSS_NEW, 1, 'watch-css')

# ---- 5. 展开/收起交互 ----
OLD_LIS = """  $("#modBody").addEventListener("click",function(e){
    var nx=e.target.closest(".mod-next"); if(nx){nextRandom();return;}
    var m=e.target.closest(".mc"); if(m)openFilm(+m.dataset.i);
  });"""
NEW_LIS = """  $("#modBody").addEventListener("click",function(e){
    var nx=e.target.closest(".mod-next"); if(nx){nextRandom();return;}
    var wt=e.target.closest(".mod-watch");
    if(wt){
      var p=document.querySelector("#modBody .mod-src");
      if(p){var was=p.hidden;p.hidden=!was;wt.setAttribute("aria-expanded",was?"true":"false");}
      return;
    }
    var m=e.target.closest(".mc"); if(m)openFilm(+m.dataset.i);
  });"""
sub(OLD_LIS, NEW_LIS, 1, 'watch-toggle')

# ---- 校验 ----
for need, n in [('mod-watch', 2), ('mod-src', 4), ('ms-chip', 6), ('watchUrl', 2), ('IC.tv', 1), ('在线观看', 2), ('vodsearch', 1)]:
    c = h.count(need)
    if c != n: print('FAIL check %s: expect %d got %d' % (need, n, c)); sys.exit(1)
    print('chk %-12s x%d' % (need, c))

io.open(P, 'w', encoding='utf-8').write(h)
print('written: %d -> %d chars' % (orig, len(h)))