# 部署说明

本包保持 public/ 文件夹结构，并带 Cloudflare Workers Static Assets 入口脚本。

Cloudflare Workers Builds 填法：

Build command:

```bash
npm install
```

Deploy command:

```bash
npm run deploy
```

Non-production branch deploy command:

```bash
npm run preview
```

Path 留空。

本地预览：

```bash
cd public
python3 -m http.server 4207
```

打开：

```text
http://localhost:4207
```
