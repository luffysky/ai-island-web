param(
  [string]$CommitMessage,
  [string]$Remote = "origin",
  [string]$Branch,
  [switch]$NoCommit,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repo

if (!$Branch) {
  $Branch = (& git branch --show-current).Trim()
  if (!$Branch) { throw "Cannot detect current branch. Pass -Branch explicitly." }
}

Write-Host "Current git status:" -ForegroundColor Cyan
& git status --short

if ($DryRun) {
  Write-Host "Dry run only. No git commands executed." -ForegroundColor Yellow
  exit 0
}

if (!$NoCommit) {
  if (!$CommitMessage) {
    throw "CommitMessage is required unless -NoCommit is used."
  }

  & git add -A -- . ':!ai_island_v3.zip' ':!.codex_zip_extract_20260522' ':!.env.local' ':!node_modules'

  $staged = (& git diff --cached --name-only)
  if (!$staged) {
    Write-Host "No staged changes to commit." -ForegroundColor Yellow
  } else {
    & git commit -m $CommitMessage
  }
}

Write-Host "Pushing HEAD to $Remote/$Branch..." -ForegroundColor Cyan
& git push $Remote "HEAD:$Branch"
Write-Host "Push complete." -ForegroundColor Green
