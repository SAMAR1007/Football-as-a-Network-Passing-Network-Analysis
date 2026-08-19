# AI MODEL CARD

## Model name

Passing Network Analysis Framework — Hub Player Identification and Tactical
Performance Evaluation

## Model date and version

No numbered versioning. The framework was developed and evaluated in 2026 and
has not been updated since. Because the engine is deterministic, the source
code is the authoritative version record: the same input always produces the
same output, and any number in a report can be recomputed from the code and the
events that fed it. Users registered with the project repository will be
informed by email or issue if an update is released.

## Overview

**Model type**

Deterministic analytical engine, not a trained statistical or machine-learning
model. The engine implements fourteen analysis modules that construct passing
networks from match event data and compute hub players, degree / betweenness /
eigenvector / clustering centrality, the Grund centralisation index, the
weakest-link player, tactical maps (PPDA, field tilt, team shape), timelines,
momentum and a match verdict. Every output is an explicit, documented
computation over the event data.

**Primary intended users**

- Football analysts, coaches and scouting staff preparing for matches.
- Students and researchers in football analytics.
- The general public: the framework is free, open and runs entirely in a local
  browser against a local server.

**Primary intended uses**

- Opposition analysis: identifying an opponent's hub player, its weakest link
  and the mitigation strategies (man-marking, pressing triggers, blocking
  forward passing lanes) that would disrupt its circulation.
- Hub player identification and tactical performance evaluation.
- Teaching and demonstration of passing-network methods on real match data.
- Low-stakes decision support for match preparation.

**Questions or comments**

Please send any questions to the project maintainer by opening an issue in the
project repository (see README.md for the run instructions and file layout).

## Out of scope uses

The framework is intended for low-stakes analytical uses such as informing
match preparation. It should not be used for decisions that have a real-world
effect on players or clubs, such as transfer valuations, contract or selection
decisions. It should not be used for betting or gambling decisions. It does not
establish causal claims about tactics and match outcome, and it is not a
substitute for the judgement of a professional analyst. Findings should not be
generalised beyond the elite international knockout matches on which the
framework was evaluated.

## Metrics

**Accuracy and reliability**

The framework is deterministic by construction: the same input always produces
the same output, and every number can be traced to the documented code that
produced it and the events that fed it. Reliability evidence from the full
evaluation: a hub player was identified without error in all sixty-two team
analyses. The hub was within the top three on eigenvector centrality in
sixty-one of sixty-two analyses, within the top three on betweenness centrality
in fifty-five, and within the top three on degree centrality in forty-four —
hypothesis H1 is supported. Internal consistency holds: the Grund
centralisation index and the involvement counts agree (Switzerland, the most
centralised side at 25.94 per cent, also carried the most involved hub in the
dataset, Granit Xhaka with 227 involvements). The winners had the higher
passing accuracy in sixteen of the thirty-one matches, and the higher-tempo
side won eighteen of the thirty-one.

**Quantitative analysis**

The evaluation is descriptive rather than inferential: no statistical tests
were performed, and the outputs are point estimates describing single matches.
The verdict justice scores ranged from 25 to 100 and can disagree with the
result; those disagreements are reported exactly as computed rather than
concealed.

**Precision and recall**

Not applicable in the sense of a learned classifier. Hub identification is a
deterministic rule — the player with the greatest total passing involvement —
so there are no false positives or false negatives to measure. The closest
analogue is the consistency evidence above: across sixty-two analyses the
hub-defining involvement count and the centrality measures agreed, and the six
ties on the involvement count were resolved by a deterministic rule and
reported as part of the record.

## Limitations

- The framework is descriptive and single-match; its outputs are point
  estimates and should be read with their uncertainty in mind.
- The following factors can affect outputs: data quality and completeness of
  the event feed (missing events, missing player names, absent expected-threat
  values); competition and level — the framework was evaluated only on elite
  international knockout matches, so league play, lower levels and other
  event-data formats are untested; the limited representation of women's
  football (six matches); and the fact that tactics change over time — the
  framework is not updated in real time, so its outputs reflect the events in
  the input data only.
- No tracking data is used: off-ball movement and pressing shape are
  approximated from event data.
- The redistribution licence of the bundled match data is not documented in
  the project files, and the tool ships without a formal usage policy.

## Training and evaluation data

The dataset comprises thirty-one real matches of StatsBomb-format event data
totalling 110,080 events, with a precomputed expected-threat value for every
action: the 2018 and 2019 Champions League finals plus twenty-nine knockout
matches — six from the World Cup 2022, five from Euro 2024, seven from the Copa
America 2024, six from the Women's World Cup 2023 and five from the Africa Cup
of Nations 2023. The set spans six competitions, three confederations and both
the men's and women's international game.

The evaluation used the full dataset (sixty-two team analyses); there is no
train/test split because the framework is deterministic rather than learned.
The data is real match event data in a documented format, and every analysis is
fully reproducible from the bundled workbooks and the source code. Please speak
to the maintainer (via the project repository) if you would like to inspect the
data.

## Ethical considerations

The research is desk-based: it involves no human participants, no primary data
collection and no personally identifiable information — the inputs are match
event data only. The architecture embeds a privacy choice: the entire
application runs on the user's machine and no match data is transmitted to a
third party or stored remotely. Transparency is a design property: every output
is the result of deterministic computation and can be recomputed from the code
and events that produced it, including results that are inconvenient (the six
tied hubs and the low justice scores of 25 and 43). The framework is honest
about scope: it does not claim to outperform professional analysts or to
establish causal claims. Representation was treated as a substantive choice:
the framework ran unchanged on all thirty-one matches across six competitions,
including six women's matches, with no evidence of methodological failure
specific to any competition. The framework's natural application, opposition
analysis, is a dual-use capability: it identifies an opponent's hub, its
weakest link and the mitigation strategies that exploit them, and this risk is
managed by the honesty of the outputs. Gaps are stated plainly: institutional
ethical approval was not required for this desk-based design, and the
redistribution licence of the bundled data is undocumented.

## Feedback

All users are encouraged to share concerns or comments about the performance of
the framework by opening an issue in the project repository. You should receive
a response from the maintainer with information on how your comments will be
processed and any teams it will be escalated to. Because the framework is open
source and deterministic, any reported number can be independently recomputed
from the code and the bundled events. We thank you for your support in
developing our data processes.

## Additional notes and any other relevant factors

Six times across the thirty-one matches, two players tied on the hub-defining
involvement count (for example Upamecano and Varane at 106 in the World Cup
final); a deterministic rule selects a single hub, and the ties are reported as
part of the record. None of the sixty-two hubs was a forward: twenty-five were
defenders and thirty-seven midfielders, so the hub is consistently a deep
build-up connector — the pattern an eye-based, reputation-driven reading tends
to underestimate. The framework was accurate on the dataset as delivered;
further work is needed to establish whether its outputs still generalise to new
competitions and levels today. Future directions are a wider dataset (league
matches and more competitions), tracking data to capture off-ball movement, and
the valuation of actions beyond goals.
