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

    update(blendShapes: any[]): number {
        if (!blendShapes?.length) return this.blinkCount;

        const categories = blendShapes[0].categories;

        const left = categories.find(
            (c: any) => c.categoryName === "eyeBlinkLeft"
        )?.score ?? 0;

        const right = categories.find(
            (c: any) => c.categoryName === "eyeBlinkRight"
        )?.score ?? 0;

        const avgBlink = (left + right) / 2;

        // const lookDownLeft = categories.find(
        //     (c: any) => c.categoryName === "eyeLookDownLeft"
        // )?.score ?? 0;

        // const lookDownRight = categories.find(
        //     (c: any) => c.categoryName === "eyeLookDownRight"
        // )?.score ?? 0;

        // const avgLookDown = (lookDownLeft + lookDownRight) / 2;

        // if (avgLookDown > this.THRESHOLD_LOOK_DOWN) {
        //     console.log('Looking down');
        //     console.log(avgBlink);
        // }
        
        // This does not work when head tilts up

        // Eye just closed
        if (!this.isEyeClosed && avgBlink > this.CLOSE_THRESHOLD) {
            this.isEyeClosed = true;
        }

        // Eye reopened → count blink
        if (this.isEyeClosed && avgBlink < this.OPEN_THRESHOLD) {
            this.isEyeClosed = false;
            this.blinkCount++;
        }

        return this.blinkCount;
    }

    getCount() {
        return this.blinkCount;
    }

    reset() {
        this.blinkCount = 0;
        this.isEyeClosed = false;
    }
}
