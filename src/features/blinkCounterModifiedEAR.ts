type HeadPose = {
    pitch: number;
    yaw: number;
    roll: number;
};

export class BlinkCounterModifiedEAR {
    private blinkCount = 0;
    private frameCounter = 0;
    private isEyeClosed = false;
    private lastPitch = Infinity;
    private lastRoll = Infinity;
    private lastYaw = Infinity;

    private BLINK_Z_THRESHOLD = -1.5;    // z-score below this = closed eye
    private OPEN_Z_THRESHOLD = -0.5;

    private readonly MIN_CONSECUTIVE_FRAMES = 1; // previoously 1
    private readonly WINDOW_SIZE = 30; // number of EAR values to keep
    private earWindow: number[] = [];

    reset() {
        this.blinkCount = 0;
        this.frameCounter = 0;
        this.isEyeClosed = false;
        this.lastPitch = Infinity;
        this.lastRoll = Infinity;
        this.lastYaw = Infinity;

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

    private median(values: number[]): number {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    private mad(values: number[], median: number): number {
        const deviations = values.map(v => Math.abs(v - median));
        return this.median(deviations);
    }

    update(landmarks: any[], pose: HeadPose | null): { count: number, blinkDetected: boolean } {
        let didBlinkThisFrame = false;

        if (!landmarks?.length) return {
            count: this.blinkCount,
            blinkDetected: didBlinkThisFrame
        };

        const face = landmarks[0];

        const leftEAR = this.calculateEAR(face, [33, 160, 158, 133, 153, 144]);
        const rightEAR = this.calculateEAR(face, [362, 385, 387, 263, 373, 380]);
        const ear = (leftEAR + rightEAR) / 2;

        // If head tilts up/down with more than 2 degrees, reset earWindow, frameCounter, and isEyeClosed
        if (pose !== null) {
            if (this.lastPitch != Infinity && Math.abs(this.lastPitch - pose.pitch) >= 1) {
                this.frameCounter = 0;
                this.isEyeClosed = false;
                this.earWindow = [];
            }
            this.lastPitch = pose.pitch; // update lastPitch

            // if (this.lastRoll != Infinity && Math.abs(this.lastRoll - pose.roll) >= 1) {
            //     this.frameCounter = 0;
            //     this.isEyeClosed = false;
            //     this.earWindow = [];
            // }
            // this.lastRoll = pose.roll; // update lastRoll

            // if (this.lastYaw != Infinity && Math.abs(this.lastYaw- pose.yaw) >= 1) {
            //     this.frameCounter = 0;
            //     this.isEyeClosed = false;
            //     this.earWindow = [];
            //     // console.log(Math.abs(this.lastYaw - pose.yaw));
            // }
            // this.lastYaw = pose.yaw; // update lastYaw

        }

        // calculate 
        // const dx = face[33].x - face[263].x;
        // const dy = face[33].y - face[263].y;
        // const eyeWidth = Math.sqrt(dx * dx + dy * dy);
        // console.log(`interocular distance is ${eyeWidth}`);


        if (this.earWindow.length < 3) { // minimum length for median
            // wait until window fills with at least 1 frame
            // console.log('waiting for ear window to fill');
            this.earWindow.push(ear);
            return { count: this.blinkCount, blinkDetected: false };
        }

        // mean based
        // const mean = this.earWindow.reduce((a, b) => a + b, 0) / this.earWindow.length;
        // const std = Math.sqrt(this.earWindow.reduce((a, b) => a + (b - mean) ** 2, 0) / this.earWindow.length);
        // if (std < 1e-6) { // avoid division by zero
        //     return { count: this.blinkCount, blinkDetected: false };
        // }
        // const z = (ear - mean) / std;  // z-score

        // median based
        const med = this.median(this.earWindow);
        const mad = this.mad(this.earWindow, med);
        const z = (ear - med) / (1.4826 * mad);

        // console.log(`EAR score is ${ear}`);
        // console.log(`z-score is ${z}, mean is ${mean}, std is ${std}`);
        // console.log();

        // check if eye is closed
        if (z < this.BLINK_Z_THRESHOLD) {
            this.frameCounter++;
            this.isEyeClosed = true;
        } else if (this.isEyeClosed && z > this.OPEN_Z_THRESHOLD) {
            // eye has reopened so count blink if it lasted enough frames
            if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
                this.blinkCount++;
                didBlinkThisFrame = true;
            }
            this.frameCounter = 0;
            this.isEyeClosed = false;
            // this.earWindow.push(ear);
        } else if (this.isEyeClosed) {
            // eye still closed but not enough frames yet → keep counting
            this.frameCounter++;
        } else {
            // eye is open, no blink, reset frame counter
            this.frameCounter = 0;
        }

        // add to rolling window
        this.earWindow.push(ear);
        if (this.earWindow.length > this.WINDOW_SIZE) {
            this.earWindow.shift();
        }

        return { count: this.blinkCount, blinkDetected: didBlinkThisFrame };
    }

    getCount() {
        return this.blinkCount;
    }
}

// export class BlinkCounterModifiedEAR {
//     private blinkCount = 0;
//     private frameCounter = 0;
//     private isEyeClosed = false;
//     private lastPitch = Infinity;
//     private lastRoll = Infinity;
//     private lastYaw = Infinity;

//     private BLINK_Z_THRESHOLD = -1.5;    // z-score below this = closed eye
//     private OPEN_Z_THRESHOLD = -0.5;

//     private readonly MIN_CONSECUTIVE_FRAMES = 1; // previoously 1
//     private readonly WINDOW_SIZE = 30; // number of EAR values to keep
//     private earWindow: number[] = [];

//     reset() {
//         this.blinkCount = 0;
//         this.frameCounter = 0;
//         this.isEyeClosed = false;
//         this.lastPitch = Infinity;
//         this.lastRoll = Infinity;
//         this.lastYaw = Infinity;

//         this.earWindow = [];
//     }

//     private l2Norm(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
//         const dx = p1.x - p2.x;
//         const dy = p1.y - p2.y;
//         const dz = (p1.z ?? 0) - (p2.z ?? 0);

//         return Math.sqrt(dx * dx + dy * dy + dz * dz);
//     }


//     private calculateEAR(landmarks: any[], indices: number[]): number {
//         const [p1, p2, p3, p4, p5, p6] = indices;

//         const vertical1 = this.l2Norm(landmarks[p2], landmarks[p6]);
//         const vertical2 = this.l2Norm(landmarks[p3], landmarks[p5]);
//         const horizontal = this.l2Norm(landmarks[p1], landmarks[p4]);

//         return (vertical1 + vertical2) / (2.0 * horizontal);
//     }

//     private median(values: number[]): number {
//         const sorted = [...values].sort((a, b) => a - b);
//         const mid = Math.floor(sorted.length / 2);
//         return sorted.length % 2 === 0
//             ? (sorted[mid - 1] + sorted[mid]) / 2
//             : sorted[mid];
//     }

//     private mad(values: number[], median: number): number {
//         const deviations = values.map(v => Math.abs(v - median));
//         return this.median(deviations);
//     }

//     update(landmarks: any[], pose: HeadPose | null): { count: number, blinkDetected: boolean } {
//         let didBlinkThisFrame = false;

//         if (!landmarks?.length) return {
//             count: this.blinkCount,
//             blinkDetected: didBlinkThisFrame
//         };

//         const face = landmarks[0];

//         const leftEAR = this.calculateEAR(face, [33, 160, 158, 133, 153, 144]);
//         const rightEAR = this.calculateEAR(face, [362, 385, 387, 263, 373, 380]);
//         const ear = (leftEAR + rightEAR) / 2;

//         // If head tilts up/down with more than 2 degrees, reset earWindow, frameCounter, and isEyeClosed
//         if (pose !== null) {
//             if (this.lastPitch != Infinity && Math.abs(this.lastPitch - pose.pitch) >= 1) {
//                 this.frameCounter = 0;
//                 this.isEyeClosed = false;
//                 this.earWindow = [];
//             }
//             this.lastPitch = pose.pitch; // update lastPitch

//             if (this.lastRoll != Infinity && Math.abs(this.lastRoll - pose.roll) >= 1) {
//                 this.frameCounter = 0;
//                 this.isEyeClosed = false;
//                 this.earWindow = [];
//             }
//             this.lastRoll = pose.roll; // update lastRoll

//             if (this.lastYaw != Infinity && Math.abs(this.lastYaw - pose.yaw) >= 1) {
//                 this.frameCounter = 0;
//                 this.isEyeClosed = false;
//                 this.earWindow = [];
//                 // console.log(Math.abs(this.lastYaw - pose.yaw));
//             }
//             this.lastYaw = pose.yaw; // update lastYaw

//         }

//         // calculate 
//         // const dx = face[33].x - face[263].x;
//         // const dy = face[33].y - face[263].y;
//         // const eyeWidth = Math.sqrt(dx * dx + dy * dy);
//         // console.log(`interocular distance is ${eyeWidth}`);


//         if (this.earWindow.length < 3) { // minimum length for median
//             // wait until window fills with at least 1 frame
//             // console.log('waiting for ear window to fill');
//             this.earWindow.push(ear);
//             return { count: this.blinkCount, blinkDetected: false };
//         }

//         // mean based
//         // const mean = this.earWindow.reduce((a, b) => a + b, 0) / this.earWindow.length;
//         // const std = Math.sqrt(this.earWindow.reduce((a, b) => a + (b - mean) ** 2, 0) / this.earWindow.length);
//         // if (std < 1e-6) { // avoid division by zero
//         //     return { count: this.blinkCount, blinkDetected: false };
//         // }
//         // const z = (ear - mean) / std;  // z-score

//         // median based
//         const med = this.median(this.earWindow);
//         // const mad = this.mad(this.earWindow, med);
//         // const z = (ear - med) / (1.4826 * mad);
//         const normalizedEAR = ear / med;

//         if (normalizedEAR < 0.60) { // changed from normalizedEAR < this.PERCENT_THRESHOLD
//             this.frameCounter++;

//         } else { // eye reopened
//             if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
//                 this.blinkCount++;
//                 didBlinkThisFrame = true;
//             }
//             this.frameCounter = 0;
//         }

//         // console.log(`EAR score is ${ear}`);
//         // console.log(`z-score is ${z}, mean is ${mean}, std is ${std}`);
//         // console.log();

//         // check if eye is closed
//         // if (z < this.BLINK_Z_THRESHOLD) {
//         //     this.frameCounter++;
//         //     this.isEyeClosed = true;
//         // } else if (this.isEyeClosed && z > this.OPEN_Z_THRESHOLD) {
//         //     // eye has reopened so count blink if it lasted enough frames
//         //     if (this.frameCounter >= this.MIN_CONSECUTIVE_FRAMES) {
//         //         this.blinkCount++;
//         //         didBlinkThisFrame = true;
//         //     }
//         //     this.frameCounter = 0;
//         //     this.isEyeClosed = false;
//         //     // this.earWindow.push(ear);
//         // } else if (this.isEyeClosed) {
//         //     // eye still closed but not enough frames yet → keep counting
//         //     this.frameCounter++;
//         // } else {
//         //     // eye is open, no blink, reset frame counter
//         //     this.frameCounter = 0;
//         // }

//         // add to rolling window
//         this.earWindow.push(ear);
//         if (this.earWindow.length > this.WINDOW_SIZE) {
//             this.earWindow.shift();
//         }

//         return { count: this.blinkCount, blinkDetected: didBlinkThisFrame };
//     }

//     getCount() {
//         return this.blinkCount;
//     }
// }