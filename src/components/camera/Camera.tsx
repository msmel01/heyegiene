import "./Camera.css";
import { useRef, useEffect, useState } from "react";
import { DrawingUtils, FaceLandmarker } from "@mediapipe/tasks-vision";
import { createFaceLandmarker, getFaceLandmarker } from "../../mediapipe/faceLandmarker.ts";
import BlendShapesPanel from "./BlendShapesPanel.tsx";


type CameraProps = {
    debug?: boolean; // show overlay + blendshapes if true
};


export default function Camera({ debug = false }: CameraProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // canvas used to draw landmarks
    // react state variable holding array of blendShapes from mediapipe
    const [blendShapes, setBlendShapes] = useState<any[]>([]);
    // react state variable tracking whether webcam and detection loop are running
    const [running, setRunning] = useState(false);

    // Initialize FaceLandmarker
    useEffect(() => {
        async function init() {
            // Initialize FaceLandmarker and webcam
            await createFaceLandmarker();
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
            video.srcObject = stream; // assign MediaStream to connect the camera feed

            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => resolve();
            });

            setRunning(true);

            // Match canvas size to video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            console.log("Webcam started, canvas size:", canvas.width, canvas.height);

        } catch (err) {
            console.error("Could not start webcam:", err);
        }
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
            if (video.readyState < 2) { // at least one frame of data available
                animationFrameId = requestAnimationFrame(processFrame);
                return;
            }
            // readyState must be:
            // 3 -> can play next frame without stalling
            // OR
            // 4 -> enough to play smoothly
            // to start calculating / drawing landmarks
            
            // TODO: clean this up later
            // if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            //     canvas.width = video.videoWidth;
            //     canvas.height = video.videoHeight;
            // }

            let results;
            try {
                const faceLandmarker = getFaceLandmarker();
                results = await faceLandmarker.detectForVideo(video, performance.now());
                /*
                FaceLandmarkerResult returns:
                - Detected face landmarks in normalized image coordinates.
                  faceLandmarks: NormalizedLandmark[][];

                - Optional face blendshapes results.
                  faceBlendshapes: Classifications[];

                - Optional facial transformation matrix.
                  facialTransformationMatrixes: Matrix[];
                */
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
                    // drawingUtils.drawConnectors(
                    //     landmarks,
                    //     FaceLandmarker.FACE_LANDMARKS_LIPS,
                    //     { color: "#E0E0E0" }
                    // );
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

            {debug && <BlendShapesPanel blendShapes={blendShapes} />}

            {!running && (
                <button
                    onClick={startWebcam}
                    style={{ marginTop: "1rem", padding: "0.5rem 1rem", fontSize: "16px", cursor: "pointer" }}
                >
                    Start Webcam
                </button>
            )}
        </div>
    );
}
