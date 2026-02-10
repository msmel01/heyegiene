// import { useState } from 'react'
import Header from "./components/layout/Header";
import Camera from "./components/camera/Camera";

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { useState, useEffect, useRef } from "react";

import { BlinkCounterBlendshapes } from "./features/blinkCounterBlendshapes";
import { BlinkCounterEAR } from "./features/blinkCounterEAR";

import './App.css'

function App() {
  const [faceResults, setFaceResults] = useState<FaceLandmarkerResult | null>(null);
  const [blinkCountBlendshapes, setBlinkCountBlendshapes] = useState(0);
  const [blinkCountEAR, setBlinkCountEAR] = useState(0);
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

  const alertSoundRef = useRef<HTMLAudioElement>(
    new Audio("alert.mp3") // put a short sound file in public/
  );

  useEffect(() => {
    if (faceResults) {
      const countBlendshapes = blinkCounterBlendshapesRef.current.update(faceResults.faceBlendshapes);
      setBlinkCountBlendshapes(countBlendshapes);

      const countEAR = blinkCounterEARRef.current.update(faceResults.faceLandmarks);
      setBlinkCountEAR(countEAR);
    }
  }, [faceResults]); // runs every time faceResults changes

  useEffect(() => {
    const interval = setInterval(() => {
      if (blinkCounterEARRef.current.isTimeLastBlinkAlert()) {
        // TODO: clean this up once move to Electron
        if (!document.hidden) { // only play if tab is active
          // alertSound.currentTime = 0;
          // console.log('Blink alert');
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
        <Camera debug={true} onResults={setFaceResults} />
        <p>Blink count from blendshapes: {blinkCountBlendshapes}</p>
        <p>Blink count from EAR: {blinkCountEAR}</p>
      </main>
    </>
  )
}

export default App
