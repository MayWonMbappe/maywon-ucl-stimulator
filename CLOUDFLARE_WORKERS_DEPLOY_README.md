# Cloudflare Workers Static Assets 部署说明

本包用于 Cloudflare Workers / Static Assets 新界面。

## 当前修复

Cloudflare 报错：

```text
A compatibility_date is required when publishing.
```

已在仓库根目录加入 `wrangler.jsonc`：

```jsonc
{
  "name": "maywon-ucl-stimulator",
  "compatibility_date": "2026-06-20",
  "assets": {
    "directory": "./public",
    "html_handling": "none",
    "not_found_handling": "none"
  }
}
```

## Cloudflare 设置推荐

```text
Build command:
exit 0

Deploy command:
npx wrangler deploy

Non-production branch deploy command:
npx wrangler versions upload

Path:
留空
```

如果你不想改 Deploy command，继续用下面这两个也可以，因为 `wrangler.jsonc` 已经提供 compatibility_date：

```text
Deploy command:
npx wrangler deploy --assets ./public/

Non-production branch deploy command:
npx wrangler versions upload --assets ./public/
```

## GitHub 根目录应包含

```text
public/
wrangler.jsonc
package.json
CLOUDFLARE_WORKERS_DEPLOY_README.md
CLOUDFLARE_PUBLIC_DEPLOY_README.md
```

注意：不要把 `wrangler.jsonc` 放进 `public/`，它必须在仓库根目录。
