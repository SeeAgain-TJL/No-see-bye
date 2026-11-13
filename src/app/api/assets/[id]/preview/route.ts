import { NextRequest,NextResponse } from "next/server";
import { getUserFromRequest } from "@/core/auth";
import { prisma } from "@/core/prisma";
import { getStorage } from "@/core/storage-factory";
import { apiError,checkOrigin,HttpError } from "@/core/http";
import { makePreview } from "@/core/previews";
import { assetDTO } from "@/modules/memories/server";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
 let key:string|undefined;
 try{
  checkOrigin(req);const user=await getUserFromRequest(req);const {id}=await ctx.params;
  const asset=await prisma.asset.findFirst({where:{id,ownerId:user.userId,status:"ready"}});
  if(!asset||!asset.mime.startsWith("video/"))throw new HttpError(404,"视频不存在");
  const length=Number(req.headers.get("content-length"));
  if(!Number.isSafeInteger(length)||length<1||length>512*1024)throw new HttpError(413,"封面最大 512 KB");
  if(!req.body)throw new HttpError(400,"封面为空");
  const reader=req.body.getReader();const parts:Uint8Array[]=[];let total=0;
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>length){await reader.cancel();throw new HttpError(413,"封面超出大小限制");}parts.push(value);}
  if(total!==length)throw new HttpError(400,"封面未传输完整");
  let generated;
  try{generated=await makePreview(asset.key,Buffer.concat(parts));}catch{throw new HttpError(415,"无法读取封面图片");}
  key=generated.thumbnailKey;
  const updated=await prisma.asset.updateMany({where:{id:asset.id,ownerId:user.userId,status:"ready",thumbnailKey:asset.thumbnailKey},data:{thumbnailKey:key}});
  if(!updated.count)throw new HttpError(409,"附件已更新，请重试");
  key=undefined;
  if(asset.thumbnailKey)await getStorage().delete(asset.thumbnailKey).catch(console.error);
  return NextResponse.json(assetDTO({...asset,thumbnailKey:generated.thumbnailKey}));
 }catch(error){if(key)await getStorage().delete(key).catch(console.error);return apiError(error);}
}
