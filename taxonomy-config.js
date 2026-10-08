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
    '青春': ['drama', 'family'],
    '婚姻': ['drama', 'family'],
    '亲情': ['drama', 'family'],
    '友情': ['drama', 'family'],
    '历史': ['drama', 'history'],
    '战争': ['drama', 'history'],
    '传记': ['drama', 'history'],
    '二战': ['drama', 'history'],
    '冷战': ['drama', 'history'],
    '古代史': ['drama', 'history'],
    '维多利亚时代': ['drama', 'history'],
    '中世纪': ['drama', 'history'],
    '犯罪': ['drama', 'social'],
    '黑帮': ['drama', 'social'],
    '社会问题': ['drama', 'social'],
    '法律': ['drama', 'social'],
    '侦探': ['drama', 'social'],
    '惊悚': ['drama', 'social'],
    '悬疑': ['horror', 'suspense'],
    '推理': ['horror', 'suspense'],
    '谋杀': ['horror', 'suspense'],
    '犯罪心理': ['horror', 'suspense'],
    '科幻': ['fantasy', 'scifi'],
    '太空歌剧': ['fantasy', 'scifi'],
    '赛博朋克': ['fantasy', 'scifi'],
    '时间旅行': ['fantasy', 'scifi'],
    '外星人': ['fantasy', 'scifi'],
    'AI': ['fantasy', 'scifi'],
    '反乌托邦': ['fantasy', 'scifi'],
    '硬科幻': ['fantasy', 'scifi'],
    '软科幻': ['fantasy', 'scifi'],
    '奇幻': ['fantasy', 'fantasy'],
    '魔幻': ['fantasy', 'fantasy'],
    '童话': ['fantasy', 'fantasy'],
    '神话': ['fantasy', 'fantasy'],
    '超现实': ['fantasy', 'fantasy'],
    '魔法': ['fantasy', 'fantasy'],
    '龙与地下城': ['fantasy', 'fantasy'],
    '动作': ['action', 'action'],
    '冒险': ['action', 'action'],
    '枪战': ['action', 'action'],
    '武术': ['action', 'action'],
    '间谍': ['action', 'action'],
    '特工': ['action', 'action'],
    '追逐': ['action', 'action'],
    '西部': ['action', 'western'],
    '军事': ['action', 'western'],
    '越战': ['action', 'western'],
    '一战': ['action', 'western'],
    '艺术': ['arthouse', 'arthouse'],
    '文艺': ['arthouse', 'arthouse'],
    '新浪潮': ['arthouse', 'arthouse'],
    '意识流': ['arthouse', 'arthouse'],
    '长镜头': ['arthouse', 'arthouse'],
    '黑白电影': ['arthouse', 'arthouse'],
    '实验': ['arthouse', 'experimental'],
    '先锋': ['arthouse', 'experimental'],
    '抽象': ['arthouse', 'experimental'],
    '结构主义': ['arthouse', 'experimental'],
    '地下电影': ['arthouse', 'experimental'],
    'Cult': ['arthouse', 'cult'],
    '独立': ['arthouse', 'cult'],
    '独立制作': ['arthouse', 'cult'],
    'B级片': ['arthouse', 'cult'],
    '午夜场': ['arthouse', 'cult'],
    '邪典': ['arthouse', 'cult'],
    '恐怖': ['horror', 'horror'],
    '鬼怪': ['horror', 'horror'],
    '僵尸': ['horror', 'horror'],
    '吸血鬼': ['horror', 'horror'],
    '心理恐怖': ['horror', 'horror'],
    '哥特': ['horror', 'horror'],
    '喜剧': ['comedy', 'comedy'],
    '浪漫喜剧': ['comedy', 'comedy'],
    '黑色喜剧': ['comedy', 'comedy'],
    '闹剧': ['comedy', 'comedy'],
    '讽刺': ['comedy', 'comedy'],
    '荒诞': ['comedy', 'comedy'],
    '动画': ['animation', 'animation'],
    '动画长片': ['animation', 'animation'],
    '定格动画': ['animation', 'animation'],
    '成人动画': ['animation', 'animation'],
    '日本动画': ['animation', 'animation'],
    '欧洲动画': ['animation', 'animation'],
    '纪录片': ['documentary', 'documentary'],
    '传记纪录片': ['documentary', 'documentary'],
    '自然': ['documentary', 'documentary'],
    '历史纪录片': ['documentary', 'documentary'],
    '社会纪录片': ['documentary', 'documentary'],
    '音乐纪录片': ['documentary', 'documentary']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyConfig};
} else {
  window.taxonomyConfig = taxonomyConfig;
}
