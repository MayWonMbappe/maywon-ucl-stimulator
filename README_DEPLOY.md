# 欧冠参赛模拟器 - 静态部署说明

这是一个纯静态网页项目，不需要后端、不需要数据库、不需要构建工具。仓库根目录直接放 `index.html` 即可部署。

## 本次更新

- 关键抉择不再只累计 xG：每次选择后会根据本次 xG、即时进球/丢球风险、球员标签加成进行即时比分判定。
- 终场不再集中把整场 xG 重新结算一遍，只补充结算最后阶段自然演化，减少“前面一直 0-0，完场突然改比分”的割裂感。
- 英文球员标签和抉择标签已改为中文显示。
- 鼠标移动到标签或抉择按钮上，可看到具体标签增益和数值影响说明。
- 新增 `data/labelData.js` 统一维护中文标签、效果中文名和悬停说明。

## 本地打开

推荐使用 VS Code 的 Live Server 插件打开 `index.html`。

也可以在项目根目录运行：

```bash
python3 -m http.server 4173
```

然后浏览器访问：

```text
http://localhost:4173
```

原因：项目使用 ES Modules，浏览器直接以 `file://` 打开时可能触发模块跨源限制。

## 文件结构

```text
index.html
styles.css
README_DEPLOY.md
_redirects
netlify.toml
.nojekyll

data/
  teamsData.js
  tacticsData.js
  eventTemplates.js
  labelData.js

js/
  app.js
  router.js
  render.js
  state.js
  utils.js
  matchEngine.js
  eventEngine.js
  seasonEngine.js
  standingsEngine.js
  knockoutEngine.js
  extraTimeEngine.js
  penaltyEngine.js
  historyStore.js
```

## Netlify 部署

1. 确认发布目录根部能直接看到 `index.html`。
2. GitHub 绑定部署时，Build command 留空，Publish directory 填 `.`。
3. 拖拽部署时，拖入解压后的项目文件夹，或上传根目录直放版本的 zip。
4. 部署完成后访问 Netlify 生成的网址。

## Cloudflare Pages 部署

1. 连接 GitHub 仓库。
2. Framework preset 选择 `None`。
3. Build command 留空。
4. Build output directory 填 `/` 或 `.`。
5. Root directory 留空，除非你把这些文件放在仓库子文件夹里。

## 数据说明

`data/teamsData.js` 中的 OVR 为程序读取字段；`ratingSource` 只用于展示，不参与计算。

球员标签中文名和说明在 `data/labelData.js` 中维护；如果继续补充球员特质，优先在该文件里新增中文译名和悬停说明。

## 存档说明

项目使用浏览器本地存档。如果更换版本后页面状态异常，可以在网页“历史记录”里清空历史，或在浏览器开发者工具中清除该站点的 Local Storage。
