# Taking screenshots

How to capture the hero image and the screenshots for a website README, so they look consistent and can be retaken when the UI changes.

## Conventions

| Setting | Value |
| --- | --- |
| Folder | `docs/images/` |
| Names | Lowercase, hyphenated, named after the page: `hero.png`, `home.png`, `dashboard.png` |
| Viewport | 1440 × 900 for desktop shots. 390 × 844 if you add a phone shot |
| Format | PNG for UI. JPG only for photo-heavy pages |
| Width in the README | 760 for the hero, 860 for the main screenshot, 50% table cells for the rest |
| Theme | One theme for every shot. Say which in the README |
| Motion | Turn on reduced motion, or wait for animations to finish, so nothing is caught mid-move |

Note the viewport, the browser and the page in the README's Screenshots section, for example "Taken from the live site at 1440 × 900 in Chrome, with reduced motion turned on." The next person can then retake them the same way.

## With Playwright

Playwright's command line saves a screenshot of a URL in one command. Install the browser once:

```bash
npx playwright install chromium
```

Then:

```bash
npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 \
  https://example.com/ docs/images/hero.png

npx playwright screenshot --viewport-size=1440,900 --color-scheme=dark \
  https://example.com/dashboard docs/images/dashboard.png

npx playwright screenshot --full-page https://example.com/pricing docs/images/pricing.png
```

`--wait-for-timeout` waits the given milliseconds after the page loads. `--wait-for-selector=".chart"` waits for an element instead.

Pages behind a sign-in need a saved session. Sign in once with `npx playwright codegen --save-storage=auth.json https://example.com/login`, then pass `--load-storage=auth.json` to `screenshot`. Add `auth.json` to `.gitignore` and delete it afterwards: it holds your session cookies.

## With headless Chrome

No Node? Chrome can save a screenshot by itself:

```bash
chrome --headless --hide-scrollbars --window-size=1440,900 \
  --screenshot=docs/images/hero.png https://example.com/
```

On Windows the binary is usually `"C:\Program Files\Google\Chrome\Application\chrome.exe"`. On macOS it is `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

## The hero image

The hero is the first thing a visitor sees, so it should show the landing page with its headline readable. Two good options:

- A 1440 × 900 shot of the landing page.
- The site's Open Graph image (`og.jpg`, `og.png` or `opengraph-image.*`), as On Record does with `apps/web/public/og.jpg`. It is already sized for previews and the same file works as the GitHub social preview.

## Before you commit

- No personal data, real customer names, emails or API keys on screen.
- Shrink large files with any image optimiser. A README screenshot rarely needs more than 300 KB.
- Every `<img>` in the README needs alt text that says what is on screen, not "screenshot".
