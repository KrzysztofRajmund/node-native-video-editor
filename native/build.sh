#!/bin/bash
# Builds the native C++ helper binaries (native/bin/color_palette) used by the app
set -e

cd "$(dirname "$0")/.."

if [ ! -f native/vendor/stb_image.h ]; then
  mkdir -p native/vendor
  curl -sSL -o native/vendor/stb_image.h https://raw.githubusercontent.com/nothings/stb/master/stb_image.h
fi

mkdir -p native/bin
g++ -O2 -std=c++17 native/color_palette.cpp -I native/vendor -o native/bin/color_palette

echo "Built native/bin/color_palette"
