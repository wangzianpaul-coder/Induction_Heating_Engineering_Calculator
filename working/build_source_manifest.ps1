param(
    [string]$Root = 'D:\Induction_Heating_Engineering_Calculator'
)

$referenceRoot = Join-Path $Root 'references'
$rows = Get-ChildItem -LiteralPath $referenceRoot -Recurse -File | Sort-Object FullName | ForEach-Object {
    $relative = $_.FullName.Substring($Root.Length + 1)
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    [pscustomobject]@{
        relative_path = $relative
        bytes = $_.Length
        last_write_time = $_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz')
        sha256 = $hash.Hash.ToLowerInvariant()
        role = if ($relative -like '*ANNULUS_CONVECTION_RESEARCH_NOTES.md') {
            'derived-research-note'
        } elseif ($relative -like 'references\legacy_prototypes\*') {
            'legacy-reference'
        } elseif ($relative -like 'references\workbooks\*') {
            'project-workbook-copy'
        } elseif ($relative -like 'references\project_uploads\*') {
            'project-source-copy'
        } else {
            'primary-or-external-source-copy'
        }
    }
}

$out = Join-Path $Root 'SOURCE_MANIFEST.csv'
$rows | Export-Csv -LiteralPath $out -NoTypeInformation -Encoding UTF8
[pscustomobject]@{ Path = $out; Files = $rows.Count; Bytes = ($rows | Measure-Object bytes -Sum).Sum }
