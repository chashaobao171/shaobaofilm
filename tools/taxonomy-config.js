// taxonomy-config.js — 类型图谱配置（基于 films-data.js 真实 genre 重新设计）
const taxonomyConfig = {
  // 动画配置
  animation: {
    expandDuration: 320,  // ms
    collapseDuration: 240,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
  },

  // 星图几何配置（尺寸比例均相对于画布边长）
  graph: {
    radiusRatio: 0.300,       // 主节点环半径比例
    childOffsetRatio: 0.100,  // 子节点相对主节点环的外扩比例
    baseNode: 34,             // 节点基础半径
    scaleNode: 24,            // 按影片数缩放的附加半径
    sizeRef: 720              // 参考画布尺寸
  },

  // 每个主类型的代表 genre（用于面板底部"直达片库"按钮）
  categoryMeta: {
    drama:       {primaryGenre: '剧情'},
    horror:      {primaryGenre: '惊悚'},
    action:      {primaryGenre: '动作'},
    fantasy:     {primaryGenre: '科幻'},
    comedy:      {primaryGenre: '喜剧'},
    animation:   {primaryGenre: '动画'},
    music:       {primaryGenre: '音乐'},
    arthouse:    {primaryGenre: '文艺'},
    documentary: {primaryGenre: '纪录片'}
  },

  // 映射配置：films-data.js 的真实 genre → [主类型, 子类型]（子类型为 null 时只计入主类型）
  genreMapping: {
    // 剧情类
    '剧情': ['drama', null],
    '爱情': ['drama', 'fam'],
    '家庭': ['drama', 'fam'],
    '同性': ['drama', 'fam'],
    '情色': ['drama', 'fam'],
    '儿童': ['drama', 'fam'],
    '青春': ['drama', 'fam'],
    '治愈': ['drama', 'fam'],
    '生活': ['drama', 'fam'],
    '历史': ['drama', 'hist'],
    '战争': ['drama', 'hist'],
    '传记': ['drama', 'hist'],
    '古装': ['drama', 'hist'],
    '戏曲': ['drama', 'hist'],
    '自传': ['drama', 'hist'],
    '犯罪': ['drama', 'crime'],
    '黑色电影': ['drama', 'crime'],
    '黑帮': ['drama', 'crime'],
    '复仇': ['drama', 'crime'],
    '社会': ['drama', 'crime'],
    // 惊悚类
    '悬疑': ['horror', 'susp'],
    '惊悚': ['horror', 'susp'],
    '心理': ['horror', 'susp'],
    '恐怖': ['horror', 'fear'],
    '灾难': ['horror', 'fear'],
    // 动作类
    '动作': ['action', 'act'],
    '冒险': ['action', 'act'],
    '公路': ['action', 'act'],
    '武侠': ['action', 'west'],
    '西部': ['action', 'west'],
    // 幻想类
    '科幻': ['fantasy', 'scifi'],
    '废土': ['fantasy', 'scifi'],
    '奇幻': ['fantasy', 'fant'],
    '梦境': ['fantasy', 'fant'],
    // 喜剧类
    '喜剧': ['comedy', 'comedy'],
    // 动画类
    '动画': ['animation', 'anim'],
    // 音乐/运动
    '音乐': ['music', 'musical'],
    '歌舞': ['music', 'musical'],
    '运动': ['music', 'sport'],
    // 艺术类
    '文艺': ['arthouse', 'art'],
    '新浪潮': ['arthouse', 'art'],
    '存在主义': ['arthouse', 'art'],
    '诗意': ['arthouse', 'art'],
    '慢电影': ['arthouse', 'art'],
    '实验': ['arthouse', 'exp'],
    '短片': ['arthouse', 'exp'],
    '默片': ['arthouse', 'exp'],
    '蒙太奇': ['arthouse', 'exp'],
    '电视电影': ['arthouse', 'exp'],
    // 纪录片
    '纪录片': ['documentary', 'doc']
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyConfig};
} else {
  window.taxonomyConfig = taxonomyConfig;
}