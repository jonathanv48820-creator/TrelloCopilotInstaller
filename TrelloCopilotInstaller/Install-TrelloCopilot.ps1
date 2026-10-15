$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "     Greenwood Trello Copilot Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# PATHS
# ============================================================

$InstallerRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceFolder = Join-Path $InstallerRoot "trello-copilot"

$DestinationFolder = "C:\trello-copilot"
$McpFolder = Join-Path $DestinationFolder ".vscode"
$McpFile = Join-Path $McpFolder "mcp.json"

$PackageFile = Join-Path $DestinationFolder "package.json"
$PackageLockFile = Join-Path $DestinationFolder "package-lock.json"
$ServerFile = Join-Path $DestinationFolder "server.mjs"
$TrelloApiFile = Join-Path $DestinationFolder "trello-api.mjs"
$NodeModules = Join-Path $DestinationFolder "node_modules"

# ============================================================
# FUNCTIONS
# ============================================================

function Stop-Installer {
    param(
        [string]$Message
    )

    Write-Host ""
    Write-Host "ERROR:" -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
    Write-Host ""

    Read-Host "Press Enter to exit"
    exit 1
}

function Update-CurrentPath {

    $MachinePath = [Environment]::GetEnvironmentVariable(
        "Path",
        "Machine"
    )

    $UserPath = [Environment]::GetEnvironmentVariable(
        "Path",
        "User"
    )

    $env:Path = "$MachinePath;$UserPath"
}

function Get-VSCodePath {

    $CodeCommand = Get-Command code -ErrorAction SilentlyContinue

    if ($CodeCommand) {
        return $CodeCommand.Source
    }

    $Locations = @(
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
        "$env:ProgramFiles\Microsoft VS Code\Code.exe",
        "${env:ProgramFiles(x86)}\Microsoft VS Code\Code.exe"
    )

    foreach ($Location in $Locations) {

        if (Test-Path $Location) {
            return $Location
        }
    }

    return $null
}

function Test-HasValue {
    param(
        $Value
    )

    if ($null -eq $Value) {
        return $false
    }

    if ($Value.ToString().Trim().Length -eq 0) {
        return $false
    }

    return $true
}

# ============================================================
# VERIFY SOURCE FILES
# ============================================================

Write-Host "Checking Trello Copilot installation files..." -ForegroundColor Yellow

if (-not (Test-Path $SourceFolder)) {
    Stop-Installer "The trello-copilot folder is missing from the installer."
}

$RequiredSourceFiles = @(
    (Join-Path $SourceFolder "package.json"),
    (Join-Path $SourceFolder "package-lock.json"),
    (Join-Path $SourceFolder "server.mjs"),
    (Join-Path $SourceFolder "trello-api.mjs")
)

foreach ($File in $RequiredSourceFiles) {

    if (-not (Test-Path $File)) {
        Stop-Installer "Required installation file is missing: $File"
    }
}

Write-Host "Trello Copilot installation files found." -ForegroundColor Green

# ============================================================
# CHECK WINGET
# ============================================================

Write-Host ""
Write-Host "Checking Windows Package Manager..." -ForegroundColor Yellow

$WingetCommand = Get-Command winget -ErrorAction SilentlyContinue

if (-not $WingetCommand) {
    Stop-Installer "Windows Package Manager (winget) was not found. Install or update Microsoft App Installer and run this installer again."
}

Write-Host "Windows Package Manager found." -ForegroundColor Green

# ============================================================
# CHECK / INSTALL VISUAL STUDIO CODE
# ============================================================

Write-Host ""
Write-Host "Checking Visual Studio Code..." -ForegroundColor Yellow

$VSCodeExe = Get-VSCodePath

if (-not $VSCodeExe) {

    Write-Host "Visual Studio Code is not installed." -ForegroundColor Yellow
    Write-Host "Installing Visual Studio Code..." -ForegroundColor Cyan
    Write-Host ""

    try {

        winget install --id Microsoft.VisualStudioCode --exact --silent --accept-package-agreements --accept-source-agreements

        if ($LASTEXITCODE -ne 0) {
            Stop-Installer "Visual Studio Code installation failed. WinGet exit code: $LASTEXITCODE"
        }
    }
    catch {

        Stop-Installer "Unable to install Visual Studio Code: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 3

    Update-CurrentPath

    $VSCodeExe = Get-VSCodePath

    if (-not $VSCodeExe) {
        Stop-Installer "Visual Studio Code installed, but Code.exe could not be located. Restart Windows and run this installer again."
    }

    Write-Host "Visual Studio Code installed successfully." -ForegroundColor Green
}
else {

    Write-Host "Visual Studio Code found." -ForegroundColor Green
}

Write-Host "VS Code: $VSCodeExe" -ForegroundColor DarkGray

# ============================================================
# CHECK / INSTALL NODE.JS
# ============================================================

Write-Host ""
Write-Host "Checking Node.js..." -ForegroundColor Yellow

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue

if (-not $NodeCommand) {

    Write-Host "Node.js is not installed." -ForegroundColor Yellow
    Write-Host "Installing Node.js LTS..." -ForegroundColor Cyan
    Write-Host ""

    try {

        winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements

        if ($LASTEXITCODE -ne 0) {
            Stop-Installer "Node.js installation failed. WinGet exit code: $LASTEXITCODE"
        }
    }
    catch {

        Stop-Installer "Unable to install Node.js: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 3

    Update-CurrentPath

    $NodeCommand = Get-Command node -ErrorAction SilentlyContinue

    if (-not $NodeCommand) {
        Stop-Installer "Node.js installed, but the node command is not available yet. Restart Windows and run this installer again."
    }

    Write-Host "Node.js installed successfully." -ForegroundColor Green
}
else {

    Write-Host "Node.js found." -ForegroundColor Green
}

try {

    $NodeVersion = node --version
    Write-Host "Node.js version: $NodeVersion" -ForegroundColor DarkGray
}
catch {

    Stop-Installer "Node.js could not be started."
}

# ============================================================
# CHECK NPM
# ============================================================

Write-Host ""
Write-Host "Checking npm..." -ForegroundColor Yellow

$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue

if (-not $NpmCommand) {

    Update-CurrentPath
    $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $NpmCommand) {
    Stop-Installer "npm was not found. Restart Windows and run this installer again."
}

Write-Host "npm found." -ForegroundColor Green

# ============================================================
# CREATE DESTINATION
# ============================================================

Write-Host ""
Write-Host "Preparing C:\trello-copilot..." -ForegroundColor Yellow

try {

    New-Item -ItemType Directory -Path $DestinationFolder -Force | Out-Null
}
catch {

    Stop-Installer "Unable to create C:\trello-copilot: $($_.Exception.Message)"
}

# ============================================================
# COPY PROJECT
# ============================================================

Write-Host ""
Write-Host "Installing Trello Copilot files..." -ForegroundColor Yellow

try {

    Get-ChildItem -Path $SourceFolder -Force |
        Where-Object {
            $_.Name -ne ".env" -and
            $_.Name -ne "node_modules" -and
            $_.Name -ne "trello-api.mjs.backup"
        } |
        ForEach-Object {

            $Target = Join-Path $DestinationFolder $_.Name

            if ($_.PSIsContainer) {

                if (Test-Path $Target) {
                    Remove-Item $Target -Recurse -Force
                }

                Copy-Item `
                    -Path $_.FullName `
                    -Destination $Target `
                    -Recurse `
                    -Force
            }
            else {

                Copy-Item `
                    -Path $_.FullName `
                    -Destination $Target `
                    -Force
            }
        }
}
catch {

    Stop-Installer "Unable to copy Trello Copilot files: $($_.Exception.Message)"
}

Write-Host "Trello Copilot files installed." -ForegroundColor Green

# ============================================================
# VERIFY PROJECT
# ============================================================

Write-Host ""
Write-Host "Verifying Trello Copilot files..." -ForegroundColor Yellow

$RequiredInstalledFiles = @(
    $PackageFile,
    $PackageLockFile,
    $ServerFile,
    $TrelloApiFile
)

foreach ($File in $RequiredInstalledFiles) {

    if (-not (Test-Path $File)) {
        Stop-Installer "Installed file is missing: $File"
    }
}

Write-Host "Trello Copilot files verified." -ForegroundColor Green

# ============================================================
# INSTALL NODE DEPENDENCIES
# ============================================================

Write-Host ""
Write-Host "Installing Trello Copilot dependencies..." -ForegroundColor Yellow

Push-Location $DestinationFolder

try {

    npm ci

    if ($LASTEXITCODE -ne 0) {
        throw "npm ci returned exit code $LASTEXITCODE"
    }
}
catch {

    Pop-Location
    Stop-Installer "Unable to install Node.js dependencies: $($_.Exception.Message)"
}

Pop-Location

if (-not (Test-Path $NodeModules)) {
    Stop-Installer "node_modules was not created."
}

Write-Host "Node.js dependencies installed." -ForegroundColor Green

# ============================================================
# CHECK EXISTING TRELLO CREDENTIALS
# ============================================================

Write-Host ""
Write-Host "Checking Trello credentials..." -ForegroundColor Yellow

$ExistingApiKey = [Environment]::GetEnvironmentVariable(
    "TRELLO_API_KEY",
    "User"
)

$ExistingToken = [Environment]::GetEnvironmentVariable(
    "TRELLO_TOKEN",
    "User"
)

$CredentialsConfigured = $false

if (
    (Test-HasValue $ExistingApiKey) -and
    (Test-HasValue $ExistingToken)
) {

    $CredentialsConfigured = $true
    Write-Host "Existing Trello credentials found." -ForegroundColor Green
}

# ============================================================
# ASK FOR TRELLO CREDENTIALS
# ============================================================

if (-not $CredentialsConfigured) {

    Write-Host ""
    Write-Host "Trello credentials need to be configured." -ForegroundColor Yellow
    Write-Host ""

    # --------------------------------------------------------
    # API KEY
    # --------------------------------------------------------

    Write-Host "Paste the Trello API Key below." -ForegroundColor Cyan
    Write-Host ""

    $TrelloApiKey = Read-Host "Trello API Key"

    if (-not (Test-HasValue $TrelloApiKey)) {
        Stop-Installer "No Trello API Key was entered."
    }

    $TrelloApiKey = $TrelloApiKey.Trim()

    # --------------------------------------------------------
    # TOKEN
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "Paste the Trello Token below." -ForegroundColor Cyan
    Write-Host "The token will be hidden while you paste it." -ForegroundColor DarkGray
    Write-Host ""

    $SecureToken = Read-Host "Trello Token" -AsSecureString

    if ($SecureToken.Length -eq 0) {
        Stop-Installer "No Trello Token was entered."
    }

    try {

        $CredentialObject = New-Object `
            System.Management.Automation.PSCredential `
            -ArgumentList "trello", $SecureToken

        $TrelloToken = $CredentialObject.GetNetworkCredential().Password
    }
    catch {

        Stop-Installer "Unable to process the Trello Token."
    }

    if (-not (Test-HasValue $TrelloToken)) {
        Stop-Installer "The Trello Token was empty."
    }

    # ========================================================
    # SAVE USER ENVIRONMENT VARIABLES
    # ========================================================

    Write-Host ""
    Write-Host "Saving Trello credentials for this Windows user..." -ForegroundColor Yellow

    try {

        [Environment]::SetEnvironmentVariable(
            "TRELLO_API_KEY",
            $TrelloApiKey,
            "User"
        )

        [Environment]::SetEnvironmentVariable(
            "TRELLO_TOKEN",
            $TrelloToken,
            "User"
        )

        # Also set credentials for this installer session.
        $env:TRELLO_API_KEY = $TrelloApiKey
        $env:TRELLO_TOKEN = $TrelloToken
    }
    catch {

        Stop-Installer "Unable to save Trello credentials: $($_.Exception.Message)"
    }

    # ============================================================

    $SavedApiKey = :GetEnvironmentVariable(
        "TRELLO_API_KEY",
        "User"
    )

    $SavedToken = :GetEnvironmentVariable(
        "TRELLO_TOKEN",
        "User"
    )

    if (-not (Test-HasValue $SavedApiKey)) {
        Stop-Installer "The Trello API Key was not saved correctly."
    }

    if (-not (Test-HasValue $SavedToken)) {
        Stop-Installer "The Trello Token was not saved correctly."
    }

    Write-Host "Trello credentials saved successfully." -ForegroundColor Green

    $TrelloApiKey = $null
    $TrelloToken = $null
    $SecureToken = $null
    $CredentialObject = $null
    $SavedApiKey = $null
    $SavedToken = $null
}
else {

    # Also load existing credentials into this installer process.
    $env:TRELLO_API_KEY = $ExistingApiKey
    $env:TRELLO_TOKEN = $ExistingToken
}

$ExistingApiKey = $null
$ExistingToken = $null

# ============================================================
# CREATE MCP FOLDER
# ============================================================

Write-Host ""
Write-Host "Creating VS Code Trello MCP configuration..." -ForegroundColor Yellow

try {

    New-Item -ItemType Directory -Path $McpFolder -Force | Out-Null
}
catch {

    Stop-Installer "Unable to create the .vscode folder."
}

# ============================================================
# CREATE WORKING MCP.JSON
# ============================================================

$McpJson = @'
{
  "servers": {
    "trello": {
      "type": "stdio",
      "command": "node",
      "args": [
        "${workspaceFolder}/server.mjs"
      ],
      "env": {
        "TRELLO_API_KEY": "${env:TRELLO_API_KEY}",
        "TRELLO_TOKEN": "${env:TRELLO_TOKEN}"
      }
    }
  }
}
'@

try {

    Set-Content `
        -Path $McpFile `
        -Value $McpJson `
        -Encoding UTF8 `
        -Force
}
catch {

    Stop-Installer "Unable to create mcp.json: $($_.Exception.Message)"
}

# ============================================================
# VERIFY MCP.JSON
# ============================================================

Write-Host ""
Write-Host "Verifying Trello MCP configuration..." -ForegroundColor Yellow

try {

    $VerifyMcp = Get-Content -Path $McpFile -Raw | ConvertFrom-Json

    if ($VerifyMcp.servers.trello.command -ne "node") {
        Stop-Installer "The Trello MCP command is not configured correctly."
    }

    $ApiKeyConfig = $VerifyMcp.servers.trello.env.TRELLO_API_KEY
    $TokenConfig = $VerifyMcp.servers.trello.env.TRELLO_TOKEN

    if ($ApiKeyConfig -ne '${env:TRELLO_API_KEY}') {
        Stop-Installer "TRELLO_API_KEY is not configured correctly in mcp.json."
    }

    if ($TokenConfig -ne '${env:TRELLO_TOKEN}') {
        Stop-Installer "TRELLO_TOKEN is not configured correctly in mcp.json."
    }
}
catch {

    Stop-Installer "Unable to verify mcp.json: $($_.Exception.Message)"
}

Write-Host "VS Code Trello MCP configuration created." -ForegroundColor Green

# ============================================================
# REMOVE OLD .ENV
# ============================================================

$OldEnvFile = Join-Path $DestinationFolder ".env"

if (Test-Path $OldEnvFile) {

    Write-Host ""
    Write-Host "Removing old .env configuration..." -ForegroundColor Yellow

    try {

        Remove-Item -Path $OldEnvFile -Force

        Write-Host "Old .env configuration removed." -ForegroundColor Green
    }
    catch {

        Write-Host "Warning: Unable to remove old .env file." -ForegroundColor Yellow
    }
}

# ============================================================
# FINAL VERIFICATION
# ============================================================

Write-Host ""
Write-Host "Performing final verification..." -ForegroundColor Yellow

# Verify Trello API key exists in current installer session
if (-not (Test-HasValue $env:TRELLO_API_KEY)) {
    Stop-Installer "TRELLO_API_KEY failed final verification."
}

# Verify Trello token exists in current installer session
if (-not (Test-HasValue $env:TRELLO_TOKEN)) {
    Stop-Installer "TRELLO_TOKEN failed final verification."
}

# Verify MCP configuration exists
if (-not (Test-Path $McpFile)) {
    Stop-Installer "mcp.json failed final verification."
}

# Verify Node dependencies exist
if (-not (Test-Path $NodeModules)) {
    Stop-Installer "Node dependencies failed final verification."
}

# Verify MCP server exists
if (-not (Test-Path $ServerFile)) {
    Stop-Installer "server.mjs failed final verification."
}

# Verify Trello API module exists
if (-not (Test-Path $TrelloApiFile)) {
    Stop-Installer "trello-api.mjs failed final verification."
}

Write-Host "Final verification passed." -ForegroundColor Green

# ============================================================
# INSTALLATION COMPLETE
# ============================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "    Trello Copilot installation complete" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Installed to:" -ForegroundColor Cyan
Write-Host ""
Write-Host "C:\trello-copilot"
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Visual Studio Code: Ready"
Write-Host "  Node.js: Ready"
Write-Host "  Node dependencies: Ready"
Write-Host "  Trello API Key: Configured"
Write-Host "  Trello Token: Configured"
Write-Host "  Trello MCP: Configured"
Write-Host ""

# ============================================================
# CLOSE EXISTING VS CODE WINDOWS
# ============================================================

Write-Host "Closing existing Visual Studio Code windows..." -ForegroundColor Yellow

$RunningCode = Get-Process -Name "Code" -ErrorAction SilentlyContinue

if ($RunningCode) {

    try {

        $RunningCode | Stop-Process -Force
        Start-Sleep -Seconds 3
    }
    catch {

        Write-Host "Could not automatically close VS Code." -ForegroundColor Yellow
        Write-Host "Close and reopen VS Code manually if Trello credentials are not detected."
    }
}

# ============================================================
# OPEN PROJECT IN NEW VS CODE PROCESS
# ============================================================

Write-Host ""
Write-Host "Opening Trello Copilot in Visual Studio Code..." -ForegroundColor Cyan

try {

    Start-Process `
        -FilePath $VSCodeExe `
        -ArgumentList "`"$DestinationFolder`""
}
catch {

    Write-Host ""
    Write-Host "VS Code could not be opened automatically." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open VS Code manually and open:"
    Write-Host "C:\trello-copilot" -ForegroundColor Cyan
}

# ============================================================
# FIRST-TIME INSTRUCTIONS
# ============================================================

Write-Host ""
Write-Host "FIRST-TIME SETUP IN VS CODE:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Sign into GitHub Copilot if prompted."
Write-Host ""

Write-Host "2. Press:"
Write-Host "   Ctrl + Shift + P" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Run:"
Write-Host "   MCP: List Servers" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Select:"
Write-Host "   trello" -ForegroundColor Cyan
Write-Host ""

Write-Host "5. Select:"
Write-Host "   Start" -ForegroundColor Cyan
Write-Host ""

Write-Host "6. Trust the MCP server if VS Code asks."
Write-Host ""

Write-Host "7. Verify Trello shows:"
Write-Host "   Running" -ForegroundColor Green
Write-Host ""

Write-Host "8. Open GitHub Copilot Chat."
Write-Host ""

Write-Host "9. Select Agent mode."
Write-Host ""

Write-Host "10. Test:"
Write-Host ""
Write-Host "    Show me the orders due today" -ForegroundColor Cyan
Write-Host ""

Write-Host "You should have approximately 27 Trello tools available." -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to close this installer"