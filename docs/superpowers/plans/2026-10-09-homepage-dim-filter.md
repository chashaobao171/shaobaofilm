# 首页多维筛选优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan phase-by-phase.

**Goal:** 让首页「影史名片」（view-films）能直接按 **电影节 / 奖项 / 榜单 / 公司** 四类"归类维度"筛选影片；核心约束是 **不把筛选栏铺臃肿** —— 用「维度按钮 + 下拉面板」收纳，而不是平铺更多下拉框/chips。

**Architecture:** 纯静态站点（films-data.js + taxonomy-data.js + index.html），无构建。数据加载顺序：films-data.js → taxonomy-data.js → 内联主脚本。筛选核心：`state` 对象 + `match(f)` + `sorted()` + `renderFilms()` + `setFilter(o)`（[index.html](file:///d:/59634/Downloads/TRAEworkspace/question/film/index.html) 863-994 行）。

**Tech Stack:** 原生 HTML/CSS/JS；Node 仅用于语法校验与数据检查；Edge 无头（`--dump-dom`）做 DOM 验证。

---

## 现状与数据支撑矩阵

### 现状（fbar 筛选栏，[index.html](file:///d:/59634/Downloads/TRAEworkspace/question/film/index.html#L625-L637)）

```
fbar-row（第 1 行）: #chips 类型胶囊 | #segs 排序 | #ctry 地区下拉 | #decade 年代下拉
fcount 行:          "共 N 部 · …" 文本 | #reset 清除筛选按钮
```

- 搜索框 `#q` 在页头（全局），不属于 fbar。
- 奖项筛选已存在但**入口不在首页**：奖项页翻面按钮 `setFilter({award:…})` 跳回名片视图，靠 `renderAwardChip()` 往 `#chips` 里插入一个可关闭的"奖项「X」✕"胶囊。
- `match(f)` 已支持：g / gs / go / dec(年代) / ctry(地区) / award(奖项) / q(搜索)。

### 数据支撑（实测确认）

| 维度 | 数据源 | 现状 | 结论 |
|---|---|---|---|
| 电影节 | `awardLinks` 6 键：戛纳金棕榈、威尼斯金狮、柏林金熊、圣丹斯、多伦多人民选择奖、锡切斯 | 现成（`AWARDS_SET` 已构建） | ✅ 零新数据，直接可用 |
| 奖项 | `awardLinks` 其余 20 键（奥斯卡、金球、BAFTA、欧洲、凯撒、华语金像/金马、日本学院、青龙、土星、安妮等） | 现成 | ✅ 零新数据，直接可用 |
| 榜单 | `D.ranks` 26 个**外部链接**（豆瓣Top250 / IMDb / 视与听 / AFI / TSPDT…），无库内影片映射 | 缺映射数据 | ⚠️ 需新建 `rankLinks`（榜单→库内片名+年份列表，格式同 awardLinks） |
| 公司 | 影片**无 studio 字段**；`keywords` 仅 160 部且为英文 TMDB 词；`collection` 仅 163 部（系列 ID，非公司） | 缺数据 | ⚠️ 需新建 `studioLinks`（公司→库内片名+年份列表） |

**关键结论**：电影节/奖项两维是"白捡"的（数据已在）；榜单/公司两维需要补一份 **人工维护的映射数据**（片名+年份 → 所属榜单/公司），数据规模可控（每家/每条 5~30 部起步）。

---

## 设计：防臃肿收纳方案

### 为什么不选 A/B

- **A. 平铺更多下拉框**（再塞 4 个 select）：fbar-row 已 4 组控件，再加 4 个 select 到移动端必溢出，且 26 个奖项塞进一个 select 太长、不可浏览。
- **B. 全部塞进 `#chips` 行**：类型胶囊已 49 个（横向滚动），混入奖项/榜单/公司会互相稀释，且丢失维度语义。

### 选定方案 C：维度按钮条 + 下拉面板（accordion）+ 活跃筛选胶囊行

```
fbar-row（第 1 行，不变）:  #chips 类型 | #segs 排序 | #ctry 地区 | #decade 年代
dimbar  （第 2 行，新增）:  [🎬 电影节 ▾] [🏆 奖项 ▾] [📈 榜单 ▾] [🏢 公司 ▾]   ← 4 个维度按钮，各带计数 n
dimpane  （第 3 行，默认隐藏）: 当前打开维度的选项面板（chips 网格 + 顶部搜索框）
active 行（并入 fcount 行）: 已选维度以可关闭胶囊呈现（复用 renderAwardChip 思路 → renderActiveChips）
```

**交互规则**

1. 点 `dimbar` 某按钮 → 展开对应 `dimpane`（只开一个，再点收起）；按钮 `.on` 点亮并显示已选数。
2. 面板内为该维度全部选项的胶囊（复用 `.chip` 样式 + 计数 `n`），并带一个搜索框过滤长列表（奖项 26 项、榜单/公司会更多）。
3. 面板内点某胶囊 = 切换 `state.fest/rank/studio`（奖项复用现有 `state.award`）→ 立即 `renderFilms()`，面板可自动收起。
4. 已选维度在 fcount 行以可关闭胶囊呈现（"电影节「戛纳」✕"），点击单个移除；`#reset` 保留全清。
5. `state` 扩展：新增 `fest`（电影节）、`rank`（榜单）、`studio`（公司）三字段，`match(f)` 增加三条对应判定；`setFilter(o)` 同步支持；`renderFilms()` 的 fcount 文案补三个维度的中文提示。

**数据结构（统一机制）**

- 电影节 / 奖项：复用现有 `AWARDS_SET`（由 `awardLinks` 构建），只需在 JS 里定义一个维度→键清单的分组表 `DIM_GROUPS`：
  - `fest: ["戛纳电影节 · 金棕榈奖","威尼斯电影节 · 金狮奖","柏林电影节 · 金熊奖","圣丹斯电影节","多伦多国际电影节 · 人民选择奖","锡切斯国际奇幻电影节"]`
  - `award: awardLinks 其余 20 键`
- 榜单 / 公司：**新建数据文件 `dim-data.js`**（不动巨大单行的 films-data.js），格式与 awardLinks 完全同构：
  ```js
  window.CINE_DIM = {
    rank:  {"豆瓣 Top 250":[["霸王别姬","1993"],["肖申克的救赎","1994"],…], "IMDb Top 250":[…], …},
    studio:{"皮克斯":[["玩具总动员","1995"],["飞屋环游记","2009"],…], "吉卜力":[…], …}
  };
  ```
  主脚本内把它们并入同一套 `DIMSET` 判定（片名+年份 → 命中），与 `AW(k,f)` 同构，只换映射表。

**首期数据范围（人工维护，实现时逐个对库内片名+年份核对）**

- 榜单（rank）8 条：豆瓣 Top 250、IMDb Top 250、视与听 2022 影史百佳、AFI 百年百大、TSPDT 影史千佳（库内收录部分）、BBC 21 世纪百大、电影旬报年度十佳（可复用 awardLinks 同名键）、华语影史百佳（港台影评人版）。
- 公司（studio）10 家：皮克斯、吉卜力、迪士尼动画、梦工厂、A24、米拉麦克斯、焦点影业、东宝、华纳兄弟、漫威影业。
- 每家/条最少 ≥5 部且 ≤30 部（超出取库内评分最高），不足 4 部的不显示（与 COLLS 规则一致，避免空维度）。

---

## 实施任务（bite-sized，按依赖序）

### T1. 数据层：新建 `dim-data.js`（榜单 + 公司映射）

- 新建 `d:\59634\Downloads\TRAEworkspace\question\film\dim-data.js`，内容为 `window.CINE_DIM = {rank:{…}, studio:{…}}`（格式见上）。
- 从 films-data.js 抽取全部 `t|y` 集合，写一次性探查脚本列出各目标榜单/公司候选片名，人工核对入库（**数据以库内已有 5854 部为准**，不新增影片）。
- index.html 在 `<script src="films-data.js">` 后、主脚本前插入 `<script src="dim-data.js"></script>`。
- 验收：Node 脚本校验 `window.CINE_DIM` 每条目引用的片名+年份全部命中 FILMS，且每条 ≥4 部。

### T2. 展示层：fbar 增加 dimbar 行 + dimpane 容器 + fcount 行扩展

- [index.html](file:///d:/59634/Downloads/TRAEworkspace/question/film/index.html#L626-L637) 的 `.fbar` 内：
  - 新增 `.dimbar`（第 2 行）：4 个维度按钮，`id="dimFest" / "dimAward" / "dimRank" / "dimStudio"`，按钮内带计数 `<span class="n">`。
  - 新增 `.dimpane`（第 3 行，`hidden` 默认）：含 `#dimQ` 搜索框 + `#dimChips` 胶囊容器。
  - fcount 行改为：`#fcount` 文本 + 活跃筛选胶囊容器 `#activeChips` + `#reset`。
- CSS（约 50 行，复用 `.chip/.chips/.hsearch/.sel` 变量与风格）：`.dimbar{display:flex;gap:8px;margin:2px 0 10px;flex-wrap:wrap}`、`.dimbtn{…}`（胶囊式按钮，`.on` 高亮 + `.n` 计数）、`.dimpane{display:none;padding:12px;border:1px solid var(--line);border-radius:14px;margin-bottom:14px;background:var(--bg2)}`、`.dimpane.open{display:block}`、`.active-chips{display:inline-flex;gap:6px;flex-wrap:wrap}`。
- 移动端（现有 531/543 行媒体查询段）：dimbar 允许换行，dimpane 全宽。

### T3. 逻辑层：DIM_GROUPS + DIMSET + state 扩展 + match + setFilter

- 主脚本内（`AWARDS_SET` 构建处附近）：
  - 定义 `DIM_GROUPS = {fest:[6 键清单], award:[其余 20 键清单]}`；`RANK_SET / STUDIO_SET` 由 `window.CINE_DIM` 构建（格式同 `AWARDS_SET`）。
  - `state` 增加 `fest:"" / rank:"" / studio:""`。
  - `match(f)` 增加：`fest` → `AW("fest",f)`（查 AWARDS_SET）；`rank` → 查 RANK_SET；`studio` → 查 STUDIO_SET。
  - `setFilter(o)` 增加 `o.fest/o.rank/o.studio` 三字段透传；`renderFilms()` fcount 文案补三个维度提示；`#reset` 清除逻辑补三字段。
- `renderAwardChip()` 泛化为 `renderActiveChips()`：奖项/电影节/榜单/公司任一已选 → 在 `#activeChips` 生成可关闭胶囊；兼容现有调用点（奖项页翻面 `setFilter({award})` 后仍显示）。
- 验收：`node --check` 提取内联脚本通过；`renderFilms()` 空态与多维度组合无异常。

### T4. 交互层：dimbar 点击 → dimpane 面板（accordion）+ 维度内搜索

- 4 个维度按钮点击切换面板开关（同一时间至多一个 open；再点收起）。
- 打开维度时动态渲染 `#dimChips`：该维度全部选项胶囊 + 计数（`fest` 6 项 / `award` 20 项 / `rank`、`studio` 按数据条数）。
- `#dimQ` 输入过滤面板胶囊（复用 collChips/dirQ 的 filter 写法）。
- 面板内点击胶囊 → 设置对应 `state` 字段 → `shown=PAGE; renderFilms(); renderActiveChips();` → 收起面板并点亮维度按钮。
- 已选维度按钮显示选中项短名（如 `电影节 · 戛纳 ✕`），可点击直接移除。
- 验收：Edge `--dump-dom` 验证 dimbar 4 按钮、面板切换、胶囊渲染、选中后 fcount 文案。

### T5. 验证 + 清理 + 提交

- 语法：Node 提取内联脚本 `--check`；dim-data.js 单独 `--check` + 命中率校验脚本。
- DOM：Edge 无头 dump（`Start-Process -RedirectStandardOutput` + 临时 `--user-data-dir`），断言 dimbar/dimpane/activeChips 渲染、组合筛选后 fcount 计数正确。
- 清理临时脚本；git 提交推送（`.canon_import_progress.json`、`PROJECT_MEMORY.md`、`.trae/` 不提交）。

---

## 验收标准

1. 首页 fbar 视觉不臃肿：默认只比现在多一行 4 个维度按钮；面板按需展开、只开一个。
2. 「电影节」「奖项」无需任何新数据即可筛选；「榜单」「公司」依赖 dim-data.js，每条 ≥4 部可筛。
3. 所有现有入口不受影响：奖项页翻面、片单 preset、导演搜索仍走 `setFilter`，且新维度胶囊可被 `#reset` 与单个 ✕ 清除。
4. 计数一致性：fcount 显示数 == 卡片实际渲染数；维度按钮计数 == 面板内可选项数。

---

## 开放问题（实现前请用户确认）

1. **榜单首期 8 条、公司首期 10 家**的范围是否合适？要增删哪条/家？
2. 榜单/公司映射采用"人工核对库内已有影片"（不动影库）——确认不要求本轮顺便扩充影库新增影片。
3. 面板交互：点选后**自动收起**（推荐）还是保持展开可连续选多个？
4. 维度按钮是否需要图标（🎬🏆📈🏢）或纯文字即可？
