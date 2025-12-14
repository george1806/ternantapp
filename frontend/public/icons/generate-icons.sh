#!/bin/bash
# PWA Icon Generator
# This script generates PWA icons from icon.svg using ImageMagick or inkscape
#
# Requirements:
#   - ImageMagick (convert command) OR
#   - Inkscape
#
# Usage: ./generate-icons.sh

set -e

SIZES=(72 96 128 144 152 192 384 512)
SOURCE="icon.svg"
DIR="$(dirname "$0")"

cd "$DIR"

echo "🎨 Generating PWA icons from $SOURCE..."

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "✅ Using ImageMagick"
    for size in "${SIZES[@]}"; do
        echo "   Generating ${size}x${size}..."
        convert -background none -resize "${size}x${size}" "$SOURCE" "icon-${size}x${size}.png"
    done
# Check for Inkscape
elif command -v inkscape &> /dev/null; then
    echo "✅ Using Inkscape"
    for size in "${SIZES[@]}"; do
        echo "   Generating ${size}x${size}..."
        inkscape "$SOURCE" -w "$size" -h "$size" -o "icon-${size}x${size}.png"
    done
else
    echo "❌ Error: Neither ImageMagick nor Inkscape is installed"
    echo ""
    echo "Please install one of the following:"
    echo "  - ImageMagick: sudo apt install imagemagick"
    echo "  - Inkscape: sudo apt install inkscape"
    echo ""
    echo "Alternatively, use an online tool:"
    echo "  1. Upload icon.svg to https://realfavicongenerator.net/"
    echo "  2. Download generated icons"
    echo "  3. Place in this directory"
    exit 1
fi

echo "✅ Done! Generated ${#SIZES[@]} icon sizes"
echo ""
echo "Generated files:"
ls -lh icon-*.png
