# 双源评分系统设计方案

## 背景

网站将整合两个数据源：
- **豆瓣**：5689 部经典影片，中文社区权威评分
- **TMDB**：新片补充，国际评分标准

虽然两者都是 0-10 分制，但**评分标准、用户群体、投票数量级完全不同**，不能直接混合排序。

## 核心原则

1. **永不混合评分排序**：豆瓣和 TMDB 评分不在同一维度比较
2. **数据来源透明化**：用户始终清楚每部影片的数据来源
3. **保持豆瓣权威性**：豆瓣影片的高评分地位不被稀释
4. **给新片曝光机会**：TMDB 影片不会被完全埋没

## 具体实现策略

### 1. 数据结构扩展

为每部影片添加 `source` 字段：

```javascript
// 豆瓣影片
{
  id: "1292052",
  t: "肖申克的救赎",
  r: "9.7",
  votes: 3000000,
  source: "douban"
}

// TMDB 影片
{
  id: "tmdb12345",
  t: "沙丘2",
  r: "8.2",
  votes: 50000,
  source: "tmdb"
}
```

### 2. 排序策略

#### 默认排序："双轨制"

```javascript
function defaultSort(films) {
  const doubanFilms = films.filter(f => f.source === 'douban')
    .sort((a, b) => parseFloat(b.r) - parseFloat(a.r));
  
  const tmdbFilms = films.filter(f => f.source === 'tmdb')
    .sort((a, b) => parseFloat(b.r) - parseFloat(a.r));
  
  return [...doubanFilms, ...tmdbFilms];
}
```

**UI 呈现**：
```
★ 9.7 肖申克的救赎 (1994)
★ 9.7 霸王别姬 (1993)
...
★ 8.5 阳光普照 (2019)
━━━━━ 以下为新增影片 ━━━━━
⭐ 8.2 沙丘2 (2024)
⭐ 8.0 奥本海默 (2023)
```

#### 按年份排序：可混排

```javascript
function sortByYear(films) {
  return films.sort((a, b) => (b.y || 0) - (a.y || 0));
}
```

年份排序时来源不重要，可以混合。

#### 按投票数排序：分源排序

```javascript
function sortByVotes(films) {
  const douban = films.filter(f => f.source === 'douban')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const tmdb = films.filter(f => f.source === 'tmdb')
    .sort((a, b) => (b.votes || 0) - (a.votes || 0));
  return [...douban, ...tmdb];
}
```

### 3. 筛选器扩展

在现有筛选器基础上增加"数据源"选项：

```html
<div class="filter-section">
  <h4>数据来源</h4>
  <label><input type="checkbox" value="douban" checked> 豆瓣经典 (5689)</label>
  <label><input type="checkbox" value="tmdb" checked> TMDB 新片 (XX)</label>
</div>
```

用户可以选择：
- 只看豆瓣（权威经典）
- 只看 TMDB（最新影片）
- 两者都看（默认）

### 4. 视觉标识系统

#### 评分图标区分

- 豆瓣：★ 9.7 （实心五角星，黄色）
- TMDB：⭐ 8.2 （空心星星，蓝色）

#### 卡片徽章

TMDB 影片右上角显示徽章：
```css
.film-card[data-source="tmdb"]::after {
  content: "NEW";
  background: #01b4e4; /* TMDB 品牌色 */
  color: white;
  padding: 2px 6px;
  font-size: 10px;
  border-radius: 3px;
}
```

#### 悬浮提示

```html
<div class="film-info" title="数据来源：TMDB · 投票数：50,000">
  ⭐ 8.2
</div>
```

### 5. 评分显示格式

```javascript
function formatRating(film) {
  if (film.source === 'douban') {
    return `★ ${film.r} <span class="votes">(${formatVotes(film.votes)}评)</span>`;
  } else {
    return `⭐ ${film.r} <span class="votes tmdb">(${formatVotes(film.votes)}评)</span>`;
  }
}

function formatVotes(votes) {
  if (votes >= 10000) return `${Math.floor(votes / 10000)}万`;
  if (votes >= 1000) return `${(votes / 1000).toFixed(1)}千`;
  return votes;
}
```

**显示效果**：
- 豆瓣：★ 9.7 (300万评)
- TMDB：⭐ 8.2 (5万评)

### 6. 详情页信息展示

在影片详情模态框中明确标注：

```html
<div class="meta-source">
  <!-- 豆瓣影片 -->
  <span class="source-badge douban">
    <img src="douban-icon.svg"> 豆瓣评分
  </span>
  
  <!-- TMDB 影片 -->
  <span class="source-badge tmdb">
    <img src="tmdb-icon.svg"> TMDB 评分
  </span>
</div>
```

### 7. 搜索结果排序

搜索时采用"相关性 + 评分"混合排序：

```javascript
function searchSort(results, query) {
  return results.sort((a, b) => {
    // 先按标题相关性
    const relevanceA = calculateRelevance(a.t, query);
    const relevanceB = calculateRelevance(b.t, query);
    
    if (relevanceA !== relevanceB) {
      return relevanceB - relevanceA;
    }
    
    // 相关性相同时，按来源和评分
    if (a.source === b.source) {
      return parseFloat(b.r) - parseFloat(a.r);
    }
    
    // 不同来源时，豆瓣优先
    return a.source === 'douban' ? -1 : 1;
  });
}
```

## 特殊场景处理

### 场景 1：同一部影片在两个库中都存在

例如《沙丘》可能豆瓣和 TMDB 都有：

**策略**：优先使用豆瓣数据，TMDB 作为补充

```javascript
function deduplicateFilms(films) {
  const titleYearMap = new Map();
  
  for (const film of films) {
    const key = `${film.t}_${film.y}`;
    
    if (!titleYearMap.has(key)) {
      titleYearMap.set(key, film);
    } else {
      const existing = titleYearMap.get(key);
      // 豆瓣优先
      if (film.source === 'douban' && existing.source === 'tmdb') {
        titleYearMap.set(key, film);
      }
    }
  }
  
  return Array.from(titleYearMap.values());
}
```

### 场景 2：用户想看"真正的最高分"

提供"仅豆瓣"筛选器，保证结果纯粹性。

### 场景 3：新片发现功能

单独提供"最新上映"页面，仅展示 TMDB 2024+ 影片：

```javascript
const newReleases = films
  .filter(f => f.source === 'tmdb' && f.y >= 2024)
  .sort((a, b) => b.y - a.y || parseFloat(b.r) - parseFloat(a.r));
```

## 前端 UI 修改清单

### HTML 修改

1. 筛选器增加"数据来源"复选框组
2. 排序下拉框增加说明文字
3. 影片卡片增加 `data-source` 属性
4. 详情模态框增加来源徽章

### CSS 修改

1. 定义 `.source-badge` 样式
2. 定义 `.tmdb-star` 和 `.douban-star` 评分图标样式
3. 添加分隔线样式（双轨制分界）
4. TMDB 卡片右上角 "NEW" 徽章

### JavaScript 修改

1. 修改 `sortFilms()` 函数，实现双轨制排序
2. 修改 `filterFilms()` 函数，增加来源筛选
3. 修改 `formatRating()` 函数，区分显示格式
4. 添加 `deduplicateFilms()` 去重函数

## 用户体验验证

### 测试场景

1. **默认浏览**：用户看到豆瓣经典排在前面，然后是新片
2. **只看经典**：取消勾选"TMDB 新片"，结果纯净
3. **只看新片**：取消勾选"豆瓣经典"，发现最新电影
4. **搜索**：搜索"沙丘"，豆瓣版优先显示
5. **按年份排序**：2024 年的 TMDB 新片排在最前面

### 预期效果

- 豆瓣高分片的权威性不受影响
- TMDB 新片有充分曝光
- 数据来源清晰透明
- 用户可自由选择浏览偏好

## 技术实现优先级

### P0（必须完成）
1. 为所有影片添加 `source` 字段
2. 实现双轨制排序算法
3. 评分图标区分（★ vs ⭐）
4. 数据来源筛选器

### P1（强烈建议）
1. TMDB 影片 "NEW" 徽章
2. 详情页来源标注
3. 去重逻辑
4. 分隔线（豆瓣/TMDB 分界）

### P2（可选优化）
1. 悬浮提示增强
2. "最新上映"专题页
3. 高级排序选项（综合评分算法）

## 总结

这套方案的核心是**"永不混合评分排序"**，通过：
- 双轨制排序保持各自权威性
- 视觉标识让来源一目了然
- 灵活筛选满足不同需求

避免了评分标准冲突，同时给豆瓣和 TMDB 都留足了展示空间。
