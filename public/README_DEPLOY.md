# 欧冠参赛模拟器部署说明

此目录是静态网站资源目录。Cloudflare Workers 部署时，根目录的 `wrangler.toml` 会把本目录作为 assets directory。

如果用 Cloudflare Workers Builds，请不要只上传 public 文件夹；请上传整个包内容，包括 `src/`、`package.json`、`wrangler.toml`。
