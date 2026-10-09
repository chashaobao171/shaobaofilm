# 项目规则（Project Rules）

## 环境约束

- **浏览器限制（重要）**：本机只有 Microsoft Edge，没有安装 Chrome。
  - 所有前端验证、截图、UI 调试一律使用 **Edge**。
  - 禁止使用 Chrome / Chromium / Playwright 自带的 chromium / chrome-headless-shell 等一切 Chrome 系浏览器内核。
  - 如需自动化，请基于 Edge（`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）。
  - 优先方式：直接提供本地地址，由用户用 Edge 手动打开查看。

## 项目概要

- 电影网站，纯静态 HTML/CSS/JS。
- 数据文件 `films-data.js`，格式 `window.CINE = {films: [...]}`。
- 影片结构：`{t, y, r, p, g, source, tmdbId, doubanId, links:{primary, secondary}}`。
- 部署：EdgeOne Pages，通过 GitHub 自动部署。
- 本地预览：`http://127.0.0.1:8642/`

## 本地常用地址

- 首页：`http://127.0.0.1:8642/index.html`
- 类型图谱：`http://127.0.0.1:8642/taxonomy.html`
