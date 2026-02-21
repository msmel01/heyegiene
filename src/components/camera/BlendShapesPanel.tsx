/*
For debug purposes
Displays the panel of faceBlendshapes categories (e.g. mouthSmileLeft, eyeBlinkRight, etc.)
with the model's confidence score for each
*/
import './blendShapesPanel.css';

type BlendShapesPanelProps = {
    blendShapes: any[]; // array of detected face blendshapes from faceLandmarker.faceBlendshapes
};

export default function BlendShapesPanel({ blendShapes }: BlendShapesPanelProps) {
    if (!blendShapes.length) return null; // nothing to display

    const categories = blendShapes[0].categories || []; // categories for first detected face

    return (
        <div className="blend-shapes-panel">
            <h3>Face Blendshapes</h3>
            <ul className="blend-shapes-list">
                {categories.map((shape: any) => (
                    <li key={shape.categoryName} className="blend-shapes-item">
                        <span className="blend-shapes-label">
                            {shape.displayName || shape.categoryName}
                        </span>
                        <span
                            className="blend-shapes-value"
                            style={{ width: `${(shape.score || 0) * 100}%` }}
                        >
                            {shape.score.toFixed(4)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
