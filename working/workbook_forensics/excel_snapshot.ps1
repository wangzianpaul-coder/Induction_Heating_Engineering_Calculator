param(
  [Parameter(Mandatory=$true)][string]$WorkbookPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [switch]$ExportPdfs,
  [switch]$Calculate
)

$ErrorActionPreference = 'Stop'
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$xl.AskToUpdateLinks = $false
$xl.AutomationSecurity = 3
$wb = $null

function TryValue([scriptblock]$Block) {
  try { & $Block } catch { $null }
}

try {
  $wb = $xl.Workbooks.Open($WorkbookPath, 0, $true)
  $before = @{}
  foreach ($ws in $wb.Worksheets) {
    $before[$ws.Name] = @{}
    $ur = $ws.UsedRange
    foreach ($c in $ur.Cells) {
      if ($c.HasFormula) { $before[$ws.Name][$c.Address($false,$false)] = $c.Value2 }
    }
  }

  if ($Calculate) {
    $xl.CalculateFullRebuild()
  }

  $result = [ordered]@{
    path = $WorkbookPath
    name = $wb.Name
    date1904 = $wb.Date1904
    precisionAsDisplayed = $wb.PrecisionAsDisplayed
    calculation = [ordered]@{
      mode = [string]$xl.Calculation
      iteration = $xl.Iteration
      maxIterations = $xl.MaxIterations
      maxChange = $xl.MaxChange
      calculationVersion = $wb.CalculationVersion
      forceFullCalculation = $wb.ForceFullCalculation
    }
    links = @()
    names = @()
    connections = @()
    sheets = @()
  }
  $links = $wb.LinkSources(1)
  if ($null -ne $links) { $result.links = @($links) }
  foreach ($n in $wb.Names) {
    $result.names += [ordered]@{name=$n.Name; refersTo=$n.RefersTo; visible=$n.Visible; value=$n.Value; comment=$n.Comment}
  }
  foreach ($c in $wb.Connections) { $result.connections += $c.Name }

  foreach ($ws in $wb.Worksheets) {
    $ur = $ws.UsedRange
    $s = [ordered]@{
      name = $ws.Name
      index = $ws.Index
      visible = $ws.Visible
      usedRange = $ur.Address($false,$false)
      usedRows = $ur.Rows.Count
      usedColumns = $ur.Columns.Count
      protection = [ordered]@{contents=$ws.ProtectContents; drawings=$ws.ProtectDrawingObjects; scenarios=$ws.ProtectScenarios}
      hiddenRows = @()
      hiddenColumns = @()
      cells = @()
      comments = @()
      validations = @()
      shapes = @()
      conditionalFormats = $ur.FormatConditions.Count
      tables = $ws.ListObjects.Count
      queryTables = $ws.QueryTables.Count
      pivotTables = $ws.PivotTables().Count
    }
    foreach ($row in $ur.Rows) { if ($row.Hidden) { $s.hiddenRows += $row.Row } }
    foreach ($col in $ur.Columns) { if ($col.Hidden) { $s.hiddenColumns += $col.Column } }
    foreach ($cell in $ur.Cells) {
      if ($null -ne $cell.Value2 -or $cell.HasFormula -or $null -ne $cell.Comment) {
        $addr = $cell.Address($false,$false)
        $rec = [ordered]@{
          address = $addr
          value = $cell.Value2
          text = [string]$cell.Text
          hasFormula = [bool]$cell.HasFormula
          formula = if($cell.HasFormula){[string]$cell.Formula}else{$null}
          formulaR1C1 = if($cell.HasFormula){[string]$cell.FormulaR1C1}else{$null}
          numberFormat = [string]$cell.NumberFormat
          style = [string]$cell.Style
          merged = [bool]$cell.MergeCells
          locked = [bool]$cell.Locked
          precedents = @()
          dependents = @()
        }
        if ($cell.HasFormula) {
          $old = $before[$ws.Name][$addr]
          $rec['cachedBefore'] = $old
          $rec['valueChangedAfterCalculation'] = if ($Calculate) { [string]$old -ne [string]$cell.Value2 } else { $null }
          try { foreach($a in $cell.DirectPrecedents.Areas){$rec.precedents += ($a.Worksheet.Name+'!'+$a.Address($false,$false))} } catch {}
          try { foreach($a in $cell.DirectDependents.Areas){$rec.dependents += ($a.Worksheet.Name+'!'+$a.Address($false,$false))} } catch {}
        }
        if ($null -ne $cell.Comment) { $rec['commentAuthor']=$cell.Comment.Author; $rec['commentText']=$cell.Comment.Text() }
        $s.cells += $rec
      }
    }
    foreach ($c in $ws.Comments) { $s.comments += [ordered]@{address=$c.Parent.Address($false,$false); author=$c.Author; text=$c.Text()} }
    try {
      $vCells = $ur.SpecialCells(-4174)
      foreach($c in $vCells.Cells){
        $s.validations += [ordered]@{address=$c.Address($false,$false);type=$c.Validation.Type;operator=$c.Validation.Operator;formula1=$c.Validation.Formula1;formula2=$c.Validation.Formula2;ignoreBlank=$c.Validation.IgnoreBlank;inCellDropdown=$c.Validation.InCellDropdown;inputTitle=$c.Validation.InputTitle;inputMessage=$c.Validation.InputMessage;errorTitle=$c.Validation.ErrorTitle;errorMessage=$c.Validation.ErrorMessage}
      }
    } catch {}
    foreach ($sh in $ws.Shapes) {
      $s.shapes += [ordered]@{
        name=$sh.Name; type=$sh.Type; left=$sh.Left; top=$sh.Top; width=$sh.Width; height=$sh.Height;
        visible=$sh.Visible; placement=$sh.Placement; topLeftCell=$sh.TopLeftCell.Address($false,$false); bottomRightCell=$sh.BottomRightCell.Address($false,$false);
        alternativeText=$sh.AlternativeText; title=(TryValue {$sh.Title}); onAction=$sh.OnAction;
        text=(TryValue {$sh.TextFrame2.TextRange.Text}); formula=(TryValue {$sh.Formula})
      }
    }
    if ($ExportPdfs) {
      $outDir = Split-Path -Parent $OutputPath
      $safe = ($ws.Name -replace '[\\/:*?"<>|]','_')
      $pdf = Join-Path $outDir (('{0:D2}' -f $ws.Index)+'_'+$safe+'.pdf')
      $ws.ExportAsFixedFormat(0,$pdf,0,$true,$false)
      $s['pdf'] = $pdf
    }
    $result.sheets += $s
  }
  $json = $result | ConvertTo-Json -Depth 20
  [IO.File]::WriteAllText($OutputPath,$json,[Text.UTF8Encoding]::new($false))
  Write-Output $OutputPath
}
finally {
  if ($null -ne $wb) { $wb.Close($false) }
  $xl.Quit()
  [Runtime.InteropServices.Marshal]::FinalReleaseComObject($xl) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
