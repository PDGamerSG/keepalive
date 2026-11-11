# Put the live link in the About section

The About box sits at the top right of a GitHub repository page. It can show a website link, a one-line description and topics. For a website project, the website link is the live site, so visitors can open it without scrolling to the README.

<p align="center">
  <img src="images/about-box.png" width="420"
       alt="The top right of the On Record repository page: the About box shows https://onrecord.pallabdas.me/ as the description and onrecord.pallabdas.me as the website link, then Readme, Apache-2.0 license, Activity, 0 stars and 0 watching">
</p>

## With the GitHub CLI

Run this in a terminal where `gh` is signed in (`gh auth status`) with admin or maintain access to the repo:

```bash
gh repo edit owner/repo \
  --homepage "https://example.com/" \
  --description "One sentence about what the site does." \
  --add-topic nextjs --add-topic tailwindcss --add-topic portfolio
```

Leave out `owner/repo` when you run it inside a clone of the repo. In PowerShell, put the command on one line or end each line with a backtick instead of `\`.

`scripts/set-about.mjs` in this kit runs the same command, checks the URL and the topic format first, and prints what GitHub stored:

```bash
node scripts/set-about.mjs --repo owner/repo --url https://example.com/ \
  --description "One sentence about what the site does." --topics nextjs,tailwindcss,portfolio
```

Add `--dry-run` to print the `gh` command without running it. The Build tab of `index.html` also writes the command from the facts you fill in.

To read the current values:

```bash
gh repo view owner/repo --json description,homepageUrl,repositoryTopics
```

## On the website

1. Open the repository on GitHub.
2. Click the gear icon next to **About**.
3. Paste the live link into **Website**. If the site runs on GitHub Pages, tick **Use your GitHub Pages website** instead.
4. Write the one-line description in **Description**.
5. Add topics, then click **Save changes**.

## What to write

| Field | Write | Example |
| --- | --- | --- |
| Website | The full live URL, with `https://` | `https://onrecord.pallabdas.me/` |
| Description | What the site does, in one sentence. The website field already shows the link, so the URL does not need repeating here | `Every meeting, remembered by who said it.` |
| Topics | 3 to 8 lowercase words: the framework, the language, the subject. Letters, digits and hyphens only | `react`, `vite`, `meeting-notes` |

On Record puts its URL in both Website and Description, which is why the link shows twice in its About box. A sentence in the description tells search results and link previews what the site is.

## Social preview image

The social preview is the picture shown when someone shares the repo link in a chat or on social media. The API cannot set it. Upload it by hand:

1. Open the repo's **Settings**, then **General**.
2. Under **Social preview**, click **Edit**, then **Upload an image**.
3. Use a PNG or JPG of at least 640 × 320. 1280 × 640 looks sharp everywhere. The hero screenshot or the site's Open Graph image works.

## Private repositories

The About box works the same in a private repo, but only people with access see it. GitHub Pages for a private repo needs a paid plan, so a private repo usually links to a site hosted elsewhere.
