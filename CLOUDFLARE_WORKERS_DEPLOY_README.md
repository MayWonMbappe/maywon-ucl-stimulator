# Cloudflare Workers Static Assets 部署说明（CLI flags 强制版）

本包用于 Cloudflare Workers Builds / Static Assets 界面。

## 必须填写

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

Path:

```text
留空
```

## 关键说明

这版不再只依赖 wrangler.toml / wrangler.jsonc 是否被 CI 成功读取。
`package.json` 的 deploy 脚本会在命令行直接传入：

```bash
--name maywon-ucl-stimulator --compatibility-date 2026-06-20 --assets ./public/
```

这样即使 CI 没读到配置文件，也能拿到 Worker 名称、兼容日期和静态资源目录。

## 仓库根目录必须有

```text
public/
package.json
wrangler.toml
wrangler.jsonc
CLOUDFLARE_WORKERS_DEPLOY_README.md
```

`public/` 里必须有：

```text
index.html
styles.css
data/
js/
```

