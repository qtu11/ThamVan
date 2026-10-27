#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$OutputDir='D:\thamvan\public\images',
  [string]$Manifest='',
  [int]$MinAutoScore=80,
  [int]$MaxPlaces=0,
  [int]$Offset=0,
  [switch]$NoOSM,
  [switch]$NoOpenverse,
  [switch]$DryRun
)
$ErrorActionPreference='Stop'
$scriptDir = if($PSScriptRoot){$PSScriptRoot}else{Split-Path -Parent $MyInvocation.MyCommand.Path}
if(-not $Manifest){$Manifest = Join-Path $scriptDir 'thamvan-places.json'}
& (Join-Path $scriptDir 'Download-ThamVanImages-V3.ps1') -Manifest $Manifest -OutputDir $OutputDir -Offset $Offset -MaxPlaces $MaxPlaces -MinAutoScore $MinAutoScore -NoOSM:$NoOSM -NoOpenverse:$NoOpenverse -DryRun:$DryRun
& (Join-Path $scriptDir 'Audit-ThamVanImages.ps1') -Manifest $Manifest -OutputDir $OutputDir
