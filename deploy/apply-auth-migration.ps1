param(
  [string]$Yc = 'yc',
  [string]$FunctionName = 'potok-auth-migration',
  [string]$SourceFunctionName = 'potok-api-quizzes'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$functionRoot = Join-Path $repoRoot 'yc-functions'

Push-Location $functionRoot
try {
  npm run build:migrate-auth
  if ($LASTEXITCODE -ne 0) { throw 'Auth migration build failed' }
} finally { Pop-Location }

$sourceFunction = & $Yc serverless function get --name $SourceFunctionName --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Source API function was not found' }
$versions = & $Yc serverless function version list --function-id $sourceFunction.id --format json | ConvertFrom-Json
$latest = $versions | Sort-Object created_at -Descending | Select-Object -First 1
if (!$latest.service_account_id) { throw 'Source function has no service account' }

$secretArgs = @()
foreach ($secret in $latest.secrets) {
  if ($secret.environment_variable -in @('PG_HOST','PG_PORT','PG_DATABASE','PG_USER','PG_PASSWORD','PG_CA_CERT')) {
    $secretArgs += '--secret'
    $secretArgs += "environment-variable=$($secret.environment_variable),id=$($secret.id),version-id=$($secret.version_id),key=$($secret.key)"
  }
}
if (($secretArgs.Count / 2) -lt 5) { throw 'Not all PostgreSQL Lockbox bindings were found on the source function' }

$existing = & $Yc serverless function list --format json | ConvertFrom-Json | Where-Object name -eq $FunctionName
if (!$existing) { & $Yc serverless function create --name $FunctionName --description 'One-off QuizFlow auth schema migration' | Out-Null }

$dist = Join-Path $functionRoot 'dist\migrate-auth-schema'
$zip = Join-Path $functionRoot 'dist\migrate-auth-schema.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($dist, $zip)

$args = @('serverless','function','version','create','--function-name', $FunctionName,
  '--runtime','nodejs22','--entrypoint','index.handler','--memory','256m','--execution-timeout','120s',
  '--service-account-id', $latest.service_account_id,'--source-path', $zip) + $secretArgs
& $Yc @args | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Auth migration deployment failed' }

$result = & $Yc serverless function invoke $FunctionName --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $result.statusCode -ne 200) { throw 'Auth migration invocation failed' }
$payload = $result.body | ConvertFrom-Json
if (!$payload.ok) { throw 'Auth migration did not report success' }
Write-Output ($payload | ConvertTo-Json -Depth 6)
