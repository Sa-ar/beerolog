# Beerolog Design Guide

The visual identity is a **pub chalkboard**: warm cream type on dark espresso,
condensed menu-board headings, handwritten chalk accents, and a single gold
accent. The whole web app renders in this one dark theme (no light mode).

## Foundations

Tokens live in `apps/web/src/styles.css` under `@theme`. Use the Tailwind
utilities they generate (`bg-brand-500`, `text-neutral-900`, ...) — do not
hardcode hex except for the documented one-off button-ink (`hsl(26 30% 10%)`).

### Palette

| Role | Token / class | Value | Use on dark |
|------|---------------|-------|-------------|
| Page background | body | `hsl(26 24% 9%)` espresso | — |
| Inset board / card surface | `bg-white`, `Card` | `hsl(28 16% 13%)` | surfaces |
| Primary text (cream) | `text-neutral-900` | `hsl(44 46% 93%)` | headings, body — AAA |
| Secondary text | `text-neutral-600` | `hsl(40 28% 78%)` | subhead — AA |
| Muted text | `text-neutral-500` | `hsl(38 22% 68%)` | hints, captions — AA |
| Borders / tracks | `border-neutral-200`, `bg-neutral-200` | `hsl(30 12% 24%)` | rules, meter tracks |
| Gold accent (bright) | `text-brand-300` / `bg-brand-300` | `hsl(30 75% 70%)` | accents, selected fills, meter |
| Gold accent (mid) | `bg-brand-500` | `hsl(25 85% 50%)` | primary button fill |
| Frame / hairline gold | `border-brand-700/40` | — | board & card frames |
| Button ink (on gold) | `text-[hsl(26_30%_10%)]` | dark espresso | text on any gold fill |

The **neutral ramp is inverted** (900 = lightest cream, 50 = darkest) so the
app's light-theme utilities render correctly on dark without per-component
rework. This has one sharp edge — see Gotchas.

### Type

Latin fonts loaded in `__root.tsx`:
- `font-display` — **Oswald** (condensed). Headings, menu labels, selected
  chips. Use uppercase + `tracking-wide`.
- `font-script` — **Caveat** (handwritten). The logo wordmark, eyebrows, and
  short chalk asides only. Never body copy.
- Body stays `system-ui`.

Hebrew (the default locale) is covered by per-glyph fallback in the same
stacks: **Secular One** (Hebrew display) and **Gveret Levin** (script).
Hebrew headings also drop `uppercase`/`letter-spacing` via a `[dir='rtl']`
rule (those are Latin-only affectations that mangle Hebrew). Browsers route
Latin glyphs to Oswald/Caveat and Hebrew glyphs to the Hebrew faces
automatically — no per-locale CSS. `uppercase`/`tracking` are no-ops on Hebrew
(no case), which is expected.

## Accessibility (non-negotiable)

- Body/large text ≥ 4.5:1 / 3:1 against its actual surface. Cream-on-espresso
  and dark-ink-on-gold both pass; **gold text on espresso does not at small
  sizes** — use `brand-300` (not `brand-500/600`) for small gold text.
- Never signal state by color alone. Quiz controls expose `role=radio` /
  `aria-checked` / `aria-pressed` and change border + weight, not just fill.
- Keep the visible focus ring: `focus-visible:outline-2 outline-brand-500`.
- Use logical props (`ps-*`, `text-start`) so RTL mirrors correctly.

## Component recipes

- **Board / card:** `Card` (dark surface) + `border-brand-700/40`. The landing
  board adds an inset chalk frame (`absolute inset-3 rounded-xl border
  border-brand-700/25`).
- **Quiz (`QuizStepper`):** big tappable option cards, one question per
  screen; grid columns adapt to option count (`optionGrid`) so 3-option
  scales sit on one row, not 2+orphan. Answers persist to `localStorage`
  (per-route `storageKey`). Two phases with one unifying rule — **a question
  auto-advances exactly once, the first time it's answered; every later visit
  is explicit**:
  - *First pass:* linear forward. First answer of a single-choice question
    auto-advances; multi uses Continue (+ Skip if optional). Back revisits the
    previous answer (prefilled, explicit — tap reselects, doesn't jump). No
    skip-ahead, no summary yet.
  - *Edit mode (all answered):* the **Summary** is the hub. Editing a question
    shows Back / Next / Done; tapping only highlights. Done (or Next past the
    end) returns to Summary. A change keeps all still-valid answers, drops only
    orphaned ones, and routes forward only if it unlocks a new question.
  - selected → `border-2 border-brand-300 bg-brand-300 font-semibold text-[hsl(26_30%_10%)]`
  - resting → `border-neutral-300 bg-neutral-100/40 text-neutral-900 hover:border-brand-300 hover:bg-neutral-100`
  - **Option icons:** chalk-line glyphs from `quiz-icons.tsx` (`QuizIcon`),
    `currentColor` so they invert with the card; scale questions use the
    shared `Intensity` ramp. Add art by editing the `GLYPHS` map; unmapped
    options fall back to text-only.
  - **A11y:** native radio/checkbox inputs (single tab stop, arrow keys);
    auto-advance is gated to `pointerup` so keyboard users get an explicit Next.
- **Primary button:** gold fill, dark ink — `bg-brand-500 text-[hsl(26_30%_10%)] hover:bg-brand-600`.
- **Progress / meter:** track `bg-neutral-200`, fill `bg-brand-300` (or
  `from-brand-500 to-brand-300`).
- **Menu list:** two lines per item — number + label + dotted leader
  (`border-dotted border-neutral-300`) on top, detail on its own line
  (`ps-9`). Survives long translations.

## Gotchas

- **`text-brand-900` / `text-brand-700` / raw `amber-*` are dark-ink-on-light**
  tokens. On the dark theme they become dark-on-dark and vanish. Don't use
  them as text or fills. Reach for `text-neutral-900` (cream) or
  `text-brand-200/300` (gold) instead. Shared primitives (`Button`, `Badge`)
  are already fixed; new code should follow the recipes above.
- A `fixed` element pinned to the bottom (e.g. `CookieNotice`) overlaps the
  footer — reserve equal flow space instead of covering content.
