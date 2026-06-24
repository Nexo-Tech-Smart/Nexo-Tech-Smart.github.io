$file = "C:\Users\bodega2\OneDrive - Universidad Central\Documentos\10 - Nexo Tech Smart (Emprendimiento)\products.json"
$json = Get-Content $file -Encoding UTF8 -Raw | ConvertFrom-Json
$prods = if ($json -is [array]) { $json } else { @($json) }

$count = 0
foreach ($p in $prods) {
    if ($p.img -match '/items/\d+/\d+/(\d+)_') {
        $itemId = $matches[1]
        $p | Add-Member -NotePropertyName 'sourceUrl' -NotePropertyValue "https://planetgroupcr.com/item_shop.php?item_id=$itemId" -Force
        $count++
    }
}

Write-Host "Added sourceUrl to $count products" -ForegroundColor Green
$prods | ConvertTo-Json -Depth 3 | Set-Content $file -Encoding UTF8
Write-Host "Saved" -ForegroundColor Cyan