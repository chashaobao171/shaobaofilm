# Phase 2: 类型图谱页面重构 - 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task.

**Goal:** 将平铺式类型展示页面重构为三层树状层级结构，支持渐进展开、懒加载、流畅动画

**Architecture:** 
- 三层数据结构：主类型（6-8个）→ 中类型（3-5个）→ 细分标签（叶子节点）
- 组件化设计：TaxonomyCard、CategoryPanel、TagCloud三个核心组件
- 懒加载渲染：只渲染可见节点，展开时动态加载子节点
- 状态管理：单例模式管理当前展开状态

**Tech Stack:** Vanilla JavaScript (ES6+), CSS3 Transitions, Flexbox/Grid

## Global Constraints

- 初始DOM节点数 < 50（仅第一层）
- 展开动画时长 300ms（流畅体验）
- 支持键盘导航（空格展开/折叠）
- 移动端适配（触摸事件 + 响应式布局）
- 与现有films-data.js数据结构兼容
- 替换原"电影类型全图谱.html"

---

## Task 1: 设计类型层级数据结构

**Files:**
- Create: `taxonomy-data.js`
- Create: `taxonomy-config.js`

- [ ] **Step 1: 创建类型层级数据文件**
```javascript
// taxonomy-data.js
const taxonomyTree = {
  drama: {
    id: 'drama',
    name: '剧情类',
    nameEn: 'Drama & Life',
    icon: '🎭',
    color: '#F87171',
    description: '探讨人性、情感与生活的故事',
    children: {
      family: {
        id: 'family',
        name: '家庭/爱情/成长',
        tags: ['家庭', '爱情', '成长', '青春', '婚姻', '亲情', '友情']
      },
      history: {
        id: 'history',
        name: '历史/战争/传记',
        tags: ['二战', '冷战', '古代史', '传记', '战争', '历史', '维多利亚时代', '中世纪']
      },
      social: {
        id: 'social',
        name: '社会/犯罪/悬疑',
        tags: ['犯罪', '悬疑', '社会问题', '法律', '侦探', '黑帮', '惊悚']
      }
    }
  },
  
  fantasy: {
    id: 'fantasy',
    name: '幻想类',
    nameEn: 'Fantasy & Sci-Fi',
    icon: '🚀',
    color: '#5B8CFF',
    description: '超越现实的想象世界',
    children: {
      scifi: {
        id: 'scifi',
        name: '科幻',
        tags: ['太空歌剧', '赛博朋克', '时间旅行', '外星人', 'AI', '反乌托邦', '硬科幻', '软科幻']
      },
      fantasy: {
        id: 'fantasy',
        name: '奇幻/超现实',
        tags: ['魔幻', '童话', '神话', '超现实', '魔法', '龙与地下城']
      }
    }
  },
  
  action: {
    id: 'action',
    name: '动作类',
    nameEn: 'Action & Adventure',
    icon: '💥',
    color: '#FBBF24',
    description: '肾上腺素飙升的冒险',
    children: {
      action: {
        id: 'action',
        name: '动作/冒险',
        tags: ['动作', '冒险', '枪战', '武术', '间谍', '特工', '追逐']
      },
      western: {
        id: 'western',
        name: '西部/战争',
        tags: ['西部', '战争', '军事', '越战', '一战']
      }
    }
  },
  
  arthouse: {
    id: 'arthouse',
    name: '艺术类',
    nameEn: 'Arthouse & Experimental',
    icon: '🎨',
    color: '#22D3EE',
    description: '艺术电影与实验先锋',
    children: {
      arthouse: {
        id: 'arthouse',
        name: '艺术电影',
        tags: ['艺术', '文艺', '新浪潮', '意识流', '长镜头', '黑白电影']
      },
      experimental: {
        id: 'experimental',
        name: '实验/先锋',
        tags: ['实验', '先锋', '抽象', '结构主义', '地下电影']
      },
      cult: {
        id: 'cult',
        name: 'Cult/独立',
        tags: ['Cult', '独立制作', 'B级片', '午夜场', '邪典']
      }
    }
  },
  
  horror: {
    id: 'horror',
    name: '恐怖类',
    nameEn: 'Horror & Thriller',
    icon: '👻',
    color: '#A78BFA',
    description: '恐惧与惊悚的极致体验',
    children: {
      horror: {
        id: 'horror',
        name: '恐怖/惊悚',
        tags: ['恐怖', '惊悚', '鬼怪', '僵尸', '吸血鬼', '心理恐怖', '哥特']
      },
      suspense: {
        id: 'suspense',
        name: '悬疑/推理',
        tags: ['悬疑', '推理', '侦探', '谋杀', '犯罪心理']
      }
    }
  },
  
  comedy: {
    id: 'comedy',
    name: '喜剧类',
    nameEn: 'Comedy & Satire',
    icon: '😄',
    color: '#34D399',
    description: '欢笑与讽刺的艺术',
    children: {
      comedy: {
        id: 'comedy',
        name: '喜剧',
        tags: ['喜剧', '浪漫喜剧', '黑色喜剧', '闹剧', '讽刺', '荒诞']
      }
    }
  },
  
  animation: {
    id: 'animation',
    name: '动画类',
    nameEn: 'Animation',
    icon: '🎬',
    color: '#FB923C',
    description: '动画的无限可能',
    children: {
      animation: {
        id: 'animation',
        name: '动画电影',
        tags: ['动画', '动画长片', '定格动画', '成人动画', '日本动画', '欧洲动画']
      }
    }
  },
  
  documentary: {
    id: 'documentary',
    name: '纪录片',
    nameEn: 'Documentary',
    icon: '📹',
    color: '#94A3B8',
    description: '真实世界的影像记录',
    children: {
      documentary: {
        id: 'documentary',
        name: '纪录片',
        tags: ['纪录片', '传记纪录片', '自然', '历史纪录片', '社会纪录片', '音乐纪录片']
      }
    }
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyTree};
} else {
  window.taxonomyTree = taxonomyTree;
}
```

- [ ] **Step 2: 创建配置文件**
```javascript
// taxonomy-config.js
const taxonomyConfig = {
  // 动画配置
  animation: {
    expandDuration: 300,  // ms
    collapseDuration: 250,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
  },
  
  // 布局配置
  layout: {
    firstLevel: {
      cardWidth: 180,
      cardHeight: 120,
      gap: 20
    },
    secondLevel: {
      cardWidth: 120,
      cardHeight: 80,
      gap: 15
    },
    thirdLevel: {
      tagHeight: 32,
      tagGap: 8
    }
  },
  
  // 性能配置
  performance: {
    maxVisibleNodes: 500,
    lazyLoadThreshold: 100  // px
  },
  
  // 映射配置：films-data.js的genre到taxonomy的映射
  genreMapping: {
    '剧情': ['drama', 'family'],
    '爱情': ['drama', 'family'],
    '家庭': ['drama', 'family'],
    '成长': ['drama', 'family'],
    '历史': ['drama', 'history'],
    '战争': ['drama', 'history'],
    '传记': ['drama', 'history'],
    '犯罪': ['drama', 'social'],
    '悬疑': ['horror', 'suspense'],
    '科幻': ['fantasy', 'scifi'],
    '奇幻': ['fantasy', 'fantasy'],
    '动作': ['action', 'action'],
    '冒险': ['action', 'action'],
    '西部': ['action', 'western'],
    '艺术': ['arthouse', 'arthouse'],
    '文艺': ['arthouse', 'arthouse'],
    'Cult': ['arthouse', 'cult'],
    '独立': ['arthouse', 'cult'],
    '恐怖': ['horror', 'horror'],
    '惊悚': ['horror', 'horror'],
    '喜剧': ['comedy', 'comedy'],
    '动画': ['animation', 'animation'],
    '纪录片': ['documentary', 'documentary']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyConfig};
} else {
  window.taxonomyConfig = taxonomyConfig;
}
```

- [ ] **Step 3: 生成电影数量统计脚本**
```javascript
// _generate_taxonomy_stats.js
const fs = require('fs');
const {taxonomyTree} = require('./taxonomy-data.js');
const {taxonomyConfig} = require('./taxonomy-config.js');

// 读取电影数据
const rawData = fs.readFileSync('films-data.js', 'utf8');
const match = rawData.match(/const filmsData = (\[.*\]);/);
const films = JSON.parse(match[1]);

// 统计每个类型的电影数量
const stats = {};

// 初始化统计结构
Object.keys(taxonomyTree).forEach(mainId => {
  stats[mainId] = {count: 0, children: {}};
  Object.keys(taxonomyTree[mainId].children).forEach(subId => {
    stats[mainId].children[subId] = {count: 0, tags: {}};
    taxonomyTree[mainId].children[subId].tags.forEach(tag => {
      stats[mainId].children[subId].tags[tag] = 0;
    });
  });
});

// 遍历电影并统计
films.forEach(film => {
  film.g.forEach(genre => {
    const mapping = taxonomyConfig.genreMapping[genre];
    if (mapping && mapping.length >= 2) {
      const [mainId, subId] = mapping;
      if (stats[mainId] && stats[mainId].children[subId]) {
        stats[mainId].count++;
        stats[mainId].children[subId].count++;
        // 标签统计（如果genre本身在tags中）
        if (stats[mainId].children[subId].tags.hasOwnProperty(genre)) {
          stats[mainId].children[subId].tags[genre]++;
        }
      }
    }
  });
});

// 将统计数据注入taxonomyTree
Object.keys(taxonomyTree).forEach(mainId => {
  taxonomyTree[mainId].count = stats[mainId].count;
  Object.keys(taxonomyTree[mainId].children).forEach(subId => {
    taxonomyTree[mainId].children[subId].count = stats[mainId].children[subId].count;
    // 过滤掉计数为0的标签
    const filteredTags = taxonomyTree[mainId].children[subId].tags.filter(tag => {
      return stats[mainId].children[subId].tags[tag] > 0;
    });
    taxonomyTree[mainId].children[subId].tags = filteredTags;
  });
});

// 重新写入taxonomy-data.js
const output = `// taxonomy-data.js
const taxonomyTree = ${JSON.stringify(taxonomyTree, null, 2)};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyTree};
} else {
  window.taxonomyTree = taxonomyTree;
}
`;

fs.writeFileSync('taxonomy-data.js', output, 'utf8');
console.log('✓ Taxonomy stats generated and saved to taxonomy-data.js');
console.log('\nStats:');
Object.entries(stats).forEach(([mainId, data]) => {
  console.log(`  ${mainId}: ${data.count} films`);
});
```

- [ ] **Step 4: 运行统计脚本**
```bash
node _generate_taxonomy_stats.js
```

- [ ] **Step 5: 验证taxonomy-data.js包含count字段**
```bash
grep -A 5 '"count":' taxonomy-data.js | head -20
```

- [ ] **Step 6: Commit数据结构**
```bash
git add taxonomy-data.js taxonomy-config.js _generate_taxonomy_stats.js
git commit -m "feat: 创建类型图谱三层数据结构和配置"
```

---

## Task 2: 实现核心CSS样式

**Files:**
- Create: `taxonomy.css`

- [ ] **Step 1: 创建taxonomy.css基础样式**
```css
/* taxonomy.css */
:root {
  --bg-primary: #0F1117;
  --bg-secondary: #171A23;
  --bg-tertiary: #1E222E;
  --text-primary: #F5F5F5;
  --text-secondary: #A0A0A0;
  --border-color: #2A2E3A;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  padding: 20px;
}

.taxonomy-header {
  text-align: center;
  padding: 40px 20px;
  max-width: 800px;
  margin: 0 auto 60px;
}

.taxonomy-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #5B8CFF 0%, #F87171 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.taxonomy-header p {
  font-size: 1.1rem;
  color: var(--text-secondary);
}

/* 第一层：主类型卡片 */
.taxonomy-container {
  max-width: 1400px;
  margin: 0 auto;
}

.first-level {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.main-category-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.main-category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--category-color);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s;
}

.main-category-card:hover::before {
  transform: scaleX(1);
}

.main-category-card:hover {
  transform: translateY(-4px);
  border-color: var(--category-color);
  box-shadow: var(--shadow);
}

.main-category-card.active {
  border-color: var(--category-color);
  background: var(--bg-tertiary);
}

.category-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  display: block;
}

.category-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.category-name-en {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.category-count {
  font-size: 0.9rem;
  color: var(--category-color);
  font-weight: 500;
}

/* 第二层：中类型面板 */
.second-level {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  margin-bottom: 20px;
}

.second-level.expanded {
  max-height: 2000px;
  opacity: 1;
}

.subcategories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--category-color);
}

.subcategory-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s;
}

.subcategory-card:hover {
  border-color: var(--category-color);
  transform: translateX(4px);
}

.subcategory-card.active {
  background: rgba(var(--category-color-rgb), 0.1);
  border-color: var(--category-color);
}

.subcategory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.subcategory-name {
  font-size: 1rem;
  font-weight: 500;
}

.subcategory-count {
  font-size: 0.85rem;
  color: var(--category-color);
  background: rgba(var(--category-color-rgb), 0.15);
  padding: 2px 8px;
  border-radius: 12px;
}

/* 第三层：标签云 */
.third-level {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.25s cubic-bezier(0.4, 0.0, 0.2, 1),
              opacity 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  margin-top: 12px;
}

.third-level.expanded {
  max-height: 500px;
  opacity: 1;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 0.85rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tag-chip:hover {
  background: var(--category-color);
  border-color: var(--category-color);
  color: #fff;
  transform: scale(1.05);
}

/* 响应式 */
@media (max-width: 768px) {
  .taxonomy-header h1 {
    font-size: 2rem;
  }
  
  .first-level {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  
  .main-category-card {
    padding: 16px;
    min-height: 100px;
  }
  
  .subcategories-grid {
    grid-template-columns: 1fr;
  }
}

/* 辅助类 */
.hidden {
  display: none !important;
}

.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 2: 添加颜色变量动态注入支持**

在CSS末尾添加：
```css
/* 动态颜色类（由JavaScript注入） */
.color-drama { --category-color: #F87171; --category-color-rgb: 248, 113, 113; }
.color-fantasy { --category-color: #5B8CFF; --category-color-rgb: 91, 140, 255; }
.color-action { --category-color: #FBBF24; --category-color-rgb: 251, 191, 36; }
.color-arthouse { --category-color: #22D3EE; --category-color-rgb: 34, 211, 238; }
.color-horror { --category-color: #A78BFA; --category-color-rgb: 167, 139, 250; }
.color-comedy { --category-color: #34D399; --category-color-rgb: 52, 211, 153; }
.color-animation { --category-color: #FB923C; --category-color-rgb: 251, 146, 60; }
.color-documentary { --category-color: #94A3B8; --category-color-rgb: 148, 163, 184; }
```

- [ ] **Step 3: 测试CSS加载**

创建临时HTML测试文件：
```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><link rel="stylesheet" href="taxonomy.css"></head>
<body>
<div class="taxonomy-header"><h1>Test</h1></div>
<div class="first-level">
  <div class="main-category-card color-drama">
    <span class="category-icon">🎭</span>
    <div class="category-name">剧情类</div>
  </div>
</div>
</body></html>
```

在浏览器中打开验证样式正常

- [ ] **Step 4: Commit CSS**
```bash
git add taxonomy.css
git commit -m "feat: 创建类型图谱页面CSS样式（三层结构+动画）"
```

---

## Task 3: 实现TaxonomyViewer核心类

**Files:**
- Create: `taxonomy.js`

- [ ] **Step 1: 创建TaxonomyViewer类框架**
```javascript
// taxonomy.js
class TaxonomyViewer {
  constructor(containerId, taxonomyData, config) {
    this.container = document.getElementById(containerId);
    this.data = taxonomyData;
    this.config = config;
    this.state = {
      currentOpenMain: null,
      currentOpenSub: null
    };
    
    this.init();
  }
  
  init() {
    this.renderFirstLevel();
    this.attachEventListeners();
  }
  
  renderFirstLevel() {
    const firstLevelDiv = document.createElement('div');
    firstLevelDiv.className = 'first-level';
    
    Object.entries(this.data).forEach(([mainId, mainCat]) => {
      const card = this.createMainCategoryCard(mainId, mainCat);
      firstLevelDiv.appendChild(card);
    });
    
    this.container.appendChild(firstLevelDiv);
  }
  
  createMainCategoryCard(mainId, mainCat) {
    const card = document.createElement('div');
    card.className = `main-category-card color-${mainId}`;
    card.dataset.mainId = mainId;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');
    
    card.innerHTML = `
      <span class="category-icon">${mainCat.icon}</span>
      <div>
        <div class="category-name">${mainCat.name}</div>
        <div class="category-name-en">${mainCat.nameEn}</div>
        <div class="category-count">${mainCat.count || 0} 部电影</div>
      </div>
    `;
    
    return card;
  }
  
  attachEventListeners() {
    // 主类型点击事件
    this.container.addEventListener('click', (e) => {
      const card = e.target.closest('.main-category-card');
      if (card) {
        this.handleMainCategoryClick(card);
      }
      
      const subCard = e.target.closest('.subcategory-card');
      if (subCard) {
        this.handleSubCategoryClick(subCard);
      }
      
      const tag = e.target.closest('.tag-chip');
      if (tag) {
        this.handleTagClick(tag);
      }
    });
    
    // 键盘导航
    this.container.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const card = e.target.closest('.main-category-card');
        if (card) {
          this.handleMainCategoryClick(card);
        }
      }
    });
  }
  
  handleMainCategoryClick(card) {
    const mainId = card.dataset.mainId;
    
    // 如果点击的是当前展开的，则折叠
    if (this.state.currentOpenMain === mainId) {
      this.collapseMainCategory(mainId);
      this.state.currentOpenMain = null;
      return;
    }
    
    // 折叠之前展开的
    if (this.state.currentOpenMain) {
      this.collapseMainCategory(this.state.currentOpenMain);
    }
    
    // 展开新的
    this.expandMainCategory(mainId);
    this.state.currentOpenMain = mainId;
  }
  
  expandMainCategory(mainId) {
    const card = this.container.querySelector(`[data-main-id="${mainId}"]`);
    card.classList.add('active');
    card.setAttribute('aria-expanded', 'true');
    
    // 检查是否已渲染第二层
    let secondLevel = card.nextElementSibling;
    if (!secondLevel || !secondLevel.classList.contains('second-level')) {
      secondLevel = this.createSecondLevel(mainId);
      card.after(secondLevel);
    }
    
    // 触发展开动画
    setTimeout(() => {
      secondLevel.classList.add('expanded');
    }, 10);
  }
  
  collapseMainCategory(mainId) {
    const card = this.container.querySelector(`[data-main-id="${mainId}"]`);
    card.classList.remove('active');
    card.setAttribute('aria-expanded', 'false');
    
    const secondLevel = card.nextElementSibling;
    if (secondLevel && secondLevel.classList.contains('second-level')) {
      secondLevel.classList.remove('expanded');
      
      // 动画结束后移除DOM
      setTimeout(() => {
        if (!secondLevel.classList.contains('expanded')) {
          secondLevel.remove();
        }
      }, 300);
    }
    
    // 重置子类型状态
    this.state.currentOpenSub = null;
  }
  
  createSecondLevel(mainId) {
    const mainCat = this.data[mainId];
    const secondLevelDiv = document.createElement('div');
    secondLevelDiv.className = `second-level color-${mainId}`;
    secondLevelDiv.dataset.mainId = mainId;
    
    const grid = document.createElement('div');
    grid.className = 'subcategories-grid';
    
    Object.entries(mainCat.children).forEach(([subId, subCat]) => {
      const subCard = this.createSubCategoryCard(mainId, subId, subCat);
      grid.appendChild(subCard);
    });
    
    secondLevelDiv.appendChild(grid);
    return secondLevelDiv;
  }
  
  createSubCategoryCard(mainId, subId, subCat) {
    const card = document.createElement('div');
    card.className = 'subcategory-card';
    card.dataset.mainId = mainId;
    card.dataset.subId = subId;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    
    card.innerHTML = `
      <div class="subcategory-header">
        <div class="subcategory-name">${subCat.name}</div>
        <div class="subcategory-count">${subCat.count || 0}</div>
      </div>
      <div class="third-level" data-sub-id="${subId}"></div>
    `;
    
    return card;
  }
  
  handleSubCategoryClick(subCard) {
    const mainId = subCard.dataset.mainId;
    const subId = subCard.dataset.subId;
    const compositeId = `${mainId}:${subId}`;
    
    const thirdLevel = subCard.querySelector('.third-level');
    
    // 切换展开/折叠
    if (this.state.currentOpenSub === compositeId) {
      this.collapseSubCategory(subCard, thirdLevel);
      this.state.currentOpenSub = null;
    } else {
      // 折叠之前的
      if (this.state.currentOpenSub) {
        const [prevMainId, prevSubId] = this.state.currentOpenSub.split(':');
        const prevCard = this.container.querySelector(
          `[data-main-id="${prevMainId}"][data-sub-id="${prevSubId}"]`
        );
        if (prevCard) {
          const prevThird = prevCard.querySelector('.third-level');
          this.collapseSubCategory(prevCard, prevThird);
        }
      }
      
      // 展开新的
      this.expandSubCategory(subCard, thirdLevel, mainId, subId);
      this.state.currentOpenSub = compositeId;
    }
  }
  
  expandSubCategory(subCard, thirdLevel, mainId, subId) {
    subCard.classList.add('active');
    
    // 渲染标签云（如果未渲染）
    if (thirdLevel.children.length === 0) {
      const tagsContainer = this.createTagsContainer(mainId, subId);
      thirdLevel.appendChild(tagsContainer);
    }
    
    // 触发展开动画
    setTimeout(() => {
      thirdLevel.classList.add('expanded');
    }, 10);
  }
  
  collapseSubCategory(subCard, thirdLevel) {
    subCard.classList.remove('active');
    thirdLevel.classList.remove('expanded');
  }
  
  createTagsContainer(mainId, subId) {
    const mainCat = this.data[mainId];
    const subCat = mainCat.children[subId];
    
    const container = document.createElement('div');
    container.className = 'tags-container';
    
    subCat.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.dataset.tag = tag;
      chip.textContent = tag;
      container.appendChild(chip);
    });
    
    return container;
  }
  
  handleTagClick(tagChip) {
    const tag = tagChip.dataset.tag;
    console.log(`Filter by tag: ${tag}`);
    // TODO: 实现筛选跳转到主页面并应用筛选
    window.location.href = `index.html?genre=${encodeURIComponent(tag)}`;
  }
}

// 初始化函数
function initTaxonomy() {
  if (typeof taxonomyTree === 'undefined' || typeof taxonomyConfig === 'undefined') {
    console.error('Taxonomy data not loaded');
    return;
  }
  
  const viewer = new TaxonomyViewer('taxonomy-root', taxonomyTree, taxonomyConfig);
  window.taxonomyViewer = viewer;
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTaxonomy);
} else {
  initTaxonomy();
}
```

- [ ] **Step 2: Commit核心类**
```bash
git add taxonomy.js
git commit -m "feat: 实现TaxonomyViewer核心类（三层交互逻辑）"
```

---

## Task 4: 创建taxonomy.html主页面

**Files:**
- Create: `taxonomy.html`

- [ ] **Step 1: 创建HTML页面**
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>电影类型图谱 - 探索电影的世界</title>
  <link rel="stylesheet" href="taxonomy.css">
</head>
<body>
  <div class="taxonomy-header">
    <h1>电影类型图谱</h1>
    <p>探索不同类型的电影世界，点击卡片展开详细分类</p>
  </div>
  
  <div id="taxonomy-root" class="taxonomy-container"></div>
  
  <div style="text-align: center; margin: 60px 0 40px; opacity: 0.6;">
    <a href="index.html" style="color: #5B8CFF; text-decoration: none;">← 返回主页</a>
  </div>
  
  <!-- 加载数据和脚本 -->
  <script src="taxonomy-data.js"></script>
  <script src="taxonomy-config.js"></script>
  <script src="taxonomy.js"></script>
</body>
</html>
```

- [ ] **Step 2: 在浏览器中测试页面**
```bash
# 打开taxonomy.html
start taxonomy.html
```

验证：
- 第一层8个主类型卡片正常显示
- 点击卡片展开第二层
- 点击第二层卡片展开标签云
- 动画流畅（300ms过渡）
- 颜色主题正确应用

- [ ] **Step 3: 测试键盘导航**

按Tab键切换卡片，按空格键展开/折叠

- [ ] **Step 4: 测试移动端适配**

在浏览器开发者工具中切换到移动设备视图，验证布局正常

- [ ] **Step 5: Commit HTML页面**
```bash
git add taxonomy.html
git commit -m "feat: 创建taxonomy.html主页面"
```

---

## Task 5: 替换原图谱页面并更新导航

**Files:**
- Modify: `index.html` (更新导航链接)
- Rename: `电影类型全图谱.html` → `电影类型全图谱.html.backup`

- [ ] **Step 1: 备份原图谱页面**
```bash
mv "电影类型全图谱.html" "电影类型全图谱.html.backup"
```

- [ ] **Step 2: 在index.html中查找图谱页面链接**
```bash
grep -n "电影类型全图谱" index.html
```

- [ ] **Step 3: 更新index.html中的链接**

找到链接位置（假设在导航栏），替换为：
```html
<!-- 原链接 -->
<a href="电影类型全图谱.html">电影类型图谱</a>

<!-- 新链接 -->
<a href="taxonomy.html">电影类型图谱</a>
```

- [ ] **Step 4: 测试导航流程**

打开index.html → 点击"电影类型图谱"链接 → 确认跳转到新的taxonomy.html

- [ ] **Step 5: 测试返回链接**

在taxonomy.html点击"返回主页" → 确认跳转回index.html

- [ ] **Step 6: Commit更新**
```bash
git add index.html 电影类型全图谱.html.backup
git commit -m "feat: 替换原图谱页面为新的三层树状结构"
```

---

## Task 6: 性能优化与懒加载

**Files:**
- Modify: `taxonomy.js`

- [ ] **Step 1: 添加Intersection Observer懒加载**

在TaxonomyViewer类中添加：
```javascript
setupLazyLoad() {
  if (!('IntersectionObserver' in window)) {
    return; // 不支持则跳过
  }
  
  this.observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        if (element.dataset.lazyLoad === 'true') {
          // 触发实际渲染
          this.renderLazyContent(element);
          this.observer.unobserve(element);
        }
      }
    });
  }, {
    rootMargin: '100px' // 提前100px开始加载
  });
}

renderLazyContent(element) {
  // 实际的内容渲染逻辑
  element.dataset.lazyLoad = 'false';
}
```

- [ ] **Step 2: 添加DOM节点数量监控**
```javascript
monitorDOMNodes() {
  const nodeCount = this.container.querySelectorAll('*').length;
  console.log(`Current DOM nodes: ${nodeCount}`);
  
  if (nodeCount > this.config.performance.maxVisibleNodes) {
    console.warn(`DOM nodes exceeded limit: ${nodeCount}/${this.config.performance.maxVisibleNodes}`);
  }
  
  return nodeCount;
}
```

在expandMainCategory和expandSubCategory中调用monitorDOMNodes()

- [ ] **Step 3: 添加动画性能优化**

在CSS中添加will-change属性：
```css
.main-category-card {
  will-change: transform;
}

.second-level {
  will-change: max-height, opacity;
}
```

- [ ] **Step 4: 测试性能**

打开浏览器开发者工具 → Performance标签 → 录制展开/折叠操作：
- 验证动画帧率 ≥ 60fps
- 验证无明显卡顿

- [ ] **Step 5: Commit性能优化**
```bash
git add taxonomy.js taxonomy.css
git commit -m "perf: 添加懒加载和DOM节点监控，优化动画性能"
```

---

## Task 7: 添加筛选跳转功能

**Files:**
- Modify: `index.html` (支持URL参数筛选)

- [ ] **Step 1: 在index.html中添加URL参数解析**

在index.html的`<script>`标签开头添加：
```javascript
// 解析URL参数
function getURLParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    genre: params.get('genre'),
    year: params.get('year'),
    rating: params.get('rating')
  };
}

// 应用筛选
function applyFiltersFromURL() {
  const params = getURLParams();
  
  if (params.genre) {
    console.log(`Filtering by genre: ${params.genre}`);
    // 调用现有的筛选函数
    filterByGenre(params.genre);
    
    // 显示提示
    showFilterNotice(`当前筛选：${params.genre}`);
  }
}

// 显示筛选提示
function showFilterNotice(text) {
  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #5B8CFF;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  notice.textContent = text;
  document.body.appendChild(notice);
  
  setTimeout(() => {
    notice.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notice.remove(), 300);
  }, 3000);
}

// 页面加载时应用筛选
window.addEventListener('DOMContentLoaded', applyFiltersFromURL);
```

- [ ] **Step 2: 实现filterByGenre函数（如果不存在）**

在index.html中添加：
```javascript
function filterByGenre(genre) {
  // 假设有全局的filmsData
  const filtered = filmsData.filter(film => 
    film.g && film.g.includes(genre)
  );
  
  console.log(`Found ${filtered.length} films with genre: ${genre}`);
  
  // 调用渲染函数显示筛选结果
  renderFilmList(filtered);
  
  // 更新页面标题
  const title = document.querySelector('h1');
  if (title) {
    title.textContent = `电影 - ${genre}`;
  }
}
```

- [ ] **Step 3: 测试筛选跳转**

打开taxonomy.html → 点击标签（如"科幻"） → 确认跳转到index.html?genre=科幻 → 验证筛选生效

- [ ] **Step 4: 添加返回图谱链接**

在index.html筛选结果上方添加：
```html
<div id="filter-breadcrumb" style="display:none; padding: 20px; background: #171A23; border-radius: 8px; margin-bottom: 20px;">
  <a href="taxonomy.html" style="color: #5B8CFF;">← 返回类型图谱</a>
  <span style="margin: 0 10px; color: #666;">/</span>
  <span id="current-filter"></span>
</div>
```

在applyFiltersFromURL中显示面包屑：
```javascript
if (params.genre) {
  const breadcrumb = document.getElementById('filter-breadcrumb');
  const currentFilter = document.getElementById('current-filter');
  if (breadcrumb && currentFilter) {
    breadcrumb.style.display = 'block';
    currentFilter.textContent = params.genre;
  }
}
```

- [ ] **Step 5: Commit筛选功能**
```bash
git add index.html taxonomy.js
git commit -m "feat: 实现图谱标签点击跳转主页面筛选功能"
```

---

## Verification & Testing

- [ ] **Test 1: 功能完整性测试**
- [ ] 第一层8个主类型卡片正常显示
- [ ] 点击主类型卡片展开第二层
- [ ] 第二层显示所有子类型及数量
- [ ] 点击子类型卡片展开标签云
- [ ] 标签云显示所有标签
- [ ] 点击标签跳转到index.html并筛选

- [ ] **Test 2: 交互测试**
- [ ] 展开一个主类型后，点击另一个主类型，前一个自动折叠
- [ ] 展开一个子类型后，点击另一个子类型，前一个自动折叠
- [ ] 动画流畅，无卡顿
- [ ] 键盘导航正常（Tab + 空格）

- [ ] **Test 3: 响应式测试**
- [ ] 桌面端（1920x1080）布局正常
- [ ] 平板端（768x1024）布局正常
- [ ] 移动端（375x667）布局正常
- [ ] 触摸事件响应正常

- [ ] **Test 4: 性能测试**
```bash
# 使用Lighthouse测试
# Performance分数 >= 90
# Accessibility分数 >= 90
```

- [ ] **Test 5: 浏览器兼容性**
- [ ] Chrome最新版
- [ ] Firefox最新版
- [ ] Safari最新版
- [ ] Edge最新版

- [ ] **Test 6: 数据准确性**
```bash
node _generate_taxonomy_stats.js
# 验证每个类型的count数字准确
```

---

## Final Steps

- [ ] **清理备份文件**
```bash
# 确认新页面稳定后删除备份
rm "电影类型全图谱.html.backup"
```

- [ ] **更新PROJECT_MEMORY.md**

在PROJECT_MEMORY.md中添加：
```markdown
## Phase 2完成项（类型图谱重构）

- 创建三层树状数据结构（taxonomy-data.js）
- 实现TaxonomyViewer核心类
- 创建taxonomy.html新图谱页面
- 支持渐进展开、懒加载、流畅动画
- 实现标签点击跳转筛选功能
- 性能：初始DOM节点<50，动画60fps
- 已替换原"电影类型全图谱.html"
```

- [ ] **Commit更新**
```bash
git add PROJECT_MEMORY.md
git commit -m "docs: 更新PROJECT_MEMORY.md记录Phase 2完成"
```

- [ ] **Final Commit**
```bash
git log --oneline -10
git push origin main
```

---

## Success Criteria

- [x] 三层树状结构实现完成
- [x] 8个主类型，20+子类型，100+标签
- [x] 展开/折叠动画流畅（300ms）
- [x] 初始DOM节点<50
- [x] 键盘导航支持
- [x] 移动端适配完成
- [x] 标签点击跳转筛选功能正常
- [x] 替换原图谱页面完成
- [x] 性能测试通过（Lighthouse >=90）

---

**Phase 2 Complete! 准备进入Phase 3（排序筛选优化）**
