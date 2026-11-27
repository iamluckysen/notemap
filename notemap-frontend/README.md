# NoteMap Frontend

NoteMap turns raw study material into a **Markdown summary** and an **editable, colorful Excalidraw diagram**. Notes are saved to the NoteMap REST API and can be exported as a PDF.

This is the Vite + React + TypeScript frontend for the NoteMap backend.

---

## Quick start

### 1. Prerequisites

- **Node.js 20.19+ or 22.12+** (Node 24 is fine) and npm
- The NoteMap backend running at **`http://localhost:8080`**
  - Backend repository/process: `notemap-backend` (Spring Boot)
  - If you do not have it running, use the built-in mock API described below.

### 2. Configure the backend environment

The backend reads `notemap-backend/.env`, which is ignored by Git. Copy the example file and fill in your own values:

```bash
cd ../notemap-backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Required variables:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
GROQ_API_KEY
FLAGSMITH_ENVIRONMENT_KEY
```

Never commit the real `.env` file.

### 3. Install dependencies

```bash
cd ../notemap-frontend
npm install
```

### 4. Start the frontend

```bash
npm run dev
```

Open **http://localhost:5173**.

> **Important:** open the app at `localhost`, not `127.0.0.1`. The included Spring Boot backend only allows the origin `http://localhost:5173` by default. If you use `127.0.0.1`, the browser blocks API calls with a CORS error.

### 5. Optional: run without the real backend

A small in-memory mock API is included. It implements the same five endpoints and generates sample Mermaid diagrams.

Stop anything already using port `8080`, then run:

```bash
# terminal 1 — mock API on http://localhost:8080
npm run mock

# terminal 2 — frontend
npm run dev
```

Mock data lives only in memory and is lost when the mock server stops.

---

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server (default `http://localhost:5173`). |
| `npm run build` | Type-checks with `tsc -b` and builds production assets into `dist/`. |
| `npm run preview` | Serves the built `dist/` locally for a production-style check. |
| `npm run typecheck` | Runs TypeScript only, without bundling. |
| `npm run mock` | Starts the local mock NoteMap API on port `8080`. |

---

## API configuration

The API client is in `src/api/notesApi.ts` and defaults to:

```text
http://localhost:8080/api/notes
```

Create a `.env` file in `notemap-frontend/` (ignored by Git; a template is available at `.env.example`):

```bash
VITE_API_BASE_URL=https://your-api.example.com/api/notes
VITE_FLAGSMITH_CLIENT_KEY=your_client_side_key
```

Use these values in code through `import.meta.env`:

```ts
const flagsmithKey = import.meta.env.VITE_FLAGSMITH_CLIENT_KEY;
```

Only variables prefixed with `VITE_` are exposed to the browser, so never put server secrets in a `VITE_` variable. Restart `npm run dev` after changing `.env`.

The client sends an anonymous `X-User-Id` header on **every** request. The ID is created with `crypto.randomUUID()` and stored in `localStorage` under `notemap_user_id`.

### Flagsmith experimentation

`src/lib/flagsmith.ts` initialises Flagsmith once at startup with `enableEvents: true`, then identifies the user with the same anonymous ID sent as `X-User-Id`.

- After a note is generated, the app reads the `note_generation_style` flag and records the experiment exposure.
- A successful PDF export tracks the `note_exported` conversion event.

Set the client-side key in `notemap-frontend/.env`:

```bash
VITE_FLAGSMITH_CLIENT_KEY=your_client_side_key
```

### Endpoints used

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/generate/text` | Generate a note from pasted text. Body: `{ "text": "..." }`. |
| `GET` | `/history` | List the current user's notes. |
| `GET` | `/{id}` | Load a single note. |
| `PUT` | `/{id}` | Save title, summary, Mermaid source, and Excalidraw scene. |
| `DELETE` | `/{id}` | Delete a note. |

Backend errors are expected in this shape:

```json
{
  "timestamp": "2026-11-26T13:32:25.033Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Text must not be blank."
}
```

The client shows the `message` in a toast notification.

### CORS

The backend must allow the frontend origin and the `X-User-Id` header. For local development that is:

```properties
app.cors.allowed-origin=http://localhost:5173
```

If you serve the frontend from another port or host, update the backend CORS setting or add a matching Vite proxy. The mock server already allows all origins.

---

## How to use NoteMap

1. **Create a note**
   - Choose **Paste Text**.
   - Paste a lecture transcript, article, or textbook passage (up to **12,000 characters**).
   - Or click one of the sample chips: *TCP 3-Way Handshake*, *Photosynthesis*, *React Rendering*.
   - Click **Generate Visual Note** (or press `Ctrl+Enter`).

2. **Read and edit the summary**
   - The left/top pane shows the AI summary rendered as Markdown.
   - Switch between **Preview** and **Edit** to change the Markdown.
   - Edit the note title directly in the header.

3. **Edit the diagram**
   - The Excalidraw canvas is fully editable: move shapes, change colors, add text or arrows.
   - **Reset diagram** rebuilds the original AI diagram (with a confirmation).
   - **Fit** zooms the canvas to fit all shapes.

4. **Save**
   - Click **Save Changes** or press `Ctrl+S`.
   - The header shows **Unsaved changes** until the save succeeds.

5. **Export PDF**
   - Click **Export PDF**.
   - The PDF contains the title, summary bullets, and a high-resolution image of the diagram.
   - The file is named from the note title, for example `tcp-handshake-edited.pdf`.

6. **History and deletion**
   - Notes appear in the sidebar with their source badge and date.
   - Click a note to reopen it.
   - Use the delete control on a history item and confirm to remove it.
   - On small screens, use the menu button to open the note library.

---

## Project structure

```text
notemap-frotnend/
├─ public/
│  └─ favicon.svg
├─ scripts/
│  └─ mock-backend.mjs        # Optional in-memory API for local testing
├─ src/
│  ├─ api/
│  │  └─ notesApi.ts          # All REST calls, X-User-Id, error handling
│  ├─ components/
│  │  ├─ new-note/            # Paste-text form, tabs, samples
│  │  ├─ ui/                  # Toasts, dialogs, badges, brand mark
│  │  └─ workspace/           # Note workspace, summary pane, Excalidraw board
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ excalidrawScene.ts   # Mermaid → Excalidraw + pastel palette
│  │  ├─ markdown.ts          # Markdown helpers
│  │  ├─ pdf.ts               # PNG capture + jsPDF layout
│  │  ├─ userId.ts            # Anonymous localStorage identity
│  │  └─ utils.ts
│  ├─ types/
│  │  └─ note.ts              # API/domain types
│  ├─ App.tsx                 # App state and data orchestration
│  ├─ index.css               # Tailwind theme, Markdown, Excalidraw overrides
│  └─ main.tsx
├─ index.html
├─ vite.config.ts
├─ tsconfig*.json
└─ package.json
```

---

## Build for production

```bash
npm run build
npm run preview
```

The production files are written to `dist/`. Deploy that folder to any static host.

If the API is on a different origin in production, set `VITE_API_BASE_URL` **before** running `npm run build`, and add the deployed frontend origin to the backend CORS configuration.

---

## Troubleshooting

### “Could not reach the NoteMap API” / CORS error

- Make sure the backend is running on `http://localhost:8080`.
- Open the frontend at `http://localhost:5173` (not `127.0.0.1`).
- Confirm the backend allows the origin and the `X-User-Id` header.
- If port `8080` is already used by another process, stop it before running `npm run mock`.

### `502 Bad Gateway` or blank page

The Vite dev server is not running. Start it with `npm run dev` and reload.

### The diagram is empty or fails to build

- The backend must return `mermaidCode` for the note.
- Try **Reset diagram** to rebuild from the stored Mermaid source.
- Check the browser console for Mermaid parsing errors.

### PDF does not download

- Browsers may block automatic downloads until you allow them for `localhost`.
- Wait until the canvas shows **Visual note ready** before exporting.

### Notes disappeared

Notes are tied to the anonymous ID in `localStorage`. Clearing site data or using a different browser/private window creates a new workspace and hides the old notes. The data still exists on the server under the previous `notemap_user_id`.
