param(
    [string]$Category = "",
    [int]$MaxItems = -1,
    [switch]$UpdatePrices = $false,
    [switch]$ReportOnly = $false
)

Add-Type -AssemblyName System.Web

# Copy of calculateSellingPrice from script.js
function Get-SellingPrice {
    param([int]$CostCRC)
    if ($CostCRC -le 0) { return $null }
    $minProfit = 0; $minMargin = 0.0
    if ($CostCRC -le 5000) { $minProfit = 1500; $minMargin = 0.30 }
    elseif ($CostCRC -le 20000) { $minProfit = 3000; $minMargin = 0.25 }
    elseif ($CostCRC -le 100000) { $minProfit = 5000; $minMargin = 0.20 }
    else { $minProfit = 10000; $minMargin = 0.15 }
    $margin = [Math]::Max($minMargin, $minProfit / $CostCRC)
    $sellingPrice = $CostCRC * (1 + $margin)
    return [Math]::Round($sellingPrice / 100) * 100
}

# Credentials
$username = "ronaldkfuertes@gmail.com"
$password = "Chelita23"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXO TECH SMART - PRICE CHECKER" -ForegroundColor Cyan
Write-Host "  PlanetGroupCR Price Comparator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load products
$productsPath = Join-Path $PSScriptRoot "products.json"
if (!(Test-Path $productsPath)) {
    Write-Host "ERROR: products.json not found" -ForegroundColor Red
    exit 1
}
$products = Get-Content $productsPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host ("Products loaded: {0}" -f $products.Count) -ForegroundColor Yellow

# Filter by category
if ($Category) {
    $products = $products | Where-Object { $_.category -eq $Category }
    Write-Host ("Filtered by category '{0}': {1}" -f $Category, $products.Count) -ForegroundColor Yellow
}

# Limit items
if ($MaxItems -gt 0 -and $MaxItems -lt $products.Count) {
    $products = $products | Select-Object -First $MaxItems
    Write-Host ("Limited to {0} items" -f $products.Count) -ForegroundColor Yellow
}

Write-Host ""

# Step 1: Login to PlanetGroupCR
Write-Host "Logging in to PlanetGroupCR..." -ForegroundColor Green
$loginBody = @{login_userid=$username; login_passwd=$password; go="1"}
try {
    $loginResp = Invoke-WebRequest -Uri "https://planetgroupcr.com/login.php" -Method POST -Body $loginBody -SessionVariable session -UseBasicParsing -TimeoutSec 15
    Write-Host ("  Login successful (session: {0})" -f $session.Cookies.GetCookies("https://planetgroupcr.com")[0].Value) -ForegroundColor Green
} catch {
    Write-Host ("  Login FAILED: {0}" -f $_.Exception.Message) -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check prices
$results = @()
$total = $products.Count
$i = 0
$changed = 0
$errors = 0
$same = 0
$noUrl = 0

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($product in $products) {
    $i++
    $pct = [Math]::Round($i / $total * 100, 1)
    Write-Progress -Activity "Checking prices" -Status ("{0}/{1} ({2}%)" -f $i, $total, $pct) -PercentComplete ($i / $total * 100)

    $name = $product.name
    if ($name.Length -gt 50) { $name = $name.Substring(0, 47) + "..." }

    # Get source URL
    $sourceUrl = $product.sourceUrl
    if ([string]::IsNullOrEmpty($sourceUrl)) {
        $noUrl++
        $results += [PSCustomObject]@{ id=$product.id; name=$product.name; code=$product.code; category=$product.category; pgcrPrice=$null; ourCost=$product.price; ourPrice=$null; margin=0; status="no-url" }
        continue
    }

    # Extract item_id from URL
    $match = [regex]::Match($sourceUrl, 'item_id=(\d+)')
    if (!$match.Success) {
        $noUrl++
        $results += [PSCustomObject]@{ id=$product.id; name=$product.name; code=$product.code; category=$product.category; pgcrPrice=$null; ourCost=$product.price; ourPrice=$null; margin=0; status="no-item-id" }
        continue
    }
    $itemId = $match.Groups[1].Value

    try {
        # Fetch product page WITHOUT login to get public market reference price
        $pubResp = Invoke-WebRequest -Uri ("https://planetgroupcr.com/item_shop.php?item_id=" + $itemId) -UseBasicParsing -TimeoutSec 15
        $pubHtml = $pubResp.Content.ToString()

        # Extract public retail price from H4 (first price shown to public)
        $pubPriceMatch = [regex]::Match($pubHtml, '<h4[^>]*><strong>&cent;([0-9.]+),')
        $marketRefPrice = if ($pubPriceMatch.Success) { [int]($pubPriceMatch.Groups[1].Value -replace '\.', '') } else { $null }

        # Now fetch WITH login to get reseller cost price
        $resp = Invoke-WebRequest -Uri ("https://planetgroupcr.com/item_shop.php?item_id=" + $itemId) -WebSession $session -UseBasicParsing -TimeoutSec 15
        $html = $resp.Content.ToString()

        # Extract logged-in price from H4 (reseller cost)
        $costMatch = [regex]::Match($html, '<h4[^>]*><strong>&cent;([0-9.]+),')
        $pgcrCost = if ($costMatch.Success) { [int]($costMatch.Groups[1].Value -replace '\.', '') } else { $null }

        if ($pgcrCost -eq $null) {
            $status = "no-price"
            $errors++
        } else {
            $status = "ok"
        }

        $ourStoredCost = [int]$product.price
        $newSellingPrice = Get-SellingPrice -CostCRC $pgcrCost
        $marginVal = if ($pgcrCost -gt 0) { [Math]::Round(($newSellingPrice - $pgcrCost) / $pgcrCost * 100) } else { 0 }

        $results += [PSCustomObject]@{
            id=$product.id; name=$product.name; code=$product.code; category=$product.category;
            pgcrCost=$pgcrCost; marketRefPrice=$marketRefPrice; storedCost=$ourStoredCost;
            newSellingPrice=$newSellingPrice; margin=$marginVal; status=$status
        }

        Write-Host ("[{0}/{1}] {2}: Costo={3} R={4} -> Venta={5} [{6}]" -f $i, $total, $name.Substring(0,[Math]::Min(40,$name.Length)).PadRight(42), $pgcrCost, $marketRefPrice, $newSellingPrice, $status) -ForegroundColor $(if ($pgcrCost -ne $ourStoredCost) { "Yellow" } else { "Green" })

    } catch {
        $errors++
        $results += [PSCustomObject]@{
            id=$product.id; name=$product.name; code=$product.code; category=$product.category;
            pgcrPrice=$null; ourCost=$product.price; ourPrice=$null; margin=0; status="error"
        }
        Write-Host ("[{0}/{1}] {2}: ERROR - {3}" -f $i, $total, $name.Substring(0,[Math]::Min(40,$name.Length)).PadRight(42), $_.Exception.Message) -ForegroundColor Red
    }

    # Small delay to avoid rate limiting
    if ($i -lt $total) { Start-Sleep -Milliseconds 500 }
}

$stopwatch.Stop()
Write-Progress -Activity "Checking prices" -Completed
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ("Total checked:   {0}" -f $results.Count)
Write-Host ("Changed:         {0}" -f $changed) -ForegroundColor Yellow
Write-Host ("Same:            {0}" -f $same) -ForegroundColor Green
Write-Host ("Errors:          {0}" -f $errors) -ForegroundColor Red
Write-Host ("No source URL:   {0}" -f $noUrl)
Write-Host ("Time elapsed:    {0}" -f $stopwatch.Elapsed.ToString("hh\:mm\:ss"))
Write-Host ""

# Export report
$reportPath = Join-Path $PSScriptRoot "price-report.csv"
$results | Export-Csv -Path $reportPath -NoTypeInformation -Encoding UTF8
Write-Host ("Report exported: {0}" -f $reportPath) -ForegroundColor Cyan

# Show changed products
$changedItems = $results | Where-Object { $_.status -eq "changed" }
if ($changedItems.Count -gt 0) {
    Write-Host ""
    Write-Host "PRODUCTS WITH PRICE CHANGES:" -ForegroundColor Yellow
    $changedItems | Format-Table id, @{N="Name";E={$_.name.Substring(0,[Math]::Min(40,$_.name.Length))}}, pgcrPrice, ourCost, ourPrice, margin -AutoSize
}

# Update products.json if requested
$changedItems = $results | Where-Object { $_.status -eq "ok" -and $_.pgcrCost -ne $_.storedCost }

if ($UpdatePrices -and $changedItems.Count -gt 0) {
    Write-Host ""
    Write-Host "UPDATING products.json with new prices..." -ForegroundColor Green
    $updateCount = 0
    
    $updatedProducts = foreach ($p in (Get-Content $productsPath -Raw -Encoding UTF8 | ConvertFrom-Json)) {
        $match2 = $changedItems | Where-Object { $_.id -eq $p.id }
        if ($match2 -and $match2.pgcrCost) {
            $p.price = $match2.pgcrCost
            if ($match2.marketRefPrice) { $p | Add-Member -NotePropertyName "marketReferencePrice" -NotePropertyValue $match2.marketRefPrice -Force }
            $updateCount++
        } elseif (-not $p.marketReferencePrice -and $match2.marketRefPrice) {
            $p | Add-Member -NotePropertyName "marketReferencePrice" -NotePropertyValue $match2.marketRefPrice -Force
        }
        $p
    }
    
    $updatedProducts | ConvertTo-Json -Depth 3 -Compress | Set-Content $productsPath -Encoding UTF8
    Write-Host ("Updated {0} products with new cost + market reference" -f $updateCount) -ForegroundColor Green
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
