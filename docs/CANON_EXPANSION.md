# 经典正典扩充 - 使用说明

## 背景

定时扩充（GitHub Actions 每周从 TMDB 发现新片）只覆盖**新上映/热门影片**。
本工具解决另一个方向的缺口：**老电影经典、冷门但高质量的影片**。

方案：以两个国际公认的"影史百佳/千佳"榜单作为候选名单，逐条用 TMDB API
解析出 `tmdbId / 海报 / 类型 / 评分`，去重后并入影库。

榜单候选数大、但榜单本身更新慢（S&S 十年一次、TSPDT 一年一次），
所以本工具是**手动 / 低频执行的一次性脚本**，不放进定时任务。

## 数据源

| 榜单 | 全称 | 网址 | 规模 | 更新频率 |
| --- | --- | --- | --- | --- |
| TSPDT | They Shoot Pictures, Don't They? | https://theyshootpictures.com/gf1000.htm | 前 1000 名 | 每年更新（2026 版） |
| BFI S&S | BFI Sight & Sound Greatest Films of All Time | https://www.bfi.org.uk/sight-and-sound/greatest-films-all-time | 前 250 名（含并列） | 十年一次（2022 版） |

两个榜单互相补充：TSPDT 覆盖面广（含类型片、实验片），BFI 是十年一度的
全球影评人投票，权威性最高。合并去重后约 1250~1270 个候选。

## 相关文件

- `tools/_canon_import.js` — 经典正典导入器（本次核心交付）
- `tools/_merge_new_films.js` — 将进度文件中的 `newFilms` 并入 `films-data.js`（复用现有工具）
- `tools/_recount_taxonomy.js` — 合并后重建分类统计
- `.canon_import_progress.json` — 导入进度（候选名单 / 解析结果 / 新增队列）

## 运行方式

### 第 1 步：无密钥验证（dry-run）

```powershell
# 不设置 TMDB_API_KEY 即为纯本地执行
node tools/_canon_import.js --reset
```

预期输出：

```
[1/2] 抓取 TSPDT Top 1000 ...
  TSPDT 解析到 1000 部
[2/2] 抓取 BFI Sight & Sound 2022 ...
  S&S2022 解析到 269 部
  待处理候选: 1268
```

dry-run 只做：抓榜单 → 解析 → 合并候选 → 与现有 5854 部做去重统计，
**不调用 TMDB API**，进度保存到 `.canon_import_progress.json`。

### 第 2 步：有密钥完整执行

```powershell
$env:TMDB_API_KEY="your_actual_api_key_here"
node tools/_canon_import.js
```

逐条调用 TMDB `/search/movie`（按英文标题 + 年份），解析出：

- `tmdbId`（前端链接、后续去重的关键）
- 海报、类型（映射为中文）、TMDB 评分
- 榜单标记：`lists: ["TSPDT#7", "S&S2022#3"]`（写入影片字段，可展示"上榜"徽标）

已入库影片标记为 `duplicate`，未命中标记为 `notfound`，可随时断点续跑。

### 第 3 步：合并进影库

```powershell
node tools/_merge_new_films.js .canon_import_progress.json
node tools/_recount_taxonomy.js
```

### 第 4 步：验收

- 打开 `http://127.0.0.1:8642/index.html` 抽查新增影片（海报 / 链接 / 分类）
- 确认 `taxonomy-data.js` 分类计数合理

## 参数

| 参数 | 作用 |
| --- | --- |
| `--reset` | 清空进度重新抓取 |
| `--offline` | 不联网，仅用已有进度文件统计 |
| `--dry-run` | 强制不调用 TMDB API |
| `--top=N` | 只处理合并排序前 N 个候选（按两榜最低名次） |
| `--limit=N` | 本批最多调用 N 次 API |
| `--sources=tspdt,ss2022` | 指定抓取哪些榜单 |

## 注意事项（踩坑记录）

1. **TSPDT 的 Excel 是二进制**：`1000GreatestFilms.xls` 是 OLE2/BIFF8 二进制
   文件（魔数 `d0cf11e0a1b11ae1`），UTF-8/latin1 都解析不出文本。
   脚本改用官方纯文本页 `gf1000_all1000films.htm`（每行一条，正则解析）。
2. **新入榜影片的"上年排名"是 `(---)`**：正则需兼容 `([\d-]+)`，否则每年
   新进榜的约 12 部会漏掉。
3. **拉丁字符实体**：TSPDT 老页面用 `&oacute;` 等命名实体，已内置 Latin-1
   实体表解码（导演/片名质量直接影响 TMDB 搜索命中率）。
4. **BFI 独有影片缺导演**：S&S 页面结构与 TSPDT 不同，解析到的 269 部中
   仅与 TSPDT 重叠的影片有导演信息；导演只作展示用，不影响入库。
5. **TMDB_API_KEY 在 GitHub Secrets 中**，本地无 key；本地验证用 dry-run。
6. **进度文件未加入 .gitignore**：`_canon_import_progress.json` 为本地工作
   产物，不要提交（与 `_tmdb_toprated_progress.json` 同一处理原则）。

## 与定时新片扩充的关系

- **定时任务**（`tmdb-discover-new-films.yml`，每周一）：发现新片 → 自动合入。
- **经典扩充**（本工具，手动）：榜单候选 → TMDB 解析 → 合入。
- 两者共用 `tools/_merge_new_films.js` 与 `tools/_recount_taxonomy.js`，
  互相去重，不会重复入库（TMDB 解析后按 `tmdbId` / 片名+年份判重）。

## 后续阶段（规划）

1. **冷门好片挖掘器**：TSPDT 起始名单（26,551 部，`gf1000_startinglist_table.php`）
   联合 IMDb 数据集的低频批次，定向补充高质量冷门片。
2. **图谱子类型扩展**：以权威榜单/影史分类为参照，将现有 16 个子类型扩充
   至约 24 个（如 TSPDT 的 Genre 字段、IMDb 关键词体系作参照）。
