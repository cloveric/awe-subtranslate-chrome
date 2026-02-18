# 用 Playwright 操作 Chrome Web Store（不走 DevTools MCP）

这个流程的目标是：减少你每次手工点来点去的成本，同时避免 MCP 浏览器登录被 Google 拦截的问题。

## 1. 安装依赖

```powershell
npm install
```

## 2. 打开 CWS（持久化会话）

打开开发者后台主页：

```powershell
npm run cws:open
```

打开账号页（用于检查/设置联系邮箱）：

```powershell
$env:CWS_PUBLISHER_ID="<YOUR_CWS_PUBLISHER_ID>"
npm run cws:account
```

打开自定义 URL：

```powershell
npm run cws:open -- "https://chrome.google.com/webstore/devconsole/"
```

## 3. 会话复用说明

- 脚本使用持久化 profile：`.playwright/cws-profile`
- 第一次需要你手动登录 Google 账号
- 后续通常可复用登录状态，减少重复登录

## 4. 注意事项

1. Playwright 自动化浏览器仍可能触发 Google 风控。
2. 最稳妥做法是：
   - 用本机正常 Chrome 完成一次登录与账号设置
   - 发布动作继续走 API 脚本：`scripts/cws-v2-publish.ps1`
3. 脚本运行后，终端按 Enter 会关闭浏览器。
