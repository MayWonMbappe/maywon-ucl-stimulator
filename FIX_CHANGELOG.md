# UCL Simulator Full Fix - 2026-06-20

本版修复：

1. 淘汰赛附加赛、16 强、8 强、半决赛改为两回合；决赛仍为单场。
2. 两回合总比分结算，第二回合总比分打平时进入加时/点球简化结算。
3. 阵型图按球员位置落位；拜仁 4-3-3 中奥利塞在右路、凯恩中锋、路易斯·迪亚斯左路。
4. 切换阵型时，阵型图即时重排。
5. 体能下降事件只会在 55 分钟以后出现。
6. 标签悬停显示自定义提示框，展示中文标签和具体增益。
7. 每次事件选择后，在原事件位置展示结果，点击“继续比赛”进入下一事件。
8. 事件描述加入具体球员，且每个事件后有对手战术变化的模糊概括。

## 本地预览

静态根目录版：

```bash
python3 -m http.server 4199
```

然后打开：

```text
http://localhost:4199
```

## GitHub Pages 推荐

如果使用 GitHub Pages，请使用 static-root 包，将内容上传到仓库根目录，然后在 GitHub Pages 里选：

```text
Branch: main
Folder: / root
```

## Cloudflare Workers 推荐

如果继续使用 Cloudflare Workers，请使用 worker 包，并按之前方式：

```text
Build command: npm install
Deploy command: npm run deploy
Non-production branch deploy command: npm run preview
Path: 留空
```
