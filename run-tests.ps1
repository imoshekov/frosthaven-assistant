# Check if Node.js is installed
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue

if (!$nodeInstalled) {
    Write-Output "Node.js is not installed. Proceeding with installation."

    # Get the latest stable version of Node.js
    $latestVersionUrl = "https://nodejs.org/en/"
    $webContent = Invoke-WebRequest -Uri $latestVersionUrl
    $latestVersionMatch = [regex]::Match($webContent.Content, 'Latest LTS Version: (\d+\.\d+\.\d+)')

    if ($latestVersionMatch.Success) {
        $nodeVersion = $latestVersionMatch.Groups[1].Value
        Write-Output "Latest stable version found: $nodeVersion"
    } else {
        Write-Output "Could not find the latest stable version. Exiting."
        exit
    }

    # Define the installer URL
    $installerUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
    $installerPath = "$env:TEMP\nodejs_installer.msi"

    # Download the installer
    Write-Output "Downloading Node.js installer from $installerUrl..."
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

    # Install Node.js
    Write-Output "Installing Node.js..."
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$installerPath`" /quiet /norestart"

    # Clean up the installer file
    Remove-Item -Path $installerPath -Force

    # Verify installation
    $nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeInstalled) {
        Write-Output "Node.js installation successful. Version: $(node -v)"
    } else {
        Write-Output "Node.js installation failed."
    }
}

Write-Output "Running tests on Node.js, version $(node -v)"
node tests/test.js