[CmdletBinding()]
param(
  [string]$ClientId = $env:CWS_CLIENT_ID,
  [string]$ClientSecret = $env:CWS_CLIENT_SECRET,
  [string]$RefreshToken = $env:CWS_REFRESH_TOKEN,
  [string]$PublisherId = $env:CWS_PUBLISHER_ID,
  [string]$ItemId = $env:CWS_ITEM_ID,
  [string]$ZipPath = $env:CWS_ZIP_PATH,
  [ValidateSet('DEFAULT_PUBLISH', 'STAGED_PUBLISH')]
  [string]$PublishType = $(if ($env:CWS_PUBLISH_TYPE) { $env:CWS_PUBLISH_TYPE } else { 'DEFAULT_PUBLISH' }),
  [int]$DeployPercentage = $(if ($env:CWS_DEPLOY_PERCENTAGE) { [int]$env:CWS_DEPLOY_PERCENTAGE } else { -1 }),
  [switch]$SkipReview,
  [switch]$StatusOnly,
  [int]$PollIntervalSeconds = 3,
  [int]$UploadTimeoutMinutes = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  Write-Error $Message
  exit 1
}

function Require-Value([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) {
    Fail "Missing required value: $Name"
  }
}

function Get-AccessToken {
  param(
    [string]$Cid,
    [string]$Csecret,
    [string]$Rtoken
  )

  $body = @{
    client_id = $Cid
    client_secret = $Csecret
    refresh_token = $Rtoken
    grant_type = 'refresh_token'
  }

  $tokenResp = Invoke-RestMethod `
    -Method Post `
    -Uri 'https://oauth2.googleapis.com/token' `
    -ContentType 'application/x-www-form-urlencoded' `
    -Body $body

  if (-not $tokenResp.access_token) {
    Fail 'Failed to obtain access token from oauth2.googleapis.com/token'
  }
  return $tokenResp.access_token
}

function Invoke-CwsGet {
  param(
    [string]$Uri,
    [string]$AccessToken
  )
  return Invoke-RestMethod -Method Get -Uri $Uri -Headers @{ Authorization = "Bearer $AccessToken" }
}

function Invoke-CwsUpload {
  param(
    [string]$Uri,
    [string]$AccessToken,
    [string]$FilePath
  )
  return Invoke-RestMethod `
    -Method Post `
    -Uri $Uri `
    -Headers @{ Authorization = "Bearer $AccessToken" } `
    -ContentType 'application/octet-stream' `
    -InFile $FilePath
}

function Invoke-CwsJsonPost {
  param(
    [string]$Uri,
    [string]$AccessToken,
    [hashtable]$Body
  )
  return Invoke-RestMethod `
    -Method Post `
    -Uri $Uri `
    -Headers @{
      Authorization = "Bearer $AccessToken"
      'Content-Type' = 'application/json'
    } `
    -Body ($Body | ConvertTo-Json -Depth 8)
}

Require-Value 'CWS_CLIENT_ID' $ClientId
Require-Value 'CWS_CLIENT_SECRET' $ClientSecret
Require-Value 'CWS_REFRESH_TOKEN' $RefreshToken
Require-Value 'CWS_PUBLISHER_ID' $PublisherId
Require-Value 'CWS_ITEM_ID' $ItemId

if (-not $StatusOnly) {
  Require-Value 'CWS_ZIP_PATH' $ZipPath
  if (-not (Test-Path -LiteralPath $ZipPath)) {
    Fail "ZIP not found: $ZipPath"
  }
}

if ($DeployPercentage -ne -1 -and ($DeployPercentage -lt 0 -or $DeployPercentage -gt 100)) {
  Fail 'DeployPercentage must be between 0 and 100 (or -1 to leave unchanged).'
}

$envSkipReview = $false
if ($env:CWS_SKIP_REVIEW -and $env:CWS_SKIP_REVIEW -match '^(1|true|yes)$') {
  $envSkipReview = $true
}
$shouldSkipReview = $SkipReview.IsPresent -or $envSkipReview

$itemName = "publishers/$PublisherId/items/$ItemId"
$statusUri = "https://chromewebstore.googleapis.com/v2/{0}:fetchStatus" -f $itemName
$uploadUri = "https://chromewebstore.googleapis.com/upload/v2/{0}:upload" -f $itemName
$publishUri = "https://chromewebstore.googleapis.com/v2/{0}:publish" -f $itemName

Write-Host '[CWS] Refreshing access token...'
$token = Get-AccessToken -Cid $ClientId -Csecret $ClientSecret -Rtoken $RefreshToken

if ($StatusOnly) {
  Write-Host '[CWS] Fetching current item status...'
  $status = Invoke-CwsGet -Uri $statusUri -AccessToken $token
  $status | ConvertTo-Json -Depth 8
  exit 0
}

Write-Host "[CWS] Uploading package: $ZipPath"
$uploadResp = Invoke-CwsUpload -Uri $uploadUri -AccessToken $token -FilePath $ZipPath
$uploadResp | ConvertTo-Json -Depth 8 | Write-Host

if ($uploadResp.uploadState -eq 'FAILED') {
  Fail 'Upload failed immediately. Check response above for details.'
}

Write-Host '[CWS] Polling upload state...'
$deadline = (Get-Date).AddMinutes($UploadTimeoutMinutes)
$lastUploadState = $null

while ($true) {
  if ((Get-Date) -gt $deadline) {
    Fail "Timed out waiting for upload completion after $UploadTimeoutMinutes minutes."
  }

  $status = Invoke-CwsGet -Uri $statusUri -AccessToken $token
  $lastUploadState = $status.lastAsyncUploadState
  if (-not $lastUploadState) {
    $lastUploadState = 'NOT_FOUND'
  }

  Write-Host "[CWS] lastAsyncUploadState=$lastUploadState"

  if ($lastUploadState -eq 'IN_PROGRESS' -or $lastUploadState -eq 'NOT_FOUND') {
    Start-Sleep -Seconds $PollIntervalSeconds
    continue
  }

  if ($lastUploadState -eq 'FAILED') {
    Fail 'Upload failed. Check Developer Dashboard package status and logs.'
  }

  if ($lastUploadState -eq 'SUCCEEDED') {
    break
  }

  Start-Sleep -Seconds $PollIntervalSeconds
}

$publishBody = @{
  publishType = $PublishType
}

if ($shouldSkipReview) {
  $publishBody.skipReview = $true
}

if ($DeployPercentage -ge 0) {
  $publishBody.deployInfos = @(
    @{
      deployPercentage = $DeployPercentage
    }
  )
}

Write-Host "[CWS] Submitting publish request (publishType=$PublishType, skipReview=$shouldSkipReview)..."
$publishResp = Invoke-CwsJsonPost -Uri $publishUri -AccessToken $token -Body $publishBody
$publishResp | ConvertTo-Json -Depth 8 | Write-Host

Write-Host '[CWS] Final fetchStatus:'
$finalStatus = Invoke-CwsGet -Uri $statusUri -AccessToken $token
$finalStatus | ConvertTo-Json -Depth 8
