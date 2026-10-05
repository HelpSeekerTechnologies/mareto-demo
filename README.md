# Mareto self-guided buyer journey

Three public pages on GitHub Pages, in the order a visitor meets them:

1. **Product tour** `mareto-general-product-tour.html`: seven screens of the demo board with numbered pins, a
   proof line per step, and a closing slide with one pill, "Find your fit". No meeting link.
2. **Fit finder** `mareto-fit-finder.html`: fourteen questions (the six added on 2 Oct 2026 let the team read a
   prospect before a meeting: what holds the records, how many records and where, funder reports, province,
   total staff, public forms). The result is the size of build, what it looks like and how Mareto answers the
   problems named. No price. The only call to action is the unlock card, "Get your interactive demo": name,
   work email (personal mailboxes are refused), organization, title, and the marketing opt-in line. Submitting
   posts the sixteen known HubSpot fields (the price fields empty), sends the full answer set to the engine's
   quiz-capture route on demo.mareto, writes the unlock to the browser and shows the demo link, plus the sandbox
   offer for qualifiers. `scripts/send-results-email.mjs` (run by the workflow in `.github/`) emails the fit and
   build shape, without a pricing card.
3. **Interactive demo** `mareto-interactive-demo.html`: the click-through board. Without the unlock it opens on
   the same "Get your interactive demo" card; with it, on the persona screener. The top banner keeps the one
   "Book a meeting" link of the whole journey. The tour's screenshots are taken from it.

The order and the gate come from the Sales and Marketing standup of 2 Oct 2026: tour first, then the fit
finder, no meeting button before the demo, the demo only after work details, one generalized board.

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
- No price anywhere on the pages or in the results email until the final pricing card lands (2 Oct 2026
  standup: the card on the board and the pricing page disagreed). When it lands, the estimate and the email's
  pricing card come back on that card only. The build band (Essentials, Standard, Complex) still shows.
- The HubSpot form carries only the sixteen fields it carries now; a new field needs the property created in
  HubSpot first, or the submission is rejected and the lead is lost.
- The meeting link lives only in the demo board's top banner, after the unlock. The six new quiz answers
  are not posted to HubSpot until the form has the properties; they go to the engine's quiz-capture route.
