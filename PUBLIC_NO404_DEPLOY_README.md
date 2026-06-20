# 欧冠模拟器：public/ + Worker 404 兜底部署包

本包保持 `public/` 文件夹结构，并加入 `src/index.js` Worker 入口。

## Cloudflare Workers Builds 字段

- Build command: `npm install`
- Deploy command: `npm run deploy`
- Non-production branch deploy command: `npm run preview`
- Path: 留空

## 仓库根目录必须包含

- `public/`
- `src/index.js`
- `package.json`
- `wrangler.toml`
- `wrangler.jsonc`

## 为什么不会再因为 `/` 404

`wrangler.toml` 已设置：

```toml
main = "./src/index.js"

[assets]
directory = "./public"
binding = "ASSETS"
run_worker_first = true
```

所有请求先进入 Worker。Worker 会先尝试读取静态资源；如果 `/` 或无扩展名路径未匹配资源，会返回 `public/index.html`。
