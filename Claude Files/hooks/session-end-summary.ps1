# Windows PowerShell wrapper for session-end-summary hook
# This handles calls with Unix-style paths and converts them to Windows paths

$hookPath = Join-Path $PSScriptRoot "session-end-summary.py"

# Try to find Python
$python = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    # Try py launcher if python is not in PATH
    $python = "py"
}

# Execute the Python hook script
& $python $hookPath $args
