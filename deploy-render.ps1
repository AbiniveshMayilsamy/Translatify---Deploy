$headers = @{
    'Authorization' = 'Bearer rnd_K5CywkH3iPRCSdsVv8SpXGVeU0NH'
    'Content-Type'  = 'application/json'
}

$body = '{"serviceDetails":{"envSpecificDetails":{"buildCommand":"pip install --upgrade pip setuptools wheel && pip install -r requirements.txt","startCommand":"gunicorn -w 1 -k eventlet --bind 0.0.0.0:$PORT app:app"}}}'

Write-Host "Updating build command..."
Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-d7a8q4vpm1nc73c0psvg" -Method PATCH -Headers $headers -Body $body

Write-Host "Triggering deploy..."
Invoke-RestMethod -Uri "https://api.render.com/v1/services/srv-d7a8q4vpm1nc73c0psvg/deploys" -Method POST -Headers $headers

Write-Host "Done! Check https://dashboard.render.com/web/srv-d7a8q4vpm1nc73c0psvg"
