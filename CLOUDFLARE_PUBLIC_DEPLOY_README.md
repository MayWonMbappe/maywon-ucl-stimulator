# Cloudflare 当前推荐填法

如果你看到的是 Workers Builds 界面，字段包括 Build command / Deploy command / Non-production branch deploy command / Path，请填：

```text
Build command: npm install
Deploy command: npm run deploy
Non-production branch deploy command: npm run preview
Path: 留空
```

不要再只填 `npx wrangler deploy`，因为你的日志显示 CI 没有稳定读取 compatibility_date。
本包通过 package.json 脚本直接把 `--compatibility-date 2026-06-20` 传给 Wrangler。
