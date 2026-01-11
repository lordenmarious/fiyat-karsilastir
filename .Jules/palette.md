## 2024-05-23 - Accessibility First Steps
**Learning:** Native `confirm()` dialogs are accessible but disruptive; custom accessible modals are preferred but expensive to build. Starting with robust focus states and ARIA labels provides immediate value.
**Action:** When working on extensions without a UI library, prioritize keyboard navigation and screen reader attributes as "low hanging fruit" for UX.

## 2024-05-24 - Hover-Only Controls Trap
**Learning:** Hiding controls (like delete buttons) with `opacity: 0` until hover creates a "keyboard trap" where users focus on invisible elements.
**Action:** Always add a `:focus-visible` rule that restores opacity/visibility when an element receives keyboard focus, ensuring keyboard users can see what they are interacting with.
