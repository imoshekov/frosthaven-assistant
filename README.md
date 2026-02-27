# frosthaven-assistant
A companion web application for the Frosthaven board game. It consists of an Angular‑based front end (the “website”) and a small WebSocket backend (the “server”) used for real‑time session sharing.

> Live demo: https://imoshekov.github.io/frosthaven-assistant/

---

## 🚀 Getting Started
These instructions will help you and any new contributors run, debug and build the project locally.

### 🔧 Prerequisites
- **Node.js**: v20.19.0 or newer (see `server/package.json` engines).
- **npm**: bundled with Node.
- **Angular CLI** (optional): `npm install -g @angular/cli` – you can also run via `npx`.
- **http-server** (optional): a simple static server used during debugging (`npm install -g http-server`).

### 📥 Clone the repository
```bash
git clone https://github.com/imoshekov/frosthaven-assistant.git
cd frosthaven-assistant
```

---

## 🖥️ Server (WebSocket backend)
The server is a lightweight Node.js app that keeps session state in memory and broadcasts updates to connected clients.

### Setup
```bash
cd server
npm install    # install dependencies (ws)
```

### Running locally
```bash
# start on default port 8080
npm start

# or specify a port
PORT=3000 npm start
```

You can verify the server is up by visiting `http://localhost:8080/ping`.

### Debugging
- Run with the Node inspector:
  ```bash
  node --inspect src/server.js
  ```
- Add logging in `server/src/server.js` as needed; the code is intentionally short and easy to follow.

### Notes
- The `app` folder contains an outdated `server` script in its own `package.json`; ignore it. Always use the `/server` directory.
- Sessions expire after eight hours; the server automatically cleans up idle data.

---

## 🌐 Client (Angular website)
The front end lives under the `app/` directory and is a standard Angular project with Playwright tests.

### Setup
```bash
cd app
git checkout main   # make sure you're on the right branch
npm install
```

### Development server
```bash
npm start        # runs `ng serve` at http://localhost:4200
```
Open your browser to `http://localhost:4200/frosthaven-assistant` (the base href is configured).

To serve from a different host/port use `npm run serve`.

### Building for production
```bash
npm run build          # output in dist/app
npm run build:tv       # builds and transpiles for older TVs/browsers
```

### Watch mode
Generate incremental builds during development:
```bash
npm run watch
```

### Running tests
The repository uses Playwright for end‑to‑end tests.
```bash
npm test               # equivalent to `npx playwright test`
```
Tests live in `app/tests/*.spec.ts` and use fixtures under `app/tests/fixtures`.

### Debugging the website
- Use Chrome/Edge/Vivaldi devtools to inspect components and network traffic.
- The app logs to the console; you can add breakpoints in TypeScript via source maps (the dev server provides them).
- Playwright tests can be run in headed mode or debug using `npx playwright test --debug`.

---

## 🧩 Common workflows
| **Action**                | **Command / Location**                            |
|---------------------------|---------------------------------------------------|
| Start the server locally  | `cd server && npm start`                         |
| Launch the web app        | `cd app && npm start`                            |
| Run UI tests              | `cd app && npm test`                             |
| Serve built files         | `npx http-server dist/app` (from project root)   |
| Inspect backend logs      | logs appear on the console where the server runs |

---

## 📝 Additional notes
- The site targets the `/frosthaven-assistant` base path; adjust command lines or Angular configuration if you serve it from a different URL.
- When pairing frontend and backend locally, run the server first and configure the client to connect to `ws://localhost:8080` (the default used by the app when running locally).
- Feel free to reach out if you have questions – happy to onboard new contributors!

---

*(This README was expanded on February 27, 2026 to assist new developers in getting started.)*