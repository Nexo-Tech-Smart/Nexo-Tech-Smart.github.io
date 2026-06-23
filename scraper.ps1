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
    @{id=27; name="Supermercado"}
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

function ExtractProducts($html, $categoryName) {
    $products = @()
    $articles = $html -split '<article class="itemex-plus-card'
    
    foreach ($article in $articles) {
        if ($article -match 'itemex-plus-badge-brand">([^<]+)') { $brand = $matches[1].Trim() } else { $brand = "" }
        if ($article -match 'itemex-plus-code">[^:]*:\s*([^<]+)') { $code = $matches[1].Trim() } else { $code = "" }
        if ($article -match 'itemex-plus-title[^"]*"[^>]*>([^<]+)') { $name = $matches[1].Trim() } else { $name = "" }
        
        # Image
        $img = ""
        if ($article -match 'src="([^"]+)"') {
            $src = $matches[1]
            if ($src -match '^https?://') { $img = $src }
            elseif ($src -match '^/') { $img = $baseUrl + $src }
            else { $img = $baseUrl + "/" + $src }
        }
        
        # Price - look for itemex-plus-price-main with numeric content
        $price = 0
        if ($article -match 'itemex-plus-price-main[^>]*>[^0-9&]*([0-9&cent;., ]+)\s*<' -or 
            $article -match 'itemex-plus-price-main[^>]*>[^<]*?(&cent;[0-9.,\s]+)<') {
            $price = ParsePrice $matches[1]
        }
        
        if ($price -gt 0 -and $name -ne "") {
            $script:productId++
            $markedUp = [math]::Round($price * 1.3, 2)
            $shortName = $name -replace '\s+', '+'
            $shortName = $shortName -replace '[^a-zA-Z0-9+]', ''
            if ($shortName.Length -gt 50) { $shortName = $shortName.Substring(0, 50) }
            
            $products += @{
                id = $script:productId
                name = "$brand $name".Trim()
                brand = $brand
                code = $code
                price = $markedUp
                priceCRC = $markedUp
                img = "https://placehold.co/400x300/1a1a2e/e94560?text=" + [uri]::EscapeDataString(($brand + " " + $name))
                category = $categoryName
                source = "PlanetGroupCR"
            }
        }
    }
    
    return $products
}

Write-Host "=== Scraper PlanetGroupCR para Nexo Tech Smart ===" -ForegroundColor Cyan

foreach ($cat in $categories) {
    Write-Host "Scrapeando: $($cat.name) (ca=$($cat.id))" -ForegroundColor Yellow
    $page = 1
    $maxPages = 3
    $catProducts = @()
    
    while ($page -le $maxPages) {
        $url = "$baseUrl/item_explorar.php?ca=$($cat.id)&page=$page"
        Write-Host "  Pag $page..." -NoNewline
        
        try {
            $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content
            $products = ExtractProducts $html $cat.name
            if ($products.Count -eq 0) { Write-Host " 0 (fin)"; break }
            $catProducts += $products
            Write-Host " $($products.Count) prod" -ForegroundColor Green
            $page++
            Start-Sleep -Milliseconds 800
        } catch {
            Write-Host " ERROR: $_" -ForegroundColor Red
            break
        }
    }
    
    $allProducts += $catProducts
    Write-Host "Total $($cat.name): $($catProducts.Count)" -ForegroundColor Magenta
}

Write-Host "=== FINAL ===" -ForegroundColor Cyan
Write-Host "Productos: $($allProducts.Count)" -ForegroundColor Green

$json = $allProducts | ConvertTo-Json -Depth 3
Set-Content -Path $outputFile -Value $json -Encoding UTF8
Write-Host "Guardado: $outputFile" -ForegroundColor Cyan
