// Build gate for the SNUBBS pitch page.
//
// Two jobs. The first is the usual one: don't break the brand we're borrowing.
// The second is specific to this project and matters more — the research killed
// six claims that were about to be wrong, and this file makes sure none of them
// crawl back onto the page. A claim that was false on Friday is still false on
// Monday, and the only reliable way to keep it off is to fail the build.
//
// <samp> marks text quoted verbatim from someone else, including their mistakes.
// Correcting a quote would falsify it, so <samp> is exempt from the style rules
// (but NOT from the killed-claims rules — we must never assert those, quoted or not).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const src = readFileSync(process.argv[2] ?? 'index.html', 'utf8');

const stripped = src.replace(/<script[\s\S]*?<\/script>/g, '')
                    .replace(/<style[\s\S]*?<\/style>/g, '');
const prose = stripped.replace(/<samp>[\s\S]*?<\/samp>/g, '');

// Decode entities BEFORE matching. An earlier version missed a violation
// written as `India&rsquo;s` because the regex was looking for a literal
// apostrophe. Anything that can be spelled two ways will eventually be
// spelled the way the linter isn't looking for.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
              rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
              ndash: '–', mdash: '—', hellip: '…', times: '×',
              rupee: '₹', deg: '°' };
const decode = (s) => s
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENT ? ENT[n] : m))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));

const visible = decode(stripped.replace(/<[^>]+>/g, ' ')).replace(/[‘’]/g, "'");

let fail = 0;
const bad = (m) => { console.error('FAIL  ' + m); fail = 1; };
const warn = (m) => console.error('warn  ' + m);

/* ------------------------------------------------------------------ *
 * 1. PUNCTUATION — SNUBBS types pure ASCII.
 *    Verified: their Instagram bio is ASCII + 4 emoji, zero U+2013/U+2014.
 *    The en dash in their product titles ("Watermelon Breeze – Clear
 *    Protein Soda") is a storefront artefact, not a brand device — so
 *    borrowing their voice means NOT importing dashes they never type.
 *    This is the inverse of the reference project's rule, on purpose.
 * ------------------------------------------------------------------ */
// decode first: `&ndash;` is the same violation as a literal en dash, and the
// first version of this check missed it.
const proseDecoded = decode(prose);
for (const [ch, name, cp] of [['–', 'en dash', 'U+2013'], ['—', 'em dash', 'U+2014']]) {
  let i = -1;
  while ((i = proseDecoded.indexOf(ch, i + 1)) !== -1) {
    bad(`${name} (${cp}) — SNUBBS types ASCII only: "${proseDecoded.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, ' ').trim()}"`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. THEIR RED IS THEIRS.
 *    #B10505 is the SNUBBS wordmark colour (99.8% of the logo's opaque
 *    pixels). Using it as our accent would be a fan account, not a studio.
 * ------------------------------------------------------------------ */
// Quoting their hex as evidence is fine, and is exactly what <samp> is for.
// USING it as one of our colours is not. So: allow it inside <samp>, ban it in
// prose and ban it anywhere it could actually paint a pixel.
for (const _ of prose.matchAll(/#B10505\b/gi)) {
  bad('their brandmark red #B10505 in prose outside <samp> — quote it in <samp> or drop it');
}
const css = (src.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
for (const _ of css.matchAll(/#B10505\b/gi)) {
  bad('their brandmark red #B10505 used as one of OUR colours — pick our own accent');
}
for (const _ of src.matchAll(/style\s*=\s*"[^"]*#B10505/gi)) {
  bad('their brandmark red #B10505 in an inline style — pick our own accent');
}

/* ------------------------------------------------------------------ *
 * 3. THE KILLED CLAIMS.
 *    Every one of these was investigated, believed, and then disproved.
 *    See research/context-brief.md. They must never reappear.
 * ------------------------------------------------------------------ */
const KILLED = [
  [/\b(11\.26|10\.96|9\.63)\s*MB\b/i,
   'page-weight claim — Shopify negotiates WebP correctly (hero is 46KB at phone width)'],
  [/\b0\s+of\s+26\b|\bno\s+webp\b|\bnot\s+served\s+as\s+webp\b/i,
   'WebP claim — false, Shopify serves image/webp on Accept'],
  [/\bno\s+meta\s+descriptions?\s+on\s+(?:either\s+)?(?:the\s+)?product/i,
   'PDPs DO have meta descriptions — only the homepage lacks one'],
  [/\bno\s+review\s+app\b|\bhaven'?t\s+installed\s+(?:a\s+)?reviews?\b/i,
   'Judge.me IS installed — the finding is that it has collected almost nothing'],
  [/vitamin\s+c\s+(?:is\s+)?(?:missing|absent|not\s+(?:in|listed))/i,
   'Vitamin C is present as Antioxidant (INS 300) = ascorbic acid'],
  [/\bartificial\s+sweeteners?\b(?![^.]*\bno\b)/i,
   'their "no artificial sweeteners" claim is ACCURATE (INS 960 = steviol glycosides)'],
  [/best\s*sellers?\s*rank|\bBSR\b/i,
   'BSR barred — two agents returned irreconcilable ranks'],
  [/\b106\s+ratings?\b/i,
   '106 ratings was a related-products carousel; the real counts are 3 and 2'],
  [/duplicate\s+content\s+between\s+the\s+(?:two\s+)?flavour/i,
   'flavour pages are only 0.33 similar — the Variety Pack is the duplicate (0.9987)'],
  // Added after an adversarial review caught this shipping on the page. The brief
  // corrected 6 -> 8 indexable URLs, but two superseded agent files still said 6
  // and the page pulled from those. A corrected number is only corrected in the
  // place you corrected it; everywhere else it is still wrong and still quotable.
  [/\b(?:six|6)\s+(?:of\s+your\s+)?(?:indexable\s+URLs|URLs\s+are\s+indexable)/i,
   'indexable URL count is EIGHT: homepage, 3 products, /pages/contact, /pages/faq, /collections/frontpage, /blogs/news'],
  [/\bsix\s+indexable\b/i,
   'indexable URL count is EIGHT, not six'],
  [/\bgtag\s+references\b/i,
   'there are ZERO gtag occurrences in the markup — the "six gtag references" hedge was a false-positive regex'],
  [/Meta\s+Pixel[^.]{0,40}\blive\b/i,
   'the Meta pixel ID appears exactly ONCE. Say the ID is present, not that it is live'],
];
for (const [re, why] of KILLED) {
  const m = stripped.match(re);
  if (m) bad(`killed claim resurfaced — ${why}\n        matched: ${JSON.stringify(m[0])}`);
}

/* ------------------------------------------------------------------ *
 * 4. NO MARKET SIZE. The estimates disagree by 8x+ and one house put
 *    Rs 44,048 crore on a category that had two brands in it.
 * ------------------------------------------------------------------ */
const MONEY = String.raw`(?:[₹$]|Rs\.?|INR|USD)\s?[\d,.]+\s*(?:crore|cr\b|lakh|bn|billion|million|mn)`;
for (const m of visible.matchAll(
      new RegExp(String.raw`(?:market|category|segment|industry)[^.]{0,70}?(?:worth|valued|value|size|sized|estimated|projected|reach)[^.]{0,50}?${MONEY}`, 'gi'))) {
  bad(`market size on the page: "${m[0].replace(/\s+/g, ' ').trim()}"`);
}
// …and the reverse word order ("Rs 44,048 crore market")
for (const m of visible.matchAll(new RegExp(String.raw`${MONEY}\s+(?:market|category|segment|industry|opportunity)`, 'gi'))) {
  bad(`market size on the page: "${m[0].replace(/\s+/g, ' ').trim()}"`);
}

/* ------------------------------------------------------------------ *
 * 5. NO REPORT-MILL SOURCES. Citing any of these is the weakness we
 *    are supposed to be better than.
 * ------------------------------------------------------------------ */
for (const house of ['imarc', 'grand view', 'grandview', 'technavio', 'mordor',
                     'market research future', 'marketresearchfuture', 'polaris market',
                     'future market insights', 'fact.mr', 'factmr', 'insightace',
                     'persistence market', 'vertex market']) {
  if (visible.toLowerCase().includes(house)) bad(`report-mill source cited: "${house}"`);
}

/* ------------------------------------------------------------------ *
 * 6. CLAIMS ABOUT THEM THAT WE CANNOT STAND UP.
 *    These must be phrased as questions or assumptions, never assertions.
 * ------------------------------------------------------------------ */
const MUST_HEDGE = [
  [/\byou (?:are|'re) (?:not )?breaking the law\b|\bis illegal\b|\bunlawful\b|\bnon-?compliant\b/i,
   'legal conclusion about them — we verified an FSSAI order, not their licence status'],
  [/\b(?:your|that|the)\s+claim\s+is\s+(?:false|untrue|wrong)\b/i,
   'we did NOT establish who launched first — no Wayback captures exist for either domain'],
  // any flat assertion that they are/were not first, however phrased
  [/\b(?:are|is|were|was|you'?re)\s+not\s+(?:actually\s+|really\s+|the\s+)?(?:india'?s\s+)?first\b/i,
   'assertion that they are not first — unproven; phrase it as contested, not settled'],
  [/\bnot\s+(?:actually\s+)?india'?s\s+first\b/i,
   'assertion that they are not first — unproven; phrase it as contested, not settled'],
  [/\b(?:someone|potion|a competitor|another brand)\s+(?:got there|was|came|launched)\s+first\b/i,
   'assertion that a competitor was first — we have three date signals, not proof'],
  [/\byou\s+(?:aren'?t|are\s+not)\s+first\b/i,
   'assertion that they are not first — unproven'],
  [/\bhigh[- ]protein\b[^.]{0,50}\b(?:claim|compliant|breach|fails?)\b/i,
   'protein-claim compliance barred — ICMR RDA was never retrieved'],
  [/\byou (?:have )?(?:no|don'?t have) (?:an? )?(?:FSSAI )?licen[cs]e\b/i,
   'we verified no licence NUMBER is displayed, not that no licence exists'],
];
for (const [re, why] of MUST_HEDGE) {
  const m = visible.match(re);
  if (m) bad(`unsupportable assertion — ${why}\n        matched: ${JSON.stringify(m[0].trim())}`);
}

/* ------------------------------------------------------------------ *
 * 7. ABSOLUTE-CLAIM SWEEP. Every survivor must be about US or be
 *    verifiable from published evidence. Reported, not failed —
 *    a human decides.
 * ------------------------------------------------------------------ */
let abs = 0;
for (const m of visible.matchAll(/\b(nobody|no one|none of|never|there is no|there are no|you cannot|impossible|always|every single)\b/gi)) {
  const ctx = visible.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\s+/g, ' ').trim();
  warn(`absolute claim "${m[1]}": …${ctx}…`);
  abs++;
}
if (abs) warn(`${abs} absolute claim(s) — each must be about US or publicly verifiable.`);

/* ------------------------------------------------------------------ *
 * 8. STRUCTURE. The disclosure architecture is the whole point.
 * ------------------------------------------------------------------ */
const evNotes = (src.match(/class="ev"/g) || []).length;
// tolerate every way the apostrophe can be written, so a correct page never
// fails this check on typography alone
const assumptions = (decode(src).match(/What we(?:'re| are) assuming/gi) || []).length;
if (evNotes < 5) bad(`only ${evNotes} [i] evidence notes — need one per section and per item`);
if (assumptions < 5) bad(`only ${assumptions} "What we're assuming" rows — every [i] note needs one`);
if (!/wa\.me\//.test(src)) bad('no wa.me CTA found');
if (/calendly|cal\.com|book a call|schedule a call/i.test(visible)) bad('calendar link or "book a call" — the ask is a correction call');
if (!/noindex/.test(src)) bad('missing <meta name="robots" content="noindex">');
if (!/og:image/.test(src)) bad('missing og:image — LinkedIn renders a blank grey card without it');

/* ------------------------------------------------------------------ *
 * 9. ACCESSIBILITY / BEHAVIOUR
 * ------------------------------------------------------------------ */
if (!/prefers-reduced-motion/.test(src)) bad('no prefers-reduced-motion handling');
if (/autofocus/.test(src)) bad('autofocus attribute — never on touch');

/* ------------------------------------------------------------------ *
 * 10. SIZE
 * ------------------------------------------------------------------ */
// The brief said "under ~60KB". That raw number was standing in for the thing
// that actually matters, which is what a phone on Indian mobile data has to
// pull down. This page is one file with no images and no libraries, so the
// honest measure is the compressed transfer. We gate on that, and keep a raw
// ceiling as a backstop against someone pasting in a base64 blob that happens
// to compress well.
const raw = Buffer.byteLength(src) / 1024;
const gz = gzipSync(Buffer.from(src), { level: 9 }).length / 1024;
if (gz > 28) bad(`transfer is ${gz.toFixed(1)}KB gzipped — budget is 28KB`);
if (raw > 70) bad(`raw file is ${raw.toFixed(1)}KB — backstop is 70KB`);

console.log(fail
  ? '\n✗ LINT FAILED'
  : `\n✓ lint clean — ${gz.toFixed(1)}KB over the wire (${raw.toFixed(1)}KB raw), `
    + `${evNotes} evidence notes, ${assumptions} assumption rows, no killed claims, `
    + `no dashes SNUBBS never types`);
process.exit(fail);
