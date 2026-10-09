# 小众优质电影发现策略

## 问题分析
当前策略的局限性：
1. **TMDB trending/popular** - 只能抓到主流热门片
2. **Top Rated** - 虽然质量高，但还是偏主流（教父、肖申克等大众经典）
3. **按国家筛选** - 虽然能找到外语片，但还是偏热门

**缺失的领域**：
- Cult 经典（洛基恐怖秀、圣山、橡皮头等）
- B 级片中的佳作
- 独立电影（圣丹斯、柏林泰迪熊等）
- 实验电影（布努埃尔、塔可夫斯基早期）
- 小众恐怖/科幻/奇幻
- 纪录片中的冷门佳作
- 各国的非主流大师作品（若松孝二、阿彼察邦、洪尚秀等）

---

## 新策略：多维度小众片发现

### 策略 1：TMDB Keywords 定向挖掘
TMDB 有 20 万+ keywords，可以通过小众关键词定向发现：

**Cult & Underground 相关**：
- `cult-film`, `midnight-movie`, `exploitation`, `grindhouse`
- `psychedelic`, `surrealism`, `avant-garde`, `experimental-film`
- `underground-film`, `transgressive`, `shock-value`

**艺术电影相关**：
- `art-house`, `slow-cinema`, `long-take`, `minimalism`
- `contemplative-cinema`, `poetic-realism`
- `french-new-wave`, `italian-neorealism`

**小众类型**：
- `folk-horror`, `cosmic-horror`, `body-horror`, `giallo`
- `cyberpunk`, `neo-noir`, `mumblecore`
- `found-footage`, `mockumentary`

**独立电影**：
- `independent-film`, `microbudget`, `guerrilla-filmmaking`
- `sundance-film-festival`, `sxsw`, `tribeca`

**TMDB API 用法**：
```
/discover/movie?with_keywords=1606,9715,10683&sort_by=vote_average.desc&vote_count.gte=500
```
(vote_count 调低到 500，允许更小众的片子进来)

---

### 策略 2：按导演补全作品集

**小众大师级导演**（豆瓣可能漏掉他们的冷门作品）：
- **实验/艺术**：大卫·林奇、阿彼察邦·韦拉斯哈古、洪尚秀、蔡明亮
- **Cult**：大卫·柯南伯格、约多洛夫斯基、肯·罗素、约翰·沃特斯
- **独立**：吉姆·贾木许、理查德·林克莱特、凯莉·雷查德、乔·斯万博格
- **恐怖**：卢西奥·弗尔兹、达里奥·阿基多、乔治·罗梅罗
- **日本地下**：石井聪互、塚本晋也、园子温、若松孝二
- **欧洲先锋**：让-吕克·戈达尔、布努埃尔、阿兰·罗伯-格里耶、彼得·格林纳威

**TMDB API 用法**：
```
/person/{director_id}/movie_credits
```
拉取导演的全部作品（不只是热门的）

---

### 策略 3：Film Festival 获奖/入选片

**小众电影节** \(而非奥斯卡/戛纳主竞赛\)：
- **圣丹斯电影节** (Sundance) - 独立电影摇篮
- **西南偏南** (SXSW) - 独立/实验
- **翠贝卡电影节** (Tribeca)
- **柏林泰迪熊奖** (Teddy Award) - LGBTQ+ 电影
- **鹿特丹国际电影节** - 先锋艺术片
- **Fantastic Fest** - 类型片/cult 片
- **夏塔努加电影节** - 独立恐怖/科幻

**数据源**：
可惜 TMDB 没有直接的电影节 API，但可以：
1. 通过 keywords 搜索（如 `sundance-film-festival`）
2. 或者从 Wikidata SPARQL 查询电影节获奖名单，再用 TMDB ID 拉取详情

---

### 策略 4：降低投票数门槛 + 提高评分门槛

**当前标准**：
- vote_count >= 1000
- vote_average >= 7.0

**新标准（小众片）**：
- vote_count >= 300（允许更冷门的片子）
- vote_average >= 7.5（但要求更高评分，确保质量）

这样能抓到：
- 小众但口碑极好的片子
- 各国的非主流佳作
- 独立电影中的遗珠

---

### 策略 5：特定年代的冷门佳作

按年代 + 低投票数 + 高评分挖掘：
- 1960s: vote_count 200-2000, rating >= 7.8
- 1970s: vote_count 300-3000, rating >= 7.5
- 1980s: vote_count 500-5000, rating >= 7.5

避免只抓到每个年代的超级经典（教父、星战等），而是挖掘那些被时间遗忘的佳作。

---

### 策略 6：纪录片专项

纪录片经常被忽略，但有很多冷门佳作：
```
/discover/movie?with_genres=99&sort_by=vote_average.desc&vote_count.gte=300
```

---

## 推荐实施优先级

### Phase A：Keywords 定向挖掘（最快见效）
1. 创建 100 个小众 keywords 列表
2. 每个 keyword 拉取 top 20（vote_count >= 300, rating >= 7.5）
3. 预估新增：500-1000 部小众佳作

### Phase B：小众大师导演作品集
1. 维护 50 位小众大师导演 ID
2. 拉取每位导演的全部作品（不按热度筛选）
3. 预估新增：300-600 部

### Phase C：降低投票数门槛
1. 修改 discover 参数：vote_count 300-5000, rating >= 7.5
2. 按年代/国家/类型分批拉取
3. 预估新增：1000-2000 部

---

## 要我实施哪个策略？

我推荐**先做 Phase A（Keywords 定向挖掘）**，因为：
- 技术简单（只需修改现有脚本）
- 效果立竿见影（能抓到真正的 cult 片和小众片）
- 可控性强（可以精选 keywords）

我可以立即创建一个 `_tmdb_niche_discovery.js` 脚本，通过 100 个精选 keywords 挖掘小众佳作。

要我现在开始吗？
