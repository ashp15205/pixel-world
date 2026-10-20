# Testing checklist

- [ ] Demo world loads without a Context.dev key.
- [ ] WASD and arrow keys move the player; camera follows.
- [ ] Clicking a building selects it; `E` selects the nearest building.
- [ ] Search filters pages; selecting a result focuses the world view.
- [ ] Exported JSON imports back into the app.
- [ ] Invalid URL and missing key produce readable errors.
- [ ] Map response is deduplicated, capped, and same-origin filtered.
- [ ] Individual scrape failures do not stop the remaining pages.
- [ ] Key is not saved to local/session storage and does not appear in application logs.
- [ ] Mobile layout is usable; game movement is keyboard-first in this MVP.
