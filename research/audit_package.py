#!/usr/bin/env python3
"""Check research documents and static arithmetic; never runs the proposed app."""
from __future__ import annotations

import collections
import datetime as dt
import hashlib
import itertools
import json
from pathlib import Path
import re
import sys
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
checks: list[dict] = []


def check(name, fn):
    try:
        detail = fn()
        checks.append({"name": name, "pass": True, "detail": detail})
    except Exception as error:
        checks.append({"name": name, "pass": False, "detail": str(error)})


def read_json(relative):
    return json.loads((ROOT / relative).read_text())


def json_files():
    paths = sorted(ROOT.rglob("*.json"))
    for path in paths:
        json.loads(path.read_text())
    return {"parsed": len(paths)}


def capture_hashes():
    count = 0
    names = set()
    for manifest in ("research/manifest.json", "research/round2/manifest.json"):
        for item in read_json(manifest)["items"]:
            path = ROOT / item["file"]
            assert path.exists(), item["file"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], item["file"]
            assert item["file"] not in names, f"Duplicate capture {item['file']}"
            names.add(item["file"])
            count += 1
    actual = {str(p.relative_to(ROOT)) for p in ROOT.glob("research/**/raw/*.json")}
    assert names == actual, {"unlisted": sorted(actual - names), "missing": sorted(names - actual)}
    return {"unchangedRawFiles": count, "scope": "hash integrity, not truth or execution"}


def markdown():
    count, errors = 0, []
    for path in ROOT.rglob("*.md"):
        body = path.read_text()
        if len(re.findall(r"^```", body, re.M)) % 2:
            errors.append(f"Unbalanced fence: {path.relative_to(ROOT)}")
        for match in re.finditer(r"\[[^\]\n]*\]\(([^)\n]+)\)", body):
            target = match[1].strip().split(' "')[0].strip("<>")
            if target.startswith(("http:", "https:", "mailto:", "#", "app:")):
                continue
            target = target.split("#")[0]
            if not target:
                continue
            count += 1
            if not (path.parent / target).exists():
                errors.append(f"{path.relative_to(ROOT)} -> {target}")
    assert not errors, errors
    return {"localLinks": count, "errors": errors}


def constraints():
    paths = ["docs/superpowers/specs/2026-11-10-proofroute-design.md",
             "docs/superpowers/plans/2026-11-10-proofroute.md"]
    blocks = []
    for path in paths:
        body = (ROOT / path).read_text()
        block = re.search(r"## Global [Cc]onstraints\n(.*?)(?=\n## |\n---)", body, re.S)[1]
        blocks.append([line for line in block.splitlines() if line.startswith("- ")])
    assert blocks[0] == blocks[1], "Base design/plan constraints differ"
    assert len(blocks[0]) == 11
    assert "first authorization send" in " ".join(blocks[0])
    assert "Node 24" in " ".join(blocks[0])
    return {"identicalConstraints": len(blocks[0])}


def implementation_docs():
    base = (ROOT / "docs/superpowers/plans/2026-11-10-proofroute.md").read_text()
    assert [int(x) for x in re.findall(r"^## Task (\d+)", base, re.M)] == list(range(1, 17))
    extended = (ROOT / "docs/superpowers/plans/2026-11-10-proofroute-assurance.md").read_text()
    assert re.findall(r"^## ([A-H])\. ", extended, re.M) == list("ABCDEFGH")
    actionable = [ROOT / "CLAUDE_HANDOFF.md", ROOT / "docs/ASSURANCE_CONTRACTS.md",
                  ROOT / "docs/TECHNICAL_CONTRACTS.md",
                  ROOT / "docs/superpowers/plans/2026-11-10-proofroute-assurance.md"]
    for path in actionable:
        body = path.read_text()
        assert not re.search(r"authorizationRecordedAt|recorded authorization|Node 22|`BASE`", body), path.name
        assert not re.search(r"\bTODO\b|\bTBD\b|\[INSERT", body), path.name
    return {"baseTasks": 16, "integratedStages": 8, "authorityAndPlaceholderScan": "pass"}


def deadline():
    pacific = dt.datetime(2026, 11, 12, 12, tzinfo=ZoneInfo("America/Los_Angeles"))
    utc = pacific.astimezone(dt.timezone.utc)
    india = pacific.astimezone(ZoneInfo("Asia/Kolkata"))
    assert utc == dt.datetime(2026, 11, 12, 20, tzinfo=dt.timezone.utc)
    assert india.isoformat() == "2026-11-13T01:30:00+05:30"
    checkpoint = dt.datetime(2026, 11, 10, 14, 55, tzinfo=ZoneInfo("Asia/Kolkata"))
    assert int((pacific - checkpoint).total_seconds()) == (58 * 60 + 35) * 60
    return {"UTC": utc.isoformat(), "IST": india.isoformat(), "checkpointRemaining": "58h35m"}


def schedule(route, stop_ids, vehicle, matrix, delta=0):
    """Direct recurrence for supplied static arithmetic, separate from future code."""
    indices = {node: n for n, node in enumerate(route["nodeIds"])}
    stops = {stop["id"]: stop for stop in route["stops"]}
    previous, clock, meters, load = "D0", vehicle["shiftStartSeconds"], 0, 0
    rows = []
    for stop_id in stop_ids:
        a, b = indices[previous], indices[stop_id]
        stop = stops[stop_id]
        arrival = clock + matrix[a][b] + delta
        start = max(arrival, stop["windowOpenSeconds"])
        clock = start + stop["serviceSeconds"]
        meters += route["distanceMeters"][a][b]
        load += stop["demandGrams"]
        rows.append({"stopId": stop_id, "arrivalSeconds": arrival,
                     "serviceStartSeconds": start, "departureSeconds": clock})
        previous = stop_id
    if stop_ids:
        meters += route["distanceMeters"][indices[previous]][0]
        clock += matrix[indices[previous]][0] + delta
    margins = [stops[row["stopId"]]["windowCloseSeconds"] - row["serviceStartSeconds"] for row in rows]
    return {"schedule": rows, "distance": meters, "load": load, "return": clock,
            "windowMargin": min(margins) if margins else None,
            "shiftMargin": vehicle["shiftEndSeconds"] - clock,
            "timePass": all(value >= 0 for value in margins) and clock <= vehicle["shiftEndSeconds"]}


def tiny_v1():
    route = read_json("docs/examples/tiny-route-input.json")
    oracle = read_json("docs/examples/tiny-route-oracle.json")
    total = 0
    for expected in oracle["routes"]:
        vehicle = next(v for v in route["vehicles"] if v["id"] == expected["vehicleId"])
        actual = schedule(route, expected["stopIds"], vehicle, route["travelSeconds"])
        assert actual["schedule"] == expected["schedule"]
        assert actual["distance"] == expected["distanceMeters"]
        assert actual["return"] == expected["returnSeconds"]
        assert actual["load"] == expected["loadGrams"]
        assert actual["timePass"] and actual["load"] <= vehicle["capacityGrams"]
        total += actual["distance"]
    assert total == oracle["totalDistanceMeters"] == 4200
    return {"meters": total, "nonemptyReturnSeconds": 34620, "emptyVehicle": "checked"}


def assurance_v2():
    document = read_json("docs/examples/assurance-input.json")
    oracle = read_json("docs/examples/assurance-oracle.json")
    buyer = read_json("docs/examples/assurance-buyer-plan.json")
    route = document["route"]
    scenarios = document["scenarioSet"]["scenarios"]
    assert document["schemaVersion"] == "dispatch-input/v2"
    assert route["schemaVersion"] == "route-input/v1"
    assert [s["id"] for s in scenarios] == ["NOMINAL", "CITY_SLOWDOWN", "CORRIDOR_DELAY"]
    assert scenarios[0]["travelSeconds"] == route["travelSeconds"]
    assert document["matrixProvenance"]["sourceKind"] == route["source"] == "SYNTHETIC"
    assert buyer["routes"][0]["stopIds"] == ["A", "B", "C"]
    assert document["scenarioSet"]["nodeIds"] == route["nodeIds"]
    n = len(route["nodeIds"])
    for scenario in scenarios:
        matrix, recipe = scenario["travelSeconds"], scenario["derivation"]
        assert len(matrix) == n and all(len(row) == n for row in matrix)
        expected = [row[:] for row in route["travelSeconds"]]
        if recipe["kind"] == "UNIFORM_ADD_SECONDS":
            expected = [[x + (recipe["extraSeconds"] if i != j else 0)
                         for j, x in enumerate(row)] for i, row in enumerate(expected)]
        elif recipe["kind"] == "EDGE_OVERRIDES":
            for edge in recipe["edges"]:
                a, b = [route["nodeIds"].index(edge[k]) for k in ("fromId", "toId")]
                expected[a][b] = edge["travelSeconds"]
        else:
            assert recipe["kind"] == "NOMINAL"
        assert matrix == expected, scenario["id"]
    vehicle = route["vehicles"][0]

    def evaluate(order, delta=0):
        results = {s["id"]: schedule(route, order, vehicle, s["travelSeconds"], delta) for s in scenarios}
        metrics = next(iter(results.values()))
        passed = (all(r["timePass"] for r in results.values()) and
                  metrics["distance"] <= oracle["maxTotalDistanceMeters"] and
                  metrics["load"] <= vehicle["capacityGrams"])
        return passed, results

    agent = read_json("research/round2/optimization/raw/F01-robust-tiny-oracle.json")
    passing = []
    for order in itertools.permutations(["A", "B", "C"]):
        passed, actual = evaluate(order)
        expected = next(o for o in oracle["allOrders"] if o["stopIds"] == list(order))
        agent_expected = next(o for o in agent["allOrders"] if o["stopIds"] == list(order))
        assert passed == expected["pass"] == agent_expected["robustPass"]
        for sid, result in actual.items():
            a = next(s for s in expected["scenarios"] if s["scenarioId"] == sid)
            b = next(s for s in agent_expected["scenarios"] if s["scenarioId"] == sid)
            assert result["distance"] == expected["totalDistanceMeters"] == agent_expected["distanceMeters"]
            assert result["return"] == a["returnSeconds"] == b["returnSeconds"]
            assert result["windowMargin"] == a["minimumWindowMarginSeconds"] == b["minimumWindowHeadroomSeconds"]
            assert result["shiftMargin"] == a["shiftMarginSeconds"] == b["shiftHeadroomSeconds"]
            assert result["timePass"] == a["timePass"] == b["pass"]
            assert result["schedule"] == [{k: v for k, v in row.items() if k != "windowMarginSeconds"} for row in a["schedule"]]
        if passed:
            passing.append(list(order))
    assert passing == oracle["passingOrders"] == [["B", "A", "C"]]
    assert evaluate(["A", "B", "C"])[1]["CORRIDOR_DELAY"]["windowMargin"] == -900
    rescue = evaluate(["B", "A", "C"])[1]
    assert min(r["windowMargin"] for r in rescue.values()) == 300
    assert max(r["return"] for r in rescue.values()) == 37500
    assert min(r["shiftMargin"] for r in rescue.values()) == 2100
    low, high = 0, 3600
    while low < high:
        mid = (low + high + 1) // 2
        if evaluate(["B", "A", "C"], mid)[0]:
            low = mid
        else:
            high = mid - 1
    assert low == oracle["comparison"]["uniformLegDelayToleranceSeconds"] == 150
    assert evaluate(["B", "A", "C"], 150)[0] and not evaluate(["B", "A", "C"], 151)[0]
    assert oracle["comparison"]["changedVehicleCount"] == 1
    assert oracle["comparison"]["changedStopPositionCount"] == 2
    return {"enumeratedOrders": 6, "onlyAccepted": passing[0], "rescueMeters": 4400,
            "extraMeters": 400, "minimumWindowMarginSeconds": 300,
            "worstReturnSeconds": 37500, "uniformExtraLegToleranceSeconds": low,
            "evidence": "static arithmetic; no solver/application run"}


def envelope():
    fixture = read_json("research/round2/optimization/raw/F02-envelope-conservatism.json")
    arrivals = [s["matrix"][0][1] + s["matrix"][1][2] for s in fixture["scenarioTravelSeconds"]]
    enveloped = fixture["envelopeMatrix"][0][1] + fixture["envelopeMatrix"][1][2]
    assert arrivals == [21, 21] and enveloped == 40
    return {"namedScenarioArrivals": arrivals, "envelopeArrival": enveloped}


def source_catalogs():
    defined = {item["id"] for item in read_json("research/manifest.json")["items"]}
    statuses = collections.Counter()
    for catalog in ROOT.glob("research/round2/*/SOURCES.json"):
        data = json.loads(catalog.read_text())
        for source in data["sources"]:
            defined.add(source["id"])
            path = catalog.parent / source["capture"]
            assert path.exists(), str(path)
            if "sha256" in source:
                assert hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"]
            statuses[source.get("status", "OPENED_SOURCE_WITH_REPORTED_LIMITS")] += 1
    references = set()
    for path in ROOT.rglob("*.md"):
        references.update(re.findall(r"\b(?:S|C|O|P|R)\d{2}\b", path.read_text()))
    assert not (references - defined), sorted(references - defined)
    return {"definedSourceAndOriginalQueryIds": len(defined), "referencedSourceIds": len(references),
            "missingReferences": [], "sourceCaptureStatuses": dict(statuses)}


def research_only():
    app_files = list(ROOT.glob("apps/**/*")) + list(ROOT.glob("services/solver/**/*"))
    assert not [p for p in app_files if p.is_file()], "Application files now present: reassess research-only status"
    return {"applicationImplemented": False, "modelExecuted": False, "solverExecuted": False,
            "paymentsExecuted": False, "note": "Package audit checks documents and static fixtures only."}


for name, fn in [
    ("JSON parse", json_files), ("Capture hashes", capture_hashes),
    ("Local links and fences", markdown), ("Global constraints", constraints),
    ("Implementation document consistency", implementation_docs), ("Deadline conversion", deadline),
    ("Base fixture arithmetic", tiny_v1), ("Scenario fixture arithmetic", assurance_v2),
    ("Envelope counterexample", envelope), ("Source catalog/reference integrity", source_catalogs),
    ("Research-only workspace", research_only),
]:
    check(name, fn)

report = {"auditedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
          "command": "python3 research/audit_package.py",
          "scope": "Research package integrity/static arithmetic only; no application verification.",
          "pass": all(c["pass"] for c in checks), "checks": checks}
(ROOT / "research/package-audit.json").write_text(json.dumps(report, indent=2) + "\n")
lines = ["# Research package audit", "", "Audited " + report["auditedAtUtc"] + ".", "",
         "These checks verify the written handoff, retained evidence integrity and static examples. "
         "They do **not** establish an implemented or tested application.", "",
         "Command: `python3 research/audit_package.py`.", "",
         "| Check | Result | Detail |", "|---|---|---|"]
for result in checks:
    detail = json.dumps(result["detail"], ensure_ascii=False).replace("|", "/")
    lines.append("| " + result["name"] + " | " + ("PASS" if result["pass"] else "FAIL") + " | " + detail + " |")
lines.extend(["", "Manual review also checked the report-family boundary, source-plan/free-audit versus "
              "paid-rescue disclosure, first-authorization-send deadline, webhook admission poisoning, "
              "capture/void uncertainty, endpoint retention discrepancy, session-pooling limitation and "
              "honest prior-work/demand claims. Automated checks cannot prove the proposed finance protocol.", "",
              "**Not executed:** application build/tests, model inference/evaluation, OR-Tools solves, road-engine "
              "requests/builds, PayPal transactions/webhooks, competitor demos or deployed code. The implementer "
              "must produce that evidence. No secrets, source publication or submission mutations occurred.", "",
              "The three-stop result is exhaustive only for six permutations in the frozen synthetic model. "
              "Its300-second margin/150-second extra-leg tolerance is not real-world reliability.", "",
              "See [machine-readable results](package-audit.json), [second-pass evidence map](round2/EVIDENCE_MATRIX.md) "
              "and [Claude handoff](../CLAUDE_HANDOFF.md)."])
(ROOT / "research/PACKAGE_AUDIT.md").write_text("\n".join(lines) + "\n")
print(json.dumps(report, indent=2))
sys.exit(0 if report["pass"] else 1)
