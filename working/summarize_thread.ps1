param(
    [string]$Path = 'D:\Induction_Heating_Engineering_Calculator\working\SOFTWARE_FORMULA_ANALYSIS_THREAD_EXPORT.md'
)

$text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$matches = [regex]::Matches(
    $text,
    '(?ms)^## Turn \x60(?<id>[^\x60]+)\x60.*?^### User\s+(?<user>.*?)(?=^### |^## Turn|\z)'
)

$rows = for ($i = 0; $i -lt $matches.Count; $i++) {
    $user = ([regex]::Replace($matches[$i].Groups['user'].Value, '\s+', ' ')).Trim()
    if ($user.Length -gt 500) {
        $user = $user.Substring(0, 500) + '...'
    }
    [pscustomobject]@{
        No = $i + 1
        Turn = $matches[$i].Groups['id'].Value
        User = $user
    }
}

$rows | Format-Table -Wrap -AutoSize
