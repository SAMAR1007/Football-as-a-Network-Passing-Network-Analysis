export default function StepNav({ currentStep, stepsEnabled, onStepChange }) {
  const labels = ["Load", "Network", "Centrality", "Tactical", "Match Story", "Hub Analysis", "Report"];
  return (
    <nav className="steps" id="steps">
      {labels.map((label, i) => (
        <button
          key={i}
          data-step={i + 1}
          className={currentStep === i + 1 ? "active" : ""}
          disabled={!stepsEnabled && i + 1 !== 1}
          onClick={() => onStepChange(i + 1)}
        >
          <span className="step-num">{i + 1}</span>
          <span className="step-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
