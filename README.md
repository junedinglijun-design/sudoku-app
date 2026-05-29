# 猫咪数独 (Nyan Sudoku)

可爱猫咪主题的 9×9 数独 H5 小游戏，支持手机浏览器、微信分享与「添加到主屏幕」。

## 在线体验

https://sudoku-app-gamma-nine.vercel.app

## 版本

- **v1.1.0** — H5 移动端优化（全屏视口、安全区、触控、分享卡片、PWA manifest）
- **v1.0.0** — 基础数独玩法、自定义出题、存档

## 本地开发

```bash
npm install
npm run dev
```

## 构建与部署

```bash
npm run build      # 生产构建 → dist/
npm run preview    # 本地预览构建结果
npm run deploy     # 部署到 Vercel（需已登录 vercel CLI）
npm run package    # 打包 dist 为 zip（离线分发）
```

## H5 说明

- 用手机浏览器或微信打开线上链接即可游玩
- iOS Safari：分享 → **添加到主屏幕**，可全屏打开
- 微信分享会读取 `share-cover.png` 作为链接预览图
