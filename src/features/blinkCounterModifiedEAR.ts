export class BlinkCounterModifiedEAR {
    private blinkCount = 0;
    private frameCounter = 0;
    private isEyeClosed = false;

    private BLINK_Z_THRESHOLD = -1;    // z-score below this = closed eye
    private OPEN_Z_THRESHOLD = -0.5;

    private readonly MIN_CONSECUTIVE_FRAMES = 2;
    private readonly WINDOW_SIZE = 30; // number of EAR values to keep
    private earWindow: number[] = [];

    reset() {
        this.blinkCount = 0;
        this.frameCounter = 0;
        this.earWindow = [];
    }

    private l2Norm(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z ?? 0) - (p2.z ?? 0);

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
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

        const ear = (leftEAR + rightEAR) / 2;

        // const leftEye = face[33];
        // const rightEye = face[362];
        // const eyeMidY = (leftEye.y + rightEye.y) / 2;
        // const nose = face[1]; // tip of nose
        // const chin = face[152];
        // const faceHeight = chin.y - nose.y;
        // const pitchNormalized = (nose.y - eyeMidY) / faceHeight;
        // const pitch = Math.atan2(chin.y * 480 - nose.y * 480, chin.z * 640 - nose.z * 640);
        // console.log(pitch);

        // add to rolling window
        this.earWindow.push(ear);
        if (this.earWindow.length > this.WINDOW_SIZE) {
            this.earWindow.shift();
        }

        // if (this.earWindow.length < this.WINDOW_SIZE) {
        //     // wait until window fills
        //     return { count: this.blinkCount, blinkDetected: false };
        // }

        // fit the Isolation Forest on current window
        // isolation-forest expects 2D array [[value], [value], ...]
        // const data = this.earWindow.map(v => [v]);
        // this.model.fit(data);

        // predict anomaly score for current EAR
        // const prediction = this.model.predict([[ear]]); // 1 = normal, -1 = outlier
        // console.log(prediction[0]);
        // // const isOutlier = prediction[0] === -1;
        // const scoreThreshold = 0.5; // adjust if needed
        // const isOutlier = this.model.scores()[this.earWindow.length - 1] < scoreThreshold;

        // const scores = this.model.scores();
        // const latestScore = scores[scores.length - 1];
        // console.log(latestScore);
        // const scoreThreshold = 0; // values below this are outliers
        // const isOutlier = latestScore < scoreThreshold;

        const mean = this.earWindow.reduce((a, b) => a + b, 0) / this.earWindow.length;
        const std = Math.sqrt(this.earWindow.reduce((a, b) => a + (b - mean) ** 2, 0) / this.earWindow.length);
        const z = (ear - mean) / std;  // z-score
        // console.log(z);
        const isOutlier = z < -1;

        // if (isOutlier) {
        //     this.frameCounter++;
        // } else {
        //     if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
        //         this.blinkCount++;
        //         didBlinkThisFrame = true;
        //     }
        //     this.frameCounter = 0;
        // }

        // check if eye is closed
        if (z < this.BLINK_Z_THRESHOLD) {
            this.frameCounter++;
            this.isEyeClosed = true;
        } else if (this.isEyeClosed && z > this.OPEN_Z_THRESHOLD) {
            // eye has reopened → count blink if it lasted enough frames
            if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
                this.blinkCount++;
                didBlinkThisFrame = true;
            }
            this.frameCounter = 0;
            this.isEyeClosed = false;
        } else if (this.isEyeClosed) {
            // eye still closed but not enough frames yet → keep counting
            this.frameCounter++;
        } else {
            // eye is open, no blink, reset frame counter
            this.frameCounter = 0;
        }
        return { count: this.blinkCount, blinkDetected: didBlinkThisFrame };
    }

    getCount() {
        return this.blinkCount;
    }
}

