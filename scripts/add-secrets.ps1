#Requires -Version 5.1
<#
.SYNOPSIS
    Добавление GitHub Actions secrets через REST API.
    Требуется токен с scope: repo
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$Token,
  [string]$Owner = "resarytrew",
  [string]$Repo = "quize"
)

$Headers = @{
  "Authorization" = "Bearer $Token"
  "Accept"        = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
}

# Получить public key
Write-Host "Fetching public key..." -ForegroundColor Cyan
try {
  $KeyResp = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/actions/secrets/public-key" -Headers $Headers
  $PublicKey = $KeyResp.key
  $KeyId = $KeyResp.key_id
  Write-Host "Public key obtained (key_id: $KeyId)" -ForegroundColor Green
} catch {
  Write-Host "ERROR: Cannot fetch public key. Token needs 'repo' scope." -ForegroundColor Red
  Write-Host "Create new token: https://github.com/settings/tokens/new?scopes=repo" -ForegroundColor Yellow
  exit 1
}

function Add-Secret {
  param([string]$Name, [string]$Value)
  
  # Зашифровать значение钠
  $Encrypted = [System.Convert]::FromBase64String($PublicKey)
  # Для GitHub API нужно зашифровать через sealed_box
  # Используем gh CLI作为 fallback
  
  try {
    $null = &"C:\Program Files\GitHub CLI\gh.exe" secret set $Name --body $Value -R "$Owner/$Repo" 2>&1
    Write-Host "  OK: $Name" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "  FAIL: $Name" -ForegroundColor Red
    return $false
  }
}

# Или используем прямой API вызов сodium sealed box
# Но проще всего - попробовать через gh CLI с правильным токеном

Write-Host "`nAttempting to add secrets via gh CLI..." -ForegroundColor Cyan

$env:GH_TOKEN = $Token

$secrets = @{
  "VITE_SUPABASE_URL" = "https://lntsyybfbunajmzbahrq.supabase.co"
  "VITE_SUPABASE_ANON_KEY" = "replace-with-supabase-anon-key"
  "VITE_API_URL" = "https://replace-with-api-gateway-id.apigw.yandexcloud.net/api"
  "YC_S3_ACCESS_KEY_ID" = "replace-with-yc-s3-access-key-id"
  "YC_S3_SECRET_ACCESS_KEY" = "replace-with-yc-s3-secret-access-key"
  "YC_BUCKET" = "quizflow22-prod"
  "YC_CDN_RESOURCE_ID" = "replace-with-yc-cdn-resource-id"
}

foreach ($kv in $secrets.GetEnumerator()) {
  $result = &"C:\Program Files\GitHub CLI\gh.exe" secret set $kv.Key --body $kv.Value -R "$Owner/$Repo" 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: $($kv.Key)" -ForegroundColor Green
  } else {
    Write-Host "  FAIL: $($kv.Key) - $result" -ForegroundColor Red
  }
}

Write-Host "`nDone!" -ForegroundColor Green
