// taxonomy.js - 电影类型图谱交互核心类

class TaxonomyViewer {
  constructor(containerId, taxonomyData, config) {
    this.container = document.getElementById(containerId);
    this.data = taxonomyData;
    this.config = config;
    this.state = {
      currentOpenMain: null,
      currentOpenSub: null
    };
    
    if (!this.container) {
      console.error(`Container element with id "${containerId}" not found`);
      return;
    }
    
    this.init();
  }
  
  init() {
    this.renderFirstLevel();
    this.attachEventListeners();
  }
  
  /**
   * 渲染第一层：主类型卡片网格
   */
  renderFirstLevel() {
    const firstLevelDiv = document.createElement('div');
    firstLevelDiv.className = 'first-level';
    
    Object.entries(this.data).forEach(([mainId, mainCat]) => {
      const card = this.createMainCategoryCard(mainId, mainCat);
      firstLevelDiv.appendChild(card);
    });
    
    this.container.appendChild(firstLevelDiv);
  }
  
  /**
   * 创建主类型卡片
   */
  createMainCategoryCard(mainId, mainCat) {
    const card = document.createElement('div');
    card.className = `main-category-card color-${mainId}`;
    card.dataset.mainId = mainId;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', `${mainCat.name}，${mainCat.count || 0}部电影`);
    
    card.innerHTML = `
      <span class="category-icon" aria-hidden="true">${mainCat.icon}</span>
      <div>
        <div class="category-name">${mainCat.name}</div>
        <div class="category-name-en">${mainCat.nameEn}</div>
        <div class="category-count">${mainCat.count || 0} 部电影</div>
      </div>
    `;
    
    return card;
  }
  
  /**
   * 绑定所有事件监听器
   */
  attachEventListeners() {
    // 主容器点击事件委托
    this.container.addEventListener('click', (e) => {
      // 主类型卡片点击
      const mainCard = e.target.closest('.main-category-card');
      if (mainCard) {
        this.handleMainCategoryClick(mainCard);
        return;
      }
      
      // 子类型卡片点击
      const subCard = e.target.closest('.subcategory-card');
      if (subCard) {
        this.handleSubCategoryClick(subCard);
        return;
      }
      
      // 标签芯片点击
      const tag = e.target.closest('.tag-chip');
      if (tag) {
        this.handleTagClick(tag);
        return;
      }
    });
    
    // 键盘导航支持
    this.container.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        
        const mainCard = e.target.closest('.main-category-card');
        if (mainCard) {
          this.handleMainCategoryClick(mainCard);
          return;
        }
        
        const subCard = e.target.closest('.subcategory-card');
        if (subCard) {
          this.handleSubCategoryClick(subCard);
          return;
        }
        
        const tag = e.target.closest('.tag-chip');
        if (tag) {
          this.handleTagClick(tag);
          return;
        }
      }
    });
  }
  
  /**
   * 处理主类型卡片点击
   */
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
  
  /**
   * 展开主类型
   */
  expandMainCategory(mainId) {
    const card = this.container.querySelector(`[data-main-id="${mainId}"]`);
    if (!card) return;
    
    card.classList.add('active');
    card.setAttribute('aria-expanded', 'true');
    
    // 检查是否已渲染第二层
    let secondLevel = card.nextElementSibling;
    if (!secondLevel || !secondLevel.classList.contains('second-level')) {
      secondLevel = this.createSecondLevel(mainId);
      card.after(secondLevel);
    }
    
    // 触发展开动画（需要延迟以确保CSS过渡生效）
    setTimeout(() => {
      secondLevel.classList.add('expanded');
    }, 10);
    
    // 平滑滚动到卡片位置
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  /**
   * 折叠主类型
   */
  collapseMainCategory(mainId) {
    const card = this.container.querySelector(`[data-main-id="${mainId}"]`);
    if (!card) return;
    
    card.classList.remove('active');
    card.setAttribute('aria-expanded', 'false');
    
    const secondLevel = card.nextElementSibling;
    if (secondLevel && secondLevel.classList.contains('second-level')) {
      secondLevel.classList.remove('expanded');
      
      // 动画结束后移除DOM（节省内存）
      const duration = this.config?.animation?.collapseDuration || 250;
      setTimeout(() => {
        if (!secondLevel.classList.contains('expanded')) {
          secondLevel.remove();
        }
      }, duration);
    }
    
    // 重置子类型状态
    this.state.currentOpenSub = null;
  }
  
  /**
   * 创建第二层：子类型网格
   */
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
  
  /**
   * 创建子类型卡片
   */
  createSubCategoryCard(mainId, subId, subCat) {
    const card = document.createElement('div');
    card.className = 'subcategory-card';
    card.dataset.mainId = mainId;
    card.dataset.subId = subId;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${subCat.name}，${subCat.count || 0}部电影`);
    
    card.innerHTML = `
      <div class="subcategory-header">
        <div class="subcategory-name">${subCat.name}</div>
        <div class="subcategory-count">${subCat.count || 0}</div>
      </div>
      <div class="third-level" data-sub-id="${subId}"></div>
    `;
    
    return card;
  }
  
  /**
   * 处理子类型卡片点击
   */
  handleSubCategoryClick(subCard) {
    const mainId = subCard.dataset.mainId;
    const subId = subCard.dataset.subId;
    const compositeId = `${mainId}:${subId}`;
    
    const thirdLevel = subCard.querySelector('.third-level');
    if (!thirdLevel) return;
    
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
  
  /**
   * 展开子类型（显示标签云）
   */
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
  
  /**
   * 折叠子类型
   */
  collapseSubCategory(subCard, thirdLevel) {
    if (!subCard || !thirdLevel) return;
    
    subCard.classList.remove('active');
    thirdLevel.classList.remove('expanded');
  }
  
  /**
   * 创建标签容器（第三层）
   */
  createTagsContainer(mainId, subId) {
    const mainCat = this.data[mainId];
    const subCat = mainCat.children[subId];
    
    const container = document.createElement('div');
    container.className = 'tags-container';
    
    if (!subCat.tags || subCat.tags.length === 0) {
      container.innerHTML = '<span class="no-tags">暂无标签</span>';
      return container;
    }
    
    subCat.tags.forEach(tag => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.dataset.tag = tag;
      chip.textContent = tag;
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', `筛选${tag}类型电影`);
      container.appendChild(chip);
    });
    
    return container;
  }
  
  /**
   * 处理标签点击（跳转到主页面并应用筛选）
   */
  handleTagClick(tagChip) {
    const tag = tagChip.dataset.tag;
    if (!tag) return;
    
    console.log(`Filtering by tag: ${tag}`);
    
    // 跳转到主页面并应用类型筛选
    // index.html需要支持genre参数
    window.location.href = `index.html?genre=${encodeURIComponent(tag)}`;
  }
  
  /**
   * 公共方法：折叠所有展开的类型
   */
  collapseAll() {
    if (this.state.currentOpenMain) {
      this.collapseMainCategory(this.state.currentOpenMain);
      this.state.currentOpenMain = null;
    }
    this.state.currentOpenSub = null;
  }
  
  /**
   * 公共方法：获取当前状态
   */
  getState() {
    return {
      currentOpenMain: this.state.currentOpenMain,
      currentOpenSub: this.state.currentOpenSub
    };
  }
}

/**
 * 初始化函数
 */
function initTaxonomy() {
  // 检查依赖是否加载
  if (typeof taxonomyTree === 'undefined') {
    console.error('taxonomyTree is not defined. Please load taxonomy-data.js first.');
    return;
  }
  
  if (typeof taxonomyConfig === 'undefined') {
    console.error('taxonomyConfig is not defined. Please load taxonomy-config.js first.');
    return;
  }
  
  // 创建TaxonomyViewer实例
  const viewer = new TaxonomyViewer('taxonomy-root', taxonomyTree, taxonomyConfig);
  
  // 暴露到全局以便调试
  window.taxonomyViewer = viewer;
  
  console.log('Taxonomy viewer initialized successfully');
}

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTaxonomy);
} else {
  initTaxonomy();
}
