import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector: FaceDetector | null = null;

export async function createFaceDetector() {
  // TODO: find out how to use local storage
  const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");

  faceDetector = await FaceDetector.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite`,
      // modelAssetPath: "/mediapipe/models/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
  });

  return faceDetector;
}

export function getFaceDetector() {
  if (!faceDetector) throw new Error("FaceDetector not initialized");
  return faceDetector;
}