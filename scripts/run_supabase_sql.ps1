param(
  [string[]]$Files,
  [switch]$AllNewFeatureSql,
  [switch]$IncludeCoreAiSql,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")

function Import-DotEnv([string]$path) {
  if (!(Test-Path -LiteralPath $path)) { return }
  Get-Content -LiteralPath $path | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#") -or $line -notmatch "=") { return }
    $parts = $line -split "=", 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

Import-DotEnv (Join-Path $repo ".env.local")

$defaultFiles = @(
  "supabase/free_notes_migration.sql",
  "supabase/checkin_migration.sql",
  "supabase/blog_migration.sql",
  "supabase/forum_migration.sql",
  "supabase/comment_likes_migration.sql",
  "supabase/ai_unlimited_migration.sql",
  "supabase/interaction_analytics_migration.sql"
)

if ($IncludeCoreAiSql) {
  $defaultFiles = @("supabase/ai_migration.sql") + $defaultFiles
}

if ($AllNewFeatureSql -or -not $Files -or $Files.Count -eq 0) {
  $Files = $defaultFiles
}

function Resolve-RepoFile([string]$file) {
  $path = Join-Path $repo $file
  if (!(Test-Path -LiteralPath $path)) {
    throw "SQL file not found: $file"
  }
  return (Resolve-Path -LiteralPath $path).Path
}

function Split-SqlStatements([string]$sql) {
  $statements = New-Object System.Collections.Generic.List[string]
  $buffer = New-Object System.Text.StringBuilder
  $inSingle = $false
  $inDouble = $false
  $dollarTag = $null
  $i = 0

  while ($i -lt $sql.Length) {
    if ($dollarTag) {
      if ($sql.Substring($i).StartsWith($dollarTag)) {
        [void]$buffer.Append($dollarTag)
        $i += $dollarTag.Length
        $dollarTag = $null
        continue
      }
      [void]$buffer.Append($sql[$i])
      $i++
      continue
    }

    $ch = $sql[$i]

    if (!$inSingle -and !$inDouble -and $ch -eq '$') {
      $rest = $sql.Substring($i)
      $match = [regex]::Match($rest, '^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$')
      if ($match.Success) {
        $dollarTag = $match.Value
        [void]$buffer.Append($dollarTag)
        $i += $dollarTag.Length
        continue
      }
    }

    if (!$inDouble -and $ch -eq "'") {
      [void]$buffer.Append($ch)
      if ($inSingle -and $i + 1 -lt $sql.Length -and $sql[$i + 1] -eq "'") {
        [void]$buffer.Append($sql[$i + 1])
        $i += 2
        continue
      }
      $inSingle = !$inSingle
      $i++
      continue
    }

    if (!$inSingle -and $ch -eq '"') {
      [void]$buffer.Append($ch)
      $inDouble = !$inDouble
      $i++
      continue
    }

    if (!$inSingle -and !$inDouble -and $ch -eq ';') {
      $statement = $buffer.ToString().Trim()
      if ($statement) {
        $statements.Add($statement)
      }
      [void]$buffer.Clear()
      $i++
      continue
    }

    [void]$buffer.Append($ch)
    $i++
  }

  $tail = $buffer.ToString().Trim()
  if ($tail) {
    $statements.Add($tail)
  }

  return $statements
}

function Get-SupabaseCli {
  $localBin = Join-Path $repo "node_modules/.bin/supabase.cmd"
  if (Test-Path -LiteralPath $localBin) { return $localBin }

  $localBinPs1 = Join-Path $repo "node_modules/.bin/supabase.ps1"
  if (Test-Path -LiteralPath $localBinPs1) { return $localBinPs1 }

  $local = Join-Path $repo ".tools/supabase/supabase.exe"
  if (Test-Path -LiteralPath $local) { return $local }

  $localGo = Join-Path $repo ".tools/supabase/supabase-go.exe"
  if (Test-Path -LiteralPath $localGo) { return $localGo }

  $cmd = Get-Command supabase -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
$supabase = Get-SupabaseCli

function Get-SessionDbUrl {
  if (!$env:SUPABASE_DB_URL) { return $null }
  return ($env:SUPABASE_DB_URL -replace ':6543/', ':5432/')
}

Write-Host "SQL execution plan:" -ForegroundColor Cyan
foreach ($file in $Files) {
  Write-Host " - $file"
}

if ($DryRun) {
  Write-Host "Dry run only. No SQL executed." -ForegroundColor Yellow
  exit 0
}

if ($psql) {
  $dbUrl = Get-SessionDbUrl
  if (!$dbUrl) {
    throw "SUPABASE_DB_URL is required when using psql. Example: `$env:SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-...pooler.supabase.com:6543/postgres'"
  }

  foreach ($file in $Files) {
    $full = Resolve-RepoFile $file
    Write-Host "Applying $file with psql..." -ForegroundColor Cyan
    & $psql.Source $dbUrl -v ON_ERROR_STOP=1 -f $full
  }
  Write-Host "Done." -ForegroundColor Green
  exit 0
}

if ($supabase) {
  $dbUrl = Get-SessionDbUrl
  if (!$dbUrl) {
    throw "SUPABASE_DB_URL is required when using Supabase CLI db query without a linked project."
  }

  foreach ($file in $Files) {
    $full = Resolve-RepoFile $file
    Write-Host "Applying $file with Supabase CLI..." -ForegroundColor Cyan
    $sql = Get-Content -Raw -LiteralPath $full
    $sql = $sql.TrimStart([char]0xFEFF)
    $statements = Split-SqlStatements $sql
    $index = 0
    foreach ($statement in $statements) {
      $index++
      $tmp = [System.IO.Path]::GetTempFileName()
      try {
        [System.IO.File]::WriteAllText($tmp, ($statement + ";"), [System.Text.UTF8Encoding]::new($false))
        & $supabase db query --db-url $dbUrl --file $tmp
        if ($LASTEXITCODE -ne 0) {
          throw "Failed to apply $file statement $index/$($statements.Count)"
        }
      } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Write-Host "Done." -ForegroundColor Green
  exit 0
}

throw "No SQL runner found. Install PostgreSQL psql or Supabase CLI, then rerun this script."
