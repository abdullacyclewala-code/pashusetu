export type SkinScreenResult = {
  source: "image_model";
  modelVersion: "cattle-skin-lsd-v1";
  probability: number;
  interpretation: "normal_appearing" | "lsd_like" | "inconclusive";
  broadScreen: "normal" | "abnormal" | "inconclusive";
};

const HEALTHY_MAX = 0.2;
const LSD_LIKE_MIN = 0.89;

export async function screenCattleSkin(blob: Blob): Promise<SkinScreenResult> {
  const ort = await import("onnxruntime-web");
  ort.env.wasm.wasmPaths = "/ort/";
  const session = await ort.InferenceSession.create("/models/cattle-skin-lsd-v1.onnx", {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas"); canvas.width = 224; canvas.height = 224;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 224, 224);
  bitmap.close();
  const rgba = ctx.getImageData(0,0,224,224).data;
  const data = new Float32Array(3*224*224);
  const mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225], plane=224*224;
  for(let i=0;i<plane;i++) for(let c=0;c<3;c++) data[c*plane+i]=(rgba[i*4+c]/255-mean[c])/std[c];
  const input = new ort.Tensor("float32", data, [1,3,224,224]);
  const output = await session.run({ data_0: input });
  const probability = Number(output.lsd_like_probability.data[0]);
  const interpretation = probability >= LSD_LIKE_MIN ? "lsd_like" : probability <= HEALTHY_MAX ? "normal_appearing" : "inconclusive";
  return { source:"image_model", modelVersion:"cattle-skin-lsd-v1", probability, interpretation,
    broadScreen: interpretation === "lsd_like" ? "abnormal" : interpretation === "normal_appearing" ? "normal" : "inconclusive" };
}
