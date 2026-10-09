# 影库扩充路线图 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan phase-by-phase.

**Goal:** 将影库从 5854 部扩充至约 8500~10000 部，覆盖影史经典、冷门小众、著名导演/制作公司/奖项/电影节等高质量影片，并完善图谱与专栏展示。

**Architecture:** 纯静态站点（films-data.js + taxonomy-data.js + index.html），无构建。所有扩充通过"抓取外部权威片单 → TMDB API 解析 → 去重合并进 films-data.js → 重建分类统计"的管道完成，现有工具 `tools/_merge_new_films.js` / `tools/_recount_taxonomy.js` 复用。

**Tech Stack:** Node.js 脚本、TMDB API v3、GitHub Actions（定时新片线）、Edge 浏览器（唯一本地验证浏览器）。

## Global Constraints

- 只允许 Edge（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）做前端验证，禁用一切 Chrome 系内核
- 本地无 TMDB API key（key 在 GitHub Secrets）；本地验证一律 dry-run/离线统计
- 影片结构固定：`{t, y, r, c, d, dur, g:[中文类型], s, acts, p, id, votes, e, keywords, tmdbId, doubanId, links, source}`
- 类型标签仅 50 个中文值、keywords 仅覆盖 163/5854 部（2.7%）——新数据源必须同时补齐 `g`/`keywords`/`tmdbId` 才能支撑后续类型映射优化
- 进度文件（`*.progress.json`）为本地工作产物，不提交 git
- 每次合并后必须重建 taxonomy-data.js 并做计数一致性验证（显示数 == 真实筛选数）

---

## 阶段总览（依赖序）

| 阶段 | 内容 | 预估净增 | 前置 |
|---|---|---|---|
| **P0** | 导演名规范化（残缺名/别名合并） | 质量修复 | 无 |
| **P1** | 经典正典榜单（TSPDT / BFI S&S） | ~1000 | TMDB key |
| **P2** | 奖项/电影节获奖片（奥斯卡/三大等） | 100~300 | P0 |
| **P3** | 著名导演作品补全（周星驰/岩井俊二/姜文等） | 300~600 | P0 |
| **P4** | 制作公司/厂牌补全（好莱坞大厂/皮克斯/A24 等） | 200~500 | 无 |
| **P5** | 冷门小众关键词定向（cult/实验/艺术） | 500~1000 | P0 |
| **P6** | 国别补全（印度/拉美/非洲/北欧） | 300~800 | 无 |
| **P7** | 系列片补全（007/MCU/宫崎骏等） | 100~300 | 无 |
| **P8** | 纪录片专项 | 50~150 | 无 |

---

## 文件结构（本计划涉及的管道文件）

- `tools/_director_normalize.js`（新建，P0）— 导演名规范化/别名合并
- `tools/_canon_import.js`（已有，P1）— 经典正典导入器
- `tools/_awards_import.js`（新建，P2）— 奖项/电影节获奖片导入器
- `tools/_director_filmography.js`（新建，P3）— 导演作品集拉取
- `tools/_studio_import.js`（新建，P4）— 制作公司影片导入器
- `tools/_tmdb_niche_discovery.js`（新建，P5）— 关键词定向小众挖掘
- `tools/_country_import.js`（新建，P6）— 国别定向补全
- `tools/_collection_import.js`（新建，P7）— 系列片补全
- `tools/_documentary_import.js`（新建，P8）— 纪录片专项
- 复用：`tools/_merge_new_films.js`、`tools/_recount_taxonomy.js`、`tools/_tmdb_discover.js`
- 数据：`films-data.js`、`taxonomy-data.js`
- 展示：`index.html`（榜单/奖项/片单入口，扩充后可能增"制作公司"专栏）

---

## 展示层小工具（本次已落地，供后续扩充对照）

用户确认：**"好莱坞/奥斯卡等板块放进'精选片单'，不新增导航入口"**，并给两个页面加可发现性小工具。已实现：

1. **精选片单页（view-colls）**
   - COLLS 新增 5 组奖项片单：奥斯卡获奖 / 金球奖 / 欧洲三大电影节 / 华语电影奖项 / 动画最高奖（全部基于 `AWARDS_SET`（awardLinks）判定，非关键词，避免皮克斯等数据不足的坑）
   - 全部 25 组片单打 `tag` 分组（口碑 / 地区 / 奖项 / 类型）
   - 新增工具条：`#collQ` 搜索框（搜片单名/英文/说明）+ `#collChips` 分组胶囊 + 匹配计数
   - 后续 P2/P4 扩充奖项、制作公司片单时，直接向 `COLLS` 追加带 `tag` 的条目即可自动纳入分组与搜索
2. **导演谱系页（view-dirs）**
   - 新增 `#dirChips` 地区分组胶囊（全部 / 华语 / 日本 / 韩国 / 好莱坞 / 欧洲 / 当代新锐），与既有 `#dirQ` 搜索组合筛选
   - 后续 P3 补全导演后计数自动更新

---

## P0：导演名规范化（前置，先做）

**Files:**
- Create: `tools/_director_normalize.js`
- Modify: `films-data.js`

现状：导演字段质量差，作品最多的导演是残缺名"大卫 77 / 约翰 69 / 迈克尔 65"，昆汀/诺兰等大导演因名字被拆而显示 0 部。不修复则所有按导演/按人维度补全都会失败或重复。

- [ ] **Step 1: 编写残缺名检测脚本**，扫描 `d` 字段，按"单姓模式、高频词、TMDB 交叉验证"产出待合并清单（导演候选名 → 规范名映射）
- [ ] **Step 2: 输出检测清单**给用户确认（人工审核，避免误合并同名导演）
- [ ] **Step 3: 确认后批量规范化** `films-data.js` 中 `d` 字段，写回
- [ ] **Step 4: 复跑统计**确认"昆汀·塔伦蒂诺/克里斯托弗·诺兰/马丁·斯科塞斯"等不再是 0，且无同名误合并
- [ ] **Step 5: 提交**（`fix: 导演名字段规范化，合并残缺名与别名`）

---

## P1：经典正典榜单（TSPDT / BFI S&S）

**Files:**
- Modify: `tools/_canon_import.js`（已有，无需大改）
- Modify: `films-data.js`、`taxonomy-data.js`

离线实测：1268 候选仅 227 部（17.9%）已收录，**净增上限 ~1041 部**，缺失均为《东京物语》《八部半》等顶级经典。

- [ ] **Step 1: dry-run 验证**（无需 key）确认候选名单与去重统计正常
- [ ] **Step 2: 获取 TMDB API key**（放入本地环境变量，或直接使用 GitHub Secrets 流程）
- [ ] **Step 3: 分批执行** `node tools/_canon_import.js`（`--limit=N` 控制 API 调用量，断点续跑）
- [ ] **Step 4: 合并** `node tools/_merge_new_films.js .canon_import_progress.json` + `node tools/_recount_taxonomy.js`
- [ ] **Step 5: 验收**：Edge 打开 `http://127.0.0.1:8642/index.html` 抽查新增经典；图谱计数一致性验证
- [ ] **Step 6: 提交**

---

## P2：奖项/电影节获奖片补全

**Files:**
- Create: `tools/_awards_import.js`
- Modify: `films-data.js`、`taxonomy-data.js`、`index.html`

现有"奖项 56"入口覆盖不足。目标：奥斯卡历年最佳影片/导演、戛纳金棕榈、柏林金熊、威尼斯金狮、金马/金像获奖与提名，写入 `awards`/`lists` 字段（可展示获奖徽标），扩充"奖项"专栏。

- [ ] **Step 1: 用 Wikidata SPARQL 查询**历年获奖片单（`docs/TASK4_EXECUTION_REPORT.md` 已有做法），导出候选
- [ ] **Step 2: 编写导入器**：候选 → TMDB 解析 → 去重 → 打标 `lists:["Oscar#xxx"]` 等
- [ ] **Step 3: 合并 + 重建统计 + Edge 验收 + 提交**

---

## P3：著名导演作品补全

**Files:**
- Create: `tools/_director_filmography.js`
- Modify: `films-data.js`、`taxonomy-data.js`

用户点名的明显缺口：周星驰 5 / 岩井俊二 7 / 姜文 6。用 TMDB `/person/{id}/movie_credits` 拉取著名导演全集（按导演作品表，不按热度过滤）。

- [ ] **Step 1: 维护导演种子清单**（含中文名/英文名，首批 50~80 位：周星驰/岩井俊二/姜文/王家卫/侯孝贤/李安/张艺谋/宫崎骏/是枝裕和/昆汀/诺兰/斯科塞斯等）
- [ ] **Step 2: 编写脚本**：`/search/person` 定位 ID → `movie_credits` 拉全集 → 过滤已入库 → 解析详情
- [ ] **Step 3: 合并 + 重建统计 + Edge 抽查 + 提交**

---

## P4：制作公司/厂牌补全

**Files:**
- Create: `tools/_studio_import.js`
- Modify: `films-data.js`、`taxonomy-data.js`、`index.html`（可能增"厂牌"专栏）

用户点名：好莱坞（大制片厂）、皮克斯等。TMDB `/discover/movie?with_companies=` 按制作公司拉取：华纳/环球/派拉蒙/迪士尼/索尼/福斯/MGM、皮克斯/吉卜力/梦工厂/A24/焦点/Studiocanal/Gaumont 等。数据可新增 `studio` 字段，展示层视规模决定是否开"制作公司"专栏。

- [ ] **Step 1: 维护公司种子清单**（TMDB company id，首批 20~30 家）
- [ ] **Step 2: 编写脚本**按 `with_companies` + 评分/投票数门槛拉取
- [ ] **Step 3: 合并 + 重建统计 + 提交**；评估是否展示层加专栏（另列 task，默认不阻塞数据侧）

---

## P5：冷门小众关键词定向

**Files:**
- Create: `tools/_tmdb_niche_discovery.js`
- Modify: `films-data.js`、`taxonomy-data.js`

对应 `docs/NICHE_FILMS_STRATEGY.md` Phase A：100 个 cult/实验/艺术关键词（`cult-film`、`avant-garde`、`slow-cinema`、`folk-horror`、`giallo`、`neo-noir` 等），`vote_count>=300 & rating>=7.5`。

- [ ] **Step 1: 建立关键词清单**（复用文档已列分类）
- [ ] **Step 2: 编写脚本** `/discover/movie?with_keywords=` 分批拉取
- [ ] **Step 3: 合并 + 重建统计 + 抽样人工核对质量 + 提交**

---

## P6：国别补全

**Files:**
- Create: `tools/_country_import.js`
- Modify: `films-data.js`、`taxonomy-data.js`

现有地区分布洼地明显：美国 2153 / 日本 932 领先，印度仅 59、墨西哥 20、非洲近空白。按国别 + 评分门槛补全（宝莱坞/拉美/非洲/北欧冷门佳作），优先补低覆盖国别。

- [ ] **Step 1: 目标国别清单**（印度/墨西哥/巴西/阿根廷/埃及/伊朗/土耳其/北欧等）
- [ ] **Step 2: 编写脚本** `/discover/movie?with_original_language=&with_origin_country=` 按国别拉取
- [ ] **Step 3: 合并 + 重建统计 + 提交**

---

## P7：系列片补全

**Files:**
- Create: `tools/_collection_import.js`
- Modify: `films-data.js`、`taxonomy-data.js`

复用 `collection` 字段（已有逻辑）：007、MCU、星战、哈利波特、指环王、哥斯拉、皮克斯全系列等。用 TMDB `/collection/{id}` 拉全系列。

- [ ] **Step 1: 系列种子 ID 清单**
- [ ] **Step 2: 编写脚本拉取全系列并合并 + 重建统计 + 提交**

---

## P8：纪录片专项

**Files:**
- Create: `tools/_documentary_import.js`
- Modify: `films-data.js`、`taxonomy-data.js`

纪录片当前仅 21 部。按 genre 99 + `vote_count>=300 & rating>=7.5` 拉冷门纪录片佳作，充实纪录片大类。

- [ ] **Step 1: 编写脚本** `/discover/movie?with_genres=99` 按年代/地区分批
- [ ] **Step 2: 合并 + 重建统计 + 提交**

---

## 展示层专栏扩展（随各阶段评估，非阻塞）

现有入口：影史名片 / 精选片单 / 图谱 / 奖项 / 榜单 / 导演 / 片源查找。

- 奖项/电影节扩充 → 增强"奖项"专栏（获奖徽标、年度列表）
- 制作公司扩充 → 视规模评估新增"厂牌"专栏（沿用图1胶囊导航风格）
- 冷门小众 → 评估"精选片单"内固定"小众遗珠"片单；规模达数百部再考虑独立入口
- 导演规范化 → 直接增强"导演 74"入口的覆盖与准确性

---

## 执行顺序与检查点

1. 每个阶段独立可交付、独立提交、独立 Edge 验证
2. P0 必须最先（影响 P2/P3/P5 的正确性）
3. P1 已验证可行性（离线实测 1041 净增），优先于 P2~P8
4. 每阶段完成后跑 `tools/_recount_taxonomy.js` + 计数一致性验证 + Edge 抽查，再进下一阶段
