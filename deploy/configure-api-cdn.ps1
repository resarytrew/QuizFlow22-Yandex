param([string]$Yc = 'yc', [string]$ResourceId = 'bc8r2olqmnowvit3z62w')
$ErrorActionPreference = 'Stop'
$gateway = (& $Yc serverless api-gateway get --name potok-api --format json | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or !$gateway.domain) { throw 'API gateway not found' }
$groups = & $Yc cdn origin-group list --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot list CDN origins' }
$group = $groups | Where-Object name -eq 'potok-api-same-origin'
if (!$group) {
  $group = & $Yc cdn origin-group create --name potok-api-same-origin --origin "source=$($gateway.domain),enabled=true" --format json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create API origin group' }
}
$token = & $Yc iam create-token
if ($LASTEXITCODE -ne 0) { throw 'Cannot authenticate CDN configuration' }
$headers = @{ Authorization = "Bearer $token" }
$rules = Invoke-RestMethod -Uri "https://cdn.api.cloud.yandex.net/cdn/v1/rules?resourceId=$ResourceId" -Headers $headers
$rule = $rules.rules | Where-Object name -eq 'same-origin-api'
$body = @{
  resourceId = $ResourceId; name = 'same-origin-api'; rulePattern = '^/api(?:/.*)?$'; weight = '1'
  originsGroupId = "$($group.id)"; originProtocol = 'HTTPS'
  options = @{
    disableCache = @{ enabled = $true; value = $true }
    allowedHttpMethods = @{ enabled = $true; value = @('GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS') }
    ignoreCookie = @{ enabled = $true; value = $false }
    headerFilter = @{ enabled = $false; headers = @() }
    hostOptions = @{ host = @{ enabled = $true; value = $gateway.domain } }
  }
} | ConvertTo-Json -Depth 8
$method = if ($rule) { 'Patch' } else { 'Post' }
$url = if ($rule) { "https://cdn.api.cloud.yandex.net/cdn/v1/rules/$($rule.id)" } else { 'https://cdn.api.cloud.yandex.net/cdn/v1/rules' }
$result = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $body
if ($result.error) { throw 'CDN rule update failed' }
Write-Output "CDN operation: $($result.id)"
Write-Output 'After propagation, GET https://mykviz.ru/api/auth/me must return 401 with Cache-Control: no-store.'
