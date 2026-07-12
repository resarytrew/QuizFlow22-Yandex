#Requires -Version 5.1
<#
.SYNOPSIS
    Добавление всех необходимых secrets в GitHub Actions для QuizeFlow22.

.DESCRIPTION
    Этот скрипт добавляет secrets в репозиторий QuizeFlow22 через GitHub API.
    Требуется GitHub Personal Access Token с правами repo.

.PARAMETER GitHubToken
    GitHub Personal Access Token (ghp_xxx или github_pat_xxx).

.PARAMETER RepoOwner
    Владелец репозитория (по умолчанию: Resarytrew).

.PARAMETER RepoName
    Имя репозитория (по умолчанию: QuizeFlow22).

.EXAMPLE
    .\setup-github-secrets.ps1 -GitHubToken "ghp_xxxxxxxxxxxx"
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$GitHubToken,

  [Parameter(Mandatory=$false)]
  [string]$RepoOwner = "Resarytrew",

  [Parameter(Mandatory=$false)]
  [string]$RepoName = "QuizeFlow22"
)

$ErrorActionPreference = "Stop"
$Headers = @{
  "Authorization" = "token $GitHubToken"
  "Accept"        = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$BaseUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/actions/secrets"

Write-Host "=== Adding GitHub Actions secrets ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoOwner/$RepoName" -ForegroundColor Gray

function Set-GitHubSecret {
  param(
    [string]$Name,
    [string]$Value
  )

  $Body = @{
    name  = $Name
    value = $Value
  } | ConvertTo-Json

  try {
    $Response = Invoke-RestMethod -Uri $BaseUrl -Method Post -Headers $Headers -Body $Body -ContentType "application/json"
    Write-Host "  OK: $Name" -ForegroundColor Green
    return $true
  } catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 422) {
      # Secret already exists — update it
      $Body = @{
        name  = $Name
        value = $Value
      } | ConvertTo-Json
      try {
        $Response = Invoke-RestMethod -Uri "$BaseUrl/$Name" -Method Put -Headers $Headers -Body $Body -ContentType "application/json"
        Write-Host "  UPDATED: $Name" -ForegroundColor Yellow
        return $true
      } catch {
        Write-Host "  FAILED to update: $Name - $($_.Exception.Message)" -ForegroundColor Red
        return $false
      }
    } else {
      Write-Host "  FAILED: $Name - $($_.Exception.Message)" -ForegroundColor Red
      return $false
    }
  }
}

# ─────────────────────────────────────────────────────────────
# Yandex Cloud secrets (требуются для деплоя Cloud Functions)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[Yandex Cloud]" -ForegroundColor Cyan
Write-Host "Введите значения (или нажмите Enter чтобы пропустить):" -ForegroundColor Gray

$ycToken = Read-Host "  YC_OAUTH_TOKEN (OAuth токен Яндекса)"
if ($ycToken) { Set-GitHubSecret -Name "YC_OAUTH_TOKEN" -Value $ycToken }

$ycCloudId = Read-Host "  YC_CLOUD_ID (ID облака Yandex Cloud)"
if ($ycCloudId) { Set-GitHubSecret -Name "YC_CLOUD_ID" -Value $ycCloudId }

$ycFolderId = Read-Host "  YC_FOLDER_ID (ID каталога)"
if ($ycFolderId) { Set-GitHubSecret -Name "YC_FOLDER_ID" -Value $ycFolderId }

# ─────────────────────────────────────────────────────────────
# S3 / CDN secrets (уже могут быть настроены)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[S3 / CDN]" -ForegroundColor Cyan

$s3KeyId = Read-Host "  YC_S3_ACCESS_KEY_ID (S3 Access Key)"
if ($s3KeyId) { Set-GitHubSecret -Name "YC_S3_ACCESS_KEY_ID" -Value $s3KeyId }

$s3SecretKey = Read-Host "  YC_S3_SECRET_ACCESS_KEY (S3 Secret Key)"
if ($s3SecretKey) { Set-GitHubSecret -Name "YC_S3_SECRET_ACCESS_KEY" -Value $s3SecretKey }

$bucket = Read-Host "  YC_BUCKET (имя бакета, напр. quizflow22-prod)"
if ($bucket) { Set-GitHubSecret -Name "YC_BUCKET" -Value $bucket }

$cdnId = Read-Host "  YC_CDN_RESOURCE_ID (ID CDN ресурса)"
if ($cdnId) { Set-GitHubSecret -Name "YC_CDN_RESOURCE_ID" -Value $cdnId }

# ─────────────────────────────────────────────────────────────
# Frontend build secrets
# ─────────────────────────────────────────────────────────────
Write-Host "`n[Frontend Build]" -ForegroundColor Cyan

$supabaseUrl = Read-Host "  VITE_SUPABASE_URL (https://xxx.supabase.co)"
if ($supabaseUrl) { Set-GitHubSecret -Name "VITE_SUPABASE_URL" -Value $supabaseUrl }

$supabaseKey = Read-Host "  VITE_SUPABASE_ANON_KEY (supabase anon key)"
if ($supabaseKey) { Set-GitHubSecret -Name "VITE_SUPABASE_ANON_KEY" -Value $supabaseKey }

$apiUrl = Read-Host "  VITE_API_URL (Yandex API Gateway URL, https://xxx.apigw.yandexcloud.net/api)"
if ($apiUrl) { Set-GitHubSecret -Name "VITE_API_URL" -Value $apiUrl }

# ─────────────────────────────────────────────────────────────
# Supabase DB (для миграции данных)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[Supabase DB (для миграции)]" -ForegroundColor Cyan

$supabaseDbHost = Read-Host "  SUPABASE_DB_HOST (db.xxx.supabase.co)"
if ($supabaseDbHost) { Set-GitHubSecret -Name "SUPABASE_DB_HOST" -Value $supabaseDbHost }

$supabaseDbPass = Read-Host "  SUPABASE_DB_PASSWORD"
if ($supabaseDbPass) { Set-GitHubSecret -Name "SUPABASE_DB_PASSWORD" -Value $supabaseDbPass }

# ─────────────────────────────────────────────────────────────
# Yandex Cloud DB (для Cloud Functions)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[Yandex Cloud DB]" -ForegroundColor Cyan

$pgHost = Read-Host "  PG_HOST (host.xxx.mdb.yandexcloud.net)"
if ($pgHost) { Set-GitHubSecret -Name "PG_HOST" -Value $pgHost }

$pgPort = Read-Host "  PG_PORT (6432)"
if ($pgPort) { Set-GitHubSecret -Name "PG_PORT" -Value $pgPort }

$pgDatabase = Read-Host "  PG_DATABASE (quizflow)"
if ($pgDatabase) { Set-GitHubSecret -Name "PG_DATABASE" -Value $pgDatabase }

$pgUser = Read-Host "  PG_USER (quizflow_app)"
if ($pgUser) { Set-GitHubSecret -Name "PG_USER" -Value $pgUser }

$pgPassword = Read-Host "  PG_PASSWORD"
if ($pgPassword) { Set-GitHubSecret -Name "PG_PASSWORD" -Value $pgPassword }

$pgCaCert = Read-Host "  PG_CA_CERT (путь к CA.pem или содержимое сертификата)"
if ($pgCaCert) {
  if (Test-Path $pgCaCert) {
    $pgCaCert = Get-Content $pgCaCert -Raw
  }
  Set-GitHubSecret -Name "PG_CA_CERT" -Value $pgCaCert
}

# ─────────────────────────────────────────────────────────────
# YooKassa (платежи)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[YooKassa]" -ForegroundColor Cyan

$yooShopId = Read-Host "  YOOKASSA_SHOP_ID"
if ($yooShopId) { Set-GitHubSecret -Name "YOOKASSA_SHOP_ID" -Value $yooShopId }

$yooSecretKey = Read-Host "  YOOKASSA_SECRET_KEY"
if ($yooSecretKey) { Set-GitHubSecret -Name "YOOKASSA_SECRET_KEY" -Value $yooSecretKey }

$webhookSecret = Read-Host "  BILLING_WEBHOOK_SECRET (секрет для верификации вебхуков)"
if ($webhookSecret) { Set-GitHubSecret -Name "BILLING_WEBHOOK_SECRET" -Value $webhookSecret }

$adminSecret = Read-Host "  BILLING_ADMIN_SECRET (секрет для admin grant-pro)"
if ($adminSecret) { Set-GitHubSecret -Name "BILLING_ADMIN_SECRET" -Value $adminSecret }

# ─────────────────────────────────────────────────────────────
# Frontend URLs
# ─────────────────────────────────────────────────────────────
Write-Host "`n[Frontend URLs]" -ForegroundColor Cyan

$frontendUrl = Read-Host "  FRONTEND_URL (https://mykviz.ru)"
if ($frontendUrl) { Set-GitHubSecret -Name "FRONTEND_URL" -Value $frontendUrl }

$allowedOrigins = Read-Host "  ALLOWED_ORIGINS (https://mykviz.ru,http://localhost:5173)"
if ($allowedOrigins) { Set-GitHubSecret -Name "ALLOWED_ORIGINS" -Value $allowedOrigins }

# ─────────────────────────────────────────────────────────────
# AI (YandexGPT)
# ─────────────────────────────────────────────────────────────
Write-Host "`n[AI]" -ForegroundColor Cyan

$catalogId = Read-Host "  YC_CATALOG_ID (ID каталога для YandexGPT)"
if ($catalogId) { Set-GitHubSecret -Name "YC_CATALOG_ID" -Value $catalogId }

# ─────────────────────────────────────────────────────────────
# Object Storage bucket for quiz assets
# ─────────────────────────────────────────────────────────────
Write-Host "`n[S3 Bucket for Assets]" -ForegroundColor Cyan

$s3Bucket = Read-Host "  S3_BUCKET (quizflow22-prod)"
if ($s3Bucket) { Set-GitHubSecret -Name "S3_BUCKET" -Value $s3Bucket }

$mediaPublicBase = Read-Host "  YANDEX_MEDIA_PUBLIC_BASE (optional, e.g. https://storage.yandexcloud.net/quizflow22-prod)"
if ($mediaPublicBase) { Set-GitHubSecret -Name "YANDEX_MEDIA_PUBLIC_BASE" -Value $mediaPublicBase }

# ─────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────
Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Проверить: https://github.com/$RepoOwner/$RepoName/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "`nДля деплоя Cloud Functions:" -ForegroundColor Yellow
Write-Host "  1. GitHub → Actions → Deploy to Yandex Cloud → Run workflow" -ForegroundColor White
Write-Host "  2. Отметить 'Deploy Cloud Functions: true'" -ForegroundColor White
Write-Host "  3. Run workflow" -ForegroundColor White
