/*
Use blendshapes confidence score to count the number of blinks
*/

export class BlinkCounterBlendshapes {
    private blinkCount = 0;
    private isEyeClosed = false;

    // thresholds
    private readonly CLOSE_THRESHOLD = 0.6;
    private readonly OPEN_THRESHOLD = 0.3;

    // private readonly THRESHOLD_LOOK_DOWN = 0.7;

    // private readonly CLOSE_THRESHOLD_LOOK_DOWN = 0.6;
    // private readonly OPEN_THRESHOLD_LOOK_DOWN = 0.5;

    update(blendShapes: any[]): {count: number, blinkDetected: boolean } {
        let didBlinkThisFrame = false;
        
        if (!blendShapes?.length) return {
            count: this.blinkCount,
            blinkDetected: didBlinkThisFrame
        };

        const categories = blendShapes[0].categories;

        const left = categories.find(
            (c: any) => c.categoryName === "eyeBlinkLeft"
        )?.score ?? 0;

        const right = categories.find(
            (c: any) => c.categoryName === "eyeBlinkRight"
        )?.score ?? 0;

        const avgBlink = (left + right) / 2;

        // console.log(avgBlink);
        // const lookDownLeft = categories.find(
        //     (c: any) => c.categoryName === "eyeLookDownLeft"
        // )?.score ?? 0;

        // const lookDownRight = categories.find(
        //     (c: any) => c.categoryName === "eyeLookDownRight"
        // )?.score ?? 0;
        // const avgLookDown = (lookDownLeft + lookDownRight) / 2;

        // based on blinks
        // Eye just closed
        if (!this.isEyeClosed && avgBlink > this.CLOSE_THRESHOLD) {
            this.isEyeClosed = true;
        }

        // Eye reopened so count blink
        if (this.isEyeClosed && avgBlink < this.OPEN_THRESHOLD) {
            this.isEyeClosed = false;
            this.blinkCount++;
            didBlinkThisFrame = true;
        }

        return {
            count: this.blinkCount,
            blinkDetected: didBlinkThisFrame
        };
    }

    getCount() {
        return this.blinkCount;
    }

    reset() {
        this.blinkCount = 0;
        this.isEyeClosed = false;
    }
}
