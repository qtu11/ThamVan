#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Manifest = $(if($PSScriptRoot){Join-Path $PSScriptRoot 'thamvan-places.json'}else{'D:\thamvan\src\data\THAMVAN_HCM_V3\thamvan-places.json'}),
    [string]$OutputDir = 'D:\thamvan\public\images'
)
$ErrorActionPreference='Stop'
if(-not(Test-Path -LiteralPath $Manifest)){throw "Khong tim thay manifest: $Manifest"}
$places=@((Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json).places)
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$reports=Join-Path $OutputDir '_thamvan_reports'
New-Item -ItemType Directory -Path $reports -Force | Out-Null
$files=@(Get-ChildItem -LiteralPath $OutputDir -File -ErrorAction SilentlyContinue | Where-Object {$_.Extension -match '^\.(jpg|jpeg|png|webp)$'})
$existing=@{}
foreach($f in $files){if($f.BaseName -match '^(hcm(?:-[a-z0-9]+)?-\d{4})(?:-|$)'){
    $id=$matches[1].ToUpperInvariant()
    if(-not $existing.ContainsKey($id)){$existing[$id]=@()}
    $existing[$id]+=$f.Name
}}
$last=@{}
$results=Join-Path $reports 'download-results.csv'
if(Test-Path $results){foreach($r in @(Import-Csv $results -Encoding UTF8)){$last[$r.Id]=$r}}
$allRows=New-Object 'System.Collections.Generic.List[object]'
$missRows=New-Object 'System.Collections.Generic.List[object]'
foreach($p in $places){
    $id=[string]$p.id; $has=$existing.ContainsKey($id)
    $prior=''
    if($last.ContainsKey($id)){$prior=[string]$last[$id].Status}
    $query=([string]$p.name)+' '+([string]$p.address)
    $row=[pscustomobject]@{
        Id=$id;Name=[string]$p.name;Category=[string]$p.category;Address=[string]$p.address;
        HasGPS=($null -ne $p.lat -and $null -ne $p.lon);
        HasImage=$has;Files= $(if($has){$existing[$id] -join ' | '}else{''});
        PriorStatus=$prior;SearchCommons=('https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search='+[uri]::EscapeDataString($query));
        SearchGoogle=('https://www.google.com/search?tbm=isch&q='+[uri]::EscapeDataString($query))
    }
    $allRows.Add($row)
    if(-not $has){$missRows.Add($row)}
}
$missingCsv=Join-Path $reports 'missing-current.csv'
$allCsv=Join-Path $reports 'coverage-current.csv'
$allRows.ToArray() | Export-Csv -LiteralPath $allCsv -NoTypeInformation -Encoding UTF8
if($missRows.Count){$missRows.ToArray() | Export-Csv -LiteralPath $missingCsv -NoTypeInformation -Encoding UTF8}
else { 'Id,Name,Category,Address,HasGPS,HasImage,Files,PriorStatus,SearchCommons,SearchGoogle' | Set-Content $missingCsv -Encoding UTF8 }
$categories=@($allRows | Group-Object Category | ForEach-Object {
  $group=@($_.Group)
  [pscustomobject]@{Category=[string]$_.Name;Total=$group.Count;WithImages=@($group|Where-Object HasImage).Count;Missing=@($group|Where-Object {-not $_.HasImage}).Count}
}|Sort-Object Missing -Descending)
$categories | Export-Csv -LiteralPath (Join-Path $reports 'coverage-by-category.csv') -NoTypeInformation -Encoding UTF8
$withImages=@($allRows|Where-Object HasImage).Count
$summary=[pscustomobject]@{
    TotalPlaces=$places.Count;HasImages=$withImages;Missing=$missRows.Count;
    CoveragePercent=[Math]::Round(100*$withImages/[Math]::Max(1,$places.Count),2);
    FilesInFolder=$files.Count;UnmappedFiles=($files.Count-@($files|Where-Object {$_.BaseName -match '^hcm(?:-[a-z0-9]+)?-\d{4}(?:-|$)'}).Count);
    AuditedUtc=([DateTime]::UtcNow.ToString('o'))
}
[IO.File]::WriteAllText((Join-Path $reports 'coverage-summary.json'),(ConvertTo-Json $summary -Depth 5),[Text.UTF8Encoding]::new($false))
Write-Host ('TOTAL: '+$places.Count+' | IMAGES: '+$withImages+' | MISSING: '+$missRows.Count+' | COVERAGE: '+$summary.CoveragePercent+'%') -ForegroundColor Cyan
Write-Host "CSV missing: $missingCsv"
Write-Host "CSV all:     $allCsv"
Write-Host "CSV group:   $(Join-Path $reports 'coverage-by-category.csv')"
