# Cloudflare 部署重要说明

本包包含一个安全的 `_redirects` 文件，里面只有注释，用于覆盖 GitHub 仓库中可能残留的旧 `_redirects`。
Cloudflare 报 `Infinite loop detected` 时，通常说明仓库或构建输出目录仍存在旧的 SPA fallback rewrite 规则。
请确认 GitHub 仓库根目录中的 `_redirects` 文件第一行以 `#` 开头，而且里面没有任何真实规则。

---

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
netlify.toml
.nojekyll
```

不要只上传 zip，也不要让 `index.html` 藏在多一层文件夹里。
