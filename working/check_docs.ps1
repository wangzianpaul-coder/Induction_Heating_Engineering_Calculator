param([string]$Root = 'D:\Induction_Heating_Engineering_Calculator')

$required = @(
    'CALCULATION_BASIS.md',
    'CALCULATION_CONTRACTS.md',
    'APPLICATION_ARCHITECTURE.md',
    'PROJECT_AUDIT.md',
    'VALIDATION_CASES.md',
    'FORMULA_SOURCE_REGISTER.md'
)

$results = @()
foreach ($name in $required) {
    $path = Join-Path $Root $name
    $exists = Test-Path -LiteralPath $path
    $text = if ($exists) { [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) } else { '' }
    $fences = ([regex]::Matches($text, '(?m)^```')).Count
    $results += [pscustomobject]@{
        File = $name
        Exists = $exists
        Bytes = if ($exists) { (Get-Item -LiteralPath $path).Length } else { 0 }
        CodeFencesEven = (($fences % 2) -eq 0)
        ContainsTODO = ($text -match '(?i)\bTODO\b|待补全文')
    }
}

$basis = Join-Path $Root 'CALCULATION_BASIS.md'
if (Test-Path -LiteralPath $basis) {
    $basisText = [System.IO.File]::ReadAllText($basis, [System.Text.Encoding]::UTF8)
    foreach ($token in @('A ', 'B ', 'C ', 'D ', 'E ', 'F ', 'G ', 'H ', 'I ', 'J ', 'Engineering Decisions Requiring Approval Before Implementation')) {
        if ($basisText -notmatch [regex]::Escape($token)) {
            throw "CALCULATION_BASIS missing required token: $token"
        }
    }
}

$srcFiles = @(Get-ChildItem -LiteralPath (Join-Path $Root 'src') -Recurse -File -ErrorAction SilentlyContinue)
$testFiles = @(Get-ChildItem -LiteralPath (Join-Path $Root 'tests') -Recurse -File -ErrorAction SilentlyContinue)

$results | Format-Table -AutoSize
[pscustomobject]@{
    SourceImplementationFiles = $srcFiles.Count
    TestImplementationFiles = $testFiles.Count
    WebsiteImplemented = (($srcFiles.Count + $testFiles.Count) -gt 0)
}
