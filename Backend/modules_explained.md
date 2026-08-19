# The Fourteen Modules of the Passing Networks Engine

## How every analysis module in `predict_server.py` works

This document walks through the fourteen analysis modules that make up the passing-networks engine. All fourteen live in one file, `predict_server.py` (~4,000 lines), and are shared unchanged by every front end: the FastAPI server (`api_server.py`), the React studio, and the stdin/stdout server. The engine loads real StatsBomb event data once at startup (`load_data()`), keeps it in the in-memory `MATCH_DATA` dictionary keyed by match date, and exposes each module through the `COMMAND_HANDLERS` router in `handle_command()`.

The data each module consumes is a match dataframe with StatsBomb columns: `team_name`, `event_type`, `minute`, `second`, `period`, `player_name`, `pass_recipient_name`, `location_0` / `location_1` (start x/y), `pass_end_location_0/1` (end x/y), `pass_outcome_name`, `under_pressure`, `shot_statsbomb_xg`, `shot_outcome_name`, and a pre-computed `xt_added` threat value per action. Pitch coordinates are StatsBomb's 120 × 80.

The fourteen modules group into five themes:

- **The network core** — 1. Network Construction, 2. Basic Metrics
- **Centrality** — 3. Degree, 4. Betweenness, 5. Eigenvector, 6. Clustering, 7. Thomas Grund centralisation
- **The weakest link** — 8. Weakest Link
- **Tactical metrics** — 9. PPDA, 10. Field Tilt, 11. Team Shape, 12. Pass Sequences
- **The match story** — 13. Timeline & Momentum, 14. Match Verdict & Narrative

---

## Theme 1 — The network core

### Module 1. Network Construction

**Function:** `calculate_network_metrics(passes_df, team_name)` · line 616

This is the foundation every other module builds on. It turns a team's raw event log into a directed passing graph.

**Inputs.** The full match dataframe filtered to one team, and then — critically — filtered again to **successful passes only**: `event_type == "Pass"` and `pass_outcome_name` is NaN. Failed passes are excluded everywhere in the engine, because a network of completed passes is what describes how a team actually circulates the ball.

**How it works.**
1. Collect `all_players` as the union of every passer and every recipient named in the data.
2. Build the adjacency structure `pass_matrix[passer][recipient] += 1` — a directed, weighted edge for every completed pass. A `pass_locations` dictionary also stores the start coordinates of each passer's passes.
3. For every player, aggregate per-player statistics:
   - `passes_made` (outgoing edge weight sum) and `passes_received` (incoming),
   - `total_involvement` = made + received,
   - `connections_out` / `connections_in` (number of distinct teammates they passed to / received from),
   - `avg_x` / `avg_y` — their average position, computed as the mean start location of their passes (used to draw them on the pitch),
   - `first_minute` / `last_minute` — when they were active, so substitutes and late cameos are visible,
   - `xt_generated` — the sum of `xt_added` over their completed passes, if the column exists.
4. Build the `edges` list: one entry per directed pass relationship with `source`, `target`, `weight` (pass count) and both players' average coordinates, so the UI can draw the network with the right node positions and line thickness.
5. Run the three advanced centrality algorithms (Modules 4, 5, 6) and attach their values to every player.

**Outputs.** `players` (one dict per player), `edges`, `metrics`, and the raw `pass_matrix` — enough to draw the network and to feed every downstream module.

### Module 2. Basic Metrics & Hub Identification

**Function:** part of `calculate_network_metrics` · line 616 (the `metrics` dict)

Built directly out of the graph, these are the headline numbers shown on the Network step:

- `total_passes` — total completed passes (sum of all edge weights).
- `num_players` — nodes in the graph.
- `num_connections` — number of distinct passer→recipient pairs (directed edges).
- `network_density` = `num_connections / (num_players × (num_players − 1))`. The denominator is the maximum possible number of directed pairs, so density ∈ [0, 1]. A dense team passes between almost everyone; a sparse one is rigid and predictable.
- **Hub identification**: the hub is simply the player with the highest `total_involvement`. The metric block reports the hub's name, degree centrality, and involvement count. The hub is the player everything downstream (Grund, weakest link, hub tactical report) centres on.
- Per-player `degree_centrality` (Module 3) is also computed here.

---

## Theme 2 — Centrality

### Module 3. Degree Centrality

**Function:** inline in `calculate_network_metrics` · line ~690

Degree centrality is the simplest notion of "how connected is this player":

```
degree_centrality = (connections_out + connections_in) / (2 × (num_players − 1))
```

The numerator counts distinct teammates the player passes to **or** receives from; the denominator is the maximum possible undirected connections, so a player who links with everyone scores 1.0. Note the numerator counts unique neighbours, not pass counts — a player who exchanges 40 passes with one teammate has degree 1, which is exactly the point: degree measures *reach*, not volume.

### Module 4. Betweenness Centrality

**Function:** `calculate_betweenness_centrality(pass_matrix, all_players)` · line 142

Betweenness answers: *"how much does this player sit on the shortest paths between other pairs of players?"* A player with high betweenness is the bridge linking the defence to the attack — the one whose removal would fragment the team into disconnected clusters.

**How it works (Floyd-Warshall).**
1. Build a distance matrix where the distance of edge A→B is `1 / count` — the more passes along an edge, the "shorter" it is, so a heavily used connection is treated as close.
2. Run the Floyd-Warshall all-pairs shortest-path algorithm, also recording a `next-hop` matrix so every shortest path can be reconstructed.
3. For every ordered pair (s, t) of players, reconstruct the shortest path and add +1 to the betweenness of every node on it (excluding s and t themselves).
4. Normalize by `(n − 1) × (n − 2)` — the number of pairs a node could conceivably lie between.

The result is a score per player in [0, 1]. It is computed once per team in the network module and reused by the weakest-link module, the compare view, and the hub report.

### Module 5. Eigenvector Centrality

**Function:** `calculate_eigenvector_centrality(pass_matrix, all_players, iterations=100)` · line 263

Eigenvector centrality captures *"you are important if the players you connect to are important."* A full-back passing endlessly to an isolated forward scores lower than a midfielder linking two star players.

**How it works (power iteration).**
1. Build a **symmetric** adjacency matrix from the directed pass matrix: for each directed edge A→B with count c, both `adj[A][B]` and `adj[B][A]` receive `+c`. (Both directions contribute to both halves, so the matrix is truly symmetric — a deliberate fix noted in the code so the result matches the course text.)
2. Start with every player at centrality `1/n`.
3. Repeat 100 times: `new[i] = Σ adj[i][j] × centrality[j]`, then normalize the whole vector by its L2 norm. Each pass multiplies a player's score by the summed importance of their neighbours; after enough iterations the vector converges to the dominant eigenvector of the adjacency matrix — hence the name.

### Module 6. Clustering Coefficient

**Function:** `calculate_clustering_coefficient(pass_matrix, all_players)` · line 217

The clustering coefficient measures *triangularity* — how much a player's teammates pass among themselves. It is the network-theory way of detecting passing triangles and local combinations.

For each player:
1. Collect `neighbors` = everyone they pass to plus everyone who passes to them (directed links collapsed to undirected).
2. If they have fewer than 2 neighbours, score 0.
3. Count `neighbor_edges` — how many pairs of neighbours are connected to each other (in either direction).
4. `clustering = neighbor_edges / (k × (k − 1) / 2)` — the fraction of possible neighbour pairs that actually pass to each other.

A high value (e.g. 0.6) means the player sits inside tight, repeating triangles — typical of a central midfielder in a possession side. A low value means their neighbours don't interact, i.e. the player is a long-range connector.

### Module 7. Thomas Grund Centralisation

**Function:** `calculate_thomas_grund_centrality(df, team_name, network_data)` · line 1637

Grund's centralisation index (from Thomas Grund's work on football passing networks) measures how *concentrated* a team's ball circulation is around one player. It is the team-level counterpart to the player-level centrality scores.

**How it works.**
1. Take each player's `total_involvement` from the network module; the hub is the maximum.
2. Sum the *differences* between the hub's involvement and every other player's involvement.
3. `centrality_index = sum_of_differences / (n × total_passes)` — expressed as a percentage. If the ball flows through the hub almost exclusively, differences are large and the index rises toward 100; if involvement is evenly shared, it approaches 0.
4. Classify the team's style against thresholds:
   - **< 12%** — Highly Decentralized ("ball shared evenly across the team"),
   - **12–18%** — Moderately Decentralized ("good balance with slight hub tendencies"),
   - **18–25%** — Moderately Centralized ("a clear playmaker orchestrates the build-up"),
   - **> 25%** — Highly Centralized ("heavy reliance on one player for ball circulation").
5. Produce a ranked player table (top 10 by involvement, with difference from hub) and an *orchestration* narrative paragraph that explains the style and its tactical implication — e.g. a highly centralized team is vulnerable if the opposition marks the hub.

---

## Theme 3 — The weakest link

### Module 8. Weakest Link

**Function:** `calculate_weakest_link(df, team_name, network_data)` · line 757

This module turns the network analysis into a *scouting* question: **which player should the opposition press?** It scores every player on three vulnerabilities and combines them with position-specific weights.

**The three components:**
1. **Composite network vulnerability** — how isolated the player is from the team's structure, from the three centrality scores:
   ```
   (1 − eigen/λmax) × 0.40 + (1 − cluster/cmax) × 0.35 + (1 − between/bmax) × 0.25
   ```
   A player who is weak on all three centralities is a node the team can do without.
2. **Pressure vulnerability** — does their passing accuracy collapse when pressed? The engine splits the player's passes into `under_pressure == True` vs normal, computes both accuracies, and sets `vulnerability = min(accuracy_drop / 40, 1)` (a 40-point drop is fully vulnerable), with a +0.3 bonus if they face 3+ pressured passes and complete under 50%. Players with fewer than 5 passes get a neutral 0.5 score.
3. **xT bottleneck** — do they waste the ball's value? `xt_efficiency = xt_generated / xt_received`; `bottleneck = 1 − efficiency` when they receive meaningful threat (xT > 0.1), with special cases for negative xT players and a 50% discount for forwards who take shots.

**Position weights** (by average x-position): Goalkeeper (x < 25): 0.20 composite / 0.70 pressure / 0.10 xT; Defender (x < 50): 0.35 / 0.40 / 0.25; Midfielder (x < 80): 0.30 / 0.30 / 0.40; Forward: 0.50 / 0.35 / 0.15. Goalkeepers with under 10 involvements are skipped entirely.

A player whose involvement is under 15% of the team's most-involved player has their total score halved (they're too marginal to matter). Every player's reasons are collected as human-readable strings, the list is sorted by score, and the top entry is crowned the weakest link with a generated explanation. The methodology is reported so the result is auditable.

---

## Theme 4 — Tactical metrics

### Module 9. PPDA (Passes Per Defensive Action)

**Function:** `calculate_ppda(df, team_name)` · line 383

PPDA measures pressing intensity: **how many passes is the opponent allowed to make per defensive action you commit?** Lower is more aggressive.

```
PPDA = opponent passes in their own half (x < 60)
       ÷ your defensive actions in their half (x > 60)
```

- *Numerator*: the opponent's passes starting before x = 60 (their own half).
- *Denominator*: the team's defensive actions starting after x = 60 — the events `Tackle`, `Interception`, `Foul Committed`, and `Block`. **Pressure events are deliberately excluded**: StatsBomb fires a Pressure event whenever a defender comes within ~5 m of the ball carrier, so including it inflates the denominator about 3–6× and makes almost every team look like an elite pressing side. The code documents this calibration against the 31-match dataset.
- A division-by-zero guard (`max(def_count, 1)`) keeps the metric finite.

The value is then binned into an interpretation: **< 4** Elite pressing · **< 6** Very high · **< 8** High · **< 12** Moderate · **else** Low pressing.

### Module 10. Field Tilt

**Function:** `calculate_field_tilt(df, team_name)` · line 518

Field tilt answers *"who is living in the final third?"* It is the team's **share** of all final-third successful passes in the match:

```
field_tilt = team_final_third_passes / (team + opponent final-third passes) × 100
```

Final third means start x ≥ 80. Because every final-third pass belongs to exactly one team, the two teams' tilts always sum to 100. The code notes that it deliberately uses this *comparative* definition (the industry-standard one, per Twelve.football / FBref / StatsBomb) rather than the simpler "share of your own passes in the opponent's half", because tilt is meant to compare territorial dominance between the two teams. Back-compat aliases (`own_half`, `opponent_half`) are emitted for older UIs.

### Module 11. Team Shape

**Function:** `calculate_team_shape(df, team_name)` · line 573

Shape quantifies the team's *spread* on the pitch, from the average positions of its passers:
- `avg_width` = max y − min y across players' mean positions (how stretched they are side to side).
- `avg_depth` = max x − min x (how stretched front to back).
- `avg_player_distance` = mean of all pairwise Euclidean distances between players' average positions.
- `compactness` = `100 / avg_player_distance` — a simple inverse-distance measure: the tighter the team, the higher the compactness.

A team with low width/depth is compact and hard to play through; a wide, deep team spreads the pitch.

### Module 12. Pass Sequences

**Function:** `calculate_pass_sequences(df, team_name)` · line 315

Pass sequences describe *possession in the raw*: a run of consecutive completed passes by the same team. The engine walks the team's events in chronological order (`period`, `minute`, `second`) and maintains a running counter:
- A `Pass` with no outcome (successful) increments the counter.
- A `Pass` with an outcome (failed) **ends** the sequence.
- `Ball Receipt*` and `Carry` continue it (they're neutral).
- `Dispossessed`, `Miscontrol`, `Shot`, and `Clearance` end it.

The output is `avg_length`, `max_length`, `total_sequences`, and a `distribution` bucketing sequences into 1–3, 4–6, 7–10, and 11+ passes. Long average sequences plus many 11+ runs indicate a team that keeps the ball under pressure and builds patiently; a low average with many 1–3 sequences indicates a direct, turnover-heavy style.

---

## Theme 5 — The match story

### Module 13. Timeline & Momentum

**Functions:** `calculate_timeline(df, match_date)` · line 2822, `generate_timeline_insights(periods, teams)` · line 2452, `calculate_time_intervals(df, team_name)` · line 1606

The timeline slices the whole match into **5-minute periods** and, for each period and team, computes:
- `passes` (successful) and `total_passes`, with `accuracy`,
- `xt_added` (sum of threat generated in that window),
- `territory` — percentage of their completed passes in the defensive (x < 40), middle (40–80), and attacking (x ≥ 80) thirds,
- `top_passers` (top 3 by volume),
- `possession` — the team's share of that period's successful passes.

From these period frames the module derives the *momentum* layer:
- **Dominant periods** — which team led possession in each window.
- **Momentum shifts** — whenever the possession leader flips, recorded with the minute and a description ("X took control from Y").
- **Most attacking period** per team — the 5-minute window with the highest xT.
- **High-press periods** — windows where a team's attacking-third territory exceeds 35%.

A sibling function, `calculate_time_intervals` (15-minute buckets), re-runs the network module per window to show how network density and the hub drift over the match — useful for spotting when a team collapses or a substitute changes the structure.

The timeline output also embeds the verdict (Module 14), because the story and the verdict are presented together.

### Module 14. Match Verdict & Narrative

**Function:** `calculate_match_verdict(df, teams, periods)` · line 2222

The verdict judges whether the *scoreline was just*. For each team it computes: goals, **xG** (sum of `shot_statsbomb_xg`), **xT** (threat from passing, summed from the timeline periods), successful passes and accuracy, **possession** (pass-weighted average over periods), **progressive passes** (estimated from attacking-third share), and **tempo** (successful passes per period of possession dominance).

It then builds a comparison of advantages:

| Metric | Advantage if… |
|--------|---------------|
| xG | diff > 0.1 |
| xT | diff > 0.05 |
| Possession | diff > 5 |
| Passes | diff > 30 |

**Justice score** — for a decided match: `25 + metrics_favoring_winner × 18.75` (so 25–100; 25 for a winner who won nothing on the underlying metrics, 100 for a winner who swept all four).

**Verdict classification** (winner case), by how many metrics favoured the winner and the winner's xG over-performance (`goals − xG`):
- 3+ metrics: **Clinical Domination** (xG diff > 0.5) or **Deserved Victory**;
- 2 metrics: **Efficient Victory** or **Competitive Victory**;
- loser dominated 3+ metrics: **Smash & Grab** (loser's xG > winner's + 0.5) or **Against The Odds**;
- otherwise: **Lucky Victory** (winner xG diff > 1) or **Fine Margins**.

Draws are **Fair Result** when |xG diff| < 0.3, otherwise **Contentious Draw**.

Finally, the module *writes the story*: a narrative paragraph assembled from conditional clauses — the winner's deservedness, the loser's xG wastefulness, xT buildup superiority, possession dominance, and clinical finishing. This same text drives the Report step's printable summary.

---

## How the fourteen modules fit together

**One engine, many front ends.** `predict_server.py` is a pure calculation engine: it loads `MATCH_DATA` once, exposes every module through `handle_command()` → `COMMAND_HANDLERS`, and never cares who is calling. The FastAPI server (`api_server.py`) wraps it, loading data in its lifespan and mapping each command to `POST /api/predict`; the React studio and the stdin/stdout server use the identical router. A typical request flows like this:

1. Browser posts `{ "command": "network", "match_date": "2019-06-01", "team": "Liverpool" }`.
2. `handle_command` dispatches to `handle_network`, which pulls the match dataframe from `MATCH_DATA`, optionally filters by period/minute window, and calls `calculate_network_metrics` (Modules 1–6) plus `calculate_weakest_link` (Module 8).
3. The JSON result is sanitized (`NaN`/`Infinity` → `null`) and returned for the UI to draw.

**Dependencies between modules** (the graph is a DAG):

```
Network Construction (1)
 ├─ Basic Metrics + Hub (2)
 ├─ Degree (3)
 ├─ Betweenness (4)
 ├─ Eigenvector (5)
 ├─ Clustering (6)
 ├─ Grund centralisation (7)          ← uses involvement from 1
 └─ Weakest Link (8)                  ← uses centralities 3–5 + xT
Tactical metrics (9–12)               ← standalone, read the raw df
Timeline & Momentum (13)              ← standalone; builds periods
Match Verdict (14)                    ← consumes the periods from 13
```

**Supporting utilities** sit alongside the fourteen and feed them: the Karun Singh 12×8 **xT grid** (`BUILDUP_XT_GRID`, `get_buildup_xt`) used for goal build-up trails; the 25-zone **tactical map**, **zone pass-direction sonar**, and **zone connections** (all 5×5 grids over the 120×80 pitch); the **shot map**; per-player **player detail**; the **progressive passes** list; the **passing rate** (passes per minute of estimated possession); and the deep-dive **hub player tactical analysis** that reuses the hub from Module 2, the centralities from Modules 4–6, and Grund from Module 7 to produce strengths, weaknesses, mitigation strategies, and a long-form tactical report.
