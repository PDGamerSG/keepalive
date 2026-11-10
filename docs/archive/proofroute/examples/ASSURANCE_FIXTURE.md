# Canonical assurance fixture

These files specify the version2 synthetic example; they are not application outputs:

- [assurance-input.json](assurance-input.json): DispatchInput with route-input/v1 nested inside a v2 wrapper, three frozen matrices, synthetic provenance and explicit recipes.
- [assurance-buyer-plan.json](assurance-buyer-plan.json): the owner's existing A→B→C plan, freely auditable before purchase.
- [assurance-brief.txt](assurance-brief.txt): supported source language for actual model extraction. Begin with a draft B close10:00 if demonstrating a meaningful change to09:35; freeze the final reviewed oracle input.
- [assurance-oracle.json](assurance-oracle.json): exhaustive direct arithmetic for all six permutations. `STATIC_ARITHMETIC_ONLY`, with no model, solver, app or PayPal execution implied.

The canonical scenario order is NOMINAL, CITY_SLOWDOWN, CORRIDOR_DELAY: nominal first, then lexical IDs. The research agent's original proposed-schema fixture listed the last two differently; the new wrapper is the implementation authority. No hashes in the oracle are substituted for runtime task/contract/consent hashes.

One van starts09:00, carries8000g under10000g capacity, and must return by11:00. Every stop takes300s. A closes09:40, B09:35, C10:40; closes apply to service start inclusively. Distance ceiling4500m.

| Value | Original A→B→C | Rescue B→A→C |
|---|---|---|
| Distance |4000m |4400m |
| NOMINAL |Pass |Pass |
| CITY_SLOWDOWN |Pass; minimum window margin120s |Pass; minimum window margin300s |
| CORRIDOR_DELAY |B starts09:50,900s after09:35 close |Pass |
| All required scenarios + distance |Fail |Pass |

Only the rescue permutation passes all 3 under the ceiling in this tiny enumerated model. It has100m distance margin,2000g capacity margin and2100s minimum shift margin; worst return10:25. Optional uniform-extra-travel-per-moving-leg tolerance is150s;151s makes A late in CITY_SLOWDOWN. This perturbation is added on top of every required scenario, with the same route order and earliest schedule. It is not a traffic probability or observed reliability.

Comparison semantics: +400m distance,1 vehicle whose ordered route changes,2 stops whose `(vehicle,position)` changes. C stays third. These values must be recomputed by the application, not hard-coded into result components.

The private research [F02 counterexample](../../research/round2/optimization/raw/F02-envelope-conservatism.json) separately demonstrates why elementwise-max travel is stricter than checking the agreed finite scenarios. Each scenario reaches B at21 seconds and passes; the envelope reaches40 and fails. It is a mathematical miniature, not another complete DispatchInput.

Original synthetic fixtures may be copied into the app's chosen original-code license. Third-party road/dataset licenses are separate. For a live failure/void demo, create a fresh reviewed task with fleet capacity below total mandatory demand; do not mutate an authorized successful contract.
