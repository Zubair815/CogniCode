# CogniCode Design System (`DESIGN.md`)

This document is the single source of truth for CogniCode’s visual language, design tokens, layout geometry, component rules, accessibility standards, and motion principles.

---

## 1. Design Direction

CogniCode is a conversational AI teaching assistant for programming education. Its interface is designed as a calm, high-signal conversational operating environment inspired by ChatGPT’s web experience:

- **Conversation-first:** The active Socratic tutoring session and composer are the primary workspace.
- **Restrained & neutral:** Neutral layered surfaces in both Light and Dark themes; zero decorative purple/blue gradients, zero glassmorphic blur cards, zero glowing neon borders, and zero floating 3D ornaments.
- **Selective accent:** Brand emerald (`#10A37F` / `#0E7C61`) is reserved for primary actions, verified Socratic states, and focus rings.
- **Human-designed hierarchy:** Visual structure comes from typography, whitespace, alignment, and 1px subtle borders rather than heavy drop shadows.

---

## 2. Theme Architecture & Color Tokens

All colors are defined as CSS custom properties in [`frontend/src/index.css`](file:///d:/CogniCode/frontend/src/index.css) and mapped to semantic Tailwind utilities in [`frontend/tailwind.config.js`](file:///d:/CogniCode/frontend/tailwind.config.js).

`ThemeContext` supports `"light"`, `"dark"`, and `"system"` (persisted under `localStorage["cc-theme"]` and resolved before first paint in `frontend/index.html`).

### Light Theme Tokens (`.light`, `:root`)

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--color-canvas` | `#FFFFFF` | Primary conversation & page canvas |
| `--color-sidebar` | `#F9F9F9` | Left navigation & session history rail |
| `--color-surface` | `#F4F4F4` | User message bubble,composer fill, secondary cards |
| `--color-surface-2` | `#ECECEC` | Pressed controls, progress tracks |
| `--color-elevated` | `#FFFFFF` | Focused composer, popovers, modal dialogs |
| `--color-hover` | `rgba(0, 0, 0, 0.05)` | Subtle interactive row hover |
| `--color-active` | `rgba(0, 0, 0, 0.08)` | Quiet active sidebar item |
| `--color-line` | `rgba(0, 0, 0, 0.12)` | Input & composer border |
| `--color-line-subtle` | `rgba(0, 0, 0, 0.07)` | Section dividers & card borders |
| `--color-line-strong` | `rgba(0, 0, 0, 0.22)` | Focused container border |
| `--color-fg` | `#0D0D0D` | Primary body & heading text |
| `--color-fg-secondary` | `#5D5D5D` | Supporting labels & descriptions |
| `--color-fg-muted` | `#737373` | Metadata & timestamps (WCAG AA ≥ 4.7:1) |
| `--color-accent` | `#0E7C61` | Primary brand action fill (WCAG AA with white text) |
| `--color-accent-hover` | `#0B6A53` | Primary brand action hover |
| `--color-accent-fg` | `#0E7C61` | Accent text & inline links |
| `--color-primary` | `#0D0D0D` | High-contrast neutral action (e.g., composer send button) |
| `--color-code-bg` | `#F7F7F8` | Fenced code block surface |
| `--color-code-header` | `#ECECEC` | Code block language & copy bar |
| `--color-success` | `#0E7C61` | Low CDS band / verified attempt |
| `--color-warning` | `#9A6200` | Moderate CDS band / caution |
| `--color-danger` | `#C62828` | High CDS band / destructive action / form error |

### Dark Theme Tokens (`.dark`)

Dark mode uses a layered neutral elevation system (`sidebar #171717` → `canvas #212121` → `surface #2F2F2F` → `elevated #303030`):

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--color-canvas` | `#212121` | Primary conversation & page canvas |
| `--color-sidebar` | `#171717` | Left navigation & session history rail |
| `--color-surface` | `#2F2F2F` | User message bubble, composer fill, secondary cards |
| `--color-surface-2` | `#3A3A3A` | Pressed controls, progress tracks |
| `--color-elevated` | `#303030` | Focused composer, popovers, modal dialogs |
| `--color-hover` | `rgba(255, 255, 255, 0.07)` | Subtle interactive row hover |
| `--color-active` | `rgba(255, 255, 255, 0.11)` | Quiet active sidebar item |
| `--color-line` | `rgba(255, 255, 255, 0.12)` | Input & composer border |
| `--color-line-subtle` | `rgba(255, 255, 255, 0.07)` | Section dividers & card borders |
| `--color-line-strong` | `rgba(255, 255, 255, 0.22)` | Focused container border |
| `--color-fg` | `#ECECEC` | Primary body & heading text |
| `--color-fg-secondary` | `#B4B4B4` | Supporting labels & descriptions |
| `--color-fg-muted` | `#9B9B9B` | Metadata & timestamps (WCAG AA ≥ 4.8:1) |
| `--color-accent` | `#0E7C61` | Primary brand action fill |
| `--color-accent-hover` | `#11906F` | Primary brand action hover |
| `--color-accent-fg` | `#3CCB9F` | Accent text & inline links on dark surfaces |
| `--color-primary` | `#ECECEC` | High-contrast neutral action (composer send button) |
| `--color-code-bg` | `#171717` | Fenced code block surface |
| `--color-code-header` | `#2A2A2A` | Code block language & copy bar |
| `--color-success` | `#3CCB9F` | Low CDS band / verified attempt |
| `--color-warning` | `#E5B567` | Moderate CDS band / caution |
| `--color-danger` | `#F28B82` | High CDS band / destructive action / form error |

---

## 3. Typography

- **Sans-serif stack (`--font-sans`):** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Monospace stack (`--font-mono`):** `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`

### Type Scale

| Role | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- |
| Landing hero headline | `30px–48px` | `600` (`font-semibold`) | `1.15` |
| Page heading (`h1`) | `24px` (`text-2xl`) | `600` (`font-semibold`) | `1.3` |
| Section heading (`h2`) | `15px–18px` | `600` (`font-semibold`) | `1.4` |
| Chat message prose (`.prose-chat`) | `16px` | `400` / `600` | `1.65` |
| Standard UI control / label | `14px–15px` | `400` / `500` | `1.5` |
| Secondary / helper copy | `13px–14px` | `400` | `1.5` |
| Metadata / badges / table headers | `11px–12px` | `500` | `1.35` |

Avoid `font-black` (`900`) and `font-extrabold` (`800`). Use `font-semibold` (`600`) and `font-medium` (`500`) for hierarchy.

---

## 4. Spacing & Layout Geometry

- **Systematic spacing scale:** `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `64px`.
- **Application shell (`AppLayout`):**
  - **Left Sidebar (`--sidebar-width: 260px`):** Fixed width on desktop (collapsible), slide-over drawer (`max-w-[82vw]`) on mobile. Contains brand header, `New session` trigger, workspace navigation, scrollable `Recent sessions` list, CDS summary badge, and account popover menu.
  - **Top Header (`--header-height: 52px`):** Compact context bar for mobile navigation, collapsed-sidebar trigger, and active chat session metadata.
  - **Conversation Column (`--content-width: 768px`):** Centered reading and composing column (`max-w-content mx-auto`) so prose never stretches across wide monitors.
  - **Secondary Content Pages:** Centered `max-w-4xl` container with `24px–32px` padding.

---

## 5. Border Radius & Elevation

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--radius-sm` | `6px` | Badges, inline code, kbd tags |
| `--radius-md` | `8px` | Sidebar links, menu items, small icon buttons |
| `--radius-lg` | `10px` | Buttons, text inputs, textareas |
| `--radius-xl` | `12px` | Cards, panels, code blocks |
| `--radius-2xl` | `16px` | User chat bubbles, modal dialogs |
| `--radius-3xl` | `20px` | Bottom chat composer |

Shadows are restricted to floating or elevated elements:
- `--shadow-composer`: Subtle depth on the bottom chat composer
- `--shadow-popover`: Account & context menus
- `--shadow-dialog`: Modal dialogs

---

## 6. Component Principles

1. **`Button` & `IconButton`:** Sentence case labels (`Start chat`, `Create course`, `End session`). Variants: `primary` (accent), `neutral` (high-contrast foreground), `secondary` (bordered), `ghost`, and `danger`. Icon-only buttons require a `label` prop for `aria-label` and `title`.
2. **`Input`, `Textarea`, `SegmentedControl`:** Explicit visible `<label>`, keyboard accessible focus rings, `aria-invalid` and `aria-describedby` wired to inline error messages.
3. **`MessageBubble` & `CodeBlock`:**
   - User turns render right-aligned in a subtle neutral surface (`bg-surface rounded-2xl px-4 py-2.5`).
   - Assistant turns render full-width inside the 768px column with a 26px CogniCode mark, structured `.prose-chat` typography, and layered `bg-code` fenced code blocks with language header and copy action.
4. **`ChatInput` (Composer):** Auto-expanding textarea inside a `rounded-3xl` surface with quick Socratic pills (`Code attempt`, `Request hint`) and an icon-only circular `ArrowUp` submit button.
5. **`Modal` & `Menu`:** Focus-trapped dialogs (`Escape` to close, focus restored to trigger on exit) and arrow-key navigable popover menus.
6. **`Alert` & `EmptyState`:** Clear, actionable inline feedback (`role="alert"` for errors) without browser `alert()` / `confirm()` popups.

---

## 7. Responsive & Accessibility Rules

- **Breakpoints tested:** `375px`, `390px`, `430px`, `768px`, `1024px`, `1280px`, `1440px`, `1920px`.
- **WCAG 2.2 AA:**
  - All text tokens meet ≥ 4.5:1 contrast against their paired surfaces in both light and dark themes.
  - Visible `:focus-visible` outline (`2px solid var(--color-focus)`) across all interactive elements.
  - State is never communicated by color alone (connection status, CDS risk bands, and quiz outcomes pair color with explicit text labels and icons).
  - Full `prefers-reduced-motion: reduce` support disabling non-essential transitions and keyframe animations.
