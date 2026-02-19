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
    private readonly PERCENT_THRESHOLD = 0.6; // count as blink if ear drops to 60% of previous max EAR
    private MIN_CONSECUTIVE_FRAMES = 1;
    private frameCounter = 0;

    // rolling max normalization
    private maxEAR = 0;

    // private WINDOW_SIZE = 10; // previously 30 frames
    // private earWindow: number[] = [];

    // private consecutiveClosedFrames = 0;
    // private REQUIRED_FRAMES = 3; // TODO: want to dynamically set this based on fps

    private l2Norm(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z ?? 0) - (p2.z ?? 0);

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // private computePercentile(values: number[], percentile: number): number {
    //     const sorted = [...values].sort((a, b) => a - b);
    //     const index = Math.floor(percentile * sorted.length);
    //     return sorted[index];
    // }

    // private updateWindow(currentEAR: number) {
    //     this.earWindow.push(currentEAR);

    //     if (this.earWindow.length > this.WINDOW_SIZE) {
    //         this.earWindow.shift();
    //     }
    // }

    updateRequiredFrames(fps: number) {
        // dynamically set this
        this.MIN_CONSECUTIVE_FRAMES = Math.max(2,Math.round(fps * 0.1));

        // this.REQUIRED_CONSECUTIVE_FRAMES = Math.round(fps * 0.1) // 50 ms worth of frames
        // console.log(`Updated required consecutive frames, ${this.REQUIRED_CONSECUTIVE_FRAMES}!`);
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
        // console.log(`Average eye aspect ratio is ${avgEAR}!`);

        // if (avgEAR < this.EAR_THRESHOLD) {
        //     this.frameCounter += 1;
        // } else {
        //     if (this.frameCounter >= this.REQUIRED_CONSECUTIVE_FRAMES) {
        //         this.blinkCount += 1;
        //         this.lastBlinkTime = Date.now();
        //     }
        //     this.frameCounter = 0;
        // }

        // rolling max normalization
        this.maxEAR = Math.max(this.maxEAR * 0.995, avgEAR);
        // console.log(`Maximum eye aspect ratio is ${this.maxEAR}!`);
        const normalizedEAR = avgEAR / this.maxEAR;
        // console.log(`Normalized eye aspect ratio is ${normalizedEAR}!`);

        if (normalizedEAR < this.PERCENT_THRESHOLD) { // changed from normalizedEAR < this.PERCENT_THRESHOLD
            this.frameCounter++;
        } else {
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

        // adaptive thresholding based on rolling frame EAR baseline

        // if (!this.isEyeClosed) {
        //     this.updateWindow(avgEAR);
        // }

        // // this.updateWindow(avgEAR);

        // if (this.earWindow.length < this.WINDOW_SIZE) {
        //     return this.blinkCount; // wait until window stabilizes
        // }

        // const threshold = this.computePercentile(this.earWindow, 0.25);

        // const closeThreshold = threshold * 0.85;
        // const openThreshold = threshold * 0.95;

        // console.log(threshold);

        // if (avgEAR < threshold) {
        //     this.consecutiveClosedFrames++;
        // } else {
        //     if (this.consecutiveClosedFrames >= this.REQUIRED_FRAMES) {
        //         this.blinkCount++;
        //         this.lastBlinkTime = Date.now();
        //     }
        //     this.consecutiveClosedFrames = 0;
        // }

        // if (!this.isEyeClosed && avgEAR < closeThreshold) {
        //     this.isEyeClosed = true;
        //     this.consecutiveClosedFrames = 1;
        // }
        // else if (this.isEyeClosed) {
        //     if (avgEAR < closeThreshold) {
        //         this.consecutiveClosedFrames++;
        //     }
        //     else if (avgEAR > openThreshold) {
        //         if (this.consecutiveClosedFrames >= this.REQUIRED_FRAMES) {
        //             this.blinkCount++;
        //             this.lastBlinkTime = Date.now();
        //         }
        //         this.isEyeClosed = false;
        //         this.consecutiveClosedFrames = 0;
        //     }
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
        // this.isEyeClosed = false;
        // this.lastBlinkTime = null;
        this.lastBlinkTime = Date.now();
        this.frameCounter = 0;
        this.maxEAR = 0;
    }
}
