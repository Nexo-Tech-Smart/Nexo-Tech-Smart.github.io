param(
    [int]$ca,
    [string]$name,
    [int]$startPage = 1,
    [int]$startId = 0,
    [string]$outDir = "$PSScriptRoot\tmp"
)

$baseUrl = "https://planetgroupcr.com"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$outputFile = "$outDir\ca_${ca}.json"
$checkpointFile = "$outDir\ca_${ca}_checkpoint.json"

# Load existing checkpoint if any
$catProducts = @()
if ($startId -gt 0) { $productId = $startId } else { $productId = 0 }
if ($startPage -gt 1) {
    if (Test-Path $checkpointFile) {
        $cp = Get-Content $checkpointFile -Encoding UTF8 | ConvertFrom-Json
        $catProducts = @($cp.products)
        $startId = $cp.lastId
        $productId = $startId
        Write-Host "Resumed from page $startPage with $($catProducts.Count) products, lastId=$startId" -ForegroundColor Yellow
    } else {
        Write-Host "No checkpoint found, using startId=$productId for page $startPage" -ForegroundColor Yellow
    }
}

function ParsePrice($text) {
    $t = $text -replace '&cent;', ''; $t = $t -replace '\s+', ''
    $t = $t -replace '\.', ''; $t = $t -replace ',', '.'
    if ($t -match '^[\d.]+$') { try { return [double]::Parse($t, [System.Globalization.CultureInfo]::InvariantCulture) } catch { return 0 } }
    return 0
}
function GetMaxPage($html) { $pages = [regex]::Matches($html, 'page=(\d+)'); $max = 0; foreach ($p in $pages) { $v = [int]$p.Groups[1].Value; if ($v -gt $max) { $max = $v } }; return $max }

function ExtractProducts {
    param([string]$html, [string]$categoryName)
    $prods = @(); $articles = $html -split '<article class="itemex-plus-card'
    foreach ($article in $articles) {
        if ($article -match 'itemex-plus-badge-brand[^>]*>([^<]+)') { $brand = $matches[1].Trim() } else { $brand = "" }
        if ($article -match 'itemex-plus-code[^>]*>([^<]*)') { $code = $matches[1] -replace 'C.d:\s*', ''; $code = $code.Trim() } else { $code = "" }
        if ($article -match 'itemex-plus-title[^"]*"[^>]*>([^<]+)') { $name2 = $matches[1].Trim() } else { $name2 = "" }
        $img = ""
        if ($article -match 'src="([^"]+)"') { $src = $matches[1]; if ($src -match '^https?://') { $img = $src } elseif ($src -match '^/') { $img = $baseUrl + $src } else { $img = $baseUrl + "/" + $src } }
        $price = 0
        if ($article -match 'itemex-plus-price-main[^>]*>[^<]*?([\d.,&cent;\s]+)\s*<') { $price = ParsePrice $matches[1] }
        if ($price -gt 0 -and $name2 -ne "") {
            $script:productId++; $markedUp = [math]::Round($price * 1.3, 2)
            $prods += @{ id = $script:productId; name = "$brand $name2".Trim(); brand = $brand; code = $code; price = $markedUp; priceCRC = $markedUp; img = $img; category = $categoryName; source = "PlanetGroupCR" }
        }
    }
    return $prods
}

function SaveCheckpoint {
    param($products, $lastId, $file)
    $cp = @{ products = $products; lastId = $lastId }
    $cp | ConvertTo-Json -Depth 3 | Set-Content -Path $file -Encoding UTF8
}

Write-Host "=== Scraping: $name (ca=$ca) ===" -ForegroundColor Cyan
$page = $startPage; $maxPages = 999; $saveEvery = 10

while ($page -le $maxPages) {
    $url = "$baseUrl/item_explorar.php?ca=$ca&page=$page"
    Write-Host "  Pag $page..." -NoNewline
    try {
        $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10).Content
        if ($page -eq 1) { $maxPages = GetMaxPage $html; if ($maxPages -eq 0) { Write-Host " (1 pagina)"; $maxPages = 1 } else { Write-Host " ($maxPages paginas)" -NoNewline } }
        $products = ExtractProducts $html $name
        if ($products.Count -eq 0) { Write-Host " 0 (fin)"; break }
        $catProducts += $products
        Write-Host " $($products.Count) prod" -ForegroundColor Green

        # Checkpoint every $saveEvery pages
        if ($page % $saveEvery -eq 0) {
            SaveCheckpoint $catProducts $productId $checkpointFile
            Write-Host "  [Checkpoint saved at page $page, $($catProducts.Count) products]" -ForegroundColor DarkYellow
        }

        $page++
        Start-Sleep -Milliseconds 500
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        # Save checkpoint on error
        if ($catProducts.Count -gt 0) {
            SaveCheckpoint $catProducts $productId $checkpointFile
            Write-Host "  [Checkpoint saved before error, $($catProducts.Count) products]" -ForegroundColor DarkYellow
        }
        break
    }
}

$count = $catProducts.Count
Write-Host "Total ${name}: $count productos" -ForegroundColor Magenta
$catProducts | ConvertTo-Json -Depth 3 | Set-Content -Path $outputFile -Encoding UTF8
Write-Host "Guardado: $outputFile" -ForegroundColor Cyan
Remove-Item $checkpointFile -ErrorAction SilentlyContinue
Write-Host "Checkpoint cleaned up" -ForegroundColor Cyan