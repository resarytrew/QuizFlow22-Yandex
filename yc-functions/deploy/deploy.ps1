param(
  [Parameter(Mandatory=$true)]
  [string]$FunctionName,
  [Parameter(Mandatory=$false)]
  [string]$CloudFunctionName = "",
  [Parameter(Mandatory=$false)]
  [string]$EntryPoint = "index.handler",
  [Parameter(Mandatory=$false)]
  [string]$Runtime = "nodejs18",
  [Parameter(Mandatory=$false)]
  [int]$Memory = 256,
  [Parameter(Mandatory=$false)]
  [int]$Timeout = 30,
  [Parameter(Mandatory=$false)]
  [string]$FolderId = $(Read-Host "YC_FOLDER_ID"),
  [Parameter(Mandatory=$false)]
  [string]$ServiceAccountId = $(Read-Host "YC_SERVICE_ACCOUNT_ID"),
  [Parameter(Mandatory=$false)]
  [string]$LockboxSecretId = $(Read-Host "YC_LOCKBOX_SECRET_ID"),
  [Parameter(Mandatory=$false)]
  [string]$SupabaseAnonKey = ""
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

if (-not $CloudFunctionName) {
  $CloudFunctionName = "potok-$FunctionName"
}

Write-Host "Building $FunctionName..." -ForegroundColor Cyan

Push-Location $ROOT
try {
  npm run "build:$FunctionName"
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally {
  Pop-Location
}

$distDir = "$ROOT\dist\$FunctionName"
if (-not (Test-Path $distDir)) {
  Write-Error "Build output not found: $distDir"
  exit 1
}

$zipPath = "$ROOT\dist\$FunctionName.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Add-Type -Assembly "System.IO.Compression.Filesystem"
[System.IO.Compression.ZipFile]::CreateFromDirectory($distDir, $zipPath)

Write-Host "Package created: $zipPath" -ForegroundColor Green

$secrets = @(
  "PG_HOST", "PG_PORT", "PG_USER", "PG_PASSWORD", "PG_DATABASE", "PG_CA_CERT",
  "SUPABASE_URL", "SUPABASE_ANON_KEY",
  "YC_ACCESS_KEY_ID", "YC_SECRET_ACCESS_KEY", "S3_BUCKET",
  "YOOKASSA_SHOP_ID", "YOOKASSA_SECRET_KEY",
  "FRONTEND_URL", "ALLOWED_ORIGINS",
  "BILLING_WEBHOOK_SECRET", "BILLING_ADMIN_SECRET",
  "OPENROUTER_API_KEY", "AI_PROXY_ALLOWED_MODELS", "AI_PROXY_DEFAULT_MODEL",
  "AI_PROXY_MAX_TOKENS", "AI_PROXY_MAX_PROMPT_CHARS", "AI_PROXY_REFERER",
  "YC_CATALOG_ID", "YC_OAUTH_TOKEN"
)

$secretArgs = $secrets | ForEach-Object {
  "--secret", "environment-variable=$_,name=$LockboxSecretId,key=$_"
}

$environmentArgs = @()
if ($SupabaseAnonKey) {
  $environmentArgs = @("--environment=SUPABASE_ANON_KEY=$SupabaseAnonKey")
}

Write-Host "Deploying $CloudFunctionName..." -ForegroundColor Cyan

yc serverless function version create `
  --function-name=$CloudFunctionName `
  --runtime=$Runtime `
  --entrypoint=$EntryPoint `
  --memory="${Memory}m" `
  --execution-timeout="${Timeout}s" `
  --service-account-id=$ServiceAccountId `
  --folder-id=$FolderId `
  --source-path=$zipPath `
  $environmentArgs `
  $secretArgs

if ($LASTEXITCODE -eq 0) {
  Write-Host "deployed $CloudFunctionName" -ForegroundColor Green
} else {
  Write-Error "Deployment failed"
  exit 1
}
