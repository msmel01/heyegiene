// import { useState } from 'react'
import Header from "./components/layout/Header";
import Camera from "./components/camera/Camera";

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { useState, useEffect, useRef } from "react";

import { BlinkCounterBlendshapes } from "./features/blinkCounterBlendshapes";
import { BlinkCounterEAR } from "./features/blinkCounterEAR";
import { BlinkCounterModifiedEAR } from "./features/blinkCounterModifiedEAR";

import './App.css'

// class BlinkFusion {
//   private blinkCount = 0;
//   private lastBlinkTime = 0;
//   private REFRACTORY_MS = 250;

//   update(earBlink: boolean, blendBlink: boolean) {
//     const now = Date.now();

//     const blinkEvent = earBlink || blendBlink;

//     if (blinkEvent && (now - this.lastBlinkTime > this.REFRACTORY_MS)) {
//       this.blinkCount++;
//       this.lastBlinkTime = now;
//     }

//     return this.blinkCount;
//   }
// }

function App() {
  const [faceResults, setFaceResults] = useState<FaceLandmarkerResult | null>(null);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [fps, setFps] = useState<number>(0);

  type HeadPose = {
    pitch: number;
    yaw: number;
    roll: number;
  };

  const [pose, setPose] = useState<HeadPose | null>(null);

  // Blink count variables
  const [blinkCountBlendshapes, setBlinkCountBlendshapes] = useState(0);
  const [blinkCountEAR, setBlinkCountEAR] = useState(0);
  const [blinkCountModifiedEAR, setBlinkCountModifiedEAR] = useState(0);

  // const blinkFusionRef = useRef(new BlinkFusion());
  // const [blinkCountCombined, setBlinkCountCombined] = useState(0);
  /*
  FaceLandmarkerResult returns:
  - Detected face landmarks in normalized image coordinates.
    faceLandmarks: NormalizedLandmark[][];

  - Optional face blendshapes results.
    faceBlendshapes: Classifications[];

  - Optional facial transformation matrix.
    facialTransformationMatrixes: Matrix[];
  */

  const blinkCounterBlendshapesRef = useRef(new BlinkCounterBlendshapes());
  const blinkCounterEARRef = useRef(new BlinkCounterEAR());
  const blinkCounterModifiedEARRef = useRef(new BlinkCounterModifiedEAR());

  const alertSoundRef = useRef<HTMLAudioElement>(
    new Audio("alert.mp3") // put a short sound file in public/
  );

  useEffect(() => {
    if (faceResults) {

      const countBlendshapes = blinkCounterBlendshapesRef.current.update(faceResults.faceBlendshapes);
      setBlinkCountBlendshapes(countBlendshapes.count);

      const countEAR = blinkCounterEARRef.current.update(faceResults.faceLandmarks);
      setBlinkCountEAR(countEAR.count);

      const countModifiedEAR = blinkCounterModifiedEARRef.current.update(faceResults.faceLandmarks);
      setBlinkCountModifiedEAR(countModifiedEAR.count);

      // const fused = blinkFusionRef.current.update(
      //   countEAR.blinkDetected,
      //   countBlendshapes.blinkDetected
      // );

      // setBlinkCountCombined(fused);

    }
  }, [faceResults]); // runs every time faceResults changes

  useEffect(() => {
    if (fps > 0) {
      blinkCounterEARRef.current.updateRequiredFrames(fps);
    }
  }, [fps]);

  // console.log(`Pitch: ${pitch.toFixed(1)} | Yaw: ${yaw.toFixed(1)} | Roll: ${roll.toFixed(1)}`);

  useEffect(() => {
    const interval = setInterval(() => {
      if (blinkCounterEARRef.current.isTimeLastBlinkAlert()) {
        // TODO: clean this up once move to Electron
        if (!document.hidden && isCameraRunning) { // only play if tab is active and camera is on
          // alertSound.currentTime = 0;
          console.log('Blink alert');
          // alertSoundRef.current.play().catch((err) => {
          //   console.warn("Cannot play sound:", err);
          // });
        } else {
          console.log("Tab inactive, skipping alert sound");
        }
      }
    }, 1000); // check every second

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Header />
      <main>
        {/* camera tool here */}
        <Camera debug={true} onResults={setFaceResults} onCameraStateChange={setIsCameraRunning} onFpsChange={setFps} onHeadPoseChange={setPose} />
        <p>Blink count from blendshapes: {blinkCountBlendshapes}</p>
        <p>Blink count from EAR: {blinkCountEAR}</p>
        <p>Blink count from Modified EAR: {blinkCountModifiedEAR}</p>
        {pose && (
          <>
            <p>Pitch: {pose.pitch.toFixed(1)}</p>
            <p>Yaw: {pose.yaw.toFixed(1)}</p>
            <p>Roll: {pose.roll.toFixed(1)}</p>
          </>
        )}
      </main>
    </>
  )
}

export default App
