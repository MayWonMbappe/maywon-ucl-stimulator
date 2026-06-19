# 欧冠参赛模拟器 - 部署说明

这是纯静态网页项目，根目录已经直接包含 `index.html`。

## Cloudflare Pages / Workers 静态部署

重要：本版本已经删除 `_redirects` 文件，避免 Cloudflare 报错：

`Invalid _redirects configuration: Infinite loop detected ... code: 100324`

本项目使用 hash 路由（例如 `/#/season`），不需要 SPA fallback rewrite，因此 Cloudflare 不需要 `_redirects`。

推荐设置：

- Framework preset：None / Static HTML
- Build command：留空
- Build output directory：`.`
- Root directory：留空（如果 `index.html` 在仓库根目录）

如果你把整个文件夹作为子目录上传，例如仓库结构是 `ucl_cf_pages_safe/index.html`，则 Root directory 或 Build output directory 需要对应改成该子目录。

## Netlify 部署

推荐设置：

- Build command：留空
- Publish directory：`.`

`netlify.toml` 保留给 Netlify 使用；Cloudflare 不需要读取它。

## GitHub 上传检查

仓库首页应直接看到：

```text
index.html
styles.css
README_DEPLOY.md
data/
js/
.nojekyll
```

不要只上传 zip，也不要让 `index.html` 藏在多一层文件夹里。

## 为什么没有 `_redirects` / `netlify.toml`

本项目用 `/#/...` 形式的 hash 路由。hash 部分不会发到服务器，所以刷新页面时服务器始终请求根路径或真实静态资源，不需要把所有路径 rewrite 到 `index.html`。因此删除重定向配置是最稳的跨平台方案。
