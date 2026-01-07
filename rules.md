# Akakçe Hover Project Rules

## 🚨 IMPORTANT: Read This First!

Before starting ANY work on this project, always follow this workflow:

1. **Read `rules.md`** (this file) first
2. **Read `Important Tasks/check-before-next-step.md`** for blockers or prerequisites
3. **Read `Important Tasks/planned-tasks.md`** to understand what to work on
4. **After completing work**, update the task files (NOT rules.md):
   - Move completed items from `planned-tasks.md` → `done-tasks.md`
   - Update `check-before-next-step.md` with any new blockers

---

## Project Overview

**Akakçe Hover Price** is a Firefox browser extension that shows price comparisons from Akakçe.com on Turkish e-commerce sites.

### Supported Sites
- Amazon.com.tr
- Trendyol.com
- Hepsiburada.com

### Architecture
- **Popup Window Mode**: Opens Akakçe in a popup (bypasses bot detection)
- NO direct scraping (bot protection blocks it)
- Settings stored in `browser.storage.sync`

---

## Technical Constraints

| Constraint | Reason |
|------------|--------|
| No direct fetch to Akakçe | Bot detection blocks it |
| Must use explicit addon ID | Firefox storage requires it |
| Remove & re-add extension after manifest changes | Firefox caches manifests |

---

## File Structure

```
├── manifest.json      # Extension config (v2.2)
├── content.js         # Runs on e-commerce sites
├── background.js      # Keyboard shortcut handler
├── popup.html/js      # Settings popup in toolbar
├── styles.css         # Button/tooltip styling
├── utils.js           # cleanProductTitle, debounce
├── Important Tasks/   # Task tracking
│   ├── check-before-next-step.md
│   ├── planned-tasks.md
│   └── done-tasks.md
```

---

## Version History

| Version | Features |
|---------|----------|
| 2.0 | Popup window mode (bypass bot) |
| 2.1 | Multi-site, keyboard shortcut |
| 2.2 | Settings popup with color picker |
