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
    // private isEyeClosed = false;
    // private lastBlinkTime = null;
    private lastBlinkTime = Date.now();

    private readonly TIME_LAST_BLINK_THRESHOLD = 5000; // 5 seconds
    // private readonly CLOSE_THRESHOLD = 0.15;
    // private readonly OPEN_THRESHOLD = 0.20;

    // private readonly EAR_THRESHOLD = 0.2;

    // blink detection threshold
    private readonly PERCENT_THRESHOLD = 0.60; // count as blink if ear drops to 60% of previous max EAR
    private MIN_CONSECUTIVE_FRAMES = 2;
    private frameCounter = 0;

    // rolling max normalization
    private maxEAR = 0;

    private l2Norm(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z ?? 0) - (p2.z ?? 0);

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    updateRequiredFrames(fps: number) {
        // dynamically set this
        this.MIN_CONSECUTIVE_FRAMES = Math.max(2,Math.round(fps * 0.15)); // 150 ms minimum
    }

    private calculateEAR(landmarks: any[], indices: number[]): number {
        const [p1, p2, p3, p4, p5, p6] = indices;

        const vertical1 = this.l2Norm(landmarks[p2], landmarks[p6]);
        const vertical2 = this.l2Norm(landmarks[p3], landmarks[p5]);
        const horizontal = this.l2Norm(landmarks[p1], landmarks[p4]);

        return (vertical1 + vertical2) / (2.0 * horizontal);
    }

    update(landmarks: any[]): { count: number, blinkDetected: boolean } {
        let didBlinkThisFrame = false;

        if (!landmarks?.length) return {
            count: this.blinkCount,
            blinkDetected: didBlinkThisFrame
        };

        const face = landmarks[0];

        const leftEAR = this.calculateEAR(face, [33, 160, 158, 133, 153, 144]);
        const rightEAR = this.calculateEAR(face, [362, 385, 387, 263, 373, 380]);
            
        const avgEAR = (leftEAR + rightEAR) / 2;

        // rolling max normalization
        this.maxEAR = Math.max(this.maxEAR * 0.995, avgEAR);
        const normalizedEAR = avgEAR / this.maxEAR;

        if (normalizedEAR < this.PERCENT_THRESHOLD) { // changed from normalizedEAR < this.PERCENT_THRESHOLD
            this.frameCounter++;

        } else { // eye reopened
            if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
                this.blinkCount++;
                this.lastBlinkTime = Date.now();
                didBlinkThisFrame = true;
            }
            this.frameCounter = 0;
        }

        // Eye just closed
        // if (!this.isEyeClosed && avgEAR < this.CLOSE_THRESHOLD) {
        //     this.isEyeClosed = true;
        // }

        // // Eye reopened → count blink
        // if (this.isEyeClosed && avgEAR > this.OPEN_THRESHOLD) {
        //     this.isEyeClosed = false;
        //     this.blinkCount++;
        //     this.lastBlinkTime = Date.now()
        // }

        return {
            count: this.blinkCount,
            blinkDetected: didBlinkThisFrame
        };
    }

    getCount() {
        return this.blinkCount;
    }

    private getTimeSinceLastBlink(): number {
        return Date.now() - this.lastBlinkTime; // in ms
    }

    isTimeLastBlinkAlert(): boolean {
        return this.getTimeSinceLastBlink() > this.TIME_LAST_BLINK_THRESHOLD;
    }

    reset() {
        this.blinkCount = 0;
        this.lastBlinkTime = Date.now();
        this.frameCounter = 0;
        this.maxEAR = 0;
    }
}
