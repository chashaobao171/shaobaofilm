// taxonomy-data.js
const taxonomyTree = {
  "drama": {
    "id": "drama",
    "name": "剧情类",
    "nameEn": "Drama & Life",
    "icon": "🎭",
    "color": "#F87171",
    "description": "探讨人性、情感与生活的故事",
    "count": 5973,
    "children": {
      "family": {
        "id": "family",
        "name": "家庭/爱情/成长",
        "tags": [
          "家庭",
          "爱情",
          "青春"
        ],
        "count": 4024
      },
      "history": {
        "id": "history",
        "name": "历史/战争/传记",
        "tags": [
          "传记",
          "战争",
          "历史"
        ],
        "count": 541
      },
      "social": {
        "id": "social",
        "name": "社会/犯罪/悬疑",
        "tags": [
          "犯罪",
          "黑帮",
          "惊悚"
        ],
        "count": 1408
      }
    }
  },
  "fantasy": {
    "id": "fantasy",
    "name": "幻想类",
    "nameEn": "Fantasy & Sci-Fi",
    "icon": "🚀",
    "color": "#5B8CFF",
    "description": "超越现实的想象世界",
    "count": 913,
    "children": {
      "scifi": {
        "id": "scifi",
        "name": "科幻",
        "tags": [
          "太空歌剧",
          "赛博朋克",
          "时间旅行",
          "外星人",
          "AI",
          "反乌托邦",
          "硬科幻",
          "软科幻"
        ],
        "count": 444
      },
      "fantasy": {
        "id": "fantasy",
        "name": "奇幻/超现实",
        "tags": [
          "魔幻",
          "童话",
          "神话",
          "超现实",
          "魔法",
          "龙与地下城"
        ],
        "count": 469
      }
    }
  },
  "action": {
    "id": "action",
    "name": "动作类",
    "nameEn": "Action & Adventure",
    "icon": "💥",
    "color": "#FBBF24",
    "description": "肾上腺素飙升的冒险",
    "count": 1513,
    "children": {
      "action": {
        "id": "action",
        "name": "动作/冒险",
        "tags": [
          "动作",
          "冒险"
        ],
        "count": 1467
      },
      "western": {
        "id": "western",
        "name": "西部/战争",
        "tags": [
          "西部"
        ],
        "count": 46
      }
    }
  },
  "arthouse": {
    "id": "arthouse",
    "name": "艺术类",
    "nameEn": "Arthouse & Experimental",
    "icon": "🎨",
    "color": "#22D3EE",
    "description": "艺术电影与实验先锋",
    "count": 5,
    "children": {
      "arthouse": {
        "id": "arthouse",
        "name": "艺术电影",
        "tags": [
          "文艺",
          "新浪潮"
        ],
        "count": 4
      },
      "experimental": {
        "id": "experimental",
        "name": "实验/先锋",
        "tags": [
          "实验"
        ],
        "count": 1
      },
      "cult": {
        "id": "cult",
        "name": "Cult/独立",
        "tags": [
          "Cult",
          "独立制作",
          "B级片",
          "午夜场",
          "邪典"
        ],
        "count": 0
      }
    }
  },
  "horror": {
    "id": "horror",
    "name": "恐怖类",
    "nameEn": "Horror & Thriller",
    "icon": "👻",
    "color": "#A78BFA",
    "description": "恐惧与惊悚的极致体验",
    "count": 870,
    "children": {
      "horror": {
        "id": "horror",
        "name": "恐怖/惊悚",
        "tags": [
          "恐怖"
        ],
        "count": 348
      },
      "suspense": {
        "id": "suspense",
        "name": "悬疑/推理",
        "tags": [
          "悬疑"
        ],
        "count": 522
      }
    }
  },
  "comedy": {
    "id": "comedy",
    "name": "喜剧类",
    "nameEn": "Comedy & Satire",
    "icon": "😄",
    "color": "#34D399",
    "description": "欢笑与讽刺的艺术",
    "count": 1609,
    "children": {
      "comedy": {
        "id": "comedy",
        "name": "喜剧",
        "tags": [
          "喜剧"
        ],
        "count": 1609
      }
    }
  },
  "animation": {
    "id": "animation",
    "name": "动画类",
    "nameEn": "Animation",
    "icon": "🎬",
    "color": "#FB923C",
    "description": "动画的无限可能",
    "count": 570,
    "children": {
      "animation": {
        "id": "animation",
        "name": "动画电影",
        "tags": [
          "动画"
        ],
        "count": 570
      }
    }
  },
  "documentary": {
    "id": "documentary",
    "name": "纪录片",
    "nameEn": "Documentary",
    "icon": "📹",
    "color": "#94A3B8",
    "description": "真实世界的影像记录",
    "count": 21,
    "children": {
      "documentary": {
        "id": "documentary",
        "name": "纪录片",
        "tags": [
          "纪录片"
        ],
        "count": 21
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
