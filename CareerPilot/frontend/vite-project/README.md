# CareerPilot frontend

React 19 + Vite. See the project root `README.md` for setup, Codespaces and phone testing.

* `npm install` then `npm run dev` (port 5173). `/api` requests are proxied to the backend (see `vite.config.js`).
* `npm run build` / `npm run lint`
* `src/api.js` is the only place that knows endpoint URLs; `src/styles.css` is the whole design system.
