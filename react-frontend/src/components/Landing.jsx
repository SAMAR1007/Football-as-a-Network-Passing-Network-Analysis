import "./Landing.css";
import Logo from "./Logo";

/* ─────────────────────────────────────────────────────────────
   Minimal inline icons — no external icon dependency required.
───────────────────────────────────────────────────────────── */

function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    load: (
      <>
        <path d="M12 3v11" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 19h14" />
      </>
    ),

    network: (
      <>
        <circle cx="5" cy="12" r="2.2" />
        <circle cx="18" cy="6" r="2.2" />
        <circle cx="18" cy="18" r="2.2" />
        <path d="m7 11 8.8-4" />
        <path d="m7 13 8.8 4" />
        <path d="M18 8.2v7.6" />
      </>
    ),

    centrality: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="m9.8 9.8-3.4-2.7" />
        <path d="m14.2 9.8 3.4-2.7" />
        <path d="m9.8 14.2-3.4 2.7" />
        <path d="m14.2 14.2 3.4 2.7" />
      </>
    ),

    tactical: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <line x1="12" y1="4" x2="12" y2="20" />
        <circle cx="12" cy="12" r="3" />
        <rect x="3" y="8" width="4" height="8" />
        <rect x="17" y="8" width="4" height="8" />
      </>
    ),

    story: (
      <>
        <path d="M4 18V6" />
        <path d="M4 17c4-7 6 4 9-3 2-4 3-4 7-8" />
        <circle cx="4" cy="18" r="1.5" />
        <circle cx="20" cy="6" r="1.5" />
      </>
    ),

    report: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h5" />
        <path d="M9 9h2" />
      </>
    ),

    hub: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="4" r="1.8" />
        <circle cx="19" cy="8" r="1.8" />
        <circle cx="19" cy="16" r="1.8" />
        <circle cx="12" cy="20" r="1.8" />
        <circle cx="5" cy="16" r="1.8" />
        <circle cx="5" cy="8" r="1.8" />
        <path d="M12 9V5.8" />
        <path d="m14.5 10.5 3-1.8" />
        <path d="m14.5 13.5 3 1.8" />
        <path d="M12 15v3.2" />
        <path d="m9.5 13.5-3 1.8" />
        <path d="m9.5 10.5-3-1.8" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] ?? null}</svg>;
}


/* ─────────────────────────────────────────────────────────────
   Features
───────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    n: "01",
    icon: "load",
    title: "Load",
    text: "Pick a real match, or upload your own CSV / Excel event file — every pass becomes part of the network.",
  },
  {
    n: "02",
    icon: "network",
    title: "Network",
    text: "Every team's passing web — density, hub players, links and ball flow across the pitch.",
  },
  {
    n: "03",
    icon: "centrality",
    title: "Centrality",
    text: "Degree, betweenness and eigenvector centrality pinpoint the hub players who truly run the game.",
  },
  {
    n: "04",
    icon: "tactical",
    title: "Tactical",
    text: "PPDA, field tilt, 25-zone passing maps and direction sonars — tactical performance evaluation for both sides.",
  },
  {
    n: "05",
    icon: "story",
    title: "Match story",
    text: "Momentum timeline, goal build-up xT trails, shot data and the match verdict — how passing shaped the result.",
  },
  {
    n: "06",
    icon: "hub",
    title: "Hub analysis",
    text: "Deep dive on each playmaker — pressure resistance, top connections, xT threat and how to stop them.",
  },
  {
    n: "07",
    icon: "report",
    title: "Report",
    text: "One printable document — passing profile, hub identification and full tactical evaluation.",
  },
];


/* ─────────────────────────────────────────────────────────────
   Workflow
───────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    tag: "Match",
    title: "Pick a match",
    text: "Choose any fixture from the dataset — Champions League finals included — or upload your own event data.",
  },
  {
    n: "02",
    tag: "Analysis",
    title: "Run the analyses",
    text: "Fourteen analysis modules compute live: passing networks, centrality, tactics, match story and hub deep-dives.",
  },
  {
    n: "03",
    tag: "Report",
    title: "Read the report",
    text: "From executive summary to hub exploitation guide — print it or save the complete analysis as PDF.",
  },
];


/* ─────────────────────────────────────────────────────────────
   Data chips
───────────────────────────────────────────────────────────── */

const CHIPS = [
  "StatsBomb event data",
  "Passing networks",
  "Hub player identification",
  "Weighted pass graphs",
  "14 live modules",
  "Tactical performance evaluation",
  "PPDA · field tilt",
];


/* ─────────────────────────────────────────────────────────────
   Hero Network Visualization
───────────────────────────────────────────────────────────── */

function NetworkPanel() {
  const HOME = [
    [56, 64],
    [112, 50],
    [170, 60],
    [214, 84],
    [168, 116],
    [214, 132],
    [112, 118],
    [62, 120],
    [52, 180],
    [112, 182],
    [170, 168],
  ];

  const AWAY = [
    [424, 64],
    [368, 50],
    [310, 60],
    [266, 84],
    [312, 116],
    [266, 132],
    [368, 118],
    [418, 120],
    [428, 180],
    [368, 182],
    [310, 168],
  ];

  const ring = (nodes) =>
    nodes.map((_, i) => [i, (i + 1) % nodes.length]);

  const hubLinks = (nodes, hub, others) =>
    others.map((j) => [hub, j]);

  const homeEdges = [
    ...ring(HOME),
    ...hubLinks(HOME, 4, [1, 2, 3, 5, 6, 8]),
  ];

  const awayEdges = [
    ...ring(AWAY),
    ...hubLinks(AWAY, 5, [0, 1, 2, 3, 6, 7]),
  ];

  return (
    <div className="network-card">

      <div className="network-card__top">
        <div>
          <span className="eyebrow">Live visualization</span>

          <h2>Passing network</h2>
        </div>

        <span className="status-pill">
          <i className="status-pill__dot" />
          Live
        </span>
      </div>


      <div className="network-card__canvas">

        <svg
          className="network-svg"
          viewBox="0 0 480 320"
          fill="none"
          role="img"
          aria-label="Illustration of two football passing networks"
        >

          <defs>

            <linearGradient
              id="pitchGlow"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="rgba(255,255,255,.14)"
              />

              <stop
                offset="100%"
                stopColor="rgba(255,255,255,.02)"
              />
            </linearGradient>


            <radialGradient
              id="networkGlow"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop
                offset="0%"
                stopColor="rgba(201,245,59,.08)"
              />

              <stop
                offset="100%"
                stopColor="rgba(201,245,59,0)"
              />
            </radialGradient>

          </defs>


          <rect
            x="0"
            y="0"
            width="480"
            height="320"
            fill="url(#networkGlow)"
          />


          <g className="net-pitch">

            <rect
              x="10"
              y="10"
              width="460"
              height="300"
              rx="2"
            />

            <line
              x1="240"
              y1="10"
              x2="240"
              y2="310"
            />

            <circle
              cx="240"
              cy="160"
              r="34"
            />

            <circle
              cx="240"
              cy="160"
              r="2.2"
            />

            <rect
              x="10"
              y="90"
              width="46"
              height="140"
            />

            <rect
              x="424"
              y="90"
              width="46"
              height="140"
            />

            <rect
              x="10"
              y="138"
              width="10"
              height="44"
            />

            <rect
              x="460"
              y="138"
              width="10"
              height="44"
            />

            <rect
              x="10"
              y="10"
              width="460"
              height="300"
              fill="url(#pitchGlow)"
            />

          </g>


          <g className="net-ticks">

            {[64, 160, 256].map((y) => (
              <line
                key={`y-${y}`}
                x1="4"
                y1={y}
                x2="12"
                y2={y}
              />
            ))}

            {[80, 160, 240, 320, 400].map((x) => (
              <line
                key={`x-${x}`}
                x1={x}
                y1="306"
                x2={x}
                y2="314"
              />
            ))}

          </g>


          <g className="net-edges">

            {homeEdges.map(([a, b], i) => (
              <line
                key={`home-${i}`}
                x1={HOME[a][0]}
                y1={HOME[a][1]}
                x2={HOME[b][0]}
                y2={HOME[b][1]}
              />
            ))}


            {awayEdges.map(([a, b], i) => (
              <line
                key={`away-${i}`}
                className="away"
                x1={AWAY[a][0]}
                y1={AWAY[a][1]}
                x2={AWAY[b][0]}
                y2={AWAY[b][1]}
              />
            ))}


            <line
              className="net-link"
              x1="168"
              y1="116"
              x2="312"
              y2="116"
            />

          </g>


          <g className="net-nodes">

            {HOME.map(([x, y], i) => (
              <circle
                key={`home-node-${i}`}
                cx={x}
                cy={y}
                r={i === 4 ? 6.5 : 4}
                className={i === 4 ? "pulse" : ""}
              />
            ))}


            {AWAY.map(([x, y], i) => (
              <circle
                key={`away-node-${i}`}
                cx={x}
                cy={y}
                r={i === 5 ? 6.5 : 4}
                className={
                  i === 5
                    ? "away pulse2"
                    : "away"
                }
              />
            ))}

          </g>

        </svg>

      </div>


      <div className="network-card__bottom">

        <span>Every pass mapped</span>

        <span>xT pre-computed</span>

      </div>

    </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   Landing Page
───────────────────────────────────────────────────────────── */

export default function Landing({ onStart }) {
  return (
    <main className="landing">

      {/* Navigation */}

      <header className="landing-nav">

        <a
          className="brand"
          href="#"
          aria-label="Football as a Network — passing network analysis framework home"
        >

          <Logo size={28} />

          <span className="brand-text">
            <span className="brand-name">
              Football as a <em>Network</em>
            </span>

            <span className="brand-tag">
              Passing network analysis framework
            </span>
          </span>

        </a>


        <nav
          className="nav-actions"
          aria-label="Primary navigation"
        >

          <a
            className="nav-link"
            href="#landing-features"
          >
            Modules
          </a>


          <a
            className="nav-link"
            href="#landing-how"
          >
            How it works
          </a>


          <a
            className="nav-link"
            href="#/data"
          >
            Data dashboard
          </a>


          <button
            className="nav-cta"
            type="button"
            onClick={onStart}
          >
            Start analysing

            <span aria-hidden="true">
              ↗
            </span>
          </button>

        </nav>

      </header>


      {/* Hero */}

      <section className="hero">

        <div className="hero-grid">

          <div className="hero-copy">

            <div className="hero-kicker">

              <span className="kicker-line" />

              Passing networks · hub players · tactical evaluation

            </div>


            <h1 className="hero-title">

              Football as a

              <span>
                Network.
              </span>

            </h1>


            <p className="hero-sub">
              Design and development of a passing network
              analysis framework for hub player identification
              and tactical performance evaluation — every pass
              mapped, every hub found, on real match data.
            </p>


            <div className="hero-cta">

              <button
                className="btn-hero"
                type="button"
                onClick={onStart}
              >

                Start analysing

                <span
                  className="btn-arrow"
                  aria-hidden="true"
                >
                  →
                </span>

              </button>


              <a
                className="btn-ghost"
                href="#landing-how"
              >
                Explore the workflow
              </a>

            </div>


            <div className="hero-meta">

              <span>
                <i />
                Passing networks
              </span>

              <span>
                <i />
                Hub player ID
              </span>

              <span>
                <i />
                Tactical performance
              </span>

              <span>
                <i />
                xT pre-computed
              </span>

            </div>

          </div>


          <div className="hero-visual">

            <div className="visual-label visual-label--top">
              MATCH ANALYSIS / 01
            </div>


            <NetworkPanel />


            <div className="visual-label visual-label--bottom">
              PASSING NETWORK SCIENCE
            </div>

          </div>

        </div>

      </section>


      {/* Data Foundation */}

      <section
        className="data-section"
        id="landing-data"
      >

        <div className="wrap data-inner">

          <div className="data-copy">

            <span className="section-label">
              01 / Data foundation
            </span>


            <h2 className="section-title">
              Built on real match events.
            </h2>


            <p>
              Every number — pass volumes, hub scores,
              centrality and tactical metrics — comes from
              tracked event data computed by the pipeline.
            </p>

          </div>


          <div
            className="data-badges"
            aria-label="Analysis capabilities"
          >

            {CHIPS.map((chip) => (
              <span
                className="data-chip"
                key={chip}
              >
                <i className="chip-mark" />
                {chip}
              </span>
            ))}

          </div>

        </div>

      </section>


      {/* Analysis Suite */}

      <section
        className="section modules-section"
        id="landing-features"
      >

        <div className="wrap">

          <div className="section-heading">

            <div>

              <span className="section-label">
                02 / Passing & hub suite
              </span>


              <h2 className="section-title">
                Map the passes. Find the hubs.
              </h2>

            </div>


            <p className="section-intro">
              A focused analytical pipeline that moves from
              raw pass events to hub player identification and
              tactical performance evaluation.
            </p>

          </div>


          <div className="module-grid">

            {FEATURES.map((feature) => (
              <article
                className="module-card"
                key={feature.title}
              >

                <div className="module-card__top">

                  <span className="module-number">
                    {feature.n}
                  </span>


                  <span className="module-icon">
                    <Icon name={feature.icon} />
                  </span>

                </div>


                <h3>
                  {feature.title}
                </h3>


                <p>
                  {feature.text}
                </p>


                <span
                  className="module-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>

              </article>
            ))}

          </div>

        </div>

      </section>


      {/* Workflow */}

      <section
        className="section workflow-section"
        id="landing-how"
      >

        <div className="wrap">

          <div className="section-heading section-heading--workflow">

            <div>

              <span className="section-label">
                03 / Workflow
              </span>


              <h2 className="section-title">
                From passes to hub insight.
              </h2>

            </div>

          </div>


          <div className="workflow">

            <div
              className="workflow-line"
              aria-hidden="true"
            />


            {STEPS.map((step) => (
              <article
                className="workflow-step"
                key={step.n}
              >

                <div className="workflow-step__marker">
                  <span>
                    {step.n}
                  </span>
                </div>


                <span className="workflow-step__tag">
                  {step.tag}
                </span>


                <h3>
                  {step.title}
                </h3>


                <p>
                  {step.text}
                </p>

              </article>
            ))}

          </div>

        </div>

      </section>


 

    </main>
  );
}