#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is required but not installed. Please install it first:"
    echo "macOS: brew install imagemagick"
    echo "Windows: choco install imagemagick"
    exit 1
fi

# Create PNG versions at different sizes
convert -background none -resize 16x16 icon.svg icon-16.png
convert -background none -resize 32x32 icon.svg icon-32.png
convert -background none -resize 64x64 icon.svg icon-64.png
convert -background none -resize 128x128 icon.svg icon-128.png
convert -background none -resize 256x256 icon.svg icon-256.png
convert -background none -resize 512x512 icon.svg icon-512.png
convert -background none -resize 1024x1024 icon.svg icon-1024.png

# Create Windows ICO
convert icon-{16,32,64,128,256}.png icon.ico

# Create macOS ICNS
mkdir -p icon.iconset
cp icon-16.png icon.iconset/icon_16x16.png
cp icon-32.png icon.iconset/icon_16x16@2x.png
cp icon-32.png icon.iconset/icon_32x32.png
cp icon-64.png icon.iconset/icon_32x32@2x.png
cp icon-128.png icon.iconset/icon_128x128.png
cp icon-256.png icon.iconset/icon_128x128@2x.png
cp icon-256.png icon.iconset/icon_256x256.png
cp icon-512.png icon.iconset/icon_256x256@2x.png
cp icon-512.png icon.iconset/icon_512x512.png
cp icon-1024.png icon.iconset/icon_512x512@2x.png

# Convert to icns (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    iconutil -c icns icon.iconset
else
    echo "ICNS creation is only supported on macOS"
fi

# Cleanup temporary files
rm icon-{16,32,64,128,256,512,1024}.png
rm -rf icon.iconset

echo "Icon conversion complete!" 