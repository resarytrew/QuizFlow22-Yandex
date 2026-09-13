param([string]$Yc = 'yc', [string]$ResourceId = 'bc8r2olqmnowvit3z62w')
$ErrorActionPreference = 'Stop'
$gateway = (& $Yc serverless api-gateway get --name potok-public-quiz-seo --format json | ConvertFrom-Json)
if ($LASTEXITCODE -ne 0 -or !$gateway.domain) { throw 'SEO gateway not found' }
# Check the origin before routing public traffic to it.
$check = Invoke-WebRequest -Uri "https://$($gateway.domain)/quizzes/sitemap.xml"
if ($check.StatusCode -ne 200 -or $check.Content -notmatch '<sitemapindex') { throw 'SEO origin check failed' }
$groups = & $Yc cdn origin-group list --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot list CDN origins' }
$group = $groups | Where-Object name -eq 'potok-public-quiz-seo'
if (!$group) {
  $group = & $Yc cdn origin-group create --name potok-public-quiz-seo --origin "source=$($gateway.domain),enabled=true" --format json | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create SEO origin group' }
}
$token = & $Yc iam create-token
if ($LASTEXITCODE -ne 0) { throw 'Cannot authenticate CDN configuration' }
$headers = @{ Authorization = "Bearer $token" }
$rules = Invoke-RestMethod -Uri "https://cdn.api.cloud.yandex.net/cdn/v1/rules?resourceId=$ResourceId" -Headers $headers
$rule = $rules.rules | Where-Object name -eq 'public-quiz-seo'
$body = @{
  resourceId = $ResourceId; name = 'public-quiz-seo'; rulePattern = '^/quizzes(?:/.*)?$'; weight = '5'
  originsGroupId = "$($group.id)"; originProtocol = 'HTTPS'
  options = @{
    disableCache = @{ enabled = $true; value = $true }
    rewrite = @{ enabled = $false }
    hostOptions = @{ host = @{ enabled = $true; value = $gateway.domain } }
  }
} | ConvertTo-Json -Depth 8
$method = if ($rule) { 'Patch' } else { 'Post' }
$url = if ($rule) { "https://cdn.api.cloud.yandex.net/cdn/v1/rules/$($rule.id)" } else { 'https://cdn.api.cloud.yandex.net/cdn/v1/rules' }
$result = Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $body
if ($result.error) { throw 'CDN rule update failed' }
Write-Output "CDN operation: $($result.id)"
Write-Output 'Verify /quizzes/index.html and /quizzes/sitemap.xml after CDN propagation. Cache must stay disabled.'
