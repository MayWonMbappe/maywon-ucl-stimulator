# 欧冠参赛模拟器 - 静态部署说明

这是一个纯静态网页项目，不需要后端、不需要数据库、不需要构建工具。

## 本地打开

推荐使用 VS Code 的 Live Server 插件打开 `index.html`。

原因：项目使用 ES Modules，浏览器直接以 `file://` 打开时可能触发模块跨源限制。

## 文件结构

```text
index.html
styles.css
README_DEPLOY.md

data/
  teamsData.js
  tacticsData.js
  eventTemplates.js

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

1. 确认所有文件都在同一个项目文件夹里。
2. 打开 Netlify 的拖拽部署页面。
3. 把整个项目文件夹拖进去。
4. 部署完成后访问生成的网址。

## 第一版范围

- 支持选择 12 支可选球队。
- 支持瑞士轮 8 场比赛、积分榜、赛前部署、中场调整、7 个关键事件、赛后报告、轮间管理、历史记录。
- 淘汰赛、加时和点球模块已经预留并提供基础函数，可继续扩展为完整 bracket 体验。

## 数据说明

`data/teamsData.js` 中的 OVR 为程序读取字段；`ratingSource` 只用于展示，不参与计算。
