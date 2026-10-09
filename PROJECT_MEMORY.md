# 电影网站项目记忆文档（PROJECT_MEMORY）

> 交接用途：新对话直接读本文件即可理解项目全貌、当前状态与下一步任务入口。
> 最后更新：2026-10-09

---

## 一、项目概述

纯静态电影数据网站，无后端、无构建步骤。所有数据以 `window.*` 全局对象注入，页面直接消费。

- **唯一页面**：`index.html`（约 95KB，`taxonomy.html` 不存在，图谱是 index.html 内的一个区块）
- **数据源**：豆瓣（主）+ TMDB（补充海报与新片）
- **部署**：EdgeOne Pages 监听 GitHub `main` 分支，推送后自动部署
- **当前分支状态**：`main` 指向 `561920a`（"图谱子类型计数修复 + 奖项强关联扩展"），已同步远程（EdgeOne Pages 自动部署）

### 环境约束（务必遵守）

- 本机**只有 Microsoft Edge，没有 Chrome**。所有前端验证/截图/UI 调试一律用 Edge
  （`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）。
- **禁止**使用 Chrome / Chromium / Playwright 自带内核。
- 优先方式：启动本地服务后由用户用 Edge 手动打开。
- 本地预览：`http://127.0.0.1:8642/index.html`

---

## 二、真实文件结构

```
film/
├── index.html                 # 唯一页面（图谱/榜单/奖项/导演/电影库 全在这一个文件）
├── films-data.js              # 核心数据 window.CINE（单行压缩，约 6.5MB）
├── dim-data.js                # 维度筛选数据 window.CINE_DIM = {rank, studio}
├── taxonomy-data.js           # 类型图谱树 window.taxonomyTree + window.taxonomyMeta
├── posters/                   # 本地海报（9215 文件 / 353.6MB，git 已跟踪，唯一在用的海报目录）
├── .github/workflows/         # film-expansion.yml / poster-download.yml /
│                              # test-tmdb-connectivity.yml / tmdb-backfill.yml /
│                              # tmdb-discover-new-films.yml
├── tools/                     # 一次性脚本（详见第六节）
├── docs/                      # 历史规划文档
├── curated-lists/             # 片单 json 与预览
└── PROJECT_MEMORY.md          # 本文件
```

**index.html 中脚本加载顺序（不可颠倒）**：
`films-data.js` → `taxonomy-data.js` → `dim-data.js`

**已清理**：`_deploy/`、`_deploy_webp/`（均为派生产物，已删除，释放约 330MB，且已由 `.gitignore` 排除）。
`.gitignore` 内容：`_deploy/`、`_deploy_webp/`、`*.zip`、`Thumbs.db`、`Desktop.ini`、`.DS_Store`。

---

## 三、三个数据文件的结构（已逐一核实）

### 1. `films-data.js` → `window.CINE`

顶层键：`films, dirs, dregion, awards, ranks, tax, meta, awardLinks`

- **`meta`**（当前实际值）：
  ```json
  {"films":8795,"curated":44,"posters":5688,"directors":3222,"synopsis":5689,
   "countries":94,"decades":11,"genres":49,"dirs":74,"awards":56,"ranks":26,"types":124}
  ```
- **`films`**：8795 部。单条结构：
  ```json
  {"t":"复仇者联盟6","y":2027,"d":"乔·罗素","r":0,"c":"","dur":0,
   "g":["科幻","动作","冒险"],"s":"...","acts":"...",
   "p":"posters/f0YBuh4hyiAheXhh4JnJWoKi9g5.jpg","id":"tmdb1003598","votes":0,
   "e":"Avengers: Secret Wars","tmdbId":1003598,"keywords":[...],"collection":86311,
   "links":{"primary":"...","secondary":"..."},"source":"tmdb"}
  ```
  字段含义：`t` 中文名 / `e` 英文名 / `y` 年份 / `r` 豆瓣评分 / `d` 导演 / `dur` 时长 /
  `g` 类型标签数组（**匹配与图谱关键字段**）/ `p` 本地海报路径 / `s` 简介 / `acts` 主演 /
  `id`/`tmdbId`/`source` 来源标识 / `links` 外链 / `keywords`/`collection` TMDB 补充。
- **`awardLinks`**：45 个奖项键，值为 `[["片名","年份"], ...]`，**只存命中库内**的影片。
  例：`"戛纳电影节 · 金棕榈奖": [["偷自行车的人","1948"], ...]`
  45 键：戛纳金棕榈 / 威尼斯金狮 / 柏林金熊 / 洛迦诺金豹 / 圣塞巴斯蒂安金贝壳 /
  卡罗维发利水晶球 / 莫斯科圣乔治 / 上海金爵 / 东京金麒麟 / 奥斯卡 / 金球 / BAFTA /
  美国演员工会 SAG / 美国导演工会 DGA / 评论家选择 / 独立精神 / 圣丹斯 / 多伦多人民选择 /
  哥谭 / 欧洲电影奖 / 凯撒 / 大卫·迪·多纳泰罗 / 德国劳拉 / 戈雅 / 罗伯特 / 金甲虫 /
  BIFA / 日本电影学院 / 电影旬报十佳 / 蓝丝带 / 每日电影 / 韩国青龙 / 韩国大钟 / 百想 /
  香港金像 / 台湾金马 / 中国金鸡 / 百花 / 华表 / 亚洲电影大奖 / 印度观众 / 安妮 / 土星 /
  锡切斯 / 三大电影节新人单元。
  展示卡共 56 项，其中 45 项有对应影片；其余 11 项（开罗金字塔 / 塔林黑夜 / 特柳赖德 /
  AFI 终身成就 / 人民选择 / 幻想曲 / 鹿特丹 / 釜山 / 翠贝卡 / SXSW / 香港国际）因库内
  无可靠对应片而留空（前端不显示按钮）。
- **`awards`**：6 组展示卡片 `{g,c,s,items:[{n,e,m,d}]}`（前端翻面卡，页面渲染用）。
- **`ranks`**：5 组展示卡片（含 IMDb Top 250、豆瓣 Top 250 等，带 `u` 外链）。
- **`tax`**：11 组图谱说明文案 `{k,accent,t,te,s,items:[{i,n,e,d,f}]}`。
  ⚠️ **index.html 并未使用 `tax`**（图谱实际用 `window.taxonomyTree`），属于遗留数据。
- `dirs` / `dregion`：导演卡数据（74 位导演 / 6 个地区）。

### 2. `dim-data.js` → `window.CINE_DIM = {rank, studio}`

- **`rank`**（6 榜单，**只存命中库内**的条目，`{t,y,...}` 数组）：
  | 榜单 | 命中数 |
  |---|---|
  | 豆瓣 Top 250 | 250 |
  | AFI 百年百大 | 91 |
  | BBC 21世纪百大 | 84 |
  | 视与听 2022 影史百佳 | 97 |
  | TSPDT 影史千佳 | 702 |
  | 华语影史百佳 | 59 |
- **`studio`**（10 家公司）：皮克斯 15 / 吉卜力 13 / 迪士尼动画 9 / 梦工厂 9 / A24 8 /
  米拉麦克斯 11 / 焦点影业 7 / 东宝 12 / 华纳兄弟 17 / 漫威影业 17。

### 3. `taxonomy-data.js` → `window.taxonomyTree` + `window.taxonomyMeta`

- **`taxonomyTree`**：9 大类，共 44 子类型。**`children` 是对象 map（不是数组）**。
  结构：
  ```
  {id, name, nameEn, icon, color, description, count, children: {
      <subId>: {id, name, tags:[...], mode:"one"|"all"|"any", count, tagCounts:{标签:数}}
  }}
  ```
- 9 大类 id：`drama, horror, action, fantasy, comedy, animation, music, arthouse, documentary`
- 各类 `count`：drama 6567 / horror 1949 / action 2073 / fantasy 1341 / comedy 2352 /
  animation 808 / music 372 / arthouse 116 / documentary 356
- 子类型分布：drama 12、horror 4、action 4、fantasy 6、comedy 5、animation 6、music 3、
  arthouse 3、documentary 1 ＝ 44
- **`taxonomyMeta`**：`{"films":8795,"categories":9,"subcategories":44,"updated":"2026-10-09"}`
  （已修正，与实际影片数一致；44 个子类型 count 全部 >0 且与前端点击结果相等）

---

## 四、index.html 消费逻辑与关键不变量

- **筛选匹配键**：`f.t + "|" + String(f.y)`（片名|年份）。所有 `*_SET` 都以此键建索引。
- **`RANK_SET` / `STUDIO_SET`** 由 `window.CINE_DIM` 构建：
  `rank` 的每个榜单数组 → `{t+"|"+y:1}`；`studio` 同理。
- **`AWARDS_SET` / `DIM_GROUPS`**（约 L898-910）由 `D.awardLinks` 构建：
  ```js
  Object.keys(D.awardLinks).forEach(n => D.awardLinks[n].forEach(p => s[p[0]+"|"+String(p[1])] = 1));
  DIM_GROUPS = {fest:[6个电影节], award:[awardLinks 中非电影节奖项]}
  ```
- **图谱区**（约 L1333-1405）：
  - `TAXO = window.taxonomyTree`
  - `CAT_TAGS[类id]` = 该类下所有**非 `mode:"all"`** 子类型的 tags 并集（`all` 是交叉子类型，不额外贡献影片）
  - `subAttr(sub)`：`mode==="all"` → `data-gs`（需全含）；`mode==="any"` → `data-go`（任一）；否则 → `data-g`（单标签）
  - 子类型 chip 显示 `sub.count||0`，点击 → `setFilter(subFilter(chip))`
- **奖项区**（约 L1408-1433）：`#awardsBox` 渲染 `D.awards` 翻面卡；卡背面按钮
  `查看库内 '+al.length+' 部获奖影片 →'`，其中 `al = D.awardLinks[a.n]`；**无 `al` 则不显示按钮**。
  点击按钮 → `setFilter({award: 奖项名})`。
- **榜单入口 / 导演卡**（约 L1434-1448+）：用 `D.meta.ranks`、`D.ranks`、`D.dirs`、`D.dregion`。

### ⭐ 关键不变量（改动时务必保持）

> **所有映射数组只应包含"命中库内"的影片。**
> chip / 按钮上显示的数字 **= 数组长度 = 点击后"共 N 部"**。
> 一旦写入库外片名或漏掉库内片，计数与筛选结果就会不一致（这是本项目最容易踩的坑）。

---

## 五、已完成的工作

1. **榜单匹配（已完成并部署）**
   - 重建 `dim-data.js`：6 大榜单只存命中库内的条目（见第三节表格）。
   - 新增 27 条 **英文→中文桥接表（BRIDGE）**，修复 `normEn` 归一化（后置冠词、年份标注顺序、
     缩写、英式拼写、罗马数字、索引覆盖等）。
   - 用 vm 加载 `dim-data.js` 复核，命中结果与预期完全一致；剩余未命中已逐条核实为
     "库内确实没有该片"或"库内无英文名/原语片名对不上"。
   - AFI / BBC 等未满额属正常（榜单本身含库外影片）。
2. **删除两个精选片单**：豆瓣 9.0+、作者电影精选。
3. **清理派生目录**：删除 `_deploy/`（200MB）、`_deploy_webp/`（129MB），释放约 330MB。
4. **部署**：`git checkout main; git merge --ff-only expansion; git push origin main` 成功。

---

## 六、工具箱与可复用方法（下一任务会用到）

### `tools/taxonomy-config.js`
```js
taxonomyConfig = {
  animation:{...}, graph:{...},
  categoryMeta:{9类 → primaryGenre},
  genreMapping:{ 真实genre → [主类型, 子类型] }   // 子类型为 null 时只计入主类型
}
```
例：`'剧情':['drama',null]`、`'爱情':['drama','fam']`、`'历史':['drama','hist']`。

### `tools/_recount_taxonomy.js`
读取 `films-data.js` + `taxonomy-config.js`，按"去重影片数"重算各类/子类 `count` 与 `tagCounts`，
并回写 `taxonomy-data.js`（同时刷新 `taxonomyMeta`）。核心逻辑：
```js
const [a,b] = genreMapping[g];                     // a=主类型, b=子类型id
seenMain.add(a);
if (b && taxonomyTree[a] && taxonomyTree[a].children[b]) seenSub.add(a+':'+b);  // ← b 必须是 children 里的真实 id
```
> ⚠️ 第 41 行的判定决定了：**若 `genreMapping` 的子类型 id 与 `taxonomyTree.children` 的 key 不一致，
> 该子类型 count 会永远是 0**。这正是下一任务要修的核心问题。

### 文本匹配方法（榜单/奖项匹配复用）
`normCn`（中文归一化）+ `normEn`（英文归一化）+ 年份容差 ±1 + EN→中文 BRIDGE 桥接表。

### 常用命令
```powershell
# 进入项目
cd d:\59634\Downloads\TRAEworkspace\question\film
# 本地预览
# （任意静态服务器指向项目根目录，端口 8642）
# 重算图谱计数
node tools/_recount_taxonomy.js
```

**Git 注意事项**：
- PowerShell **不支持 heredoc**，`git commit -m "$(cat <<'EOF' ...)"` 会报 ParserError。
  改用：写信息到 `tools/_commit_msg.txt` → `git commit -F tools/_commit_msg.txt` → 删除临时文件。
- Write 工具**不能写到工作区外**（写 `%TEMP%` 会 PathScopeExceed）。
- 提交前先 `git status` 核对，只 `git add` 具体文件，勿 `git add -A`。

---

## 七、已完成任务：图谱子类型丰富 + 奖项强关联映射（2026-10-09 完成）

**目标**：保证**每个子类型**和**大部分奖项**都有正确对应的电影（count 与实际筛选结果一致）。

### 完成结果（已提交 561920a 并推送 main）

- **图谱**：采用路线 A，重写 `tools/_recount_taxonomy.js`，直接按 `sub.tags` + `mode`
  计算 count，不再依赖 `genreMapping`；12 个孤儿 genre 标签已折叠进对应子类型。
  44 个子类型 count **全部 >0**，且与前端点击结果逐一相等；`taxonomyMeta.films` 修正为 8795。
- **奖项**：为缺失奖项补齐库内命中的获奖影片，`awardLinks` 键数 **26 → 45**；
  每条均能在库内命中（片名|年份）。56 个展示奖项中 **45 个**有对应影片，达标"大部分"。
  剩余 11 项因库内无可靠对应片而留空（空则前端不显示按钮，宁缺毋滥）。

### 原问题（已修复，保留供参考）

1. **子类型 count 大面积 = 0**（44 个子类型中约 24 个为 0，前端 chip 直接显示 0）：
   - `genreMapping` 的目标 sub id 与 `taxonomyTree.children` 的 key **不一致**：
     - `'爱情'/'家庭'/'同性'/'情色'/'儿童' → ['drama','fam']`，但 children 里没有 `fam`
       （实际是 `love` / `family` / `gay` / `erotic` / `kid`）
     - `'文艺'/'新浪潮'/'存在主义'/'诗意'/'慢电影' → ['arthouse','art']`，children 里没有 `art`（实际 `auteur`）
     - `'实验'/'短片'/'默片'/'蒙太奇'/'电视电影' → ['arthouse','exp']`，children 里没有 `exp`（实际 `avant`）
     - `'战争'/'传记'/'古装'/'戏曲'/'自传' → ['drama','hist']`，但 children 里 `war` / `bio` / `costume` 是独立子类型
     - `'悬疑'/'惊悚' → ['horror','susp']` 正常，但 `thrill` 子类型无 genre 指向它
     - `'冒险'/'公路' → ['action','act']` 正常，但 `adv` 无 genre 指向
     - `'音乐' → ['music','musical']`，但 `music` 子类型无 genre 指向
     - `'短片' → ['arthouse','exp']`，但 `short` 子类型无 genre 指向
   - **所有 `mode:"all"` 的交叉子类型**（科幻动作 / 科幻惊悚 / 奇幻冒险 / 奇幻动画 / 爱情喜剧 /
     动画喜剧 / 动作喜剧 / 剧情喜剧 / 冒险动画 / 喜剧动画 / 家庭动画 / 儿童动画）count 恒为 0，
     因为 `genreMapping` 从不会映射到它们 —— 需要单独按 tags 组合计算。
   - 结论：**要么统一 id、要么改 recount 直接基于 `tags` 计算**，并让 chip 数字 = 实际筛选命中数。
2. **`taxonomyMeta.films = 8869` 过时**（实际 8795），重跑 recount 即可修正。
3. **奖项侧**：`awardLinks` 已有 26 键且只存命中项，但覆盖面偏"大奖"，需检查各奖项是否
   "正确对应"（片名/年份是否对得上库内条目），并考虑补齐更多常规奖项。

### 建议入口
1. 先跑 `node tools/_recount_taxonomy.js` 看当前重算结果，确认 0 值分布。
2. 决定修复路线：
   - **路线 A（推荐）**：改 `_recount_taxonomy.js`，直接用 `sub.tags` 按 `mode` 计算 count
     （`one`=含该标签；`any`=含任一；`all`=全含），不再依赖 `genreMapping`，从根本上消除 id 不一致。
   - **路线 B**：统一 `taxonomy-config.js` 的 sub id 与 `taxonomy-data.js` 的 children key。
3. 奖项：核对 `awardLinks` 每条的片名/年份能否在 `films` 中命中（用 `t|y` 键验证），
   替换对不上的、补齐缺失的。
4. 改完务必复核：**chip 显示数 = 数组长度 = 点击后"共 N 部"**（第四节的铁律）。

### 收尾检查清单
- [x] `taxonomyMeta.films` = 8795（或当时实际值）
- [x] 44 个子类型 chip 数字均 > 0 且与点击结果一致
- [x] `mode:"all"` 交叉子类型数字 = 同时含全部标签的影片数
- [x] 45 个 `awardLinks` 每条都能在库内命中
- [ ] 本地 http://127.0.0.1:8642/index.html 用 Edge 目视核对（待用户确认）
- [x] 提交并推送 `main`，确认 EdgeOne Pages 自动部署（commit 561920a）

---

## 八、可清理的临时文件（非必需，视情况处理）

根目录残留：`dl135_a.json`、`dl135_b.json`、`doulist3270887{,b,c,d}.json`（榜单抓取临时文件）、
`.verify_changed.txt`、`.canon_import_progress.json`、`.expansion_progress.json`、`.last_merge_count.txt`。
这些均未被 `index.html` 引用。

---

**文档生成时间**：2026-10-09
**影片总数**：8795 部
**当前状态**：榜单匹配已完成并部署；下一任务为图谱子类型丰富 + 奖项强关联映射
