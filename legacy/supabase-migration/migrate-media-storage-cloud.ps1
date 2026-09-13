param([string]$Yc = 'yc', [string]$FunctionName = 'potok-media-migration', [string]$SourceFunctionName = 'potok-api-quizzes')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$functionRoot = Join-Path $repoRoot 'yc-functions'
Push-Location $functionRoot
try { npm run build:migrate-media; if ($LASTEXITCODE -ne 0) { throw 'Media migration build failed' } } finally { Pop-Location }
$source = & $Yc serverless function get --name $SourceFunctionName --format json | ConvertFrom-Json
$latest = & $Yc serverless function version list --function-id $source.id --format json | ConvertFrom-Json | Sort-Object created_at -Descending | Select-Object -First 1
$required = @('PG_HOST','PG_PORT','PG_DATABASE','PG_USER','PG_PASSWORD','PG_CA_CERT','SUPABASE_URL','SUPABASE_ANON_KEY','YC_ACCESS_KEY_ID','YC_SECRET_ACCESS_KEY','S3_BUCKET','YANDEX_MEDIA_PUBLIC_BASE')
$secretArgs = @()
foreach ($secret in $latest.secrets) {
  if ($secret.environment_variable -in $required) { $secretArgs += '--secret'; $secretArgs += "environment-variable=$($secret.environment_variable),id=$($secret.id),version-id=$($secret.version_id),key=$($secret.key)" }
}
foreach ($key in @('PG_HOST','PG_DATABASE','PG_USER','PG_PASSWORD','SUPABASE_URL','YC_ACCESS_KEY_ID','YC_SECRET_ACCESS_KEY','S3_BUCKET')) {
  if ($latest.secrets.key -notcontains $key) { throw "Missing required migration binding: $key" }
}
if (!(& $Yc serverless function list --format json | ConvertFrom-Json | Where-Object name -eq $FunctionName)) { & $Yc serverless function create --name $FunctionName --description 'Temporary legacy media migration' | Out-Null }
$dist = Join-Path $functionRoot 'dist\migrate-media-storage'; $zip = Join-Path $functionRoot 'dist\migrate-media-storage.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($dist, $zip)
$args = @('serverless','function','version','create','--function-name',$FunctionName,'--runtime','nodejs22','--entrypoint','index.handler','--memory','512m','--execution-timeout','600s','--service-account-id',$latest.service_account_id,'--source-path',$zip) + $secretArgs
& $Yc @args | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'Media migration deployment failed' }
for ($attempt = 1; $attempt -le 30; $attempt++) {
  $result = & $Yc serverless function invoke $FunctionName --format json | ConvertFrom-Json
  $payload = $result.body | ConvertFrom-Json
  Write-Output ($payload | ConvertTo-Json -Depth 6 -Compress)
  if ($payload.failed.Count -gt 0) { throw 'At least one legacy media object could not be copied' }
  if ($payload.remaining -eq 0) { break }
  if ($payload.processed -eq 0) { throw 'Media migration made no progress' }
}
if ($payload.remaining -ne 0) { throw "Media migration stopped with $($payload.remaining) records remaining" }
Write-Output 'Legacy storage references migrated. The temporary function may now be removed.'
