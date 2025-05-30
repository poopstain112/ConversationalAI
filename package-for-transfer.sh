#!/bin/bash

echo "==================================================="
echo "Valor AI - Digital Ocean Transfer Package Creator"
echo "==================================================="
echo ""

# Create directories if they don't exist
mkdir -p do-transfer/uploads

# Copy missing directories if needed
if [ ! -d "do-transfer/data" ] && [ -d "data" ]; then
  cp -r data do-transfer/
  echo "Copied data directory"
fi

# Create a zip file containing everything
echo "Creating transfer package..."
timestamp=$(date +"%Y%m%d_%H%M%S")
zip -r "valor_transfer_package_${timestamp}.zip" do-transfer/

echo ""
echo "==================================================="
echo "Package Created Successfully!"
echo "==================================================="
echo ""
echo "Your Valor transfer package has been created:"
echo "valor_transfer_package_${timestamp}.zip"
echo ""
echo "Transfer Instructions:"
echo "1. Download this zip file to your local machine"
echo "2. Upload it to your Digital Ocean droplet"
echo "3. Follow the setup instructions in TRANSFER-INSTRUCTIONS.md"
echo ""
echo "Thank you, Commander. Valor is ready for transfer."