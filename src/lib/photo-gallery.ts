import type { MediaAsset, Memory } from '@/modules/memories/types';

export type GalleryPhoto = { memory: Memory; asset: MediaAsset };

/** Video posters stay out of a photo gallery. Preserve authored fields verbatim. */
export function galleryPhotos(items: Memory[], limit = 24): GalleryPhoto[] {
  const seen = new Set<string>();
  const photos: GalleryPhoto[] = [];
  for (const memory of items) for (const asset of memory.assets) {
    if (!asset.mime.startsWith('image/') || seen.has(asset.id)) continue;
    seen.add(asset.id); photos.push({ memory, asset });
  }
  return photos.slice(0, Math.max(0, limit));
}
