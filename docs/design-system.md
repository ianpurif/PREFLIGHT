# Rovaulta design system

Rovaulta is a confidential deployment gate for autonomous warehouse robots. It binds an exact
robot build to a site's private evaluation envelope, exposes only the public evaluation projection,
and requires a human to approve the exact release intent on Ledger hardware.

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

## Visual personality

- Precise: use alignment, measured spacing, short labels, and deterministic status language.
- Technical: use modest monospace treatment for identifiers and small operational metadata.
- Restrained: favor charcoal, off-white, neutral gray, and one controlled oxide accent.
- Premium: create hierarchy with typography, whitespace, and strong edges instead of decoration.
- Enterprise: keep actions obvious and information scannable.
- Operational: make the next step and current boundary visible.

The public landing and account-entry surfaces use a charcoal control-plane treatment with an oxide
amber accent. This is an original Rovaulta identity; it is not a brand or color-system copy of
another company.

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

The entry surfaces use these roles:

| Role | Value | Use |
| --- | --- | --- |
| Charcoal canvas | `#0d1112` | Page background |
| Raised surface | `#151b1c` / `#1a2222` | The one meaningful form or review grouping |
| Ink | `#eef0eb` | Primary text |
| Muted text | `#a6afac` | Supporting copy |
| Structural line | `#2d3938` / `#465351` | Dividers and boundaries |
| Oxide accent | `#d9864e` | Primary action, current boundary, focus emphasis |
| Accent light | `#f0b184` | Accent text on charcoal |
| Verified | `#91c4a4` | Small positive/complete signals only |

The accent is not a verdict. Use semantic status colors deliberately: green for verified or
approved, amber/oxide for pending or attention, red for blocked or failed, and neutral for
inactive. Every status needs text or structure in addition to color. Secondary metadata uses
`#87918e` on raised surfaces and `#818c88` on the canvas; small text and focus rings must be
tested against their actual background at a minimum 4.5:1 contrast target. Do not use
low-contrast gray as a primary control.

## Shape and depth

- Prefer square or near-square geometry: `0–2px` radius for controls and primary surfaces.
- Use borders and dividers to show grouping and system boundaries.
- Use one elevated surface when a user must act, such as the operator account form.
- Avoid the pattern of every section becoming a rounded rectangle with a shadow.
- Avoid glassmorphism, decorative blobs, neon glow, and soft floating-card compositions.
- Keep shadows rare and quiet; depth should not compete with the workflow.

## Components

### Buttons and links

Primary actions are solid oxide controls with a visible edge, readable dark text, a clear hover
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
- Keep the public page information-dense enough to feel operational without becoming a dashboard.
- On mobile, put the account form before supporting explanation so authentication actions remain
  discoverable without a long scroll.
- Avoid horizontal overflow at 320px, 375px, tablet widths, and desktop widths.

## Imagery

The landing page does not require stock photography. The current landing visual is an original
technical release-review schematic: it explains exact-build binding, private evaluation, and the
human approval boundary more clearly than a photograph. Technical schematics and restrained
product projections are preferred when they explain the release boundary more clearly than a photograph.
If photography is introduced later, use believable industrial robotics, controlled facilities,
engineering labs, or autonomous warehouse environments. Avoid generic humanoid robots, cheesy AI
imagery, and visuals that imply physical safety has been proven.

## Motion

Motion should explain state or improve feedback: small hover transitions, focus changes, loading
feedback, and navigation response are appropriate. Keep transitions short and quiet. Do not use
bounce, floating panels, decorative parallax, or animation that suggests a verdict is being made.
Respect `prefers-reduced-motion: reduce`.

## Do

- establish the page purpose with one strong heading;
- make the next action obvious;
- use alignment, borders, dividers, and meaningful surfaces;
- keep exact-build, private-evaluation, and human-approval boundaries explicit;
- preserve semantic HTML, keyboard flow, and visible focus;
- validate the UI at mobile and desktop widths.

## Don't

- build a generic SaaS dashboard;
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
