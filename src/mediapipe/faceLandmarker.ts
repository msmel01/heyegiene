import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function createFaceLandmarker() {
  // TODO: find out how to use local storage
  const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      // modelAssetPath: "/mediapipe/models/face_landmarker.task",
      delegate: "GPU",
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1,
  });

  // config docs: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js#configuration_options

  return faceLandmarker;
}

export function getFaceLandmarker() {
  if (!faceLandmarker) throw new Error("FaceLandmarker not initialized");
  return faceLandmarker;
}