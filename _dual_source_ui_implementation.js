/**
 * 双源评分系统 - 前端实现
 * 在现有的电影类型全图谱.html 基础上添加
 */

// ============ 1. 排序函数修改 ============

// 原有的排序函数需要改为双轨制
function sortFilmsDualTrack(films, sortBy) {
  const doubanFilms = films.filter(f => f.source === 'douban' || !f.source);
  const tmdbFilms = films.filter(f => f.source === 'tmdb');
  
  function sortGroup(group, criteria) {
    return group.sort((a, b) => {
      switch(criteria) {
        case 'rating':
          return parseFloat(b.r || 0) - parseFloat(a.r || 0);
        case 'year':
          return (b.y || 0) - (a.y || 0);
        case 'votes':
          return (b.votes || 0) - (a.votes || 0);
        default:
          return 0;
      }
    });
  }
  
  // 按年份排序时可以混排
  if (sortBy === 'year') {
    return sortGroup([...doubanFilms, ...tmdbFilms], 'year');
  }
  
  // 其他排序采用双轨制
  const sortedDouban = sortGroup(doubanFilms, sortBy);
  const sortedTmdb = sortGroup(tmdbFilms, sortBy);
  
  return [...sortedDouban, ...sortedTmdb];
}

// ============ 2. 筛选器 HTML ============

const sourceFilterHTML = `
<div class="filter-group" id="filter-source">
  <div class="filter-title">数据来源</div>
  <label class="filter-option">
    <input type="checkbox" value="douban" checked onchange="applyFilters()">
    <span>豆瓣经典 (<span id="douban-count">5689</span>)</span>
  </label>
  <label class="filter-option">
    <input type="checkbox" value="tmdb" checked onchange="applyFilters()">
    <span>TMDB 新片 (<span id="tmdb-count">0</span>)</span>
  </label>
</div>
`;

// 在现有筛选器区域插入（在类型筛选器之后）
// 需要在 HTML 中找到合适位置插入上述代码

// ============ 3. 评分显示函数 ============

function formatRating(film) {
  const rating = parseFloat(film.r || 0).toFixed(1);
  const votes = formatVotes(film.votes || 0);
  const source = film.source || 'douban';
  
  if (source === 'tmdb') {
    return `<span class="rating tmdb" title="TMDB评分">⭐ ${rating}</span>
            <span class="votes tmdb">(${votes}评)</span>`;
  } else {
    return `<span class="rating douban" title="豆瓣评分">★ ${rating}</span>
            <span class="votes">(${votes}评)</span>`;
  }
}

function formatVotes(votes) {
  if (votes >= 10000) return Math.floor(votes / 10000) + '万';
  if (votes >= 1000) return (votes / 1000).toFixed(1) + '千';
  return votes.toString();
}

// ============ 4. 卡片渲染修改 ============

function renderFilmCard(film) {
  const source = film.source || 'douban';
  const newBadge = source === 'tmdb' ? '<span class="badge-new">NEW</span>' : '';
  
  return `
    <div class="film-card" data-id="${film.id}" data-source="${source}" onclick="showFilmDetail('${film.id}')">
      ${newBadge}
      <div class="poster">
        <img src="${getPosterUrl(film.p)}" alt="${film.t}" loading="lazy">
      </div>
      <div class="info">
        <div class="title">${film.t}</div>
        <div class="meta">
          ${formatRating(film)}
          <span class="year">${film.y || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

// ============ 5. 分隔线插入 ============

function renderFilmList(films) {
  const container = document.getElementById('film-list');
  container.innerHTML = '';
  
  let lastSource = null;
  
  films.forEach((film, index) => {
    const currentSource = film.source || 'douban';
    
    // 当从豆瓣切换到 TMDB 时插入分隔线
    if (lastSource === 'douban' && currentSource === 'tmdb') {
      const separator = document.createElement('div');
      separator.className = 'source-separator';
      separator.innerHTML = '<span>━━━━━ 以下为新增影片 ━━━━━</span>';
      container.appendChild(separator);
    }
    
    const card = document.createElement('div');
    card.innerHTML = renderFilmCard(film);
    container.appendChild(card.firstElementChild);
    
    lastSource = currentSource;
  });
}

// ============ 6. 筛选逻辑修改 ============

function applyFilters() {
  let filteredFilms = [...window.CINE.films];
  
  // 数据来源筛选
  const sourceCheckboxes = document.querySelectorAll('#filter-source input:checked');
  const selectedSources = Array.from(sourceCheckboxes).map(cb => cb.value);
  
  if (selectedSources.length > 0 && selectedSources.length < 2) {
    // 只选了一个来源
    filteredFilms = filteredFilms.filter(f => {
      const source = f.source || 'douban';
      return selectedSources.includes(source);
    });
  }
  
  // ... 其他现有筛选逻辑（年代、类型、国家等）
  
  // 排序
  const sortBy = document.getElementById('sort-select').value;
  filteredFilms = sortFilmsDualTrack(filteredFilms, sortBy);
  
  // 渲染
  renderFilmList(filteredFilms);
  
  // 更新计数
  updateFilmCount(filteredFilms);
}

// ============ 7. 详情页来源标注 ============

function showFilmDetail(filmId) {
  const film = window.CINE.films.find(f => f.id === filmId);
  if (!film) return;
  
  const source = film.source || 'douban';
  const sourceBadge = source === 'tmdb' 
    ? '<span class="source-badge tmdb"><img src="tmdb-icon.svg" width="16"> TMDB评分</span>'
    : '<span class="source-badge douban"><img src="douban-icon.svg" width="16"> 豆瓣评分</span>';
  
  // 在现有详情模态框的评分区域添加来源标注
  const modalHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${film.t}</h2>
        <div class="rating-section">
          ${formatRating(film)}
          ${sourceBadge}
        </div>
      </div>
      <!-- 其他现有内容 -->
    </div>
  `;
  
  // ... 显示模态框
}

// ============ 8. CSS 样式 ============

const additionalCSS = `
/* 数据来源徽章 */
.badge-new {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #01b4e4;
  color: white;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: bold;
  border-radius: 3px;
  z-index: 10;
}

/* 评分图标区分 */
.rating.douban {
  color: #f6c445;
}

.rating.tmdb {
  color: #01b4e4;
}

.votes.tmdb {
  color: #01b4e4;
  opacity: 0.8;
}

/* 来源分隔线 */
.source-separator {
  width: 100%;
  text-align: center;
  margin: 30px 0;
  color: #999;
  font-size: 14px;
}

.source-separator span {
  display: inline-block;
  padding: 0 20px;
  background: white;
  position: relative;
}

.source-separator::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: #ddd;
  z-index: -1;
}

/* 来源标识卡片 */
.film-card[data-source="tmdb"] {
  border: 1px solid #01b4e410;
}

.film-card[data-source="tmdb"]:hover {
  box-shadow: 0 4px 12px rgba(1, 180, 228, 0.15);
}

/* 详情页来源徽章 */
.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.source-badge.douban {
  background: #f6c44515;
  color: #f6c445;
}

.source-badge.tmdb {
  background: #01b4e410;
  color: #01b4e4;
}

/* 筛选器样式 */
#filter-source {
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: 15px;
}
`;

// ============ 9. 初始化统计 ============

function updateSourceCount() {
  const doubanCount = window.CINE.films.filter(f => !f.source || f.source === 'douban').length;
  const tmdbCount = window.CINE.films.filter(f => f.source === 'tmdb').length;
  
  document.getElementById('douban-count').textContent = doubanCount;
  document.getElementById('tmdb-count').textContent = tmdbCount;
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', () => {
  updateSourceCount();
});
`;

// ============ 10. 使用说明 ============

/*
整合步骤：

1. 运行 _add_source_field.js 为所有影片添加 source 字段
2. 在 电影类型全图谱.html 中引入这个脚本
3. 在筛选器区域插入 sourceFilterHTML
4. 替换现有的排序函数为 sortFilmsDualTrack
5. 替换卡片渲染函数为 renderFilmCard
6. 在 <style> 标签中添加 additionalCSS
7. 测试所有功能

关键修改点：
- 排序逻辑：sortFilmsDualTrack() 替代原有排序
- 渲染逻辑：renderFilmList() 添加分隔线插入
- 筛选器：添加数据来源选项
- 详情页：showFilmDetail() 添加来源标注
*/
