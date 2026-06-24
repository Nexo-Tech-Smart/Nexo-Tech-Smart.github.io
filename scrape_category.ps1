param(
    [int]$ca,
    [string]$name,
    [string]$outDir = "$PSScriptRoot\tmp"
)

$baseUrl = "https://planetgroupcr.com"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$outputFile = "$outDir\ca_$ca.json"
$products = @()
$productId = 0

function ParsePrice($text) {
    $t = $text -replace '&cent;', ''; $t = $t -replace '\s+', ''
    $t = $t -replace '\.', ''; $t = $t -replace ',', '.'
    if ($t -match '^[\d.]+$') { try { return [double]::Parse($t, [System.Globalization.CultureInfo]::InvariantCulture) } catch { return 0 } }
    return 0
}
function GetMaxPage($html) { $pages = [regex]::Matches($html, 'page=(\d+)'); $max = 0; foreach ($p in $pages) { $v = [int]$p.Groups[1].Value; if ($v -gt $max) { $max = $v } }; return $max }
function ExtractProducts($html, $categoryName) {
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

Write-Host "=== Scraping: $name (ca=$ca) ===" -ForegroundColor Cyan
$page = 1; $maxPages = 999; $catProducts = @()
while ($page -le $maxPages) {
    $url = "$baseUrl/item_explorar.php?ca=$ca&page=$page"
    Write-Host "  Pag $page..." -NoNewline
    try {
        $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30).Content
        if ($page -eq 1) { $maxPages = GetMaxPage $html; if ($maxPages -eq 0) { Write-Host " (1 pagina)"; $maxPages = 1 } else { Write-Host " ($maxPages paginas)" -NoNewline } }
        $products = ExtractProducts $html $name
        if ($products.Count -eq 0) { Write-Host " 0 (fin)"; break }
        $catProducts += $products
        Write-Host " $($products.Count) prod" -ForegroundColor Green
        $page++
        Start-Sleep -Milliseconds 1200
    } catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        break
    }
}
$count = $catProducts.Count
Write-Host "Total ${name}: $count productos" -ForegroundColor Magenta
$catProducts | ConvertTo-Json -Depth 3 | Set-Content -Path $outputFile -Encoding UTF8
Write-Host "Guardado: $outputFile" -ForegroundColor Cyan