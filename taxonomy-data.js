// taxonomy-data.js — 计数由 _recount_taxonomy.js 精确统计（去重影片数）
const taxonomyTree = {
  "drama": {
    "id": "drama",
    "name": "剧情类",
    "nameEn": "Drama & Life",
    "icon": "🎭",
    "color": "#F87171",
    "description": "人性、情感与命运的长卷",
    "count": 6541,
    "children": {
      "drama": {
        "id": "drama",
        "name": "剧情",
        "tags": [
          "剧情",
          "社会",
          "青春",
          "治愈",
          "生活"
        ],
        "mode": "any",
        "count": 5109,
        "tagCounts": {
          "剧情": 5106,
          "社会": 1,
          "青春": 1,
          "治愈": 1,
          "生活": 1
        }
      },
      "love": {
        "id": "love",
        "name": "爱情",
        "tags": [
          "爱情"
        ],
        "mode": "one",
        "count": 1698,
        "tagCounts": {
          "爱情": 1698
        }
      },
      "crime": {
        "id": "crime",
        "name": "犯罪",
        "tags": [
          "犯罪",
          "黑帮",
          "复仇"
        ],
        "mode": "any",
        "count": 1225,
        "tagCounts": {
          "犯罪": 1223,
          "黑帮": 1,
          "复仇": 1
        }
      },
      "noir": {
        "id": "noir",
        "name": "黑色电影",
        "tags": [
          "黑色电影"
        ],
        "mode": "one",
        "count": 12,
        "tagCounts": {
          "黑色电影": 12
        }
      },
      "family": {
        "id": "family",
        "name": "家庭",
        "tags": [
          "家庭"
        ],
        "mode": "one",
        "count": 558,
        "tagCounts": {
          "家庭": 558
        }
      },
      "bio": {
        "id": "bio",
        "name": "传记",
        "tags": [
          "传记",
          "自传"
        ],
        "mode": "any",
        "count": 246,
        "tagCounts": {
          "传记": 245,
          "自传": 1
        }
      },
      "hist": {
        "id": "hist",
        "name": "历史",
        "tags": [
          "历史"
        ],
        "mode": "one",
        "count": 382,
        "tagCounts": {
          "历史": 382
        }
      },
      "war": {
        "id": "war",
        "name": "战争",
        "tags": [
          "战争"
        ],
        "mode": "one",
        "count": 313,
        "tagCounts": {
          "战争": 313
        }
      },
      "gay": {
        "id": "gay",
        "name": "同性",
        "tags": [
          "同性"
        ],
        "mode": "one",
        "count": 153,
        "tagCounts": {
          "同性": 153
        }
      },
      "costume": {
        "id": "costume",
        "name": "古装",
        "tags": [
          "古装",
          "戏曲"
        ],
        "mode": "any",
        "count": 75,
        "tagCounts": {
          "古装": 74,
          "戏曲": 1
        }
      },
      "erotic": {
        "id": "erotic",
        "name": "情色",
        "tags": [
          "情色"
        ],
        "mode": "one",
        "count": 45,
        "tagCounts": {
          "情色": 45
        }
      },
      "kid": {
        "id": "kid",
        "name": "儿童",
        "tags": [
          "儿童"
        ],
        "mode": "one",
        "count": 42,
        "tagCounts": {
          "儿童": 42
        }
      }
    }
  },
  "horror": {
    "id": "horror",
    "name": "惊悚类",
    "nameEn": "Thriller & Horror",
    "icon": "👻",
    "color": "#A78BFA",
    "description": "悬念、恐惧与心跳的极限",
    "count": 1927,
    "children": {
      "susp": {
        "id": "susp",
        "name": "悬疑",
        "tags": [
          "悬疑",
          "心理"
        ],
        "mode": "any",
        "count": 726,
        "tagCounts": {
          "悬疑": 724,
          "心理": 2
        }
      },
      "thrill": {
        "id": "thrill",
        "name": "惊悚",
        "tags": [
          "惊悚"
        ],
        "mode": "one",
        "count": 1213,
        "tagCounts": {
          "惊悚": 1213
        }
      },
      "fear": {
        "id": "fear",
        "name": "恐怖",
        "tags": [
          "恐怖"
        ],
        "mode": "one",
        "count": 545,
        "tagCounts": {
          "恐怖": 545
        }
      },
      "disaster": {
        "id": "disaster",
        "name": "灾难",
        "tags": [
          "灾难"
        ],
        "mode": "one",
        "count": 32,
        "tagCounts": {
          "灾难": 32
        }
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
    "count": 2060,
    "children": {
      "act": {
        "id": "act",
        "name": "动作",
        "tags": [
          "动作"
        ],
        "mode": "one",
        "count": 1470,
        "tagCounts": {
          "动作": 1470
        }
      },
      "adv": {
        "id": "adv",
        "name": "冒险",
        "tags": [
          "冒险",
          "公路"
        ],
        "mode": "any",
        "count": 899,
        "tagCounts": {
          "冒险": 898,
          "公路": 1
        }
      },
      "wuxia": {
        "id": "wuxia",
        "name": "武侠",
        "tags": [
          "武侠"
        ],
        "mode": "one",
        "count": 58,
        "tagCounts": {
          "武侠": 58
        }
      },
      "west": {
        "id": "west",
        "name": "西部",
        "tags": [
          "西部"
        ],
        "mode": "one",
        "count": 95,
        "tagCounts": {
          "西部": 95
        }
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
    "count": 1342,
    "children": {
      "scifi": {
        "id": "scifi",
        "name": "科幻",
        "tags": [
          "科幻",
          "废土"
        ],
        "mode": "any",
        "count": 645,
        "tagCounts": {
          "科幻": 644,
          "废土": 1
        }
      },
      "fant": {
        "id": "fant",
        "name": "奇幻",
        "tags": [
          "奇幻",
          "梦境"
        ],
        "mode": "any",
        "count": 736,
        "tagCounts": {
          "奇幻": 735,
          "梦境": 1
        }
      },
      "scifi-act": {
        "id": "scifi-act",
        "name": "科幻动作",
        "tags": [
          "科幻",
          "动作"
        ],
        "mode": "all",
        "count": 301,
        "tagCounts": {
          "科幻": 644,
          "动作": 1470
        }
      },
      "scifi-thr": {
        "id": "scifi-thr",
        "name": "科幻惊悚",
        "tags": [
          "科幻",
          "惊悚"
        ],
        "mode": "all",
        "count": 146,
        "tagCounts": {
          "科幻": 644,
          "惊悚": 1213
        }
      },
      "fant-adv": {
        "id": "fant-adv",
        "name": "奇幻冒险",
        "tags": [
          "奇幻",
          "冒险"
        ],
        "mode": "all",
        "count": 230,
        "tagCounts": {
          "奇幻": 735,
          "冒险": 898
        }
      },
      "fant-anim": {
        "id": "fant-anim",
        "name": "奇幻动画",
        "tags": [
          "奇幻",
          "动画"
        ],
        "mode": "all",
        "count": 232,
        "tagCounts": {
          "奇幻": 735,
          "动画": 809
        }
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
    "count": 2347,
    "children": {
      "comedy": {
        "id": "comedy",
        "name": "喜剧",
        "tags": [
          "喜剧"
        ],
        "mode": "one",
        "count": 2347,
        "tagCounts": {
          "喜剧": 2347
        }
      },
      "romcom": {
        "id": "romcom",
        "name": "爱情喜剧",
        "tags": [
          "喜剧",
          "爱情"
        ],
        "mode": "all",
        "count": 634,
        "tagCounts": {
          "喜剧": 2347,
          "爱情": 1698
        }
      },
      "anim-com": {
        "id": "anim-com",
        "name": "动画喜剧",
        "tags": [
          "喜剧",
          "动画"
        ],
        "mode": "all",
        "count": 298,
        "tagCounts": {
          "喜剧": 2347,
          "动画": 809
        }
      },
      "act-com": {
        "id": "act-com",
        "name": "动作喜剧",
        "tags": [
          "喜剧",
          "动作"
        ],
        "mode": "all",
        "count": 317,
        "tagCounts": {
          "喜剧": 2347,
          "动作": 1470
        }
      },
      "dramedy": {
        "id": "dramedy",
        "name": "剧情喜剧",
        "tags": [
          "喜剧",
          "剧情"
        ],
        "mode": "all",
        "count": 899,
        "tagCounts": {
          "喜剧": 2347,
          "剧情": 5106
        }
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
    "count": 809,
    "children": {
      "anim": {
        "id": "anim",
        "name": "动画",
        "tags": [
          "动画"
        ],
        "mode": "one",
        "count": 809,
        "tagCounts": {
          "动画": 809
        }
      },
      "fant-anim": {
        "id": "fant-anim",
        "name": "奇幻动画",
        "tags": [
          "动画",
          "奇幻"
        ],
        "mode": "all",
        "count": 232,
        "tagCounts": {
          "动画": 809,
          "奇幻": 735
        }
      },
      "adv-anim": {
        "id": "adv-anim",
        "name": "冒险动画",
        "tags": [
          "动画",
          "冒险"
        ],
        "mode": "all",
        "count": 294,
        "tagCounts": {
          "动画": 809,
          "冒险": 898
        }
      },
      "com-anim": {
        "id": "com-anim",
        "name": "喜剧动画",
        "tags": [
          "动画",
          "喜剧"
        ],
        "mode": "all",
        "count": 298,
        "tagCounts": {
          "动画": 809,
          "喜剧": 2347
        }
      },
      "fam-anim": {
        "id": "fam-anim",
        "name": "家庭动画",
        "tags": [
          "动画",
          "家庭"
        ],
        "mode": "all",
        "count": 215,
        "tagCounts": {
          "动画": 809,
          "家庭": 558
        }
      },
      "kid-anim": {
        "id": "kid-anim",
        "name": "儿童动画",
        "tags": [
          "动画",
          "儿童"
        ],
        "mode": "all",
        "count": 12,
        "tagCounts": {
          "动画": 809,
          "儿童": 42
        }
      }
    }
  },
  "music": {
    "id": "music",
    "name": "音乐/运动",
    "nameEn": "Music & Sports",
    "icon": "🎵",
    "color": "#F472B6",
    "description": "旋律、舞台与竞技场",
    "count": 370,
    "children": {
      "music": {
        "id": "music",
        "name": "音乐",
        "tags": [
          "音乐"
        ],
        "mode": "one",
        "count": 243,
        "tagCounts": {
          "音乐": 243
        }
      },
      "musical": {
        "id": "musical",
        "name": "歌舞",
        "tags": [
          "歌舞"
        ],
        "mode": "one",
        "count": 57,
        "tagCounts": {
          "歌舞": 57
        }
      },
      "sport": {
        "id": "sport",
        "name": "运动",
        "tags": [
          "运动"
        ],
        "mode": "one",
        "count": 75,
        "tagCounts": {
          "运动": 75
        }
      }
    }
  },
  "arthouse": {
    "id": "arthouse",
    "name": "艺术类",
    "nameEn": "Arthouse & Experimental",
    "icon": "🎨",
    "color": "#22D3EE",
    "description": "作者电影与实验先锋",
    "count": 114,
    "children": {
      "short": {
        "id": "short",
        "name": "短片",
        "tags": [
          "短片"
        ],
        "mode": "one",
        "count": 31,
        "tagCounts": {
          "短片": 31
        }
      },
      "auteur": {
        "id": "auteur",
        "name": "文艺/作者",
        "tags": [
          "文艺",
          "新浪潮",
          "存在主义",
          "诗意",
          "慢电影"
        ],
        "mode": "any",
        "count": 6,
        "tagCounts": {
          "文艺": 2,
          "新浪潮": 2,
          "存在主义": 1,
          "诗意": 1,
          "慢电影": 1
        }
      },
      "avant": {
        "id": "avant",
        "name": "实验/先锋",
        "tags": [
          "实验",
          "默片",
          "蒙太奇",
          "电视电影"
        ],
        "mode": "any",
        "count": 77,
        "tagCounts": {
          "实验": 1,
          "默片": 1,
          "蒙太奇": 1,
          "电视电影": 75
        }
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
    "count": 343,
    "children": {
      "doc": {
        "id": "doc",
        "name": "纪录片",
        "tags": [
          "纪录片"
        ],
        "mode": "one",
        "count": 343,
        "tagCounts": {
          "纪录片": 343
        }
      }
    }
  }
};

const taxonomyMeta = {
  "films": 8758,
  "categories": 9,
  "subcategories": 44,
  "updated": "2026-10-26"
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyTree, taxonomyMeta};
} else {
  window.taxonomyTree = taxonomyTree;
  window.taxonomyMeta = taxonomyMeta;
}
