# Chrome Web Store API v2 发布指南

本仓库提供了脚本：`scripts/cws-v2-publish.ps1`，用于通过 API 上传并发布扩展包。

## 1. 前置条件

1. 你的扩展条目已在 Chrome Web Store Developer Dashboard 创建过一次。
2. 本地已有待发布 ZIP（例如：`release/awe-subtranslate-chrome-v0.1.0.zip`）。
3. 你可用 Google OAuth 获取 `refresh_token`，且 scope 包含：
   - `https://www.googleapis.com/auth/chromewebstore`

## 2. 需要的环境变量

```powershell
$env:CWS_CLIENT_ID="..."
$env:CWS_CLIENT_SECRET="..."
$env:CWS_REFRESH_TOKEN="..."
$env:CWS_PUBLISHER_ID="..."
$env:CWS_ITEM_ID="..."
$env:CWS_ZIP_PATH="C:\path\to\your\extension.zip"
```

可选变量：

```powershell
$env:CWS_PUBLISH_TYPE="DEFAULT_PUBLISH"   # 或 STAGED_PUBLISH
$env:CWS_DEPLOY_PERCENTAGE="10"           # 0-100，默认 -1（不设置）
$env:CWS_SKIP_REVIEW="true"               # true/false
```

## 3. 参数说明

- `CWS_PUBLISHER_ID`：发布者 ID（Dashboard 账户维度）。
- `CWS_ITEM_ID`：扩展 Item ID（通常是 32 位小写字母 ID）。
- `CWS_ZIP_PATH`：要上传的 ZIP 路径。

## 4. 常用命令

仅查看当前状态（不上传）：

```powershell
.\scripts\cws-v2-publish.ps1 -StatusOnly
```

上传并直接发布：

```powershell
.\scripts\cws-v2-publish.ps1
```

灰度发布 10%：

```powershell
.\scripts\cws-v2-publish.ps1 -PublishType STAGED_PUBLISH -DeployPercentage 10
```

跳过评审（仅在你的账号/条目策略允许时生效）：

```powershell
.\scripts\cws-v2-publish.ps1 -SkipReview
```

## 5. 常见问题

1. `Missing required value`
   - 环境变量未设置完整，按第 2 节补齐。
2. OAuth 报错（`invalid_client` / `invalid_grant`）
   - 检查 `Client ID/Secret` 与 `Refresh Token` 是否匹配同一 OAuth 应用。
3. 上传接口报不存在
   - 先确认该 `item` 已在 Dashboard 存在，API v2 媒体上传针对现有条目。

## 6. 官方文档

- 发布总览：https://developer.chrome.com/docs/webstore/publish/
- API 使用：https://developer.chrome.com/docs/webstore/using-api
- `publish` 接口：https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish
- `fetchStatus` 接口：https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/fetchStatus
- `upload` 接口：https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items.media/upload
