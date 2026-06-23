$baseUrl = "https://planetgroupcr.com"
$outputFile = "$PSScriptRoot\products.json"
$allProducts = @()
$productId = 0

$categories = @(
    @{id=32; name="Hogar"},
    @{id=19; name="Computadoras"},
    @{id=31; name="Carro"},
    @{id=35; name="Videojuegos"},
    @{id=29; name="Celulares"},
    @{id=27; name="Supermercado"},
    @{id=28; name="Laptops y Tablets"},
    @{id=33; name="Herramientas"},
    @{id=34; name="Repuestos"},
    @{id=38; name="Accesorios Celular"},
    @{id=37; name="Servicios"},
    @{id=39; name="Jugueteria"}
)

function ParsePrice($text) {
    $t = $text -replace '&cent;', ''
    $t = $t -replace '\s+', ''
    $t = $t -replace '\.', ''
    $t = $t -replace ',', '.'
    if ($t -match '^[\d.]+$') {
        try { return [double]::Parse($t, [System.Globalization.CultureInfo]::InvariantCulture) }
        catch { return 0 }
    }
    return 0
}

function GetMaxPage($html) {
    $pages = [regex]::Matches($html, 'page=(\d+)')
    $max = 0
    foreach ($p in $pages) { $v = [int]$p.Groups[1].Value; if ($v -gt $max) { $max = $v } }
    return $max
}

function ExtractProducts($html, $categoryName) {
    $products = @()
    $articles = $html -split '<article class="itemex-plus-card'
    
    foreach ($article in $articles) {
        if ($article -match 'itemex-plus-badge-brand[^>]*>([^<]+)') { $brand = $matches[1].Trim() } else { $brand = "" }
        if ($article -match 'itemex-plus-code[^>]*>([^<]*)') { $code = $matches[1] -replace 'C.d:\s*', ''; $code = $code.Trim() } else { $code = "" }
        if ($article -match 'itemex-plus-title[^"]*"[^>]*>([^<]+)') { $name = $matches[1].Trim() } else { $name = "" }
        
        $img = ""
        if ($article -match 'src="([^"]+)"') {
            $src = $matches[1]
            if ($src -match '^https?://') { $img = $src }
            elseif ($src -match '^/') { $img = $baseUrl + $src }
            else { $img = $baseUrl + "/" + $src }
        }
        
        $price = 0
        if ($article -match 'itemex-plus-price-main[^>]*>[^<]*?([\d.,&cent;\s]+)\s*<') {
            $price = ParsePrice $matches[1]
        }
        
        if ($price -gt 0 -and $name -ne "") {
            $script:productId++
            $markedUp = [math]::Round($price * 1.3, 2)
            
            $products += @{
                id = $script:productId
                name = "$brand $name".Trim()
                brand = $brand
                code = $code
                price = $markedUp
                priceCRC = $markedUp
                img = $img
                category = $categoryName
                source = "PlanetGroupCR"
            }
        }
    }
    
    return $products
}

Write-Host "=== Scraper COMPLETO PlanetGroupCR ===" -ForegroundColor Cyan
Write-Host "Categorias a scrapear: $($categories.Count)" -ForegroundColor Yellow

foreach ($cat in $categories) {
    Write-Host "Scrapeando: $($cat.name) (ca=$($cat.id))" -ForegroundColor Yellow
    $page = 1
    $maxPages = 999
    $catProducts = @()
    
    while ($page -le $maxPages) {
        $url = "$baseUrl/item_explorar.php?ca=$($cat.id)&page=$page"
        Write-Host "  Pag $page..." -NoNewline
        
        try {
            $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content
            if ($page -eq 1) {
                $maxPages = GetMaxPage $html
                if ($maxPages -eq 0) { Write-Host " (1 pagina)"; $maxPages = 1 }
                else { Write-Host " ($maxPages paginas)" -NoNewline }
            }
            $products = ExtractProducts $html $cat.name
            if ($products.Count -eq 0) { Write-Host " 0 (fin)"; break }
            $catProducts += $products
            Write-Host " $($products.Count) prod" -ForegroundColor Green
            $page++
            Start-Sleep -Milliseconds 1500
        } catch {
            Write-Host " ERROR: $_" -ForegroundColor Red
            break
        }
    }
    
    $allProducts += $catProducts
    $count = $catProducts.Count
    Write-Host "Total $($cat.name): $count productos" -ForegroundColor Magenta
}

Write-Host "=== FINAL ===" -ForegroundColor Cyan
Write-Host "Productos totales: $($allProducts.Count)" -ForegroundColor Green

$json = $allProducts | ConvertTo-Json -Depth 3
Set-Content -Path $outputFile -Value $json -Encoding UTF8
Write-Host "Archivo guardado: $outputFile" -ForegroundColor Cyan
