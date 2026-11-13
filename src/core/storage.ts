import type { Readable } from "node:stream";
export interface ByteRange {
  start: number;
  end?: number;
}
export interface ReadResult {
  stream: Readable;
  size: number;
  start: number;
  end: number;
}
export interface StorageProvider {
  readonly driver: "local";
  put(key: string, body: Readable): Promise<number>;
  read(key: string, range?: ByteRange): Promise<ReadResult | null>;
  size(key: string): Promise<number | null>;
  delete(key: string): Promise<void>;
}
