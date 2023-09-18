# RSSWorker
一个能运行在 Cloudflare worker 上面的rss订阅源生成器（灵感来自[RSSHub](https://docs.rsshub.app/)）

## 使用方法
1. 安装依赖 - `npm install`
2. 部署到 Cloudflare worker - `npm run deploy`

## 可用路由
### 哔哩哔哩
- `/bilibili/dynamic/:uid` - 用户动态
- `/bilibili/videos/:uid` - 投稿视频