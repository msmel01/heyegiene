# heyegiene
Website to help reduce bad screen usage habits and the resulting eye strain.

Computer Vision Syndrome

## To do:
1. Stop detecting blinks when eye region is covered
    - ~~Use Mediapipe to stop when face detection confidence score is below certain threshold~~
    - Store histogram of eyes during calibration period to determine if eyes are occluded (Bhattacharyya coefficient)
    - Use edge-based segmentation to detect abrupt break or unnatural edges
    - Feature matching techniques like SIFT and HOG with calibrated images
2. ~~Stop blink alerts when camera is off~~
3. 
4. Improve the blink detection algorithm: try adaptive thresholding with rolling average

## Dev notes
Possible limitations of web app:
- When the web tab loses focus, requestAnimationFrame may throttle or webcam access may pause depending on the browser
    - Solution: use desktop wrapper like Electron, Tauri, or Neutralino
    - Solution: make it a browser extension / web app hybrid
        - Limitation: different cross browser behavior

- Models used:
    - Mediapipe [blendshape](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pd)
    - Mediapipe [facemesh](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf)

- Blink detection techniques:
    - BlinkCounterBlendshapes thresholds blink confidence scores from the blendshape model to count blinks
        - Problem: when head is tilted up, blendshapes model fails to detect blinks
        - Use of two thresholds to create deadband zone and handle hysteresis
    - BlinkCounterEAR calculates Eye Aspect Ratio (EAR) from the certain eye landmark points and then thresholds this area to detect blinks
        - Problem: baseline EAR is different for individuals and at different head tilts
            - Solutions to try: adaptive threshold - register blink if EAR drops below that person's baseline
    - 

- Alert trigger options
    - Trigger when time elapsed since last blink > threshold
        - Research shows 14-17 blinks per minute in general -> 15.5 on average -> blink every 3.9 seconds in general
        - Use minimum 14 blinks per minute -> blink every 4.2 seconds in general
            - Problem: can be annoying
        - Use long no-blink intervals (~8 seconds)
    - Trigger when blink rate < threshold
        - Calculate rolling blink rate and give general alert if prolonged for a certain period of time
    - Adaptive thresholding - measure baseline blink rate during first 2 minutes
        - Look into Blink Rate Threshold (BRT)

- Alert design options:
    - Peripheral UI pulse
    - Soft screen fade (reduce brightness)
    - Gentle audio cue
    - Model popups in extreme cases (very long no-blink periods or repeated violations)
    - Add cooldown (e.g., no alert for 30 seconds after correction).

- Features I like to have:
    - Dashboard
        - Average blink rate
        - Longest no-blink streak
        - Healthy digital eye score
    - 20-20-20 protocol timer
    - Viewing distance alerts
    - Prolonged lack of blinking alerts