import "./Camera.css";
import { useRef, useEffect, useState } from "react";
import { DrawingUtils, FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

import { createFaceLandmarker, getFaceLandmarker } from "../../mediapipe/faceLandmarker.ts";
import { createFaceDetector, getFaceDetector } from "../../mediapipe/faceDetector.ts";
import { cropEye } from "../../utils/cropEye.ts";
import BlendShapesPanel from "./BlendShapesPanel.tsx";


type CameraProps = {
    debug?: boolean; // show overlay + blendshapes if true
    // onResults?: React.Dispatch<
    //     React.SetStateAction<FaceLandmarkerResult | null>
    // >;
    onResults?: (results: FaceLandmarkerResult) => void;
    onCameraStateChange: (isRunning: boolean) => void;
};


export default function Camera({ debug = false, onResults, onCameraStateChange }: CameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // canvas used to draw landmarks
    const streamRef = useRef<MediaStream | null>(null);

    // react state variable holding array of blendShapes from mediapipe
    const [blendShapes, setBlendShapes] = useState<any[]>([]);
    // react state variable tracking whether webcam and detection loop are running
    const [running, setRunning] = useState(false);

    // react state variable tracking whether we are in calibration phase
    const [calibrating, setCalibrating] = useState(false);
    const calibrationStartRef = useRef<number | null>(null);
    const calibrationDuration = 3000; // 4 seconds

    // Initialize FaceLandmarker
    useEffect(() => {
        async function init() {
            // Initialize FaceLandmarker and webcam
            await createFaceLandmarker();
            await createFaceDetector();
        }
        init();
    }, []);

    // Start webcam
    const startWebcam = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            video.srcObject = stream; // assign MediaStream to connect the camera feed

            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => resolve();
            });

            setRunning(true);
            setCalibrating(true);
            onCameraStateChange(true);

            // Match canvas size to video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log("Webcam started, canvas size:", canvas.width, canvas.height);

        } catch (err) {
            console.error("Could not start webcam:", err);
        }
    };

    // Stop webcam
    const stopWebcam = () => {
        const video = videoRef.current;

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (video) {
            video.srcObject = null;
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d"); // want to draw in 2D
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        setRunning(false);
        onCameraStateChange(false);
    };

    // Detection loop
    useEffect(() => {
        if (!running) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d"); // want to draw in 2D
        // ctx is a CanvasRenderingContext2D object

        if (!ctx) return;

        let animationFrameId: number;

        const drawingUtils = new DrawingUtils(ctx);

        const processFrame = async () => {
            if (video.readyState < 2) { // at least one frame of data available to start calculating / drawing landmarks
                // readyState must be:
                // 3 -> can play next frame without stalling
                // OR
                // 4 -> enough to play smoothly
                animationFrameId = requestAnimationFrame(processFrame);
                return;
            } else if (calibrating) {
                calibrationStartRef.current = performance.now()
            }

            let results;
            try {
                // Check to see if eyes are detected
                // const faceDetector = getFaceDetector();

                // const detections = faceDetector.detectForVideo(
                //     video,
                //     performance.now()
                // );

                // // probably need to improve this
                // if (!detections.detections.length) { // no face is detected
                //     ctx.clearRect(0, 0, canvas.width, canvas.height);
                //     animationFrameId = requestAnimationFrame(processFrame);
                //     return;
                // } else if (detections.detections[0].categories[0].score < 0.85) { // face is not confidently detected
                //     ctx.clearRect(0, 0, canvas.width, canvas.height);
                //     animationFrameId = requestAnimationFrame(processFrame);
                //     return;
                // }
                // console.log(detections.detections[0].categories[0]);

                const faceLandmarker = getFaceLandmarker();
                results = await faceLandmarker.detectForVideo(video, performance.now());

                if (calibrating && results.faceLandmarks?.length) {
                    const now = performance.now();
                    const elapsed = now - (calibrationStartRef.current ?? now);

                    const landmarks = results.faceLandmarks[0];

                    console.log('calibrating');
                    
                    cropEye(video, landmarks, true);
                    cropEye(video, landmarks, false);

                    // const leftEyePixels = cropEye(video, landmarks, "left");
                    // const rightEyePixels = cropEye(video, landmarks, "right");

                    // const leftHist = computeHistogram(leftEyePixels);
                    // const rightHist = computeHistogram(rightEyePixels);

                    if (elapsed > calibrationDuration) {
                        setCalibrating(false);
                        console.log("Calibration complete");
                    }
                }

                if (onResults) { // triggers blink logic in App.tsx
                    onResults(results);
                }

            } catch (error) {
                console.error("FaceLandmarker error:", error);
                animationFrameId = requestAnimationFrame(processFrame);
                return;

            }

            // Clear overlay
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw landmarks on overlay
            if (results.faceLandmarks) {
                for (const landmarks of results.faceLandmarks) {
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                        { color: "#C0C0C070", lineWidth: 1 }
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                        { color: "#FF3030" }
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                        { color: "#30FF30" }
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                        { color: "#E0E0E0" }
                    );
                    drawingUtils.drawConnectors(
                        landmarks,
                        FaceLandmarker.FACE_LANDMARKS_LIPS,
                        { color: "#E0E0E0" }
                    );
                }
            }

            // Update blendShapes
            if (results.faceBlendshapes) {
                setBlendShapes(results.faceBlendshapes);
            }

            animationFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();

        return () => cancelAnimationFrame(animationFrameId);
    }, [running]);

    return (
        <div className="camera-container">
            {debug && (
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ display: "block", width: "100%", height: "100%" }}
                />
            )}

            {debug && <canvas ref={canvasRef} />}

            <button
                onClick={running ? stopWebcam : startWebcam}
                style={{ marginTop: "1rem", padding: "0.5rem 1rem", fontSize: "16px", cursor: "pointer" }}
            >
                {running ? "Stop Webcam" : "Start Webcam"}
            </button>

            {debug && <BlendShapesPanel blendShapes={blendShapes} />}

            {/* {!running && (
                <button
                    onClick={running ? stopWebcam : startWebcam}
                    style={{ marginTop: "1rem", padding: "0.5rem 1rem", fontSize: "16px", cursor: "pointer" }}
                >
                    {running ? "Stop Webcam" : "Start Webcam"}
                </button>
            )} */}

        </div>
    );
}
