# Optimization query and navigation log

Specialist browser research captured November9 UTC / November10 IST,2026. The primary agent reconstructed this log from saved raw captures; it is not a claim that every navigation or attempted search was retained. Queries are decoded from captured Google URLs. No source application/payment was executed.

## Captured searches

- `DIMACS VRPTW challenge distance truncated one decimal` — [raw/Q01-dimacs-location.json](raw/Q01-dimacs-location.json); timestamp 2026-11-09T21:00:42.709Z.
- `robust vehicle routing time windows travel time uncertainty scenario open access paper` — [raw/Q02-robust-routing-literature.json](raw/Q02-robust-routing-literature.json); timestamp 2026-11-09T21:03:21.339Z.

## Opened and attempted sources

| Capture | Status | URL / retained evidence |
|---|---|---|
| [O01-ortools-time-window-source](raw/O01-ortools-time-window-source.json) | OPENED_TEXT | [OR-Tools time-window mechanics](https://github.com/google/or-tools/blob/stable/ortools/constraint_solver/samples/vrp_time_windows.py) — Simplified example needs service durations/fixed starts/empty vehicle output; not executed. |
| [O02-ortools-search-status](raw/O02-ortools-search-status.json) | OPENED_TEXT | [OR-Tools search status](https://developers.google.com/optimization/routing/routing_options) — Model-specific status; timeout is not broad infeasibility proof. |
| [O03-ortools-routing-header](raw/O03-ortools-routing-header.json) | EXCERPTS_ONLY | [Shared routing topology/multiple dimensions](https://raw.githubusercontent.com/google/or-tools/stable/ortools/constraint_solver/routing.h) — Full179707-character file not retained; excerpt evidence only. |
| [O04-osrm-api](raw/O04-osrm-api.json) | EXCERPTS_ONLY | [OSRM matrix units and unreachable cells](https://project-osrm.org/docs/v5.24.0/api/#) — Selected API excerpts, no road engine/request executed. |
| [O05-osrm-repository](raw/O05-osrm-repository.json) | OPENED_TEXT | [OSRM engine/license](https://github.com/Project-OSRM/osrm-backend) — BSD2 engine separate from OSM ODbL map data; not built. |
| [O06-valhalla-license](raw/O06-valhalla-license.json) | OPENED_TEXT | [Valhalla matrices/license](https://github.com/valhalla/valhalla) — Default kilometers; engine MIT separate from data. Not executed. |
| [O06-valhalla-matrix](raw/O06-valhalla-matrix.json) | OPENED_TEXT | [Valhalla matrices/license](https://valhalla.github.io/valhalla/api/matrix/) — Default kilometers; engine MIT separate from data. Not executed. |
| [O07-openrouteservice-restrictions](raw/O07-openrouteservice-restrictions.json) | OPENED_TEXT | [openrouteservice limits/license](https://giscience.github.io/openrouteservice/hosted-api-restrictions) — Hosted limits may change; GPL3/LGPL3 component review needed before reuse. |
| [O07-ors-license](raw/O07-ors-license.json) | OPENED_TEXT | [openrouteservice limits/license](https://github.com/GIScience/openrouteservice) — Hosted limits may change; GPL3/LGPL3 component review needed before reuse. |
| [O08-dimacs-vrptw](raw/O08-dimacs-vrptw.json) | OPENED_TEXT | [DIMACS benchmark conventions](https://dimacs.rutgers.edu/programs/implementation-challenges/vehicle-routing/implementation-challenge-vehicle-routing/vrp-with-time-windows) — Dataset redistribution permission not established; compare matching conventions only. |
| [O09-sintef-solomon](raw/O09-sintef-solomon.json) | BLOCKED_CHALLENGE | [Solomon access and VRPLIB parser](https://www.sintef.no/projectweb/top/vrptw/solomon-benchmark/) — SINTEF blocked; parser MIT does not grant dataset rights. |
| [O09-vrplib-formats](raw/O09-vrplib-formats.json) | OPENED_TEXT | [Solomon access and VRPLIB parser](https://github.com/PyVRP/VRPLIB) — SINTEF blocked; parser MIT does not grant dataset rights. |
| [O10-pyvrp-repository](raw/O10-pyvrp-repository.json) | OPENED_TEXT | [PyVRP comparator](https://github.com/PyVRP/PyVRP) — MIT solver, inspected main≥3.12; not installed or benchmarked. |
| [O11-amazon-data-structures](raw/O11-amazon-data-structures.json) | OPENED_TEXT | [Amazon last-mile research data](https://github.com/MIT-CAVE/rc-cli/blob/main/templates/data_structures.md) — 9184 historical routes; CC BY-NC4.0; no download/training/commercial-use permission assumed. |
| [O11-amazon-dataset](raw/O11-amazon-dataset.json) | OPENED_TEXT | [Amazon last-mile research data](https://registry.opendata.aws/amazon-last-mile-challenges/) — 9184 historical routes; CC BY-NC4.0; no download/training/commercial-use permission assumed. |
| [O12-geofabrik-southern-zone](raw/O12-geofabrik-southern-zone.json) | OPENED_TEXT | [Regional local map preparation](https://download.geofabrik.de/asia/india/southern-zone.html) — 533MB PBF at retrieval; graph preparation resource use not measured. |
| [O13-osm-copyright](raw/O13-osm-copyright.json) | OPENED_TEXT | [OSM map-data rights](https://www.openstreetmap.org/copyright) — Separate from engine code; not legal clearance for a particular derived database. |
| [O14-vrptw-controller](raw/O14-vrptw-controller.json) | OPENED_TEXT | [Independent validator reference](https://github.com/laser-ufpb/VRPTWController) — MIT reference, does not validate our v2 scenario model unchanged. |
| [O15-robust-paper](raw/O15-robust-paper.json) | OPENED_TEXT | [Robust VRPTW established research](https://optimization-online.org/2018/02/6477/) — Full paper/algorithm not inspected or reproduced. |
| [O16-ortools-pypi-files](raw/O16-ortools-pypi-files.json) | OPENED_TEXT | [OR-Tools wheel/runtime feasibility](https://pypi.org/project/ortools/#files) — Listing is not install test; local defaultPython3.15 not assumed supported. |

Missing retrieval timestamps were not invented. Duplicate rendered attempts/code excerpts are counted as separate captures, not separate projects or distinct resources. Full details and hashes: [SOURCES.json](SOURCES.json).
