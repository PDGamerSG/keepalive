# KeepAlive design context

The existing 3D landing page is the visual source. All app routes use burgundy navigation and headings, warm cream surfaces, mint save actions, and coral focus accents. Fraunces carries page titles; Geist carries labels, controls, and tabular figures. The dashboard stays compact with one metric strip, keyboard-accessible tabs, and an AG Grid table.

Use src/app/globals.css for shared tokens and controls. Keep the landing page styling scoped to .ka. Preserve sandbox behavior and clear loading, empty, error, and unavailable states.
