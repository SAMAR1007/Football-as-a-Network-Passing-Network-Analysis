import { useState, useEffect, useCallback } from "react";
import { api, bustCache } from "./api";
import Header from "./components/Header";
import MatchBar from "./components/MatchBar";
import StepNav from "./components/StepNav";
import Landing from "./components/Landing";
import LoadStep from "./steps/LoadStep";
import NetworkStep from "./steps/NetworkStep";
import CentralityStep from "./steps/CentralityStep";
import TacticalStep from "./steps/TacticalStep";
import StoryStep from "./steps/StoryStep";
import HubStep from "./steps/HubStep";
import ReportStep from "./steps/ReportStep";
import DataDashboard from "./components/DataDashboard";
import "./App.css";

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "").trim();
  if (h === "app") return "app";
  if (h === "data") return "data";
  return "home";
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const [allMatches, setAllMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [matchInfo, setMatchInfo] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepsEnabled, setStepsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Hash routing: #/ = landing page, #/app = analysis app
  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  const goApp = useCallback(() => {
    window.location.hash = "#/app";
  }, []);

  // Store match info on window for ReportStep to access
  useEffect(() => {
    window.__MATCH_INFO = matchInfo || {};
  }, [matchInfo]);

  // Bootstrap: load matches on mount (landing renders even if API is unreachable)
  useEffect(() => {
    (async () => {
      try {
        await populateMatches();
      } catch (e) {
        console.warn("Could not load matches:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function populateMatches(selectDate) {
    bustCache({ command: "matches" });
    const d = await api({ command: "matches" });
    const m = d.matches || [];
    setAllMatches(m);

    // Workaround for select option _m data — store matches lookup
    window.__MATCHES_LOOKUP = {};
    m.forEach((match) => {
      window.__MATCHES_LOOKUP[match.date] = match;
    });

    if (selectDate) {
      setSelectedMatch(selectDate);
      const info = window.__MATCHES_LOOKUP[selectDate];
      await loadMatch(selectDate, info);
    }
    return m;
  }

  async function loadMatch(date, info) {
    setSelectedMatch(date);
    setMatchInfo(info);
    if (!date) {
      setStepsEnabled(false);
      setTeams([]);
      return;
    }
    const t = await api({ command: "teams", match_date: date });
    setTeams(t.teams || []);
    setStepsEnabled(true);
    setCurrentStep(1);
  }

  const handleMatchChange = useCallback(
    async (date) => {
      const info = window.__MATCHES_LOOKUP?.[date];
      await loadMatch(date, info);
    },
    []
  );

  const handleMatchesRefresh = useCallback(
    async (selectDate) => {
      await populateMatches(selectDate);
    },
    []
  );

  const handleStepChange = useCallback((n) => {
    setCurrentStep(n);
  }, []);

  const stepComponents = {
    1: LoadStep,
    2: NetworkStep,
    3: CentralityStep,
    4: TacticalStep,
    5: StoryStep,
    6: HubStep,
    7: ReportStep,
  };

  const StepComponent = stepComponents[currentStep];

  // ── Landing page (separate page, nothing below it) ──
  if (route === "home") {
    return <Landing onStart={goApp} />;
  }

  // ── Data characteristics dashboard (dataset-wide, no match needed) ──
  if (route === "data") {
    return (
      <>
        <Header />
        <main>
          <DataDashboard />
        </main>
        <footer>
          Live profile of the loaded corpus. All fourteen analysis modules run
          live in <code>predict_server.py</code>; this page is served by{" "}
          <code>api_server.py</code>.
        </footer>
      </>
    );
  }

  // ── Analysis app page ──
  return (
    <>
      <Header />
      {loading ? (
        <section className="bar bar--loading">
          <label className="bar-field">
            <span className="bar-label">Match</span>
            <select disabled>
              <option>Loading matches...</option>
            </select>
          </label>
        </section>
      ) : (
        <MatchBar
          allMatches={allMatches}
          selectedMatch={selectedMatch}
          teams={teams}
          onMatchChange={handleMatchChange}
          onMatchesRefresh={handleMatchesRefresh}
        />
      )}
      <StepNav
        currentStep={currentStep}
        stepsEnabled={stepsEnabled}
        onStepChange={handleStepChange}
      />
      <main>
        {!selectedMatch ? (
          <p className="empty-state">Pick a match above to begin.</p>
        ) : (
          <StepComponent match={selectedMatch} teams={teams} matchInfo={matchInfo} allMatches={allMatches} />
        )}
      </main>
      <footer>
        Reads real StatsBomb event data with xT pre-computed. All fourteen
        analysis modules run live in <code>predict_server.py</code>; this page
        is served by <code>api_server.py</code>.
      </footer>
    </>
  );
}
