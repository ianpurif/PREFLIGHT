# Rovaulta design system

Rovaulta is a confidential deployment gate for autonomous warehouse robots. It binds an exact
robot build to a site's private evaluation envelope, exposes only the public evaluation projection,
and requires a human to approve the exact release intent on Ledger hardware.

The current product theme is LIGHT-FIRST, MINIMAL, TECHNICAL, ENTERPRISE, and
PRECISION-FOCUSED. Dark presentation is not the default visual language. A light canvas gives the
workflow room to breathe while dark type, measured dividers, and restrained industrial accents keep
the product operational rather than decorative.

The interface is for safety engineers, robotics integrators, operators, and technical teams moving
software toward real facilities. It should communicate precision, trust, operational control, and
clear limits. A simulation or evaluation pass is evidence for a defined envelope; it is not a
guarantee of physical robot safety.

## Product identity

The product story is:

1. declare the exact site, robot, and build;
2. evaluate within the private site boundary;
3. inspect the public result;
4. require human approval before release.

The UI may show verdicts, commitments, digests, route metadata, status, and the approval boundary.
It must never reveal private rules, restricted geometry, confidential intermediate findings, raw CRE
payloads, credentials, signatures, or a fabricated authorization state.

## Brand assets

Use the supplied artwork rather than recreating the logo with text or a placeholder letter:

- `apps/web/public/brand/rovaulta-wordmark.png` is the primary wordmark. Use it in public headers,
  account-entry headers, the Ledger operator header, and loading states where the full product name
  should be recognized immediately.
- `apps/web/public/brand/rovaulta-mark.png` is the standalone mark. Use it in compact authenticated
  workspace navigation, compact footer treatments, and other contexts where the full wordmark would
  compete with operational content.
- `apps/web/src/app/icon.png` uses the standalone mark as the browser/app icon.

The PNGs are transparent and should sit on the light system surfaces without a decorative container.
Keep the wordmark large enough to read, preserve its aspect ratio, and use empty alternative text
when the surrounding link already names Rovaulta. Do not recolor, stretch, crop the artwork further,
or place it on a dark-first treatment.

## Visual personality

- Precise: use alignment, measured spacing, short labels, and deterministic status language.
- Technical: use modest monospace treatment for identifiers and small operational metadata.
- Restrained: favor off-white, white, neutral gray, charcoal type, and one controlled oxide accent.
- Premium: create hierarchy with typography, whitespace, and strong edges instead of decoration.
- Enterprise: keep actions obvious and information scannable.
- Operational: make the next step and current boundary visible.

The public landing and account-entry surfaces use a light control-plane treatment with charcoal type,
quiet green verification signals, and an oxide accent for action and attention. This is an original
Rovaulta identity; it is not a brand or color-system copy of another company.

## Typography

Use the existing system-first sans-serif stack from `globals.css`:

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Do not add a remote font dependency for a visual refresh. Use a clear hierarchy:

- display heading: compact, high-contrast, and used once per page;
- section heading: strong but materially smaller than the display heading;
- body: comfortable line height and a readable measure;
- metadata: small uppercase labels with generous tracking;
- identifiers: monospace only where it improves exactness or scanning.

Avoid serif display accents, novelty fonts, oversized all-caps paragraphs, and making every label
look like a status badge.

## Color

Use color to establish hierarchy and meaning, not to decorate the page. The entry surfaces use these
roles:

| Role | Value | Use |
| --- | --- | --- |
| Light canvas | `#f5f7f5` | Page background |
| Primary surface | `#ffffff` | The meaningful form or review grouping |
| Raised neutral | `#eef2ef` | Secondary technical grouping or status frame |
| Ink | `#182321` | Primary text and headings |
| Muted text | `#4c5c56` | Supporting copy |
| Subtle text | `#5f6d68` | Metadata that remains readable on light surfaces |
| Structural line | `#d8e1dc` / `#aab8b0` | Dividers and boundaries |
| Oxide accent | `#9a552c` | Primary action, links, active emphasis |
| Accent text | `#7b3f20` | Accent text on light surfaces |
| Attention | `#8a5110` | Pending/hold state only |
| Verified | `#276b4c` | Small positive/complete signals only |

The oxide accent is not a verdict. Use semantic status colors deliberately: green for verified or
approved, amber for pending or attention, red for blocked or failed, and neutral for inactive. Every
status needs text or structure in addition to color. Small text and focus rings must be tested
against their actual light background at a minimum 4.5:1 contrast target. Do not use low-contrast
gray as a primary control.

### Light/dark mode policy

Rovaulta is light-first. `/` and `/start` use the light system as their default and do not switch to
a dark-first presentation based on device preference. A future authenticated workspace may add a
separately designed dark mode only when its information hierarchy, status semantics, and contrast
tokens are specified and reviewed; do not generate a dark mode by inverting these colors.

## Shape and depth

- Prefer square or near-square geometry: `0–2px` radius for controls and primary surfaces.
- Use borders and dividers to show grouping and system boundaries.
- Use one clean, lightly elevated surface when a user must act, such as the operator account form.
- Avoid the pattern of every section becoming a rounded rectangle with a shadow.
- Avoid glassmorphism, decorative blobs, neon glow, and soft floating-card compositions.
- Keep shadows rare and quiet; the light canvas, borders, and whitespace do most of the grouping work.

## Components

### Buttons and links

Primary actions are solid oxide controls with a visible edge, readable white text, a clear hover
state, and a high-contrast focus ring. Secondary actions are outlined controls or underlined text
links with enough area to tap. Do not hide sign-in or account creation behind subtle text alone.

Every interactive control must have:

- a visible default boundary or background;
- a readable hover and active state;
- a high-contrast `:focus-visible` state;
- a useful disabled state that remains legible;
- semantic HTML and keyboard access;
- a target large enough for touch interaction.

### Cards and forms

Use a card only when it groups a decision or a cohesive form. Labels sit directly above inputs,
required/password guidance stays close to the field, and errors use `role="alert"`. The `/start`
mode switch exposes both `Create operator account` and `Sign in` as first-class controls.

### Inputs and tables

Inputs use visible labels, clear focus rings, rectangular fields, and readable placeholder text;
validation feedback stays adjacent to the field or form. Tables, when introduced on operational
surfaces, should use aligned columns, row dividers, monospace treatment only for exact identifiers,
and explicit empty/loading/error states instead of rounded-card decoration.

### Navigation

Keep the brand and the route back to the overview in a stable header. Landing navigation exposes
only the few destinations that help a first-time visitor understand the product; the primary
console action remains visually distinct.

### Status indicators

Use short, explicit phrases such as `Human approval required`, `CONTROLLED ACCESS`, or `HOLD`.
Status marks support the text; they do not replace it. Do not imply that `CLEAR` is the same as
release authorization.

## Layout and density

- Anchor the page to a consistent content rail, with strong left alignment.
- Use whitespace to separate workflow stages, then use thin dividers to reinforce relationships.
- Keep the first viewport focused on one purpose and one obvious next action.
- Keep the public page information-dense enough to feel operational without becoming a dashboard;
  let the light canvas and whitespace make the few important signals easy to scan.
- On mobile, put the account form before supporting explanation so authentication actions remain
  discoverable without a long scroll.
- Avoid horizontal overflow at 320px, 375px, tablet widths, and desktop widths.

## Imagery

The landing page does not require stock photography. The current landing visual is an original,
light-surface technical release-review schematic: it explains exact-build binding, private
evaluation, and the human approval boundary more clearly than a photograph. Technical schematics
and restrained product projections are preferred when they explain the release boundary more clearly
than a photograph.
If photography is introduced later, use believable industrial robotics, controlled facilities,
engineering labs, or autonomous warehouse environments. Avoid generic humanoid robots, cheesy AI
imagery, and visuals that imply physical safety has been proven.

## Motion

Motion should explain state or improve feedback: small hover transitions, focus changes, loading
feedback, and navigation response are appropriate. Keep transitions short and quiet. Do not use
bounce, floating panels, decorative parallax, or animation that suggests a verdict is being made.
Respect `prefers-reduced-motion: reduce`. The light theme should not compensate with glow, shimmer,
or decorative gradients.

## Do

- establish the page purpose with one strong heading;
- make the next action obvious;
- use alignment, borders, dividers, and meaningful surfaces;
- use a light canvas with strong charcoal typography and restrained accent moments;
- keep exact-build, private-evaluation, and human-approval boundaries explicit;
- preserve semantic HTML, keyboard flow, and visible focus;
- validate the UI at mobile and desktop widths.

## Don't

- build a generic SaaS dashboard;
- make a dark-first or futuristic-black presentation the default;
- use purple AI gradients, decorative blobs, or excessive glassmorphism;
- turn every group into a rounded card or pill;
- make buttons transparent enough to disappear;
- rely on color alone for status;
- claim simulation proves real-world robot safety;
- imply that an automated clear result bypasses the Ledger approval gate.

## Reference note

Palantir is a design reference for enterprise visual discipline and information architecture. The
useful principles here are clear hierarchy, unified components, workflow-oriented layouts, measured
spacing, borders/dividers, and limited primary actions. See [Palantir](https://www.palantir.com/),
[Workshop overview](https://www.palantir.com/docs/foundry/workshop/overview)
and [Workshop application design best practices](https://www.palantir.com/docs/foundry/workshop/application-design-best-practices).

Rovaulta must remain an original product identity and must not copy Palantir's proprietary
branding, assets, or exact interface designs.

Future AI coding agents should read this document before modifying Rovaulta's UI.
