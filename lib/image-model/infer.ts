export type SkinScreenResult = {
  source: "image_model";
  modelVersion: "cattle-skin-v2";
  probabilities: { fmd_like: number; normal_appearing: number; lsd_like: number };
  interpretation: "normal_appearing" | "lsd_like" | "fmd_like" | "inconclusive";
  broadScreen: "normal" | "abnormal" | "inconclusive";
  confidence: number;
};
const MIN_CONFIDENCE=.75, MIN_MARGIN=.2;
export async function screenCattleSkin(blob: Blob): Promise<SkinScreenResult> {
  const ort=await import("onnxruntime-web"); ort.env.wasm.wasmPaths="/ort/";
  const session=await ort.InferenceSession.create("/models/cattle-skin-v2.onnx",{executionProviders:["wasm"],graphOptimizationLevel:"all"});
  const bitmap=await createImageBitmap(blob);const canvas=document.createElement("canvas");canvas.width=224;canvas.height=224;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas unavailable");const side=Math.min(bitmap.width,bitmap.height);ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,224,224);bitmap.close();const rgba=ctx.getImageData(0,0,224,224).data,data=new Float32Array(3*224*224),mean=[.485,.456,.406],std=[.229,.224,.225],plane=224*224;for(let i=0;i<plane;i++)for(let c=0;c<3;c++)data[c*plane+i]=(rgba[i*4+c]/255-mean[c])/std[c];
  const output=await session.run({data_0:new ort.Tensor("float32",data,[1,3,224,224])});const p=Array.from(output.class_probabilities.data as Float32Array).map(Number);const order=p.map((v,i)=>({v,i})).sort((a,b)=>b.v-a.v);let interpretation:SkinScreenResult["interpretation"]="inconclusive";if(order[0].v>=MIN_CONFIDENCE&&order[0].v-order[1].v>=MIN_MARGIN)interpretation=(["fmd_like","normal_appearing","lsd_like"] as const)[order[0].i];
  return{source:"image_model",modelVersion:"cattle-skin-v2",probabilities:{fmd_like:p[0],normal_appearing:p[1],lsd_like:p[2]},interpretation,broadScreen:interpretation==="normal_appearing"?"normal":interpretation==="inconclusive"?"inconclusive":"abnormal",confidence:order[0].v};
}
