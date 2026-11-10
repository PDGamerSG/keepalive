# Optimization, matrices, data and independent assurance

Second-pass investigation, November9 UTC / November10 IST, 2026. A specialist agent collected primary documentation/source and constructed research fixtures; the primary agent completed this synthesis after the agent reached a usage limit. No OR-Tools solve, model inference or road-engine build was run. [Sources](SOURCES.json) · [Search log](QUERY_LOG.md).

## Recommendation: one route, several explicitly frozen worlds

Use **one shared vehicle assignment/stop order** with three named travel matrices. Independently recompute feasibility under all three. A valid artifact must satisfy every required scenario's windows, service durations and vehicle shift/depot-return rule, plus shared coverage/capacity/distance. This is finite-scenario feasibility, not a stochastic confidence interval, traffic forecast, universal robust guarantee or proof of optimality.

Robust vehicle routing itself is established research. [The robust VRPTW paper landing page](https://optimization-online.org/2018/02/6477/) [O15] documents a compact formulation/branch-price-and-cut line of work. Only the landing-page metadata/abstract were inspected; the complete paper and algorithm were not reproduced. Our proposed finite-scenario model is a simpler implementation choice, not a claimed implementation of that paper.

## Exact solver approach

The [official time-window sample source](https://github.com/google/or-tools/blob/stable/ortools/constraint_solver/samples/vrp_time_windows.py) [O01] and [routing header excerpts](https://raw.githubusercontent.com/google/or-tools/stable/ortools/constraint_solver/routing.h) [O03] support shared routing variables with multiple cumulative dimensions. For each required scenario:

- Bind that scenario's matrix in its own callback factory; avoid the Python loop-closure bug that makes every callback use the final matrix.
- Transit = scenario travel from node a to b + service duration at a; depot service is zero.
- Add a separate Time dimension; fixed shift-start cumul, end upper bound, service-start windows and waiting slack.
- Reuse the same `RoutingModel`, node manager and `NextVar` route topology across dimensions.
- Keep one delivery capacity model and one distance model; constrain sum of vehicle end-distance cumul values to the frozen ceiling.

Do not solve a different route for each scenario and call it a shared rescue. Do not combine matrices with elementwise maximum and claim it is equivalent: different scenarios' worst edges can form a fictitious harsher world. The separate [envelope counterexample](raw/F02-envelope-conservatism.json) has two scenarios reaching B at21 seconds, both passing a21-second close; the elementwise max reaches at40 and fails. An envelope can be a sufficient stronger model, but may reject accepted finite-scenario solutions.

The existing base service-start recurrence, service-at-origin callback and global distance sum are sound for static delivery-only routing. New audit findings are **implementation traps**, not proof that the existing design was mathematically broken. Official examples omit service durations in some simplified cases, allow flexible depot time, and skip unused vehicles when printing; this product must retain service time/fixed departure and serialize an empty route for every unused vehicle.

[Routing search-status documentation](https://developers.google.com/optimization/routing/routing_options) [O02] distinguishes successful search, partial success, timeout and infeasible statuses. Do not map every missing assignment to “infeasible.” Even an infeasible result is relative to the encoded model, which may contain a bug; the product's broad claim remains “no accepted plan found within the limit.”

## A falsifiable flagship fixture

[F01 fixture](raw/F01-robust-tiny-fixture.json) and [F01 oracle](raw/F01-robust-tiny-oracle.json) define three stops, one vehicle and three synthetic matrices. The research agent enumerated all six stop permutations using direct schedule arithmetic, **not OR-Tools or the proposed app**. The primary-agent package audit independently recomputes these values.

| Candidate | Distance | Nominal | CORRIDOR_DELAY | CITY_SLOWDOWN |
|---|---|---|---|---|
| A→B→C | 4,000m | Pass | B late900 seconds | Pass |
| B→A→C | 4,400m | Pass | Pass | Pass; worst window margin300 seconds |

The rescue is the only all-scenario accepted permutation under the4,500m ceiling in this tiny fixture. That finite enumeration supports an exact tiny-oracle statement only; it does not let the app claim optimality on arbitrary12/100-stop inputs. It returns by10:25 under the tested worst scenario versus an11:00 shift end. Display the extra400m as a tradeoff, not a savings claim.

## Repair and diagnosis without fictional failures

A correctly encoded all-scenario OR-Tools candidate should already satisfy the hard model. A checker failure then suggests modeling/serialization corruption or an injected fault; do not describe it as an ordinary LLM route hallucination.

The default solve should encode all required scenarios from its first attempt. A genuine optional refinement experiment can deliberately start with a **declared nominal-only relaxation**, record `modeledScenarioIds`, then let the all-scenario checker produce a counterexample and add the missing dimensions on the next bounded attempt. The frozen contract always requires all scenarios; relaxing a search model never relaxes payment eligibility. Label the first artifact a relaxed candidate.

Diagnosis has three honest levels: an exact witness that this route violates a promise; a route-local sufficient change to a constraint; and a bounded new solve under a reviewed new draft. None proves the globally smallest relaxation or global infeasibility. Keep remedy changes out of the already authorized task.

## Matrix engines and data pitfalls

| Resource | Verified behavior | Recommended use |
|---|---|---|
| [OSRM Table API](https://project-osrm.org/docs/v5.24.0/api/) [O04], [engine](https://github.com/Project-OSRM/osrm-backend) [O05] | Duration seconds, distance meters; directed source/destination order; `null` for unreachable pairs; engine BSD-2-Clause. | Preferred optional local road snapshot. Request both annotations, reject unreachable/fallback cells unless explicitly modeled, freeze engine/profile/map metadata. A route engine is not a live-traffic feed. |
| [Valhalla matrix](https://valhalla.github.io/valhalla/api/matrix/) [O06] | Default output kilometers, time/distance null for unreachable paths, explicit time-dependent direction/count restrictions; project MIT license with separate OSM-data terms. | Alternative after the core. Normalize units exactly and freeze the chosen departure/profile assumptions. Do not silently mix km/meters or call a static matrix a time-dependent model. |
| [openrouteservice hosted restrictions](https://giscience.github.io/openrouteservice/hosted-api-restrictions) [O07] | Hosted matrix limit3,500 origin×destination cells; dynamic-argument limit25 cells at inspection. | A101-node full matrix is10,201 cells, so it needs batching/another engine. Smaller demo still needs quotas/terms/privacy review. Do not split the optimization itself into independent chunks. |
| [Geofabrik Southern Zone](https://download.geofabrik.de/asia/india/southern-zone.html) [O12] | PBF533MB at retrieval; OSM data timestamp shown; shapefile/geopackage archives about1.2GB. | Preparation can take substantial CPU/disk/time beyond download size. Do not put a regional engine build on the hackathon critical path or imply it was installed. |
| [OSM license/copyright](https://www.openstreetmap.org/copyright) [O13] | ODbL and attribution obligations; derived data needs its own careful treatment. | Keep engine-code license and map-data license separate; retain attribution/provenance in public artifacts. Do not call all road data MIT because the engine is. |

Default demo remains a synthetic frozen matrix with prominent labels. A road snapshot can establish more realistic network distances, but still does not establish historical traffic or actual delivery performance.

## Dataset and benchmark resources

| Resource | What is available | Conditions and safe use |
|---|---|---|
| [DIMACS VRPTW challenge](https://dimacs.rutgers.edu/programs/implementation-challenges/vehicle-routing/implementation-challenge-vehicle-routing/vrp-with-time-windows) [O08] | Solomon/Homberger-Gehring conventions, output and distance objective; travel/distance Euclidean values truncated to one decimal. | Keep objective, vehicle count and rounding identical before comparing. Scale to integer tenths explicitly; do not compare a meter model with raw benchmark cost. Dataset redistribution permissions were not established here. |
| [VRPTWController](https://github.com/laser-ufpb/VRPTWController) [O14] | MIT-licensed independent challenge scoring/validation implementation. | Useful reference/evaluation tool, not the production TypeScript checker. Do not claim it validates our scenario extension unchanged. |
| [VRPLIB](https://github.com/PyVRP/VRPLIB) [O09] | MIT parser/writer for VRPLIB and Solomon; README warns distance conventions require deliberate rounding. | Parser license is not automatically a dataset license; document conversion. |
| [PyVRP](https://github.com/PyVRP/PyVRP) [O10] | MIT solver, many rich routing constraints; inspected main requires Python≥3.12. | Optional nominal benchmark comparison, not a second production solver on day one. Match model/runtime and use independent acceptance checks. |
| [Amazon Last Mile challenge dataset](https://registry.opendata.aws/amazon-last-mile-challenges/) [O11], [structure guide](https://github.com/MIT-CAVE/rc-cli/blob/main/templates/data_structures.md) |9,184 historical2018 routes across five US metropolitan areas;6,112 training and3,072 evaluation; anonymized identifiers/obfuscated location data. | **CC BY-NC4.0**, not unrestricted commercial training data. Keep research evaluation separate; do not redistribute it under the app's MIT license or assume commercial rights. Historical sequences are not guaranteed optimal. No download/training occurred. |
| SINTEF Solomon benchmark [O09 attempted] | Retrieval encountered “Just a moment…” challenge. | Unresolved access, not an inspected dataset or a missing novelty signal. Use DIMACS documentation for the established conventions. |

For the submission, generated fixtures and the exact tiny oracle provide the clearest reproducibility. A matched public benchmark adds depth after correctness and license handling are settled; large data collection is not required to demonstrate actual AI.

## Runtime and practical evaluation

[OR-Tools PyPI files](https://pypi.org/project/ortools/#files) [O16] showed9.15.6755 (Jan14,2026), cp312 macOS ARM64 wheel21.9MB and x86_64 wheel23.9MB; displayed wheels/classifiers went through3.14, not the local default3.15. Use an explicit Python3.12 managed environment. Pin the actual solved dependency lock and demonstrate installation; a file listing is not an installation test.

Evaluate in this order: tiny exact enumeration,12/20-stop synthetic dispatch, scenario-boundary tests, robustness against mutated artifacts, matched nominal benchmarks, then optional100-stop bounded runs. Measure solve/check/model time separately. A100-stop input cap is not a guaranteed success/latency target. Do not train a predictor merely to make the architecture larger; no suitable calibrated traffic labels were established.

The scenario extension adds real modeling/checking depth. Its value comes from a readable broken-promise witness and accepted rescue, supported by exact assumptions and measured runs.
