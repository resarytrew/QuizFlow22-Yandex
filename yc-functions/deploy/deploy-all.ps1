param(
  [Parameter(Mandatory=$false)]
  [string]$FolderId = $(Read-Host "YC_FOLDER_ID"),
  [Parameter(Mandatory=$false)]
  [string]$ServiceAccountId = $(Read-Host "YC_SERVICE_ACCOUNT_ID"),
  [Parameter(Mandatory=$false)]
  [string]$LockboxSecretId = $(Read-Host "YC_LOCKBOX_SECRET_ID")
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

$functions = @(
  @{
    BuildName = "api-router"
    CloudName = "potok-api-quizzes"
    Memory = 512
    Timeout = 60
  },
  @{
    BuildName = "cron-cleanup"
    CloudName = "potok-cron-cleanup"
    Memory = 256
    Timeout = 60
  }
)

Push-Location $ROOT
try {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

  Write-Host "Building shared TypeScript declarations..." -ForegroundColor Cyan
  npm run build:shared
  if ($LASTEXITCODE -ne 0) { throw "Shared build failed" }
} finally {
  Pop-Location
}

foreach ($fn in $functions) {
  Write-Host "`nDeploying $($fn.CloudName) from $($fn.BuildName)..." -ForegroundColor Cyan
  & "$PSScriptRoot\deploy.ps1" `
    -FunctionName $fn.BuildName `
    -CloudFunctionName $fn.CloudName `
    -Memory $fn.Memory `
    -Timeout $fn.Timeout `
    -EntryPoint "index.handler" `
    -FolderId $FolderId `
    -ServiceAccountId $ServiceAccountId `
    -LockboxSecretId $LockboxSecretId

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment failed for $($fn.CloudName)"
    exit 1
  }
}

Write-Host "`nUnified router and cron functions deployed." -ForegroundColor Green
Write-Host "API Gateway should point /api/{proxy+} to potok-api-quizzes." -ForegroundColor White
