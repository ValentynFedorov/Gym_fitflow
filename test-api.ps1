<#
.SYNOPSIS
    Smoke-test every FitFlow OS REST endpoint and print a pass/fail table.

.DESCRIPTION
    Logs in as admin / trainer / client (seeded accounts), exercises every
    route in apps/api/src and asserts on HTTP status + minimal shape.
    Writes a markdown report to test-api-report.md.

.EXAMPLE
    ./test-api.ps1
    ./test-api.ps1 -Verbose
#>

[CmdletBinding()]
param(
    [string] $BaseUrl = 'http://localhost:3001/api/v1'
)

$ErrorActionPreference = 'Continue'
$report = @()
$tokens = @{}

# ----------------------------------------------------------------- helpers
function Invoke-Api {
    param(
        [string] $Method,
        [string] $Path,
        [string] $Token = $null,
        $Body = $null
    )
    $h = @{ 'content-type' = 'application/json' }
    if ($Token) { $h['authorization'] = "Bearer $Token" }
    $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $h; UseBasicParsing = $true; TimeoutSec = 15 }
    if ($Body -ne $null) { $params['Body'] = ($Body | ConvertTo-Json -Depth 10) }
    try {
        $res = Invoke-WebRequest @params -ErrorAction Stop
        return @{ ok = $true; status = [int]$res.StatusCode; body = $res.Content }
    } catch {
        $status = $null
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        $msg = $_.Exception.Message
        return @{ ok = $false; status = $status; body = $msg }
    }
}

function Test-Endpoint {
    param(
        [string] $Name,
        [string] $Method,
        [string] $Path,
        [string] $Token = $null,
        $Body = $null,
        [int[]] $ExpectStatus = @(200, 201, 204),
        [scriptblock] $Assert = $null
    )
    $r = Invoke-Api -Method $Method -Path $Path -Token $Token -Body $Body
    $passStatus = $ExpectStatus -contains $r.status
    $assertMsg  = $null
    if ($passStatus -and $Assert) {
        try {
            $obj = $null
            if ($r.body) { try { $obj = $r.body | ConvertFrom-Json -ErrorAction Stop } catch {} }
            & $Assert $obj
        } catch {
            $passStatus = $false
            $assertMsg  = $_.Exception.Message
        }
    }
    $detail = ''
    if (-not $passStatus) {
        if ($assertMsg) {
            $detail = $assertMsg
        } else {
            $b = if ($r.body) { [string]$r.body } else { '' }
            if ($b.Length -gt 160) { $detail = $b.Substring(0, 160) } else { $detail = $b }
        }
    }
    $script:report += [pscustomobject]@{
        Name   = $Name
        Method = $Method
        Path   = $Path
        Status = $r.status
        Pass   = $passStatus
        Detail = $detail
    }
    $color = if ($passStatus) { 'Green' } else { 'Red' }
    $tag   = if ($passStatus) { 'PASS' } else { 'FAIL' }
    Write-Host ("  [{0}] {1,-6} {2,-50} -> {3}" -f $tag, $Method, $Path, $r.status) -ForegroundColor $color
    return $r
}

function Login {
    param([string] $Email, [string] $Password, [string] $Tag)
    $r = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $Email; password = $Password }
    if (-not $r.ok) {
        Write-Host "  [FAIL] login $Tag -> $($r.status) $($r.body)" -ForegroundColor Red
        return $null
    }
    $obj = $r.body | ConvertFrom-Json
    $tokens[$Tag] = @{ token = $obj.accessToken; userId = $obj.user.id; role = $obj.user.role }
    Write-Host "  [OK]   logged in as $Tag -> userId=$($obj.user.id), role=$($obj.user.role)" -ForegroundColor Green
    return $obj
}

# ----------------------------------------------------------------- run
Write-Host "FitFlow OS — endpoint smoke-test against $BaseUrl" -ForegroundColor Cyan

Write-Host "`n[1] Auth" -ForegroundColor Cyan
Login -Email 'admin@fitflow.local'   -Password 'admin123'   -Tag 'admin'
Login -Email 'trainer@fitflow.local' -Password 'trainer123' -Tag 'trainer'
Login -Email 'client@fitflow.local'  -Password 'client123'  -Tag 'client'

$admin   = $tokens['admin']
$trainer = $tokens['trainer']
$client  = $tokens['client']

if (-not $admin -or -not $trainer -or -not $client) {
    Write-Host "Login failed — aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[2] Public / Mock" -ForegroundColor Cyan
Test-Endpoint -Name 'mock/my-pass'      -Method GET -Path '/mock/my-pass'
Test-Endpoint -Name 'zones list'        -Method GET -Path '/zones'
Test-Endpoint -Name 'zones occupancy'   -Method GET -Path '/zones/occupancy'
Test-Endpoint -Name 'achievements list' -Method GET -Path '/gamification/achievements'

Write-Host "`n[3] Dashboard (admin)" -ForegroundColor Cyan
Test-Endpoint -Name 'stats'          -Method GET -Path '/dashboard/stats'        -Token $admin.token -Assert { param($o) if ($o.totalVisits -eq $null) { throw 'no totalVisits' } }
Test-Endpoint -Name 'overview'       -Method GET -Path '/dashboard/overview'     -Token $admin.token
Test-Endpoint -Name 'recent-visits'  -Method GET -Path '/dashboard/recent-visits?limit=5' -Token $admin.token
Test-Endpoint -Name 'top-clients'    -Method GET -Path '/dashboard/top-clients?limit=5'   -Token $admin.token
Test-Endpoint -Name 'floor-plan'     -Method GET -Path '/dashboard/floor-plan'   -Token $admin.token -Assert { param($o) if ($o.Count -lt 1) { throw 'no zones' } }
Test-Endpoint -Name 'heatmap-90d'    -Method GET -Path '/dashboard/heatmap?days=30' -Token $admin.token
Test-Endpoint -Name 'heatmap-mine'   -Method GET -Path "/dashboard/heatmap?userId=$($client.userId)&days=30" -Token $client.token

Write-Host "`n[4] Gamification" -ForegroundColor Cyan
Test-Endpoint -Name 'leaderboard'    -Method GET -Path '/gamification/leaderboard?limit=5' -Token $admin.token
Test-Endpoint -Name 'xp self'        -Method GET -Path "/gamification/xp/$($client.userId)" -Token $client.token -Assert { param($o) if ($o.level -lt 1) { throw 'level<1' } }
Test-Endpoint -Name 'streak self'    -Method GET -Path "/gamification/streak/$($client.userId)" -Token $client.token -Assert { param($o) if ($o.currentStreak -lt 0) { throw 'streak<0' } }
Test-Endpoint -Name 'user achievements' -Method GET -Path "/gamification/users/$($client.userId)" -Token $client.token
Test-Endpoint -Name 'monthly-report' -Method GET -Path "/gamification/monthly-report/$($client.userId)" -Token $client.token
# Forbidden case: client tries to read someone else's xp
Test-Endpoint -Name 'xp other (must 403)' -Method GET -Path "/gamification/xp/$($admin.userId)" -Token $client.token -ExpectStatus 403

Write-Host "`n[5] Metrics (client)" -ForegroundColor Cyan
Test-Endpoint -Name 'metrics list'    -Method GET -Path "/metrics/users/$($client.userId)?days=90" -Token $client.token -Assert { param($o) if (-not $o) { throw 'no data' } }
Test-Endpoint -Name 'metrics summary' -Method GET -Path "/metrics/users/$($client.userId)/summary" -Token $client.token
$newMetric = Test-Endpoint -Name 'metrics create' -Method POST -Path "/metrics/users/$($client.userId)" -Token $client.token -Body @{ weightKg = 79.2; waistCm = 84.0 } -ExpectStatus @(200, 201)
if ($newMetric.ok) {
    $created = $newMetric.body | ConvertFrom-Json
    Test-Endpoint -Name 'metrics delete' -Method DELETE -Path "/metrics/$($created.id)" -Token $client.token
}

Write-Host "`n[6] Classes" -ForegroundColor Cyan
Test-Endpoint -Name 'classes admin'   -Method GET -Path '/classes/admin' -Token $admin.token
Test-Endpoint -Name 'classes client'  -Method GET -Path '/classes/client' -Token $client.token -Assert { param($o) if (-not $o) { throw 'no list' } }
Test-Endpoint -Name 'classes trainer' -Method GET -Path '/classes/trainer' -Token $trainer.token

# Find an upcoming bookable class
$cls = (Invoke-Api -Method GET -Path '/classes/client' -Token $client.token).body | ConvertFrom-Json
$first = $cls | Where-Object { -not $_.isBooked -and -not $_.isOnWaitlist } | Select-Object -First 1
if ($first) {
    $book = Test-Endpoint -Name 'book class'   -Method POST   -Path "/classes/$($first.id)/book"   -Token $client.token
    Test-Endpoint -Name 'cancel booking'        -Method DELETE -Path "/classes/$($first.id)/book"  -Token $client.token
} else {
    Write-Host "  [SKIP] no bookable class found" -ForegroundColor Yellow
}

Write-Host "`n[7] Ratings" -ForegroundColor Cyan
Test-Endpoint -Name 'rating leaderboard' -Method GET -Path '/ratings/leaderboard?limit=5' -Token $client.token
Test-Endpoint -Name 'ratings trainer'    -Method GET -Path "/ratings/trainers/$($trainer.userId)" -Token $trainer.token

Write-Host "`n[8] AI workout plan (mock unless ANTHROPIC_API_KEY set)" -ForegroundColor Cyan
Test-Endpoint -Name 'ai workout-plan' -Method POST -Path '/ai/workout-plan' -Token $client.token -Body @{
    goal = 'gain_mass'; level = 'intermediate'; daysPerWeek = 3; minutesPerSession = 60; equipment = 'full_gym'
} -Assert { param($o) if ($o.weeklySchedule.Count -lt 1) { throw 'no plan' } }

Write-Host "`n[9] Equipment + incidents" -ForegroundColor Cyan
$eqList = Test-Endpoint -Name 'equipment list' -Method GET -Path '/equipment' -Token $client.token -Assert { param($o) if ($o.Count -lt 1) { throw 'no equipment' } }
$eqArr  = $eqList.body | ConvertFrom-Json
$target = $eqArr | Select-Object -First 1
$newInc = Test-Endpoint -Name 'incident report (client)' -Method POST -Path '/equipment/incidents' -Token $client.token -Body @{
    equipmentId = $target.id; severity = 'LOW'; note = 'smoke-test ticket'
} -ExpectStatus @(200, 201)
Test-Endpoint -Name 'incidents list (admin)' -Method GET -Path '/equipment/incidents' -Token $admin.token
if ($newInc.ok) {
    $inc = $newInc.body | ConvertFrom-Json
    Test-Endpoint -Name 'incident resolve (admin)' -Method PATCH -Path "/equipment/incidents/$($inc.id)" -Token $admin.token -Body @{ status = 'RESOLVED' }
}
# Forbidden: trainer tries to resolve
Test-Endpoint -Name 'incident PATCH as trainer (must 403)' -Method PATCH -Path "/equipment/incidents/00000000-0000-0000-0000-000000000000" -Token $trainer.token -Body @{ status = 'RESOLVED' } -ExpectStatus @(403, 404)

Write-Host "`n[10] Attendance" -ForegroundColor Cyan
Test-Endpoint -Name 'my open visits' -Method GET -Path '/attendance/me/open' -Token $client.token
# Try check-in then check-out (best-effort; might fail if zone full / no sub)
$zones = (Invoke-Api -Method GET -Path '/zones').body | ConvertFrom-Json
if ($zones.Count -gt 0) {
    $z = $zones[0]
    $checkIn = Test-Endpoint -Name "check-in to $($z.name)" -Method POST -Path '/attendance/check-in' -Token $client.token -Body @{ zoneId = $z.id }
    if ($checkIn.ok) {
        $visit = $checkIn.body | ConvertFrom-Json
        Start-Sleep -Seconds 1
        Test-Endpoint -Name 'check-out by path' -Method POST -Path "/attendance/check-out/$($visit.id)" -Token $client.token
    }
}

# ----------------------------------------------------------------- summary
$pass = ($report | Where-Object Pass).Count
$fail = ($report | Where-Object { -not $_.Pass }).Count
$total = $report.Count

Write-Host ""
Write-Host ("RESULT: {0}/{1} passed, {2} failed" -f $pass, $total, $fail) -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

# Markdown report
$md = @()
$md += "# FitFlow OS — endpoint smoke-test report"
$md += ""
$md += "- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$md += "- Base URL: $BaseUrl"
$md += "- Result: **$pass / $total passed** ($fail failed)"
$md += ""
$md += "| Result | Method | Path | Status | Detail |"
$md += "|---|---|---|---|---|"
foreach ($r in $report) {
    $emoji = if ($r.Pass) { 'OK' } else { 'FAIL' }
    $detail = ($r.Detail -replace '\|', '\|') -replace '\r?\n', ' '
    $md += "| $emoji | $($r.Method) | $($r.Path) | $($r.Status) | $detail |"
}
$path = Join-Path $PSScriptRoot 'test-api-report.md'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, ($md -join "`n"), $utf8)
Write-Host "Markdown report: $path" -ForegroundColor Cyan

if ($fail -gt 0) { exit 1 } else { exit 0 }
