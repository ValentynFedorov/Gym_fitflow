<#
.SYNOPSIS
    FitFlow OS diagnostic — collects environment info into a markdown report
    so the developer can share it (paste into chat/issue).

.DESCRIPTION
    Read-only. Writes the report to diagnose-report.md in the project root
    and also prints it to the console. Doesn't start Docker, doesn't write
    .env, doesn't change anything else.

.EXAMPLE
    ./diagnose.ps1
#>

[CmdletBinding()]
param()

$ProjectRoot = $PSScriptRoot
$reportPath  = Join-Path $ProjectRoot 'diagnose-report.md'

$sb = New-Object System.Text.StringBuilder

function Add-Line  { param([string]$s = '') ; [void]$sb.AppendLine($s) }
function Add-H2    { param([string]$s)      ; Add-Line ''; Add-Line ('## ' + $s); Add-Line '' }
function Add-Code {
    param([string]$Body = '', [string]$Lang = '')
    Add-Line ('```' + $Lang)
    Add-Line $Body
    Add-Line '```'
}
function Try-Get {
    param([scriptblock]$Block, [string]$OnFail = 'n/a')
    try {
        $r = & $Block 2>&1 | Out-String
        return $r.Trim()
    } catch {
        return $OnFail + ' (' + $_.Exception.Message + ')'
    }
}
function Test-Cmd { param([string]$n) ; return [bool](Get-Command $n -ErrorAction SilentlyContinue) }

# ------------------------------------------------------------ Header
$now = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
$os  = Get-CimInstance Win32_OperatingSystem
Add-Line '# FitFlow OS — diagnostic report'
Add-Line ''
Add-Line ('- Generated: '   + $now)
Add-Line ('- Host: '        + $env:COMPUTERNAME)
Add-Line ('- User: '        + $env:USERNAME)
Add-Line ('- ProjectRoot: ' + $ProjectRoot)
Add-Line ('- PowerShell: '  + $PSVersionTable.PSVersion + ' (' + $PSVersionTable.PSEdition + ')')
Add-Line ('- OS: '          + $os.Caption + ' build ' + $os.BuildNumber)

# ------------------------------------------------------------ Tool versions
Add-H2 'Tool versions'
$lines = @()
foreach ($t in @(
    @{ Name = 'node'   ; Exe = 'node'   ; Cmd = { node --version } },
    @{ Name = 'npm'    ; Exe = 'npm'    ; Cmd = { npm --version } },
    @{ Name = 'git'    ; Exe = 'git'    ; Cmd = { git --version } },
    @{ Name = 'docker' ; Exe = 'docker' ; Cmd = { docker --version } },
    @{ Name = 'docker compose' ; Exe = 'docker' ; Cmd = { docker compose version } }
)) {
    if (Test-Cmd $t.Exe) {
        $v = Try-Get -Block $t.Cmd -OnFail 'ERROR'
    } else {
        $v = 'NOT INSTALLED'
    }
    $lines += ($t.Name.PadRight(16) + ' ' + $v)
}
Add-Code -Body ($lines -join "`n")

# ------------------------------------------------------------ Docker daemon
Add-H2 'Docker daemon'
$pipeEngine       = Test-Path '\\.\pipe\docker_engine'
$pipeDesktopLinux = Test-Path '\\.\pipe\dockerDesktopLinuxEngine'
$dockerProc       = Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue
if ($dockerProc) { $procStatus = 'RUNNING (PID ' + $dockerProc.Id + ')' } else { $procStatus = 'NOT RUNNING' }
$pipe1 = if ($pipeEngine)       { 'present' } else { 'missing' }
$pipe2 = if ($pipeDesktopLinux) { 'present' } else { 'missing' }
$daemonReport = @(
    ('Docker Desktop process        : ' + $procStatus),
    ('Pipe docker_engine            : ' + $pipe1),
    ('Pipe dockerDesktopLinuxEngine : ' + $pipe2)
) -join "`n"
Add-Code -Body $daemonReport
if (Test-Cmd 'docker') {
    Add-Line '**docker context ls**'
    Add-Code -Body (Try-Get -Block { docker context ls })
    if ($pipeEngine -or $pipeDesktopLinux) {
        Add-Line '**docker version --format short**'
        Add-Code -Body (Try-Get -Block { docker version --format 'Client {{.Client.Version}}, Server {{.Server.Version}}' })
    } else {
        Add-Line '_skipping docker version: daemon pipe missing (would hang)._'
    }
}

# ------------------------------------------------------------ WSL
Add-H2 'WSL'
if (Test-Cmd 'wsl') {
    Add-Code -Body (Try-Get -Block { wsl --status })
    Add-Code -Body (Try-Get -Block { wsl --list --verbose })
} else {
    Add-Code -Body 'wsl not available'
}

# ------------------------------------------------------------ Ports
Add-H2 'Ports of interest'
$portLines = @()
foreach ($p in 5432, 6379, 3000, 3001) {
    $c = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) {
        $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) { $pname = $proc.ProcessName } else { $pname = '?' }
        $portLines += ('{0,-6} TAKEN  by PID {1} ({2})' -f $p, $c.OwningProcess, $pname)
    } else {
        $portLines += ('{0,-6} free' -f $p)
    }
}
Add-Code -Body ($portLines -join "`n")

# ------------------------------------------------------------ FitFlow containers
Add-H2 'FitFlow containers'
$hasDocker = Test-Cmd 'docker'
$hasDaemon = $pipeEngine -or $pipeDesktopLinux
if ($hasDocker -and $hasDaemon) {
    Add-Code -Body (Try-Get -Block { docker ps -a --filter 'name=fitflow' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' })
} elseif ($hasDocker) {
    Add-Code -Body 'docker CLI present but daemon down — skipping container list (would hang).'
} else {
    Add-Code -Body 'docker CLI missing'
}

# ------------------------------------------------------------ Project files
Add-H2 'Project files'
$files = @(
    '.env',
    '.env.example',
    'docker-compose.yml',
    'docker-compose.override.yml',
    'setup.ps1',
    'package.json',
    'package-lock.json'
)
$fileLines = @()
foreach ($f in $files) {
    $full = Join-Path $ProjectRoot $f
    if (Test-Path $full) {
        $info = Get-Item $full
        $kb   = [math]::Round(($info.Length / 1024), 1)
        $mtim = $info.LastWriteTime.ToString('yyyy-MM-dd HH:mm')
        $fileLines += ($f.PadRight(32) + ' present  (' + $kb + ' KB, modified ' + $mtim + ')')
    } else {
        $fileLines += ($f.PadRight(32) + ' MISSING')
    }
}
Add-Code -Body ($fileLines -join "`n")

# ------------------------------------------------------------ node_modules
Add-H2 'node_modules'
$nm = Join-Path $ProjectRoot 'node_modules'
if (Test-Path $nm) {
    $count = (Get-ChildItem $nm -Directory -ErrorAction SilentlyContinue).Count
    Add-Code -Body ('root: present (' + $count + ' top-level entries)')
} else {
    Add-Code -Body 'root: missing — npm install has not run yet'
}

# ------------------------------------------------------------ .env (secrets masked)
Add-H2 '.env contents (secrets masked)'
$envPath = Join-Path $ProjectRoot '.env'
if (Test-Path $envPath) {
    $envLines = Get-Content $envPath | ForEach-Object {
        if ($_ -match '^(JWT_\w+)=') { $Matches[1] + '=***masked***' } else { $_ }
    }
    Add-Code -Body ($envLines -join "`n")
} else {
    Add-Code -Body '(no .env yet)'
}

# ------------------------------------------------------------ override
Add-H2 'docker-compose.override.yml'
$ovPath = Join-Path $ProjectRoot 'docker-compose.override.yml'
if (Test-Path $ovPath) {
    Add-Code -Lang 'yaml' -Body (Get-Content $ovPath -Raw)
} else {
    Add-Code -Body '(no override — default ports will be used)'
}

# ------------------------------------------------------------ recent setup logs
Add-H2 'Recent setup logs (tail 80 lines each)'
foreach ($log in 'setup-run.log','setup-run.err.log') {
    $p = Join-Path $ProjectRoot $log
    Add-Line ('**' + $log + '**')
    if (Test-Path $p) {
        Add-Code -Body ((Get-Content $p -Tail 80) -join "`n")
    } else {
        Add-Code -Body '(missing)'
    }
}

# ------------------------------------------------------------ Git state
Add-H2 'Git state'
if (Test-Cmd 'git') {
    Add-Code -Body (Try-Get -Block { git -C $ProjectRoot log --oneline -5 })
    Add-Code -Body (Try-Get -Block { git -C $ProjectRoot status --short })
} else {
    Add-Code -Body 'git not installed'
}

# ------------------------------------------------------------ Write + show
$text = $sb.ToString()
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($reportPath, $text, $utf8)

Write-Host ''
Write-Host ('Report written to: ' + $reportPath) -ForegroundColor Green
Write-Host 'Copy the contents below (or open the file) and paste into the chat.' -ForegroundColor Green
$bar = '=' * 78
Write-Host $bar -ForegroundColor DarkGray
Write-Host $text
Write-Host $bar -ForegroundColor DarkGray
