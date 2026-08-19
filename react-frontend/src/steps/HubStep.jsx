import HubAnalysis from "../components/HubAnalysis";

export default function HubStep({ match, teams }) {
  return (
    <>
      <div className="card">
        <h3>Hub player tactical analysis</h3>
        <p className="muted">
          Deep dive on each team's central playmaker — the passing hub the whole
          build-up flows through. How to contain them: passing direction and
          distance, pressure resistance, top connections, zone activity, xT
          threat, strengths &amp; weaknesses, and tactical recommendations.
        </p>
      </div>
      <HubAnalysis title="7. Hub player tactical analysis" match={match} teams={teams} />
    </>
  );
}
