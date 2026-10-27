#requires -Version 5.1
<# Import locally acquired photos AFTER the owner reviewed the identity and reuse permission.
Input CSV: Id,LocalFile,SourceUrl,Author,License,Confirmed
Id=HCM-0001, LocalFile can be absolute path or file name in _thamvan_manual_inbox.
Confirmed=YES only after manual review. No overwrite and no invented attribution.
#>
[CmdletBinding()]
param(
  [string]$Manifest=(Join-Path $PSScriptRoot 'thamvan-places.json'),
  [string]$OutputDir='D:\thamvan\public\images',
  [string]$ApprovalsCsv=''
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
if(-not(Test-Path -LiteralPath $Manifest)){throw 'Manifest khong ton tai'}
$data=@((Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8|ConvertFrom-Json).places)
$byid=@{};foreach($p in $data){$byid[[string]$p.id]=$p}
$reports=Join-Path $OutputDir '_thamvan_reports'
$inbox=Join-Path $OutputDir '_thamvan_manual_inbox'
New-Item -ItemType Directory -Path $reports,$inbox -Force|Out-Null
if(-not $ApprovalsCsv){$ApprovalsCsv=Join-Path $reports 'approved-local.csv'}
if(-not(Test-Path -LiteralPath $ApprovalsCsv)){
  @([pscustomobject]@{Id='HCM-0001';LocalFile='HCM-0001.jpg';SourceUrl='';Author='';License='';Confirmed='NO'}) |
      Export-Csv -LiteralPath $ApprovalsCsv -NoTypeInformation -Encoding UTF8
  Write-Host "Da tao mau: $ApprovalsCsv" -ForegroundColor Yellow
  Write-Host 'Sua file CSV (Confirmed=YES), dat anh vao _thamvan_manual_inbox, va chay lai.'
  return
}
$resultsCsv=Join-Path $reports 'download-results.csv'
$ok=0;$skipped=0;$errors=0
foreach($row in @(Import-Csv -LiteralPath $ApprovalsCsv -Encoding UTF8)){
  $id=[string]$row.Id
  if($row.Confirmed -notin @('YES','yes','true','TRUE','1')){$skipped++;continue}
  if(-not $byid.ContainsKey($id)){$errors++;Write-Warning "Invalid ID: $id";continue}
  if([string]::IsNullOrWhiteSpace($row.SourceUrl) -or [string]::IsNullOrWhiteSpace($row.License)){
    $errors++;Write-Warning "Missing photo origin or rights: $id";continue
  }
  $inputPath=[string]$row.LocalFile
  if(-not [IO.Path]::IsPathRooted($inputPath)){$inputPath=Join-Path $inbox $inputPath}
  if(-not(Test-Path -LiteralPath $inputPath)){$errors++;Write-Warning "Missing photo: $inputPath";continue}
  if([IO.Path]::GetExtension($inputPath) -notin @('.jpg','.jpeg','.png')){$errors++;Write-Warning "Unsupported format: $inputPath";continue}
  $image=$null
  try {
    $image=[Drawing.Image]::FromFile($inputPath)
    if($image.Width -lt 480 -or $image.Height -lt 300){throw 'Image is too small'}
    $destFile=$id.ToLowerInvariant()+'-manual.'+[IO.Path]::GetExtension($inputPath).TrimStart('.').ToLowerInvariant()
    $dest=Join-Path $OutputDir $destFile
    if(Test-Path $dest){$skipped++;continue}
    # Do not override any other photo already assigned to this place ID.
    if(@(Get-ChildItem $OutputDir -File|Where-Object {$_.Name -match ('^'+[regex]::Escape($id.ToLowerInvariant())+'-.*\.(jpg|jpeg|png)$')}).Count -gt 0){$skipped++;continue}
    Copy-Item -LiteralPath $inputPath -Destination $dest -ErrorAction Stop
    $record=[pscustomobject]@{
      Id=$id;Name=[string]$byid[$id].name;Status='DOWNLOADED';FileName=$destFile;
      Confidence='MANUALLY_APPROVED';FilePage=[string]$row.SourceUrl;Author=[string]$row.Author;
      License=[string]$row.License;LicenseUrl='';Source='LOCAL_REVIEWED';Note='User approved identity and reuse rights';Timestamp=[DateTime]::UtcNow.ToString('o')
    }
    if(Test-Path $resultsCsv){@($record)|Export-Csv -LiteralPath $resultsCsv -NoTypeInformation -Append -Encoding UTF8}
    else{@($record)|Export-Csv -LiteralPath $resultsCsv -NoTypeInformation -Encoding UTF8}
    $ok++
  } catch { $errors++;Write-Warning ($id+': '+$_.Exception.Message) }
  finally {if($image){$image.Dispose()}}
}
Write-Host "IMPORTED=$ok SKIPPED=$skipped ERRORS=$errors" -ForegroundColor Cyan
Write-Host 'Now rerun V3 to rebuild the frontend image index and continue missing images.'
