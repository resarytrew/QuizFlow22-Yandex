# Deploy the isolated read-only renderer; never replace the application API.
param([string]$Yc = 'yc', [string]$SourceFunction = 'potok-api-quizzes')
$ErrorActionPreference = 'Stop'
function Invoke-YcJson([string[]]$Arguments) {
  $result = & $Yc @Arguments --format json
  if ($LASTEXITCODE -ne 0) { throw "Yandex CLI failed: $($Arguments[0..2] -join ' ')" }
  return ($result | ConvertFrom-Json)
}
$versions = Invoke-YcJson @('serverless','function','version','list','--function-name',$SourceFunction,'--limit','1')
$source = Invoke-YcJson @('serverless','function','version','get',$versions[0].id)
$functions = Invoke-YcJson @('serverless','function','list')
$function = $functions | Where-Object name -eq 'potok-public-quiz-seo'
if (!$function) { $function = Invoke-YcJson @('serverless','function','create','--name','potok-public-quiz-seo') }
$bundle = Join-Path $PSScriptRoot '../yc-functions/dist/public-quiz-seo/index.js'
if (!(Test-Path -LiteralPath $bundle)) { throw 'Run npm --prefix yc-functions run build:seo first' }
$zip = Join-Path $PSScriptRoot '../yc-functions/dist/public-quiz-seo.zip'
Compress-Archive -LiteralPath $bundle -DestinationPath $zip -Force
$versionArgs = @('serverless','function','version','create','--function-id',$function.id,'--runtime','nodejs22','--entrypoint','index.handler','--memory','256m','--execution-timeout','20s','--service-account-id',$source.service_account_id,'--source-path',$zip)
foreach ($binding in $source.secrets | Where-Object environment_variable -like 'PG_*') {
  $versionArgs += @('--secret', "environment-variable=$($binding.environment_variable),id=$($binding.id),version-id=$($binding.version_id),key=$($binding.key)")
}
if ($source.connectivity.network_id) { $versionArgs += @('--network-id', $source.connectivity.network_id) }
$version = Invoke-YcJson $versionArgs
$specPath = Join-Path $PSScriptRoot '../yc-functions/dist/public-seo-gateway.yaml'
$spec = @"
openapi: 3.0.0
info:
  title: Potok public quiz pages
  version: 1.0.0
paths:
  /quizzes:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: cloud-functions
        payload_format_version: '1.0'
        function_id: $($function.id)
        service_account_id: $($source.service_account_id)
  /quizzes/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: cloud-functions
        payload_format_version: '1.0'
        function_id: $($function.id)
        service_account_id: $($source.service_account_id)
  /quizzes/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - in: path
          name: path
          schema:
            type: string
          required: true
      x-yc-apigateway-integration:
        type: cloud-functions
        payload_format_version: '1.0'
        function_id: $($function.id)
        service_account_id: $($source.service_account_id)
"@
[IO.File]::WriteAllText($specPath, $spec)
$gateways = Invoke-YcJson @('serverless','api-gateway','list')
$gateway = $gateways | Where-Object name -eq 'potok-public-quiz-seo'
$action = if ($gateway) { 'update' } else { 'create' }
$gateway = Invoke-YcJson @('serverless','api-gateway',$action,'--name','potok-public-quiz-seo','--spec',$specPath)
Write-Output "Renderer version: $($version.id)"
Write-Output "Gateway: https://$($gateway.domain)/quizzes/"
