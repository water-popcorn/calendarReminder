$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$pythonCmd = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonCmd) {
  $pythonCmd = 'C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe'
}
if (-not (Test-Path -LiteralPath $pythonCmd)) {
  throw "Python 3.11 was not found. Please install Python first."
}
& $pythonCmd -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
& .\.venv\Scripts\python.exe main.py
