# Deploy QuizFlow22 build to Yandex Object Storage (PowerShell variant).
#
# Requirements:
#   - aws CLI in PATH (configured separately or via $env:AWS_* variables)
#   - yc CLI in PATH (optional, only for CDN cache invalidation)
#   - .env file with YC_BUCKET, YC_S3_ENDPOINT (and optional YC_CDN_RESOURCE_ID)
#
# Usage:
#   ./deploy/deploy.ps1

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

$EnvFile = Join-Path $ProjectRoot '.env'
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*#') { return }
        if ($_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim('"')
            if (-not [string]::IsNullOrEmpty($key)) {
                Set-Item -Path "Env:$key" -Value $val
            }
        }
    }
}

if ([string]::IsNullOrEmpty($env:YC_BUCKET)) {
    throw "YC_BUCKET is not set. Add it to .env or set `$env:YC_BUCKET."
}
if ([string]::IsNullOrEmpty($env:YC_S3_ENDPOINT)) {
    $env:YC_S3_ENDPOINT = 'https://storage.yandexcloud.net'
}
if ([string]::IsNullOrEmpty($env:AWS_ACCESS_KEY_ID)) {
    throw "AWS_ACCESS_KEY_ID is not set (Yandex static access key)."
}
if ([string]::IsNullOrEmpty($env:AWS_SECRET_ACCESS_KEY)) {
    throw "AWS_SECRET_ACCESS_KEY is not set (Yandex static secret key)."
}

Write-Host "==> Installing dependencies"
npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }

Write-Host "==> Building production bundle"
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

$DistDir = Join-Path $ProjectRoot 'dist'
if (-not (Test-Path $DistDir)) {
    throw "$DistDir not found. Build step failed."
}

Write-Host "==> Syncing immutable hashed assets (cache 1y) to s3://$($env:YC_BUCKET)/assets"
aws --endpoint-url="$env:YC_S3_ENDPOINT" s3 sync "$DistDir/assets" "s3://$env:YC_BUCKET/assets" `
    --delete `
    --cache-control "public, max-age=31536000, immutable"
if ($LASTEXITCODE -ne 0) { throw "aws s3 sync (assets) failed" }

Write-Host "==> Uploading immutable root assets (cache 1y)"
$immutableRootExtensions = @('.js', '.css', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico')
Get-ChildItem -Path $DistDir -File | Where-Object {
    $immutableRootExtensions -contains $_.Extension.ToLowerInvariant()
} | ForEach-Object {
    aws --endpoint-url="$env:YC_S3_ENDPOINT" s3 cp $_.FullName "s3://$env:YC_BUCKET/$($_.Name)" `
        --cache-control "public, max-age=31536000, immutable"
    if ($LASTEXITCODE -ne 0) { throw "aws s3 cp (immutable root asset $($_.Name)) failed" }
}

Write-Host "==> Uploading HTML and root files (no-cache)"
$DistRoot = (Resolve-Path $DistDir).Path.TrimEnd('\') + '\'
Get-ChildItem -Path $DistDir -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring($DistRoot.Length).Replace('\', '/')
    -not $relativePath.StartsWith('assets/') -and -not ($immutableRootExtensions -contains $_.Extension.ToLowerInvariant())
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($DistRoot.Length).Replace('\', '/')
    aws --endpoint-url="$env:YC_S3_ENDPOINT" s3 cp $_.FullName "s3://$env:YC_BUCKET/$relativePath" `
        --cache-control "public, max-age=0, must-revalidate"
    if ($LASTEXITCODE -ne 0) { throw "aws s3 cp (site file $relativePath) failed" }
}

Write-Host "==> Applying website configuration"
aws --endpoint-url="$env:YC_S3_ENDPOINT" s3api put-bucket-website `
    --bucket "$env:YC_BUCKET" `
    --website-configuration "file://$ScriptDir/yandex-cloud/website-config.json"
if ($LASTEXITCODE -ne 0) { throw "put-bucket-website failed" }

Write-Host "==> Applying CORS configuration"
aws --endpoint-url="$env:YC_S3_ENDPOINT" s3api put-bucket-cors `
    --bucket "$env:YC_BUCKET" `
    --cors-configuration "file://$ScriptDir/yandex-cloud/cors-config.json"
if ($LASTEXITCODE -ne 0) { throw "put-bucket-cors failed" }

$mediaBucket = $env:S3_BUCKET
if ([string]::IsNullOrEmpty($mediaBucket) -or $mediaBucket -eq 'potok-quiz-assets') {
    $mediaBucket = $env:YC_BUCKET
}

if (-not [string]::IsNullOrEmpty($mediaBucket)) {
    Write-Host "==> Applying media bucket CORS configuration"
    aws --endpoint-url="$env:YC_S3_ENDPOINT" s3api put-bucket-cors `
        --bucket "$mediaBucket" `
        --cors-configuration "file://$ScriptDir/yandex-cloud/assets-cors-config.json"
    if ($LASTEXITCODE -ne 0) { throw "put-bucket-cors for media bucket failed" }
}

if (-not [string]::IsNullOrEmpty($env:YC_CDN_RESOURCE_ID)) {
    $yc = Get-Command yc -ErrorAction SilentlyContinue
    if ($yc) {
        Write-Host "==> Purging Yandex CDN cache for resource $env:YC_CDN_RESOURCE_ID"
        yc cdn cache purge --resource-id "$env:YC_CDN_RESOURCE_ID" --path '/*'
    }
}

Write-Host "==> Notifying IndexNow about deployed SEO pages"
node scripts/submit-indexnow.mjs

Write-Host "==> Done. Site URL: https://$env:YC_BUCKET.website.yandexcloud.net"
