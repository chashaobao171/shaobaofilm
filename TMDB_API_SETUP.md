# TMDB API Key 注册指引

## 第一步：注册 TMDB 账号（2分钟）

1. 访问 https://www.themoviedb.org/signup
2. 填写注册信息（用户名、邮箱、密码）
3. 打开邮箱，点击验证邮件中的 "Activate My Account" 蓝色按钮

## 第二步：申请 API Key（3分钟）

1. 登录后，点击右上角头像 -> Settings
2. 左侧导航栏选择 **API**
3. 点击 "Request an API Key" 下的 "click here" 链接
4. 选择 **Developer** 类型（非商业用途）
5. 接受服务条款
6. 填写简短申请表单：
   - Application Name: `Personal Film Library`
   - Application URL: `https://chashaobao-film.xyz`
   - Application Summary: `A personal static website for film taxonomy and discovery`
7. 提交后**即时获得 API Key**

## 第三步：配置到 GitHub Secrets

1. 访问 https://github.com/chashaobao171/shaobaofilm/settings/secrets/actions
2. 点击 "New repository secret"
3. Name: `TMDB_API_KEY`
4. Secret: 粘贴你获得的 API Key（通常是32位字符串）
5. 点击 "Add secret"

## 第四步：触发连通性测试

1. 访问 https://github.com/chashaobao171/shaobaofilm/actions/workflows/test-tmdb-connectivity.yml
2. 点击右侧 "Run workflow" 按钮
3. 确认分支为 `main`
4. 点击绿色 "Run workflow" 按钮
5. 等待约 30 秒，查看测试结果

## 预期结果

- **成功**：看到三个 curl 命令都返回 HTTP 401（证明网络连通，只是缺少 API key）
- **失败**：看到 Connection timeout 或 Connection refused（说明 GitHub Actions 无法访问 TMDB，需要调整方案）

## 注意事项

- API Key 是免费的，无需信用卡
- 速率限制：约 40 请求/秒（足够我们使用）
- 必须在应用中添加 TMDB 来源署名（我们会在网页底部添加）
- 保密 API Key，不要提交到代码库（只存放在 GitHub Secrets）
