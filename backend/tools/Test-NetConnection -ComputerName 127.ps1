npm start
powershell -NoProfile -Command "Start-Sleep -Seconds 1; Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health | Select-Object -ExpandProperty StatusCode"