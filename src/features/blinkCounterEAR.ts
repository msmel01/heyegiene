/*
Use eye aspect ratio (EAR) technique using raw landmarks geometries to count the
number of blinks:

EAR = (||p2 - p6|| + ||p3 - p5||) / 2||p1 - p4||

github.com/google-ai-edge/mediapipe/blob/master/mediapipe/graphs/face_mesh/calculators/face_landmarks_to_render_data_calculator.cc

https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
Left eye landmarks index
p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144

Right eye landmarks index
p1: 362, p2: 385, p3: 387, p4: 263, p5: 373, p6: 380
*/

export class BlinkCounterEAR {
    private blinkCount = 0;
    private isEyeClosed = false;
    private lastBlinkTime = Date.now();
    
    private readonly TIME_LAST_BLINK_THRESHOLD = 5000; // 6 seconds
    private readonly CLOSE_THRESHOLD = 0.15;
    private readonly OPEN_THRESHOLD = 0.20;

    l2Norm(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }) : number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z ?? 0) - (p2.z ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    update(landmarks: any[]): number {
        if (!landmarks?.length) return this.blinkCount;

        const leftEyeEAR = (this.l2Norm(landmarks[0][160], landmarks[0][144]) +
                            this.l2Norm(landmarks[0][158], landmarks[0][153])) /
                            (2 * this.l2Norm(landmarks[0][33], landmarks[0][133]));

        const rightEyeEAR = (this.l2Norm(landmarks[0][385], landmarks[0][380]) +
                             this.l2Norm(landmarks[0][387], landmarks[0][373])) /
                             (2 * this.l2Norm(landmarks[0][362], landmarks[0][263]));
        
        const avgEAR = (leftEyeEAR + rightEyeEAR) / 2;
        
        console.log(avgEAR);

        // Eye just closed
        if (!this.isEyeClosed && avgEAR < this.CLOSE_THRESHOLD) {
            this.isEyeClosed = true;
        }

        // Eye reopened → count blink
        if (this.isEyeClosed && avgEAR > this.OPEN_THRESHOLD) {
            this.isEyeClosed = false;
            this.blinkCount++;
            this.lastBlinkTime = Date.now()
        }

        return this.blinkCount;
    }

    getCount() {
        return this.blinkCount;
    }

    getTimeSinceLastBlink(): number {
        return Date.now() - this.lastBlinkTime; // in ms
    }

    isTimeLastBlinkAlert(): boolean {
        return this.getTimeSinceLastBlink() > this.TIME_LAST_BLINK_THRESHOLD;
    }

    reset() {
        this.blinkCount = 0;
        this.isEyeClosed = false;
        this.lastBlinkTime = Date.now();
    }
}
