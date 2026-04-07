<#
.SYNOPSIS
  Bulk-copy WinscopeNet tables from local SQL Server to Azure SQL.

.DESCRIPTION
  Uses BCP to export tables from a local SQL Server instance and import them
  into Azure SQL in FK dependency order. Handles IDENTITY_INSERT automatically.

  Tables migrated (in order):
    Tier 1 (lookups):  tblRepairStatuses, tblServiceLocations, tblRepairLevels,
                       tblDeliveryMethod, tblRepairReasons, tblPaymentTerms,
                       tblPricingCategory, tblManufacturers, tblScopeTypeCategories
    Tier 2 (core):     tblSalesRep, tblScopeType, tblClient, tblTechnicians,
                       tblDepartment, tblScope, tblRepairItem
    Tier 3 (txn):      tblRepair, tblRepairItemTran

.PARAMETER LocalServer
  Local SQL Server instance name. Default: localhost

.PARAMETER LocalDb
  Local database name. Default: WinscopeNet

.PARAMETER AzureServer
  Azure SQL server FQDN. Default: tsi-sql-jb2026.database.windows.net

.PARAMETER AzureDb
  Azure database name. Default: WinscopeNet

.PARAMETER AzureUser
  Azure SQL login. Default: tsi_dev

.PARAMETER AzurePassword
  Azure SQL password. Required.

.PARAMETER TempDir
  Directory for BCP data files. Default: $env:TEMP\tsi-migrate

.PARAMETER Tables
  Comma-separated list of tables to migrate. Default: all tables in dependency order.
  Use this to re-run a specific table: -Tables "tblClient,tblDepartment"

.PARAMETER SkipExport
  Skip the BCP OUT step (reuse existing files in TempDir).

.PARAMETER SkipTruncate
  Skip truncating target tables before import. Use with caution — will fail on
  duplicate primary keys.

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "yourpassword"

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -Tables "tblClient,tblDepartment"

.EXAMPLE
  .\scripts\migrate-data.ps1 -AzurePassword "p@ss" -SkipExport
#>

[CmdletBinding()]
param(
    [string]$LocalServer   = "localhost",
    [string]$LocalDb       = "WinscopeNet",
    [string]$AzureServer   = "tsi-sql-jb2026.database.windows.net",
    [string]$AzureDb       = "WinscopeNet",
    [string]$AzureUser     = "tsi_dev",

    [Parameter(Mandatory = $true)]
    [string]$AzurePassword,

    [string]$TempDir       = "$env:TEMP\tsi-migrate",
    [string]$Tables        = "",
    [switch]$SkipExport,
    [switch]$SkipTruncate
)

$ErrorActionPreference = "Stop"

# ── FK dependency order ──
# Tables listed so that each table's FK parents appear before it.
$allTables = @(
    # Tier 1: Lookups (no FK dependencies)
    "tblRepairStatuses",
    "tblServiceLocations",
    "tblRepairLevels",
    "tblDeliveryMethod",
    "tblRepairReasons",
    "tblPaymentTerms",
    "tblPricingCategory",
    "tblManufacturers",
    "tblScopeTypeCategories",

    # Tier 2: Core entities
    "tblSalesRep",
    "tblScopeType",         # FK → tblManufacturers, tblScopeTypeCategories
    "tblClient",             # FK → tblSalesRep, tblPricingCategory, tblPaymentTerms
    "tblTechnicians",        # FK → tblServiceLocations
    "tblDepartment",         # FK → tblClient, tblServiceLocations, tblSalesRep, tblPricingCategory
    "tblScope",              # FK → tblScopeType, tblDepartment
    "tblRepairItem",

    # Tier 3: Transactions
    "tblRepair",             # FK → tblRepairStatuses, tblDepartment, tblScope, tblTechnicians, ...
    "tblRepairItemTran"      # FK → tblRepair, tblRepairItem, tblTechnicians
)

# Tables WITHOUT identity columns (no IDENTITY_INSERT needed)
$noIdentity = @("tblRepairStatuses")

# ── Resolve table list ──
if ($Tables -ne "") {
    $tableList = $Tables -split "," | ForEach-Object { $_.Trim() }
} else {
    $tableList = $allTables
}

# ── Validate BCP is available ──
$bcp = Get-Command bcp -ErrorAction SilentlyContinue
if (-not $bcp) {
    Write-Error "bcp.exe not found. Install SQL Server command-line utilities: https://learn.microsoft.com/en-us/sql/tools/bcp-utility"
    exit 1
}

$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if (-not $sqlcmd) {
    Write-Error "sqlcmd.exe not found. Install SQL Server command-line utilities."
    exit 1
}

# ── Create temp directory ──
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TSI Data Migration: Local → Azure SQL" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Source:  $LocalServer / $LocalDb"
Write-Host "  Target:  $AzureServer / $AzureDb"
Write-Host "  Tables:  $($tableList.Count)"
Write-Host "  Temp:    $TempDir"
Write-Host ""

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$results = @()

# ══════════════════════════════════════════════
# STEP 1: BCP OUT (export from local)
# ══════════════════════════════════════════════
if (-not $SkipExport) {
    Write-Host "── STEP 1: Exporting from local ──" -ForegroundColor Yellow
    Write-Host ""

    $exportFailed = $false
    foreach ($table in $tableList) {
        $outFile = Join-Path $TempDir "$table.dat"
        $fmtFile = Join-Path $TempDir "$table.fmt"

        Write-Host "  Exporting $table ... " -NoNewline

        # Export native format file first
        & bcp "$LocalDb.dbo.$table" format nul -n -f $fmtFile -S $LocalServer -T 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED (format)" -ForegroundColor Red
            $exportFailed = $true
            $results += [PSCustomObject]@{ Table = $table; Status = "FAIL"; Rows = 0 }
            continue
        }

        # Export data
        $output = & bcp "$LocalDb.dbo.$table" out $outFile -n -S $LocalServer -T 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED" -ForegroundColor Red
            $exportFailed = $true
            $results += [PSCustomObject]@{ Table = $table; Status = "FAIL"; Rows = 0 }
            continue
        }

        # Parse row count from bcp output
        $rowLine = $output | Select-String "(\d+) rows copied"
        $rowCount = if ($rowLine) { [int]($rowLine.Matches[0].Groups[1].Value) } else { 0 }

        $size = if (Test-Path $outFile) { "{0:N1} MB" -f ((Get-Item $outFile).Length / 1MB) } else { "0 MB" }
        Write-Host "$rowCount rows ($size)" -ForegroundColor Green

        # Track for summary but don't add to results yet — import step will finalize
    }

    Write-Host ""

    if ($exportFailed) {
        Write-Host "ABORTING — one or more exports failed. Target tables have NOT been modified." -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

# ── Gate: verify all export files exist before touching Azure (covers -SkipExport) ──
$missingExports = @()
foreach ($table in $tableList) {
    $datFile = Join-Path $TempDir "$table.dat"
    if (-not (Test-Path $datFile) -or (Get-Item $datFile).Length -eq 0) {
        $missingExports += $table
    }
}

if ($missingExports.Count -gt 0) {
    Write-Host "ABORTING — missing or empty export files for:" -ForegroundColor Red
    foreach ($t in $missingExports) {
        Write-Host "    - $t" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Target tables have NOT been modified." -ForegroundColor Yellow
    Write-Host "  Fix the export errors above, then re-run." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ══════════════════════════════════════════════
# STEP 2: Truncate target tables (reverse FK order)
# ══════════════════════════════════════════════
if (-not $SkipTruncate) {
    Write-Host "── STEP 2: Truncating target tables ──" -ForegroundColor Yellow
    Write-Host ""

    # Reverse order so child tables are truncated before parents
    $reverseTables = $tableList[($tableList.Count - 1)..0]

    # Build a single SQL batch: disable FK checks, truncate, re-enable
    $truncSql = @"
-- Disable all FK constraints
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

"@

    foreach ($table in $reverseTables) {
        $truncSql += "TRUNCATE TABLE dbo.$table;`n"
    }

    $truncSql += @"

-- Re-enable all FK constraints
EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
"@

    $truncFile = Join-Path $TempDir "_truncate.sql"
    $truncSql | Out-File -FilePath $truncFile -Encoding UTF8

    Write-Host "  Truncating $($reverseTables.Count) tables on Azure ... " -NoNewline

    & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword `
        -i $truncFile -b 2>&1 | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED" -ForegroundColor Red
        Write-Host "  Trying DELETE instead of TRUNCATE (FK constraints)..." -ForegroundColor Yellow

        # Fallback: DELETE instead of TRUNCATE (works when FK constraints block truncate)
        $delSql = "EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';`n"
        foreach ($table in $reverseTables) {
            $delSql += "DELETE FROM dbo.$table;`n"
        }
        $delSql += "EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';`n"

        # Reseed identity columns
        foreach ($table in $reverseTables) {
            if ($table -notin $noIdentity) {
                $delSql += "DBCC CHECKIDENT('dbo.$table', RESEED, 0);`n"
            }
        }

        $delFile = Join-Path $TempDir "_delete.sql"
        $delSql | Out-File -FilePath $delFile -Encoding UTF8

        & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword `
            -i $delFile -b 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "FAILED — check Azure permissions" -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "OK" -ForegroundColor Green
    Write-Host ""
}

# ══════════════════════════════════════════════
# STEP 3: BCP IN (import to Azure)
# ══════════════════════════════════════════════
Write-Host "── STEP 3: Importing to Azure SQL ──" -ForegroundColor Yellow
Write-Host ""

foreach ($table in $tableList) {
    $datFile = Join-Path $TempDir "$table.dat"

    if (-not (Test-Path $datFile)) {
        Write-Host "  $table — SKIPPED (no data file)" -ForegroundColor DarkGray
        $results += [PSCustomObject]@{ Table = $table; Status = "SKIP"; Rows = 0 }
        continue
    }

    $fileSize = (Get-Item $datFile).Length
    if ($fileSize -eq 0) {
        Write-Host "  $table — SKIPPED (empty)" -ForegroundColor DarkGray
        $results += [PSCustomObject]@{ Table = $table; Status = "SKIP"; Rows = 0 }
        continue
    }

    Write-Host "  Importing $table ... " -NoNewline

    # Enable IDENTITY_INSERT if table has identity column
    $hasIdentity = $table -notin $noIdentity
    if ($hasIdentity) {
        & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword `
            -Q "SET IDENTITY_INSERT dbo.$table ON;" -b 2>&1 | Out-Null
    }

    # BCP IN with native format
    # -E = keep identity values
    # -b 5000 = batch size (prevents timeouts on large tables)
    # -h "TABLOCK" = table lock for performance
    $bcpArgs = @(
        "$AzureDb.dbo.$table",
        "in", $datFile,
        "-n",
        "-S", $AzureServer,
        "-U", $AzureUser,
        "-P", $AzurePassword,
        "-b", "5000",
        "-h", "TABLOCK",
        "-E"
    )

    $output = & bcp @bcpArgs 2>&1
    $exitCode = $LASTEXITCODE

    # Turn IDENTITY_INSERT back off
    if ($hasIdentity) {
        & sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword `
            -Q "SET IDENTITY_INSERT dbo.$table OFF;" -b 2>&1 | Out-Null
    }

    if ($exitCode -ne 0) {
        Write-Host "FAILED" -ForegroundColor Red
        $errMsg = ($output | Select-String "Error|SQLState") -join "; "
        if ($errMsg) { Write-Host "    $errMsg" -ForegroundColor DarkRed }
        $results += [PSCustomObject]@{ Table = $table; Status = "FAIL"; Rows = 0 }
        continue
    }

    $rowLine = $output | Select-String "(\d+) rows copied"
    $rowCount = if ($rowLine) { [int]($rowLine.Matches[0].Groups[1].Value) } else { 0 }

    Write-Host "$rowCount rows" -ForegroundColor Green
    $results += [PSCustomObject]@{ Table = $table; Status = "OK"; Rows = $rowCount }
}

# ══════════════════════════════════════════════
# STEP 4: Validate row counts
# ══════════════════════════════════════════════
Write-Host ""
Write-Host "── STEP 4: Validating ──" -ForegroundColor Yellow
Write-Host ""

$validationSql = ""
foreach ($table in $tableList) {
    $validationSql += "SELECT '$table' AS [Table], COUNT(*) AS [Rows] FROM dbo.$table;`n"
}

$valFile = Join-Path $TempDir "_validate.sql"
$validationSql | Out-File -FilePath $valFile -Encoding UTF8

& sqlcmd -S $AzureServer -d $AzureDb -U $AzureUser -P $AzurePassword `
    -i $valFile -W -s "|" 2>&1 | ForEach-Object {
    if ($_ -match "^\s*tbl") {
        $parts = $_ -split "\|" | ForEach-Object { $_.Trim() }
        Write-Host "  $($parts[0].PadRight(25)) $($parts[1]) rows" -ForegroundColor DarkCyan
    }
}

# ══════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════
$stopwatch.Stop()
$elapsed = $stopwatch.Elapsed

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Migration Complete" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$okCount   = ($results | Where-Object Status -eq "OK").Count
$failCount = ($results | Where-Object Status -eq "FAIL").Count
$skipCount = ($results | Where-Object Status -eq "SKIP").Count
$totalRows = ($results | Measure-Object -Property Rows -Sum).Sum

Write-Host "  Succeeded:  $okCount" -ForegroundColor Green
if ($failCount -gt 0) { Write-Host "  Failed:     $failCount" -ForegroundColor Red }
if ($skipCount -gt 0) { Write-Host "  Skipped:    $skipCount" -ForegroundColor DarkGray }
Write-Host "  Total rows: $("{0:N0}" -f $totalRows)"
Write-Host "  Elapsed:    $("{0:mm\:ss}" -f $elapsed)"
Write-Host ""

if ($failCount -gt 0) {
    Write-Host "  Failed tables:" -ForegroundColor Red
    $results | Where-Object Status -eq "FAIL" | ForEach-Object {
        Write-Host "    - $($_.Table)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "  Re-run failed tables with:" -ForegroundColor Yellow
    $failedNames = ($results | Where-Object Status -eq "FAIL" | ForEach-Object { $_.Table }) -join ","
    Write-Host "    .\scripts\migrate-data.ps1 -AzurePassword `"...`" -Tables `"$failedNames`" -SkipTruncate" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "  Data files in: $TempDir" -ForegroundColor DarkGray
Write-Host "  Clean up with: Remove-Item -Recurse `"$TempDir`"" -ForegroundColor DarkGray
Write-Host ""
