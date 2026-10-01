# Mareto self-guided buyer journey

Three public pages on GitHub Pages, in the order a visitor meets them:

1. **Product tour** `mareto-general-product-tour.html`: seven screens of the demo board with numbered pins, a
   proof line per step, and a closing slide that sends people to the fit finder or to a meeting.
2. **Fit finder** `mareto-fit-finder.html`: eight questions; the result is the size of build, what it looks like,
   the year-one estimate on the published pricing card, how Mareto answers the problems named, then an email
   capture. The capture posts to HubSpot; `scripts/send-results-email.mjs` (run by the workflow in `.github/`)
   emails the same results with the same maths.
3. **Interactive demo** `mareto-interactive-demo.html`: the click-through board. The tour's screenshots are
   taken from it.

`mareto-demo-cfs.html` and `mareto-demo-housing.html` are sector variants of the board and have not been put on
the canon yet.

## The canon

Every page carries the Mareto product canon (`MARETO-UI-TARGET-V1.md` v1.4, the product lane): Lato 400 and
700 only, navy `#0B1F33` text, pill controls, 20px cards, navy-tinted shadow tokens, gradients only in icon
medallions, action buttons and display numerals, no red, no uppercase outside the 11px stat eyebrow, no divider
lines, no pie or doughnut charts. The layer lives in `tools/canon.css` and is injected into each page by
`tools/canonize.py`, which also maps every off-canon colour, folds font weights, strips separators and turns
doughnuts into bar rows. Run it after any hand edit to a page:

```
python tools/canonize.py mareto-interactive-demo.html
```

Check with the brand lint before committing:

```
node C:\Users\alina\mareto-governance\standard\mos-1.0\corteza\frontend\lint\check-brand.mjs <page>
```

## Rebuilding the tour

The tour's copy lives in `tools/tour.py` (`STEPS`); the screenshots come from the board.

```
python -m http.server 8793 --bind 127.0.0.1     # from the repo root
python tools/tour.py                            # copy, pins, callouts, proof lines, closing slide
python tools/shoot-tour.py                      # seven screenshots from the local board, pins placed by element
python tools/canonize.py mareto-general-product-tour.html
```

`tools/quiz.py` rebuilds the fit finder's landing and script the same way; `tools/canonize.py` afterwards.

## What may not go on these pages

- No client names, client quotes or staff names. Proof lines are anonymised ("a family-services agency",
  "a youth shelter") and come from the migration explainers and the capability catalogue.
- No competitor product names. "Your current system", "spreadsheets and forms".
- No claim that is not live for a client today.
- Pricing only from the current pricing briefing (`Products/Mareto/Pricing`, 29 Sep 2026): Essentials $5,000
  setup plus $400 a month for up to 10 users; Standard and Complex setup by the scorecard; graduated licence
  $40, $34, $32, $30, $27; annual prepay 5 percent as the only reduction. No multi-year discounts.
- The HubSpot form carries only the sixteen fields it carries now; a new field needs the property created in
  HubSpot first, or the submission is rejected and the lead is lost.
- Book a meeting goes to Travis's HubSpot link everywhere.

## Where the engine lives

The score, the intake on demo.mareto, the sandbox factory and the jobs moved to the private repo HelpSeekerTechnologies/mareto-sales-engine on 1 Oct 2026. This repo keeps the public pages only.
