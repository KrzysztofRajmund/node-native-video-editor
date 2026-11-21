// Computes the dominant color and a palette of the most common colors in an image.
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#include <cstdio>
#include <cstdint>
#include <cstdlib>
#include <vector>
#include <algorithm>
#include <map>

struct Bucket {
  uint64_t r = 0, g = 0, b = 0, count = 0;
};

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: color_palette <image> [paletteSize]\n");
    return 1;
  }
  int paletteSize = argc > 2 ? atoi(argv[2]) : 8;

  int width, height, channels;
  unsigned char* pixels = stbi_load(argv[1], &width, &height, &channels, 3); // force RGB
  if (!pixels) {
    fprintf(stderr, "failed to load image: %s\n", argv[1]);
    return 1;
  }

  // Quantize into 8x8x8 buckets (drop low 5 bits per channel) to group similar colors
  const int SHIFT = 5;
  std::map<uint32_t, Bucket> histogram;

  long pixelCount = (long)width * height;
  for (long i = 0; i < pixelCount; i++) {
    unsigned char r = pixels[i * 3 + 0];
    unsigned char g = pixels[i * 3 + 1];
    unsigned char b = pixels[i * 3 + 2];
    uint32_t key = ((r >> SHIFT) << 10) | ((g >> SHIFT) << 5) | (b >> SHIFT);
    Bucket& bucket = histogram[key];
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count++;
  }
  stbi_image_free(pixels);

  std::vector<Bucket> buckets;
  buckets.reserve(histogram.size());
  for (auto& entry : histogram) buckets.push_back(entry.second);

  std::sort(buckets.begin(), buckets.end(), [](const Bucket& a, const Bucket& b) {
    return a.count > b.count;
  });

  int n = (int)std::min((size_t)paletteSize, buckets.size());

  printf("{\"dominant\":");
  if (n > 0) {
    const Bucket& d = buckets[0];
    printf("\"#%02x%02x%02x\"", (int)(d.r / d.count), (int)(d.g / d.count), (int)(d.b / d.count));
  } else {
    printf("null");
  }

  printf(",\"palette\":[");
  for (int i = 0; i < n; i++) {
    const Bucket& b = buckets[i];
    printf("%s\"#%02x%02x%02x\"", i > 0 ? "," : "", (int)(b.r / b.count), (int)(b.g / b.count), (int)(b.b / b.count));
  }
  printf("]}\n");

  return 0;
}
