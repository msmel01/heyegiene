import type { Landmark } from "@mediapipe/tasks-vision";

// rectangle cropping
const leftEyeIndices = [33, 159, 133, 145]
const rightEyeIndices = [362, 386, 359, 374]

// freeform cropping
// const leftEyeIndices = [
//     33, 246, 161, 160, 159, 158, 157, 173, // upper + lower eyelid
//     133, 155, 154, 153, 145, 144, 163, 7    // inner/outer corners and extra points
// ];
// const rightEyeIndices = [
//     362, 398, 384, 385, 386, 387, 388, 466, // upper + lower eyelid
//     263, 249, 390, 373, 374, 380, 381, 382  // inner/outer corners and extra points
// ];


var save = 1;

export function cropEye(
    video: HTMLVideoElement,
    landmarks: Landmark[],
    isLeftEye: boolean,
    padding = 3
    ): Uint8ClampedArray | null {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    const points = (isLeftEye ? leftEyeIndices : rightEyeIndices).map(i => ({
        x: landmarks[i].x * videoWidth,
        y: landmarks[i].y * videoHeight
    }));

    // rectangle cropping
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const width = Math.max(1, maxX - minX + padding);
    const height = Math.max(1, maxY - minY + padding);

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(
        video,
        minX - padding,
        minY - padding,
        width,
        height,
        0,
        0,
        width,
        height
    );

    // freeform cropping
    // const localPoints = points.map(p => ({ x: p.x - minX, y: p.y - minY}));
    // ctx.beginPath();
    // ctx.moveTo(localPoints[0].x, localPoints[0].y);
    // for (let i = 1; i < localPoints.length; i++) {
    //     ctx.lineTo(localPoints[i].x, localPoints[i].y);
    // }
    // ctx.closePath();
    // ctx.clip();

    // ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    // ctx.drawImage(video, 0, 0, width, height);
    // ctx.drawImage(
    //     video,
    //     minX - padding, // source x in video
    //     minY - padding, // source y in video
    //     width,          // source width
    //     height,         // source height
    //     0,              // destination x in canvas
    //     0,              // destination y in canvas
    //     width,          // destination width
    //     height          // destination height
    // );


    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data; // Uint8ClampedArray RGBA

    if (save < 3) {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = isLeftEye ? "left_eye.png" : "right_eye.png";
            link.click();
            URL.revokeObjectURL(link.href);
        }, "image/png");
        save = save + 1;
    }

    return pixels;
}