// Extract one frame locally; unsupported video codecs still upload as originals.
export async function videoPoster(file:File,signal:AbortSignal):Promise<Blob|null>{
  if(signal.aborted)return null;
  const video=document.createElement("video");
  const url=URL.createObjectURL(file);
  video.muted=true;video.preload="auto";video.playsInline=true;
  return new Promise(resolve=>{
    let settled=false;
    const finish=(blob:Blob|null)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener("abort",cancel);video.removeAttribute("src");video.load();URL.revokeObjectURL(url);resolve(blob);};
    const cancel=()=>finish(null);
    const timer=setTimeout(cancel,7000);
    signal.addEventListener("abort",cancel,{once:true});
    video.onerror=cancel;
    const draw=()=>{try{if(!video.videoWidth||!video.videoHeight)return finish(null);const canvas=document.createElement("canvas");const scale=Math.min(1,800/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));canvas.getContext("2d")!.drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>finish(blob&&blob.size<=512*1024?blob:null),"image/jpeg",.78);}catch{finish(null);}};
    video.onloadedmetadata=()=>{video.currentTime=Math.min(.35,Number.isFinite(video.duration)?video.duration/2:0);};
    video.onseeked=draw;
    video.onloadeddata=()=>{if(video.currentTime===0)draw();};
    video.src=url;
  });
}
