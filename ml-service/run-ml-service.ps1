$ErrorActionPreference = "Stop"
Set-Location "D:\smart-energy-platform\ml-service"
if (-not (Test-Path ".venv\Scripts\python.exe")) { throw "Virtual environment not found. Run installation first." }
& ".\.venv\Scripts\Activate.ps1"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
