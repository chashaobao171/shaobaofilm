// taxonomy-data.js — 子类型由生成脚本按 films-data.js 实时精确统计（去重影片数）
// 子类型 mode：one=单标签 / all=多标签交叉(且) / any=多标签并集(或)
const taxonomyTree = {
  "drama": {
    "id": "drama",
    "name": "剧情类",
    "nameEn": "Drama & Life",
    "icon": "🎭",
    "color": "#F87171",
    "description": "人性、情感与命运的长卷",
    "count": 4447,
    "children": {
      "drama": {
        "id": "drama",
        "name": "剧情",
        "tags": [
          "剧情"
        ],
        "mode": "one",
        "count": 3498,
        "tagCounts": {
          "剧情": 3498
        }
      },
      "love": {
        "id": "love",
        "name": "爱情",
        "tags": [
          "爱情"
        ],
        "mode": "one",
        "count": 1226,
        "tagCounts": {
          "爱情": 1226
        }
      },
      "crime": {
        "id": "crime",
        "name": "犯罪",
        "tags": [
          "犯罪"
        ],
        "mode": "one",
        "count": 851,
        "tagCounts": {
          "犯罪": 851
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
        "count": 313,
        "tagCounts": {
          "家庭": 313
        }
      },
      "bio": {
        "id": "bio",
        "name": "传记",
        "tags": [
          "传记"
        ],
        "mode": "one",
        "count": 245,
        "tagCounts": {
          "传记": 245
        }
      },
      "hist": {
        "id": "hist",
        "name": "历史",
        "tags": [
          "历史"
        ],
        "mode": "one",
        "count": 218,
        "tagCounts": {
          "历史": 218
        }
      },
      "war": {
        "id": "war",
        "name": "战争",
        "tags": [
          "战争"
        ],
        "mode": "one",
        "count": 197,
        "tagCounts": {
          "战争": 197
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
          "古装"
        ],
        "mode": "one",
        "count": 74,
        "tagCounts": {
          "古装": 74
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
    "count": 1315,
    "children": {
      "susp": {
        "id": "susp",
        "name": "悬疑",
        "tags": [
          "悬疑"
        ],
        "mode": "one",
        "count": 522,
        "tagCounts": {
          "悬疑": 522
        }
      },
      "thrill": {
        "id": "thrill",
        "name": "惊悚",
        "tags": [
          "惊悚"
        ],
        "mode": "one",
        "count": 792,
        "tagCounts": {
          "惊悚": 792
        }
      },
      "fear": {
        "id": "fear",
        "name": "恐怖",
        "tags": [
          "恐怖"
        ],
        "mode": "one",
        "count": 348,
        "tagCounts": {
          "恐怖": 348
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
    "count": 1499,
    "children": {
      "act": {
        "id": "act",
        "name": "动作",
        "tags": [
          "动作"
        ],
        "mode": "one",
        "count": 1147,
        "tagCounts": {
          "动作": 1147
        }
      },
      "adv": {
        "id": "adv",
        "name": "冒险",
        "tags": [
          "冒险"
        ],
        "mode": "one",
        "count": 580,
        "tagCounts": {
          "冒险": 580
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
        "count": 46,
        "tagCounts": {
          "西部": 46
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
    "count": 886,
    "children": {
      "scifi": {
        "id": "scifi",
        "name": "科幻",
        "tags": [
          "科幻"
        ],
        "mode": "one",
        "count": 444,
        "tagCounts": {
          "科幻": 444
        }
      },
      "fant": {
        "id": "fant",
        "name": "奇幻",
        "tags": [
          "奇幻"
        ],
        "mode": "one",
        "count": 469,
        "tagCounts": {
          "奇幻": 469
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
        "count": 221,
        "tagCounts": {
          "科幻": 444,
          "动作": 1147
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
        "count": 102,
        "tagCounts": {
          "科幻": 444,
          "惊悚": 792
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
        "count": 133,
        "tagCounts": {
          "奇幻": 469,
          "冒险": 580
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
        "count": 162,
        "tagCounts": {
          "奇幻": 469,
          "动画": 570
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
    "count": 1609,
    "children": {
      "comedy": {
        "id": "comedy",
        "name": "喜剧",
        "tags": [
          "喜剧"
        ],
        "mode": "one",
        "count": 1609,
        "tagCounts": {
          "喜剧": 1609
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
        "count": 463,
        "tagCounts": {
          "喜剧": 1609,
          "爱情": 1226
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
        "count": 181,
        "tagCounts": {
          "喜剧": 1609,
          "动画": 570
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
        "count": 254,
        "tagCounts": {
          "喜剧": 1609,
          "动作": 1147
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
        "count": 585,
        "tagCounts": {
          "喜剧": 1609,
          "剧情": 3498
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
    "count": 570,
    "children": {
      "anim": {
        "id": "anim",
        "name": "动画",
        "tags": [
          "动画"
        ],
        "mode": "one",
        "count": 570,
        "tagCounts": {
          "动画": 570
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
        "count": 162,
        "tagCounts": {
          "动画": 570,
          "奇幻": 469
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
        "count": 192,
        "tagCounts": {
          "动画": 570,
          "冒险": 580
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
        "count": 181,
        "tagCounts": {
          "动画": 570,
          "喜剧": 1609
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
        "count": 49,
        "tagCounts": {
          "动画": 570,
          "家庭": 313
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
          "动画": 570,
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
    "count": 244,
    "children": {
      "music": {
        "id": "music",
        "name": "音乐",
        "tags": [
          "音乐"
        ],
        "mode": "one",
        "count": 117,
        "tagCounts": {
          "音乐": 117
        }
      },
      "musical": {
        "id": "musical",
        "name": "歌舞",
        "tags": [
          "歌舞"
        ],
        "mode": "one",
        "count": 58,
        "tagCounts": {
          "歌舞": 58
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
    "count": 40,
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
        "count": 3,
        "tagCounts": {
          "实验": 1,
          "默片": 1,
          "蒙太奇": 1,
          "电视电影": 1
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
    "count": 21,
    "children": {
      "doc": {
        "id": "doc",
        "name": "纪录片",
        "tags": [
          "纪录片"
        ],
        "mode": "one",
        "count": 21,
        "tagCounts": {
          "纪录片": 21
        }
      }
    }
  }
};

const taxonomyMeta = {
  "films": 5854,
  "categories": 9,
  "subcategories": 44,
  "updated": "2026-10-09"
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {taxonomyTree, taxonomyMeta};
} else {
  window.taxonomyTree = taxonomyTree;
  window.taxonomyMeta = taxonomyMeta;
}
