#requires -Version 5.1
<#
THAM VAN HCMC V3 - missing photo recovery and source audit
Uses Wikimedia Commons + Wikidata official APIs. Does NOT scrape Google image pages.
Designed for Windows 11 / Windows PowerShell 5.1 and PowerShell 7 on Windows.
Only high-confidence matches with eligible licenses are auto-saved.
#>
[CmdletBinding()]
param(
    [string]$Manifest = $(if($PSScriptRoot){Join-Path $PSScriptRoot 'thamvan-places.json'}else{'D:\thamvan\src\data\THAMVAN_HCM_V3\thamvan-places.json'}),
    [string]$OutputDir = 'D:\thamvan\public\images',
    [string]$Contact = 'https://github.com/qtu11',
    [int]$Offset = 0,
    [int]$MaxPlaces = 0,
    [int]$MaxWidth = 1440,
    [int]$ThrottleMs = 1100,
    [switch]$DryRun,
    [switch]$NoOpenverse,
    [switch]$NoOSM,
    [int]$MinAutoScore = 80
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Drawing
$script:UserAgent = "ThamVanHeritagePhotoImporter/3.0 ($Contact) PowerShell"
$script:ThrottleMs = [Math]::Max(600, $ThrottleMs)
$script:Commons = 'https://commons.wikimedia.org/w/api.php'
$script:Wikidata = 'https://www.wikidata.org/w/api.php'
$script:Overpass = 'https://overpass-api.de/api/interpreter'
$script:OsmOffline = $false
$script:WikipediaVI = 'https://vi.wikipedia.org/w/api.php'
$script:WikipediaEN = 'https://en.wikipedia.org/w/api.php'
$script:StartUtc = [DateTime]::UtcNow

function Get-PlainText([object]$Value) {
    if ($null -eq $Value) { return '' }
    if ($Value -is [string]) { $raw = $Value }
    elseif ($null -ne $Value.value) { $raw = [string]$Value.value }
    else { return '' }
    return ([System.Net.WebUtility]::HtmlDecode([regex]::Replace($raw, '<[^>]+>', ' '))).Trim()
}
function Normalize-Text([string]$Text) {
    if ([string]::IsNullOrWhiteSpace($Text)) { return '' }
    $Text = $Text.ToLowerInvariant().Replace('đ','d').Replace('Đ','d')
    $decomposed = $Text.Normalize([Text.NormalizationForm]::FormD)
    $builder = New-Object System.Text.StringBuilder
    foreach ($ch in $decomposed.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($ch)
        }
    }
    return ([regex]::Replace($builder.ToString(), '[^a-z0-9]+', ' ').Trim() -replace '\s+', ' ')
}
function New-Slug([string]$Text) {
    $slug = (Normalize-Text $Text).Replace(' ','-')
    if ($slug.Length -gt 72) { $slug=$slug.Substring(0,72).Trim('-') }
    if ([string]::IsNullOrWhiteSpace($slug)) { return 'dia-diem' }
    return $slug
}
function Get-Url([string]$Base, [hashtable]$Params) {
    $pieces = foreach ($key in ($Params.Keys | Sort-Object)) {
        [uri]::EscapeDataString([string]$key) + '=' + [uri]::EscapeDataString([string]$Params[$key])
    }
    return $Base + '?' + ($pieces -join '&')
}
function Invoke-WikiJson([string]$Base, [hashtable]$Params) {
    $Params['format'] = 'json'
    $Params['formatversion'] = '2'
    $uri = Get-Url $Base $Params
    for ($attempt=0; $attempt -lt 5; $attempt++) {
        Start-Sleep -Milliseconds $script:ThrottleMs
        try {
            $r = Invoke-RestMethod -Uri $uri -UserAgent $script:UserAgent -Headers @{'Accept'='application/json'} -TimeoutSec 45 -ErrorAction Stop
            if ($null -ne $r.error) { throw "API: $($r.error.code) - $($r.error.info)" }
            return $r
        } catch {
            $status = 0; $retry = 0
            if ($null -ne $_.Exception.Response) {
                try { $status = [int]$_.Exception.Response.StatusCode } catch { }
                try { $retry = [int]$_.Exception.Response.Headers['Retry-After'] } catch { }
            }
            if (($status -eq 429 -or $status -ge 500 -or $status -eq 0) -and $attempt -lt 4) {
                $sleepSeconds = [Math]::Max($retry, [Math]::Min(75, 5 * [Math]::Pow(2,$attempt)))
                Write-Warning "API tam thoi loi ($status). Thu lai sau khi gia han nhip yeu cau."
                Start-Sleep -Seconds ([int]$sleepSeconds)
            } else { throw }
        }
    }
    return $null
}
function Get-DistanceKm([double]$Lat1,[double]$Lon1,[double]$Lat2,[double]$Lon2) {
    $r = [Math]::PI/180
    $a = [Math]::Pow([Math]::Sin(($Lat2-$Lat1)*$r/2),2) + [Math]::Cos($Lat1*$r)*[Math]::Cos($Lat2*$r)*[Math]::Pow([Math]::Sin(($Lon2-$Lon1)*$r/2),2)
    return 2*6371*[Math]::Asin([Math]::Min(1,[Math]::Sqrt($a)))
}
function Get-FileTitleFromUrl([string]$Url) {
    if ([string]::IsNullOrWhiteSpace($Url)) { return $null }
    if ($Url -match 'commons\.wikimedia\.org/wiki/Special:(?:Redirect/file|FilePath)/(.+?)(\?.*)?$') {
        return 'File:' + [uri]::UnescapeDataString($Matches[1]).Replace('_',' ')
    }
    if ($Url -match 'commons\.wikimedia\.org/wiki/(File:.+?)(\?.*)?$') {
        return [uri]::UnescapeDataString($Matches[1]).Replace('_',' ')
    }
    if ($Url -match '^File:.+\.(?:jpg|jpeg|png)$') { return [uri]::UnescapeDataString($Url) }
    if ($Url -match '^https://upload\.wikimedia\.org/wikipedia/commons/(?:thumb/)?[^?#]+/([^/?#]+?\.(?:jpg|jpeg|png))$') {
        return 'File:' + [uri]::UnescapeDataString($Matches[1]).Replace('_',' ')
    }
    return $null
}
function Get-CommonsFilesByTitles([string[]]$Titles) {
    $titles = @($Titles | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
    if ($titles.Count -eq 0) { return @() }
    $r = Invoke-WikiJson $script:Commons @{
        action='query'; titles=($titles -join '|'); prop='imageinfo';
        iiprop='url|size|mime|extmetadata'; iiurlwidth=1600;
        iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|UsageTerms|Credit|ImageDescription|ObjectName|Restrictions'
    }
    if (-not $r.query -or -not $r.query.pages) { return @() }
    return @($r.query.pages | Where-Object { $_.imageinfo -and $_.imageinfo.Count -gt 0 -and -not $_.missing })
}
function Get-CommonsSearchTitles([string]$Query) {
    if ([string]::IsNullOrWhiteSpace($Query)) { return @() }
    $r = Invoke-WikiJson $script:Commons @{
        action='query'; list='search'; srsearch=$Query; srnamespace='6'; srlimit='15'; srprop='';
    }
    if (-not $r.query -or -not $r.query.search) { return @() }
    return @($r.query.search | ForEach-Object { $_.title })
}
function Get-WikidataImages([object]$Place) {
    $result = @()
    $queries = @($Place.aliases | Select-Object -First 2)
    foreach ($query in $queries) {
        if ([string]::IsNullOrWhiteSpace($query)) { continue }
        $r = Invoke-WikiJson $script:Wikidata @{ action='wbsearchentities'; search=$query; language='vi'; uselang='vi'; type='item'; limit='6' }
        if (-not $r.search) { continue }
        $ids = @($r.search | Where-Object { $_.id -match '^Q\d+$' } | Select-Object -First 5 | ForEach-Object { $_.id })
        if ($ids.Count -eq 0) { continue }
        $details = Invoke-WikiJson $script:Wikidata @{ action='wbgetentities'; ids=($ids -join '|'); props='labels|aliases|descriptions|claims'; languages='vi|en' }
        if (-not $details.entities) { continue }
        foreach ($entityProp in $details.entities.PSObject.Properties) {
            $e = $entityProp.Value
            if (-not $e.claims -or -not $e.claims.P18) { continue }
            $labels = @()
            foreach($lab in @($e.labels.vi,$e.labels.en)) { if ($lab -and $lab.value) { $labels += [string]$lab.value } }
            foreach($lang in @('vi','en')) {
                $als = $e.aliases.$lang
                if ($als) { foreach($al in $als) { if($al.value) { $labels += [string]$al.value } } }
            }
            $placeNames = @($Place.aliases | ForEach-Object { Normalize-Text ([string]$_) })
            $exact = $false
            foreach($lab in $labels) { if ($placeNames -contains (Normalize-Text $lab)) { $exact = $true; break } }
            if (-not $exact) { continue }
            $coords = @($e.claims.P625)
            $distance = $null
            if ($coords.Count -gt 0 -and $Place.lat -ne $null -and $Place.lon -ne $null) {
                try {
                    $geo = $coords[0].mainsnak.datavalue.value
                    $distance = Get-DistanceKm ([double]$Place.lat) ([double]$Place.lon) ([double]$geo.latitude) ([double]$geo.longitude)
                } catch { }
                if ($null -ne $distance -and $distance -gt 2.5) { continue }
            }
            $desc = ((@($e.descriptions.vi.value, $e.descriptions.en.value) | Where-Object { $_ }) -join ' ')
            $descNorm = Normalize-Text $desc
            $cityMention = $descNorm -match 'ho chi minh|sai gon|saigon|thu duc|binh duong|vung tau|ba ria|viet nam|vietnam'
            $hasGoodCoord = ($null -ne $distance -and $distance -le 2.5)
            if (-not $hasGoodCoord -and -not $cityMention) { continue }
            foreach ($claim in @($e.claims.P18 | Select-Object -First 2)) {
                try {
                    $filename = [string]$claim.mainsnak.datavalue.value
                    if ($filename -match '\.(jpe?g|png|webp|tiff?)$') {
                        $result += [pscustomobject]@{ Title=('File:'+$filename); Match='WIKIDATA_P18'; WikidataId=$e.id; DistanceKm=$distance; Verified=$hasGoodCoord; Description=$desc }
                    }
                } catch { }
            }
        }
        if ($result.Count -gt 0) { break }
    }
    return @($result | Sort-Object Title -Unique)
}
function Get-LicenseInfo([object]$Page) {
    $ii = $Page.imageinfo[0]
    $meta = $ii.extmetadata
    $license = Get-PlainText $meta.LicenseShortName
    $licenseUrl = Get-PlainText $meta.LicenseUrl
    $author = Get-PlainText $meta.Artist
    $credit = Get-PlainText $meta.Credit
    $caption = Get-PlainText $meta.ImageDescription
    $objectName = Get-PlainText $meta.ObjectName
    $restriction = Get-PlainText $meta.Restrictions
    $pass = ($license -match '(?i)\bCC\s*(?:BY|0)\b|creative\s+commons\s+(?:attribution|zero)|public\s+domain|\bPD-') -and ($license -notmatch '(?i)NC|ND|non.?commercial|no.?derivatives')
    $mime = [string]$ii.mime
    if ($mime -notin @('image/jpeg','image/png')) { $pass=$false }
    $url = [string]$ii.thumburl
    if ([string]::IsNullOrWhiteSpace($url)) { $url=[string]$ii.url }
    if ([string]::IsNullOrWhiteSpace($url)) { $pass=$false }
    try { if (([uri]$url).Host -ne 'upload.wikimedia.org') { $pass=$false } } catch { $pass=$false }
    return [pscustomobject]@{
        Allowed=$pass; License=$license; LicenseUrl=$licenseUrl; Author=$author;
        Credit=$credit; Caption=$caption; ObjectName=$objectName; Restrictions=$restriction;
        DownloadUrl=$url; SourcePage=('https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString($Page.title.Replace(' ','_')));
        Width=[int]$ii.width; Height=[int]$ii.height; Mime=$mime
    }
}
function Test-PlaceFileMatch([object]$Place,[string]$Title) {
    $fileName=[regex]::Replace($Title, '^File:', '', 'IgnoreCase')
    $fileName=[regex]::Replace($fileName, '\.(jpeg|jpg|png|webp|tif|tiff)$', '', 'IgnoreCase')
    $titleNorm=Normalize-Text $fileName
    if ($titleNorm -match '\b(map|logo|banner|poster|icon|location map|flag|coat of arms|screenshot|locator)\b') { return 'REJECT' }
    $geoBad = 'hanoi|ha noi|da nang|da lat|can tho|hue city|thua thien hue|hai phong|nha trang|ha long|quang ninh'
    if ($titleNorm -match $geoBad) {
        $placeNorm=Normalize-Text ([string]$Place.name)
        if ($placeNorm -notmatch $geoBad) { return 'REJECT' }
    }
    foreach($rawName in @($Place.aliases)) {
        $norm = Normalize-Text ([string]$rawName)
        $tokenCount = @($norm.Split(' ',[StringSplitOptions]::RemoveEmptyEntries)).Count
        if ($norm.Length -ge 12 -and $tokenCount -ge 3 -and $titleNorm.Contains($norm)) { return 'HIGH' }
    }
    $head = Normalize-Text ([string]$Place.name)
    $tokens = @($head.Split(' ',[StringSplitOptions]::RemoveEmptyEntries))
    if ($tokens.Count -ge 3) {
        $hits=0
        foreach($token in $tokens) { if (@($titleNorm.Split(' ')) -contains $token) { $hits++ } }
        if ($hits -ge [Math]::Ceiling($tokens.Count*0.80)) { return 'REVIEW' }
    }
    return 'REJECT'
}
function Test-GeographyEvidence([object]$Place,[object]$Page,[object]$Info) {
    $text=Normalize-Text (($Page.title) + ' ' + ($Info.Caption) + ' ' + ($Info.ObjectName))
    if ($text -match 'ho chi minh|sai gon|saigon|tphcm|thu duc|cho lon|binh duong|thu dau mot|di an|thuan an|vung tau|ba ria|hoc mon|cu chi|can gio|binh thanh|go vap|quan 1|quan 3|quan 5|quan 7|quan 10|quan 11|tan binh|phu nhuan|binh chanh|binh tan') {
        return $true
    }
    # When no city is mentioned, generic photos cannot be independently placed.
    # Very distinctive names with four+ words may be proposed for review instead.
    return $false
}
function Save-ImageAsJpeg([string]$Url,[string]$Dest,[int]$LongestSide) {
    $u=[uri]$Url
    if ($u.Scheme -ne 'https' -or $u.Host -ne 'upload.wikimedia.org') { throw 'Only upload.wikimedia.org images may be downloaded' }
    $temp=[IO.Path]::Combine([IO.Path]::GetTempPath(),('thamvan-'+[guid]::NewGuid().ToString('N')+'.part'))
    try {
        Start-Sleep -Milliseconds ([Math]::Max(400,$script:ThrottleMs))
        Invoke-WebRequest -Uri $Url -UserAgent $script:UserAgent -OutFile $temp -TimeoutSec 120 -ErrorAction Stop | Out-Null
        if ((Get-Item -LiteralPath $temp).Length -lt 12000) { throw 'Image too small to be a useful photograph' }
        $img=$null; $bmp=$null; $graphics=$null
        try {
            $img=[Drawing.Image]::FromFile($temp)
            if ($img.Width -lt 480 -or $img.Height -lt 300) { throw 'Resolution too low' }
            $scale=[Math]::Min(1.0,([double]$LongestSide/[Math]::Max($img.Width,$img.Height)))
            $w=[int][Math]::Round($img.Width*$scale);$h=[int][Math]::Round($img.Height*$scale)
            $bmp=New-Object Drawing.Bitmap($w,$h)
            $graphics=[Drawing.Graphics]::FromImage($bmp)
            $graphics.Clear([Drawing.Color]::White)
            $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::HighQuality
            $graphics.DrawImage($img,0,0,$w,$h)
            $encoder=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
            $paramset=New-Object Drawing.Imaging.EncoderParameters(1)
            $paramset.Param[0]=New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality,[long]88)
            $tmpJpg=$Dest+'.tmp.jpg'
            $bmp.Save($tmpJpg,$encoder,$paramset)
            if ((Get-Item -LiteralPath $tmpJpg).Length -lt 5000) { throw 'JPEG output too small' }
            Move-Item -LiteralPath $tmpJpg -Destination $Dest -Force
        } finally {
            if($graphics){$graphics.Dispose()}; if($bmp){$bmp.Dispose()}; if($img){$img.Dispose()}
        }
    } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
}
function Append-Row([string]$CsvPath,[object]$Row) {
    $append=Test-Path -LiteralPath $CsvPath
    if($append){ @($Row) | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Append -Encoding UTF8 }
    else{ @($Row) | Export-Csv -LiteralPath $CsvPath -NoTypeInformation -Encoding UTF8 }
}
function Write-JsonFile([string]$Path,[object]$Object) {
    $content = ConvertTo-Json -InputObject $Object -Depth 9
    [IO.File]::WriteAllText($Path,$content,[Text.UTF8Encoding]::new($false))
}
function Update-FrontendIndex([string]$ImagesDir,[string]$RecordsCsv) {
    $items=@{}
    $indexPath=Join-Path $ImagesDir 'thamvan-image-index.json'
    if(Test-Path -LiteralPath $indexPath){
        foreach($entry in @(Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8 | ConvertFrom-Json)){
            $items[[string]$entry.id]=$entry
        }
    }
    if (Test-Path -LiteralPath $RecordsCsv) {
        $rows=@(Import-Csv -LiteralPath $RecordsCsv -Encoding UTF8)
        foreach ($group in @($rows | Group-Object Id)) {
            $last=@($group.Group)[-1]
            if ($last.Status -eq 'DOWNLOADED' -or $last.Status -eq 'ALREADY_DOWNLOADED') {
                if (-not $last.FileName) { continue }
                if (Test-Path -LiteralPath (Join-Path $ImagesDir $last.FileName)) {
                    $items[[string]$last.Id] = [pscustomobject]@{id=$last.Id;name=$last.Name;image=('/images/'+$last.FileName);type='LOCATION_PHOTO';status='PENDING_REVIEW';source=$last.FilePage;attribution=[pscustomobject]@{author=$last.Author;license=$last.License;licenseUrl=$last.LicenseUrl;source=$last.FilePage};review=[pscustomobject]@{identity='pending';license='pending'};confidence=$last.Confidence}
                }
            }
        }
    }
    Write-JsonFile $indexPath @($items.Values | Sort-Object id)
}

# V3: expanded evidence for photos beyond simple filename search.
function New-Hint([string]$Title,[string]$Source,[double]$Meters,[string]$Context){
    return [pscustomobject]@{Title=$Title;Source=$Source;Meters=$Meters;Context=$Context}
}
function Find-GpsHints([object]$Place){
    if($null -eq $Place.lat -or $null -eq $Place.lon){return @()}
    $lat=([double]$Place.lat).ToString('0.#######',[Globalization.CultureInfo]::InvariantCulture)
    $lon=([double]$Place.lon).ToString('0.#######',[Globalization.CultureInfo]::InvariantCulture)
    $r=Invoke-WikiJson $script:Commons @{action='query';list='geosearch';gscoord=($lat+'|'+$lon);gsradius='250';gsnamespace='6';gslimit='30';gsprimary='all'}
    $arr=@()
    foreach($g in @($r.query.geosearch)) {if($g.title){$arr+=New-Hint ([string]$g.title) 'GPS' ([double]$g.dist) 'Photo coordinate near place coordinate'}}
    return @($arr)
}
function Find-OsmHints([object]$Place){
    if ($script:OsmOffline -or $NoOSM -or $null -eq $Place.lat -or $null -eq $Place.lon) { return @() }
    $lat=([double]$Place.lat).ToString('0.#######',[Globalization.CultureInfo]::InvariantCulture)
    $lon=([double]$Place.lon).ToString('0.#######',[Globalization.CultureInfo]::InvariantCulture)
    $q='[out:json][timeout:35];(nwr(around:90,'+$lat+','+$lon+')["wikimedia_commons"];nwr(around:90,'+$lat+','+$lon+')["image"];);out center;'
    $u=Get-Url $script:Overpass @{data=$q}
    try {
        Start-Sleep -Milliseconds 1400
        $resp=Invoke-RestMethod -Uri $u -TimeoutSec 50 -UserAgent $script:UserAgent -Headers @{'Accept'='application/json'}
    } catch {
        # Stop further OSM requests during this run rather than repeating a failing network call 341 times.
        $script:OsmOffline=$true
        Write-Warning ('Overpass unavailable; OSM photo lookup disabled this run: '+$_.Exception.Message)
        return @()
    }
    $arr=@(); $names=@($Place.aliases | ForEach-Object { Normalize-Text ([string]$_) })
    foreach($ob in @($resp.elements)) {
        if(-not $ob.tags){continue}
        $osmNames=@([string]$ob.tags.name,[string]$ob.tags.'name:vi',[string]$ob.tags.'alt_name' | Where-Object {$_})
        $same=$false
        foreach($nm in $osmNames) {
            $key=Normalize-Text ([string]$nm)
            if ($key.Length -ge 7 -and $names -contains $key) {$same=$true;break}
        }
        # Never transfer a photo merely because an unnamed POI is nearby.
        if(-not $same){continue}
        $elat=$null;$elon=$null
        if($null -ne $ob.lat){$elat=[double]$ob.lat;$elon=[double]$ob.lon}
        elseif($ob.center){$elat=[double]$ob.center.lat;$elon=[double]$ob.center.lon}
        if($null -eq $elat){continue}
        $meters=1000*(Get-DistanceKm ([double]$Place.lat) ([double]$Place.lon) $elat $elon)
        if($meters -gt 130){continue}
        foreach($val in @([string]$ob.tags.wikimedia_commons,[string]$ob.tags.image)) {
            $file=Get-FileTitleFromUrl $val
            if($file -and $file -match '(?i)\\.(jpg|jpeg|png)$') {
                $arr+=New-Hint $file 'OSM_TAG' $meters ($ob.type+'/'+$ob.id+' '+$ob.tags.name)
            }
        }
    }
    return @($arr | Sort-Object Title -Unique)
}

function Find-WikipediaHints([object]$Place,[string]$Api,[string]$Language){
    $r=Invoke-WikiJson $Api @{action='query';generator='search';gsrsearch=[string]$Place.name;gsrnamespace='0';gsrlimit='8';prop='pageimages|coordinates';piprop='name';colimit='1'}
    $arr=@();$norm=Normalize-Text ([string]$Place.name)
    foreach($pg in @($r.query.pages)){
        if(-not $pg.pageimage){continue}
        $titleNorm=Normalize-Text ([string]$pg.title)
        if($titleNorm -ne $norm -and -not ($norm.Length -ge 12 -and $titleNorm.Contains($norm))){continue}
        $meters=999999.0
        if($null -ne $Place.lat -and $pg.coordinates){
            try{$meters=1000*(Get-DistanceKm ([double]$Place.lat) ([double]$Place.lon) ([double]$pg.coordinates[0].lat) ([double]$pg.coordinates[0].lon))}catch{}
            if($meters -gt 2500){continue}
        }
        $arr+=New-Hint ('File:'+([string]$pg.pageimage)) ('WIKI_'+$Language) $meters ([string]$pg.title)
    }
    return @($arr)
}
function Find-CategoryHints([object]$Place){
    $r=Invoke-WikiJson $script:Commons @{action='query';list='search';srnamespace='14';srsearch=[string]$Place.name;srlimit='5';srprop=''}
    $name=Normalize-Text ([string]$Place.name);$arr=@()
    foreach($c in @($r.query.search)){
        $cat=Normalize-Text ([string]$c.title)
        if($cat -ne ('category '+$name) -and -not ($name.Length -ge 12 -and $cat.Contains($name))){continue}
        $r2=Invoke-WikiJson $script:Commons @{action='query';list='categorymembers';cmtitle=[string]$c.title;cmnamespace='6';cmtype='file';cmlimit='30'}
        foreach($f in @($r2.query.categorymembers)){
            if($f.title){$arr+=New-Hint ([string]$f.title) 'CATEGORY' 999999 ([string]$c.title)}
        }
        if($arr.Count -ge 20){break}
    }
    return @($arr)
}
function Find-TextHints([object]$Place){
    $arr=@();$queries=@($Place.aliases | Select-Object -First 2)
    $simple=Normalize-Text ([string]$Place.name)
    if($simple.Length -gt 6){$queries+=,$simple}
    foreach($q in @($queries | Select-Object -Unique -First 3)){
        if([string]::IsNullOrWhiteSpace([string]$q)){continue}
        foreach($t in @(Get-CommonsSearchTitles ([string]$q))){$arr+=New-Hint ([string]$t) 'COMMONS_TEXT' 999999 ([string]$q)}
        if($arr.Count -ge 28){break}
    }
    return @($arr)
}
function Get-Overlap([string]$Name,[string]$Title){
    $tokens=@((Normalize-Text $Name).Split(' ') | Where-Object {$_.Length -ge 3})
    if($tokens.Count -eq 0){return 0.0}
    $text=@((Normalize-Text $Title).Split(' '));$n=0
    foreach($t in $tokens){if($text -contains $t){$n++}}
    return ([double]$n/[double]$tokens.Count)
}
function Get-MatchScore([object]$Place,[object]$Hint,[object]$Page,[object]$Info){
    if(-not $Info.Allowed -or $Info.Width -lt 500 -or $Info.Height -lt 300){return 0}
    $fn=Normalize-Text ([string]$Page.title)
    if($fn -match '\b(logo|poster|banner|map|flag|illustration|icon|advertisement|screenshot|menu|floor plan|diagram)\b'){return 0}
    $best=0.0
    foreach($n in @($Place.aliases)){
        $norm=Normalize-Text ([string]$n)
        if($norm.Length -lt 6){continue}
        $over=Get-Overlap $norm $fn
        if($fn.Contains($norm)){$over=1.0}
        if($over -gt $best){$best=$over}
    }
    $ctx=Normalize-Text ([string]$Page.title+' '+[string]$Info.Caption+' '+[string]$Hint.Context)
    $geoMention=(Test-GeographyEvidence $Place $Page $Info)
    $wrongCity='\b(ha noi|hanoi|da lat|da nang|hai phong|quang ninh|nha trang|hue city|can tho|ha long)\b'
    if($ctx -match $wrongCity -and (Normalize-Text ([string]$Place.name)) -notmatch $wrongCity){return 0}
    $source=[string]$Hint.Source;$score=0
    if($source -eq 'MANUAL'){return 100}
    if($source -eq 'DATASET'){
        if($best -ge 0.7 -or $geoMention){return 96}
        return 85 # Dataset supplies a link, not independently verified visual identity
    }
    if($source -eq 'WIKIDATA'){
        if($Hint.Meters -le 250){$score=98}elseif($Hint.Meters -le 2500){$score=93}elseif($geoMention){$score=86}else{$score=69}
    }elseif($source -like 'WIKI_*'){
        if($Hint.Meters -le 250){$score=96}elseif($Hint.Meters -le 2500){$score=93}elseif($geoMention){$score=83}else{$score=69}
    }elseif($source -eq 'OSM_TAG'){
        # Match by OSM exact name AND short geographic distance; file identity still checked below.
        if($Hint.Meters -le 90 -and $best -ge 0.75){$score=97}
        elseif($Hint.Meters -le 130 -and $best -ge 0.5){$score=84}
        else{$score=71}
    }elseif($source -eq 'GPS'){
        if($Hint.Meters -le 100 -and $best -ge 0.9){$score=96}
        elseif($Hint.Meters -le 200 -and $best -ge 0.8){$score=93}
        elseif($best -ge 0.5){$score=75}
        else{$score=55}
    }elseif($source -eq 'CATEGORY'){
        if($best -ge 0.95 -and $geoMention){$score=93}
        elseif($best -ge 0.8){$score=80}
        else{$score=67}
    }else{
        if($best -ge 0.95 -and $geoMention){$score=93}
        elseif($best -ge 0.75 -and $geoMention){$score=77}
        elseif($best -ge 0.95){$score=69}
        else{$score=45}
    }
    if($source -in @('COMMONS_TEXT','CATEGORY') -and $Place.category -match '(Ngân hàng|Tiểu học|THPT|cà phê|quán ăn|khách sạn|spa|nhà hàng|bệnh viện|phòng giao dịch)'){
        if($Hint.Meters -gt 200){$score=[Math]::Min(79,$score)}
    }
    return [int]$score
}
function Find-OpenverseReview([object]$Place){
    $arr=@()
    $url=Get-Url 'https://api.openverse.org/v1/images/' @{q=([string]$Place.name+' Vietnam');page_size='10';license_type='commercial'}
    Start-Sleep -Milliseconds ([Math]::Max(900,$script:ThrottleMs))
    try{$r=Invoke-RestMethod -Uri $url -TimeoutSec 45 -UserAgent $script:UserAgent -ErrorAction Stop}
    catch{return @()}
    foreach($im in @($r.results)){
        if(-not $im.title -or -not $im.foreign_landing_url -or -not $im.thumbnail){continue}
        if([string]$im.license -match '(?i)nc|nd'){continue}
        $over=Get-Overlap ([string]$Place.name) ([string]$im.title)
        if($over -lt 0.68){continue}
        $arr += [pscustomobject]@{Id=[string]$Place.id;Name=[string]$Place.name;Address=[string]$Place.address;
            Score=[int](35+40*$over);Provider='OPENVERSE_REVIEW';CommonsFileTitle='';ImageTitle=[string]$im.title;
            PageUrl=[string]$im.foreign_landing_url;ThumbnailUrl=[string]$im.thumbnail;Author=[string]$im.creator;
            License=([string]$im.license+' '+[string]$im.license_version);Reason='Requires human review and direct licensing check'}
    }
    return @($arr)
}
# ---------- V3 resume-aware batch ----------
if(-not(Test-Path -LiteralPath $Manifest)){throw "Missing data file: $Manifest"}
$MinAutoScore=[Math]::Max(70,[Math]::Min(100,$MinAutoScore))
$dataset=Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$all=@($dataset.places)
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$reports=Join-Path $OutputDir '_thamvan_reports'
New-Item -ItemType Directory -Path $reports -Force | Out-Null
$resultsCsv=Join-Path $reports 'download-results.csv'
$reviewCsv=Join-Path $reports 'review-candidates-v3.csv'
$missingCsv=Join-Path $reports 'missing-v3.csv'
$errorsCsv=Join-Path $reports 'errors-v3.csv'
$approvedCsv=Join-Path $reports 'manually-approved.csv'
if(-not(Test-Path $approvedCsv)){'Id,CommonsFileTitle' | Set-Content -LiteralPath $approvedCsv -Encoding UTF8}
$approved=@{}
foreach($row in @(Import-Csv -LiteralPath $approvedCsv -Encoding UTF8)){
    if($row.Id -match '^HCM-(?:[A-Z0-9]+-)?\d{4}$' -and $row.CommonsFileTitle -match '^File:'){$approved[$row.Id]=[string]$row.CommonsFileTitle}
}
$lastResult=@{}
if(Test-Path $resultsCsv){foreach($r in @(Import-Csv -LiteralPath $resultsCsv -Encoding UTF8)){
    if($r.Status -in @('DOWNLOADED','ALREADY_DOWNLOADED') -and $r.FileName -and (Test-Path -LiteralPath (Join-Path $OutputDir $r.FileName))){$lastResult[$r.Id]=$true}
}}
$batch=@($all | Select-Object -Skip ([Math]::Max(0,$Offset)))
if($MaxPlaces -gt 0){$batch=@($batch | Select-Object -First $MaxPlaces)}
Write-Host "THAM VAN V3 - records total: $($all.Count); in this batch: $($batch.Count)" -ForegroundColor Cyan
Write-Host "Images: $OutputDir" -ForegroundColor Cyan
Write-Host "Skip already-downloaded, retain sources, put unclear candidates into manual review." -ForegroundColor Gray
$usedImages=@{}
if(Test-Path $resultsCsv) {
    foreach($rec in @(Import-Csv -LiteralPath $resultsCsv -Encoding UTF8)) {
        if($rec.Status -eq 'DOWNLOADED' -and $rec.FilePage){
            if(-not $usedImages.ContainsKey([string]$rec.FilePage)){$usedImages[[string]$rec.FilePage]=[string]$rec.Id}
        }
    }
}
$success=0;$uncertain=0;$absent=0;$failure=0;$skipped=0;$apiFailures=0;$i=0
foreach($p in $batch){
    $i++;$id=[string]$p.id;$name=[string]$p.name
    $fileName=$id.ToLowerInvariant()+'-'+(New-Slug $name)+'.jpg'
    $dest=Join-Path $OutputDir $fileName
    if($lastResult.ContainsKey($id) -or (Test-Path -LiteralPath $dest)){$skipped++;continue}
    Write-Host "[$i/$($batch.Count)] $id $name"
    $out=[ordered]@{Id=$id;Name=$name;Status='NOT_FOUND';FileName='';Confidence='';FilePage='';Author='';License='';LicenseUrl='';Source='';Note='';Timestamp=([DateTime]::UtcNow.ToString('o'))}
    try{
        $hints=@();$issues=@()
        if($approved.ContainsKey($id)){$hints+=New-Hint ([string]$approved[$id]) 'MANUAL' 999999 'Human approved'}
        $direct=Get-FileTitleFromUrl ([string]$p.sourceImageUrl)
        if(-not $direct){$direct=Get-FileTitleFromUrl ([string]$p.sourceImagePage)}
        if($direct){$hints+=New-Hint $direct 'DATASET' 999999 'File direct URL from source dataset'}
        try{
            foreach($wd in @(Get-WikidataImages $p)){
                $meters=999999.0
                if($null -ne $wd.DistanceKm){$meters=[double]$wd.DistanceKm*1000}
                $hints+=New-Hint ([string]$wd.Title) 'WIKIDATA' $meters ([string]$wd.Description)
            }
        }catch{$apiFailures++;$issues+='Wikidata unavailable'}
        foreach($wiki in @(@{Api=$script:WikipediaVI;Lang='VI'},@{Api=$script:WikipediaEN;Lang='EN'})){
            try{$hints+=@(Find-WikipediaHints $p $wiki.Api $wiki.Lang)}catch{$apiFailures++;$issues+=('Wikipedia '+$wiki.Lang+' unavailable')}
        }
        if($null -ne $p.lat -and $null -ne $p.lon){
            try{$hints+=@(Find-GpsHints $p)}catch{$apiFailures++;$issues+='Commons geosearch unavailable'}
            if(-not $NoOSM){
                try{$hints+=@(Find-OsmHints $p)}catch{$apiFailures++;$issues+='OSM photo tags unavailable'}
            }
        }
        try{$hints+=@(Find-CategoryHints $p)}catch{$apiFailures++;$issues+='Commons category unavailable'}
        try{$hints+=@(Find-TextHints $p)}catch{$apiFailures++;$issues+='Commons text unavailable'}
        # De-duplicate by File title; prioritize identity or geographic evidence.
        $seen=@{};$unique=@()
        # Favor evidence backed by the user's dataset, Wikidata, Wikipedia, or matching OSM tags.
        $priority=@{'MANUAL'=0;'DATASET'=1;'WIKIDATA'=2;'OSM_TAG'=3;'WIKI_VI'=4;'WIKI_EN'=5;'GPS'=6;'CATEGORY'=7;'COMMONS_TEXT'=8}
        $ordered=@($hints | Sort-Object -Property @{Expression={if($priority.ContainsKey([string]$_.Source)){$priority[[string]$_.Source]}else{99}};Descending=$false})
        foreach($h in $ordered){
            if(-not $h.Title -or $h.Title -notmatch '^File:' -or $h.Title -notmatch '(?i)\.(jpe?g|png)$'){continue}
            $k=Normalize-Text ([string]$h.Title)
            if($seen.ContainsKey($k)){continue}
            $seen[$k]=$true;$unique+=,$h
        }
        $candidates=@()
        for($offset2=0;$offset2 -lt [Math]::Min(90,$unique.Count);$offset2+=30){
            $subset=@($unique | Select-Object -Skip $offset2 -First 30)
            try{
                $pages=@(Get-CommonsFilesByTitles @($subset | ForEach-Object {$_.Title}))
                foreach($pg in $pages){
                    $matched=@($subset | Where-Object {(Normalize-Text ([string]$_.Title)) -eq (Normalize-Text ([string]$pg.title))} | Select-Object -First 1)
                    if($matched.Count -eq 0){continue}
                    $info=Get-LicenseInfo $pg
                    $score=Get-MatchScore $p $matched[0] $pg $info
                    if($score -le 0){continue}
                    $candidates += [pscustomobject]@{Id=$id;Name=$name;Address=[string]$p.address;Score=$score;
                        Provider=[string]$matched[0].Source;CommonsFileTitle=[string]$pg.title;ImageTitle=[string]$pg.title;
                        PageUrl=[string]$info.SourcePage;ThumbnailUrl=[string]$info.DownloadUrl;Author=[string]$info.Author;
                        License=[string]$info.License;Reason=([string]$matched[0].Context);Metadata=$info}
                }
            }catch{$apiFailures++;$issues+='Commons image metadata unavailable'}
        }
        $candidates=@($candidates | Sort-Object -Property @{Expression='Score';Descending=$true},@{Expression='CommonsFileTitle';Descending=$false})
        $winner=@($candidates | Where-Object {
            $_.Score -ge $MinAutoScore -and (-not $usedImages.ContainsKey([string]$_.PageUrl) -or $usedImages[[string]$_.PageUrl] -eq $id)
        } | Select-Object -First 1)
        if($winner.Count -gt 0){
            $best=$winner[0]
            $out.FilePage=$best.PageUrl;$out.Author=$best.Author;$out.License=$best.License
            $out.LicenseUrl=[string]$best.Metadata.LicenseUrl;$out.Confidence='SCORE_'+[string]$best.Score;$out.Source=$best.Provider
            if($DryRun){$out.Status='DRY_RUN_MATCH';$out.Note='Would download if not dry-run'}
            else{
                Save-ImageAsJpeg $best.Metadata.DownloadUrl $dest $MaxWidth
                $out.Status='DOWNLOADED';$out.FileName=$fileName;$out.Note='Verified identity/photo match and license. Must attribute author.'
                $success++;$usedImages[[string]$best.PageUrl]=$id
                Write-Host ('  SAVED '+$fileName+' score='+$best.Score) -ForegroundColor Green
            }
        }
        $review=@($candidates | Where-Object {$_.Score -lt $MinAutoScore} | Select-Object -First 7)
        if(-not $NoOpenverse -and $winner.Count -eq 0){try{$review+=@(Find-OpenverseReview $p)}catch{$apiFailures++;$issues+='Openverse unavailable'}}
        $review=@($review | Sort-Object -Property @{Expression='Score';Descending=$true} | Select-Object -First 10)
        foreach($rc in $review){
            Append-Row $reviewCsv ([pscustomobject]@{Id=$rc.Id;Name=$rc.Name;Address=$rc.Address;Score=$rc.Score;
                Provider=$rc.Provider;CommonsFileTitle=$rc.CommonsFileTitle;ImageTitle=$rc.ImageTitle;PageUrl=$rc.PageUrl;
                ThumbnailUrl=$rc.ThumbnailUrl;Author=$rc.Author;License=$rc.License;Reason=$rc.Reason})
        }
        if($out.Status -eq 'NOT_FOUND'){
            if($review.Count -gt 0){$uncertain++;$out.Status='NEEDS_REVIEW';Write-Host '  Candidate photos: manual review' -ForegroundColor Yellow}
            elseif($issues.Count -gt 0){$out.Status='API_RETRY';$absent++;Write-Host '  Some APIs unavailable: retry later' -ForegroundColor Yellow}
            else{$absent++;Write-Host '  No verified photo' -ForegroundColor DarkYellow}
            $out.Note=('Review candidates='+$review.Count+'. '+($issues -join '; '))
            Append-Row $missingCsv ([pscustomobject]@{Id=$id;Name=$name;Category=$p.category;Address=$p.address;
                HasGPS=($null -ne $p.lat);Status=$out.Status;Candidates=$review.Count})
        }
    }catch{
        $out.Status='ERROR';$out.Note=$_.Exception.Message;$failure++
        Append-Row $errorsCsv ([pscustomobject]@{Id=$id;Name=$name;Error=$_.Exception.ToString()})
        Write-Warning ("${id}: " + $_.Exception.Message)
    }
    Append-Row $resultsCsv ([pscustomobject]$out)
    if(($i % 50) -eq 0){Update-FrontendIndex $OutputDir $resultsCsv}
}
Update-FrontendIndex $OutputDir $resultsCsv
$summary=[ordered]@{Version='3.0';TotalDataset=$all.Count;Batch=$batch.Count;DownloadedNow=$success;ManualReview=$uncertain;
    NoImageFound=$absent;Error=$failure;AlreadyExisting=$skipped;ApiWarningCount=$apiFailures;DateUTC=([DateTime]::UtcNow.ToString('o'))}
Write-JsonFile (Join-Path $reports 'summary-v3.json') $summary
Write-Host ('RESULT: Downloaded='+$success+', Review='+$uncertain+', NoImage='+$absent+', Error='+$failure+', Existing='+$skipped) -ForegroundColor Cyan
Write-Host "Candidates: $reviewCsv"
Write-Host "Missing:    $missingCsv"
Write-Host "Web index:  $(Join-Path $OutputDir 'thamvan-image-index.json')"
