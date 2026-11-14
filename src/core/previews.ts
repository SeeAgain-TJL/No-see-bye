import sharp from "sharp";
import { Readable } from "node:stream";
import { getStorage } from "@/core/storage-factory";

// Bound image decode concurrency and pixel count on a small ECS instance.
let active = 0;
const queue: Array<() => void> = [];
export async function makePreview(key:string, input:Buffer, display = false) {
  if (active >= 2) await new Promise<void>(resolve => queue.push(resolve));
  else active++;
  try {
    const {data,info} = await sharp(input,{limitInputPixels:40_000_000,sequentialRead:true,animated:false})
      .rotate().resize({width:display ? 1920 : 960,height:display ? 1920 : 960,fit:"inside",withoutEnlargement:true})
      .webp({quality:display ? 82 : 72}).toBuffer({resolveWithObject:true});
    const thumbnailKey = key + ".preview-" + crypto.randomUUID() + ".webp";
    await getStorage().put(thumbnailKey, Readable.from(data));
    return {thumbnailKey,width:info.width,height:info.height};
  } finally { const next=queue.shift();if(next)next();else active--; }
}
export async function imagePreview(key:string, display = false) {
  const original=await getStorage().read(key);
  if(!original)return null;
  const parts:Buffer[]=[];let length=0;
  for await(const chunk of original.stream){length+=chunk.length;if(length>20*1024**2){original.stream.destroy();return null;}parts.push(Buffer.from(chunk));}
  return makePreview(key,Buffer.concat(parts),display);
}
