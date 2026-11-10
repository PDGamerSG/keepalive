# Research package audit

Audited 2026-11-10T10:22:43.963654+00:00.

These checks verify the written handoff, retained evidence integrity and static examples. They do **not** establish an implemented or tested application.

Command: `python3 research/audit_package.py`.

| Check | Result | Detail |
|---|---|---|
| JSON parse | PASS | {"parsed": 212} |
| Capture hashes | PASS | {"unchangedRawFiles": 199, "scope": "hash integrity, not truth or execution"} |
| Local links and fences | PASS | {"localLinks": 330, "errors": []} |
| Global constraints | PASS | {"identicalConstraints": 11} |
| Implementation document consistency | PASS | {"baseTasks": 16, "integratedStages": 8, "authorityAndPlaceholderScan": "pass"} |
| Deadline conversion | PASS | {"UTC": "2026-11-12T20:00:00+00:00", "IST": "2026-11-13T01:30:00+05:30", "checkpointRemaining": "58h35m"} |
| Base fixture arithmetic | PASS | {"meters": 4200, "nonemptyReturnSeconds": 34620, "emptyVehicle": "checked"} |
| Scenario fixture arithmetic | PASS | {"enumeratedOrders": 6, "onlyAccepted": ["B", "A", "C"], "rescueMeters": 4400, "extraMeters": 400, "minimumWindowMarginSeconds": 300, "worstReturnSeconds": 37500, "uniformExtraLegToleranceSeconds": 150, "evidence": "static arithmetic; no solver/application run"} |
| Envelope counterexample | PASS | {"namedScenarioArrivals": [21, 21], "envelopeArrival": 40} |
| Source catalog/reference integrity | PASS | {"definedSourceAndOriginalQueryIds": 167, "referencedSourceIds": 138, "missingReferences": [], "sourceCaptureStatuses": {"OPENED_TEXT": 66, "ERROR_PAGE": 6, "SELECTED_EXCERPT": 1, "GENERIC_LANDING": 1, "PARTIAL_CAPTURE": 1, "EXCERPTS_ONLY": 2, "BLOCKED_CHALLENGE": 1, "ENTRANT_SELF_REPORT": 3, "LOADING_ONLY": 2, "EMPTY_CAPTURE": 2, "CODE_EXCERPTS_ONLY": 1, "OPENED_SOURCE_WITH_REPORTED_LIMITS": 14}} |
| Research-only workspace | PASS | {"applicationImplemented": false, "modelExecuted": false, "solverExecuted": false, "paymentsExecuted": false, "note": "Package audit checks documents and static fixtures only."} |

Manual review also checked the report-family boundary, source-plan/free-audit versus paid-rescue disclosure, first-authorization-send deadline, webhook admission poisoning, capture/void uncertainty, endpoint retention discrepancy, session-pooling limitation and honest prior-work/demand claims. Automated checks cannot prove the proposed finance protocol.

**Not executed:** application build/tests, model inference/evaluation, OR-Tools solves, road-engine requests/builds, PayPal transactions/webhooks, competitor demos or deployed code. The implementer must produce that evidence. No secrets, source publication or submission mutations occurred.

The three-stop result is exhaustive only for six permutations in the frozen synthetic model. Its300-second margin/150-second extra-leg tolerance is not real-world reliability.

See [machine-readable results](package-audit.json), [second-pass evidence map](round2/EVIDENCE_MATRIX.md) and [Claude handoff](../CLAUDE_HANDOFF.md).
