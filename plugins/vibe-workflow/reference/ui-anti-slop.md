# UI anti-slop checklist

"AI slop" = the default look a model produces when nobody decides: the same fonts, gradients, cards and copy on every product.
Read this in stage 4 (references), 5 (DESIGN.md), 8 (styled key screens), 10 (prototype design check) and 12 (hardening), and before any UI fix.

**Rule:** a pattern below is allowed only when `DESIGN.md` lists it under `Deliberate exceptions` with a reason tied to this product. Otherwise replace it with the alternative.
Taste comes from the product's own domain (its users, content, materials), not from what looks "modern".

## Typography

| Slop | Instead |
| --- | --- |
| Inter / Roboto / Geist / Plus Jakarta / Space Grotesk as the whole personality, picked by default | A face chosen for this product's tone; the default is fine for body text only if a deliberate display face carries the personality |
| More than two typefaces | One family, two at most |
| Reflex hero type (`text-5xl font-bold tracking-tight`), headlines wrapping to 3+ lines | Shorter headline, wider measure, then size |
| Tiny uppercase letter-spaced labels, eyebrow text above every heading | Sentence case at a readable size; put the information in the heading |
| One styled accent word in a headline (italic, serif, gradient, colour) | One face, one colour |
| Gray body text (`text-gray-400`, `text-slate-400`), gray text on coloured backgrounds | Body text at full contrast (≥ 4.5:1); tint text toward the background hue |
| Monospace outside code | The text face, tabular figures for numbers |

## Color

| Slop | Instead |
| --- | --- |
| Blue→purple / indigo / pink / cyan gradients, gradient text (`bg-clip-text`) | Flat colour from the product's palette |
| Violet or indigo primary by default; cream + terracotta "tasteful" default | A palette drawn from the domain (brand, content, materials) |
| Pure `#000` / neutral gray everywhere | Neutrals tinted toward the primary hue |
| Neon orbs, aurora meshes, bokeh blobs | Nothing, or real content |

## Layout and composition

| Slop | Instead |
| --- | --- |
| Centered hero + two CTAs + three feature cards | A first screen that shows the product doing its job |
| Rows of identical cards (3 or 6), bento grids with arbitrary spans | Vary by content importance; lists or tables when items are comparable |
| A card around every object; cards inside cards | Group with space and a tone step; one container level |
| Default dashboard shell (sidebar + stat tiles + chart) when the product is not a dashboard | Layout from the core task path in the flow |
| Index numbering as decoration (01 / 02 / 03, "Step 2") | Position and size, or a real ordered list when order matters |
| Uneven outer margins, cramped padding, huddled sections | One margin rule and one section-gap rule from DESIGN.md spacing tokens |

## Components and icons

| Slop | Instead |
| --- | --- |
| A rounded-square icon tile above every heading or card | Icons only where they help recognition |
| Generic icons: Sparkles, Zap, Rocket, Shield, Star, CheckCircle, TrendingUp | An icon that means the specific action, or a text label |
| Emoji as icons or decoration | Real icons or none |
| Pill badges and "New ·" chips everywhere | Badges only for real status |
| The "soft" 12–16px radius on everything | One corner decision in DESIGN.md (sharp, small, or fully round), applied consistently |
| Hover lift / scale on every card | Hover feedback only on things that are clickable |

## Effects

| Slop | Instead |
| --- | --- |
| Glassmorphism, `backdrop-blur` panels, floating pill nav | A plain surface or bar |
| Resting shadows and glows on flat content (`shadow-2xl`) | A tone step; shadows only on things that float (menus, dialogs) |
| Hairlines and 1px boxes around everything | Space and tone instead of lines |

## Motion

| Slop | Instead |
| --- | --- |
| Fade-in on every section | Motion that explains a state change (open, add, remove, move) |
| Bounce, wiggle, pulse, shimmer with no meaning | DESIGN.md motion tokens, ease-out, short |
| Global `transition-all` | Transition only the changed property |
| No `prefers-reduced-motion` handling | Reduced-motion fallback for every animation |

## Copy and imagery

| Slop | Instead |
| --- | --- |
| "Unlock", "empower", "seamless", "revolutionize", "all-in-one platform", "elevate" | Say what the product does, in the user's words |
| Fake numbers ("10K+ users", "99.9% uptime"), placeholder testimonials | Real data or nothing |
| Vague CTAs ("Get started", "Learn more") everywhere | The action itself ("Create invoice") |
| Abstract stock illustration, fake grey-bar dashboards and charts | A real screenshot, real content, or nothing |
| Dark patterns: fake scarcity, confirmshaming, hidden cancel | Honest choices |

## Accessibility tells

- `outline-none` / `focus:outline-none` without a visible focus style
- Icon-only buttons without an accessible name; inputs without labels
- Status shown by colour only; tap targets under 44px

## Detection (hardening, stage 12)

Search the UI source; every hit is fixed or listed as a deliberate exception.

```
rg -n "from-(blue|indigo|purple|violet|pink|cyan)|to-(purple|violet|pink|indigo)|bg-clip-text|text-transparent"
rg -n "backdrop-blur|bg-white/(5|10|20)|shadow-(xl|2xl)|drop-shadow"
rg -n "rounded-(2xl|3xl)|hover:(scale|-translate-y)|transition-all|animate-(bounce|pulse)"
rg -n "outline-none|text-(gray|slate|zinc)-(300|400)"
rg -n "#[0-9a-fA-F]{3,8}\b|\[(#|[0-9]+px)" --glob "!**/tokens*" --glob "!DESIGN.md"
rg -n -i "unlock|empower|seamless|revolutioni|all-in-one|elevate|10k\+|99\.9%"
rg -n "Sparkles|Zap|Rocket|Shield|TrendingUp"
```

Adapt to the stack (plain CSS: `linear-gradient`, `backdrop-filter`, `box-shadow`, `transition: all`).

## Sources

Distilled and paraphrased from, with thanks:
[pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0),
[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT),
[Eid0lon/zero-slop](https://github.com/Eid0lon/zero-slop) (Apache-2.0).
For deeper audits those projects ship their own detectors (`npx impeccable detect`, taste-skill `scripts/inspect.mjs`).
