# no-calendar

A single-page proposal. One static HTML file, no framework, no dependencies, no build step.

Live: https://no-calendar.vercel.app/

## What it is

An unsolicited proposal written from public evidence only, sent to one person. It is
`noindex,nofollow` and the link is the only way in.

The page is built on a three-layer disclosure model:

| Layer | What it holds |
|---|---|
| Skim | the headline, the counted receipt, and one fix line per item |
| `+ Read the case` | the argument, in native `<details>` |
| `[i]` | **What we saw / Source / What we're assuming** |

The assumption row is the loudest thing in every `[i]` note, on purpose. Hiding what you are
guessing at defeats the point of showing your working.

## Files

```
index.html   the page. one file, no dependencies.
og.png       1200x630 share card, drawn in the page's own system
lint.mjs     the build gate
vercel.json  headers and clean-URL config
```

## The gate

```
node lint.mjs index.html
```

It does two jobs.

**One: don't break the brand we borrowed.** The page uses another company's verbal grammar
for the length of one document. The gate encodes that grammar as failing tests, including a
rule most projects would have backwards: **en and em dashes are banned entirely.** That brand
types pure ASCII, so importing punctuation they never use would be a tell. `<samp>` is exempt,
because it marks text quoted verbatim and correcting a quote would falsify it.

**Two, and this matters more: keep dead claims dead.** The research behind this page
investigated, believed, and then disproved nine separate claims. Each one is now a failing
test. A claim that was false on Friday is still false on Monday, and the only reliable way to
keep it off a page is to fail the build.

The gate also refuses market sizes, report-mill citations, and any flat assertion the
evidence could not support. It reports every absolute claim (`nobody`, `never`, `none of`)
as a warning for a human to clear: each survivor has to be about us or independently
verifiable. That sweep earned its keep during the build, catching a headline that was
rhetorically satisfying and factually wrong.

Size is gated on **compressed transfer**, not raw bytes, because that is the thing the raw
number was ever standing in for. Budget is 28KB gzipped; the page ships at about 20KB with no
images and no libraries.

### Proving the gate works

A lint that passes because its regexes are broken is worse than no lint. Every rule was
verified by injecting a violation and confirming it was caught, including entity-encoded
variants (`&ndash;`, `&#8211;`, `&rsquo;`) that an earlier version missed. Two rules were
genuinely broken when first written and were fixed only because the violations were injected.

## Deploying

```
vercel deploy --prod
```

Then confirm the deployed bytes are the bytes you wrote:

```
curl -s -L https://no-calendar.vercel.app/ -o /tmp/live.html
shasum -a 256 index.html /tmp/live.html
```
