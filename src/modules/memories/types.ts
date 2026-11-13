export interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}
export interface MediaAsset {
  id: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string | null;
}
export interface Memory {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  tags: string[];
  location: string;
  mood: string;
  visibility: "private" | "public";
  pinned: boolean;
  happenedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user: { username: string; displayName?: string };
  assets: MediaAsset[];
  hasLegacyMedia: boolean;
}
export interface MemoryInput {
  title: string;
  content: string;
  happenedAt: string;
  location: string;
  mood: string;
  tags: string[];
  visibility: "private" | "public";
  assetIds: string[];
}
export interface MemoryStats {
  total: number;
  photos: number;
  videos: number;
  usedBytes: number;
  quotaBytes: number;
}
export interface MemoryList {
  items: Memory[];
  nextCursor: string | null;
  stats: MemoryStats | null;
}
