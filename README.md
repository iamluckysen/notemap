# NoteMap — AI Visual Study Boards & Interactive Note Workspace

**Live Application:** [https://notemap-mauve.vercel.app](https://notemap-mauve.vercel.app)  
**Repository:** [https://github.com/iamluckysen/notemap](https://github.com/iamluckysen/notemap)  
**Built for:** Toggle Wars — The Flagsmith Experimentation Hackathon (WeMakeDevs)

NoteMap converts raw study notes, lecture transcripts, and textbook passages into structured Markdown summaries paired with editable **Excalidraw visual boards** and **Mermaid flowcharts**—backed by live **Flagsmith Experimentation** to test and measure which AI note-generation style drives higher student engagement.

---

## How We Used Flagsmith

Flagsmith is a core architectural component of NoteMap, powering frictionless user bucketing, dynamic prompt experimentation, and conversion tracking without requiring an account sign-up wall.

### 1. The Experiment Hypothesis
When studying dense material, do learners engage more with **concise, high-density takeaways** or **detailed, multi-layered explanations**? Instead of hardcoding a single AI prompt style, NoteMap runs a live multivariate experiment in Flagsmith to measure which format users actively edit and export as study guides.

### 2. Zero-Friction Identity Bucketing (`X-User-Id`)
- On first visit, `notemap-frontend` generates a persistent **Anonymous workspace** UUID stored in `localStorage` and sends it with every API request via the `X-User-Id` header.
- Both the frontend Flagsmith SDK and `notemap-backend` evaluate flags against this identity (`getIdentityFlags(userId)`), ensuring Flagsmith deterministically buckets every visitor into a consistent experiment cohort across sessions and page reloads.

### 3. Dynamic Prompt Switching (`note_generation_style`)
- Before calling the Groq LLM API, Spring Boot evaluates the **`note_generation_style`** multivariate flag for the requesting `X-User-Id`:
  - **`concise` variant:** Instructs the LLM to synthesize tight, scannable bullet points and compact concept nodes optimized for quick revision.
  - **`detailed` variant:** Instructs the LLM to produce deeper explanatory summaries, richer node descriptions, and expanded relationship labels.
- Traffic allocation between variants can be adjusted or rolled out 100% to the winning variant directly from the Flagsmith dashboard with zero code changes or redeployments.

### 4. Conversion Metric Tracking (`note_exported`)
- When a user exports their study summary and Excalidraw diagram as a PDF, NoteMap records the **`note_exported`** conversion event in Flagsmith tied to their workspace identity.
- Flagsmith aggregates exposure counts (`note_generation_style`) against export conversions (`note_exported`) to calculate conversion lift between the `concise` and `detailed` study styles.

### 5. Reproducing the Flagsmith Experiment Setup
To run this experiment in your own Flagsmith project:
1. Create a feature flag named **`note_generation_style`** with **Remote Config** enabled and add two string variations: `concise` (50%) and `detailed` (50%).
2. Enable the **Managed Warehouse** in your Flagsmith environment settings and create an **Occurrence** metric named **`note_exported`**.
3. Create an **Experiment** linking the `note_generation_style` flag to the `note_exported` metric, then copy your **Client-side Environment Key** (frontend) and **Server-side Environment Key** (backend) into your `.env` files.

---

## Key Features

- **Dual Diagram Generation Modes:**
  - **Visual Board:** Generates color-coded concept cards, labeled border-to-border relationships, layout-aware positioning (`mindmap`, `comparison`, `process`, `architecture`), and sticky-note callouts rendered natively on Excalidraw.
  - **Flowchart:** Generates structured Mermaid.js (`flowchart TD`) diagrams automatically converted into editable Excalidraw shapes.
- **Interactive Infinite Canvas:** Drag, recolor, annotate, and rearrange AI-generated nodes on Excalidraw with full scene persistence (`PUT /api/notes/{id}`) and one-click diagram reset.
- **Split-Pane Study Workspace:** Resizable workspace with live Markdown preview, inline editing, and `Ctrl/Cmd + S` save shortcuts.
- **Flagsmith Experimentation Engine:** Evaluates per-user `note_generation_style` variations (`concise` vs. `detailed`) and tracks PDF export conversions (`note_exported`).
- **One-Click PDF Export:** Exports the formatted title, summary bullets, and high-resolution Excalidraw diagram into a downloadable PDF study guide.

---

## System Architecture

```text
React + TypeScript + Excalidraw  (notemap-frontend — Vercel)
        │  POST /api/notes/generate/text  { text, diagramType }  [Header: X-User-Id]
        ▼
Spring Boot + MySQL + GlobalExceptionHandler  (notemap-backend — Railway)
        │  1. Evaluates Flagsmith identity flag: note_generation_style (concise | detailed)
        │  2. Calls Groq LLM API with structured JSON schema enforcement
        │  3. Persists generated note & diagram data to MySQL
        ▼
Excalidraw Scene Builders (visualNoteToExcalidraw / excalidrawScene)
        │  User edits canvas & clicks "Export PDF"
        ▼
Flagsmith Conversion Tracking (tracks "note_exported" per X-User-Id)
```

---

## Repository Structure

```text
notemap/
├─ notemap-backend/     # Java 21 + Spring Boot REST API, MySQL persistence, Groq AI & Flagsmith SDK
├─ notemap-frontend/    # React + TypeScript + Vite + Excalidraw workspace & jsPDF exporter
└─ README.md            # Project overview, Flagsmith experimentation guide & local setup
```

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, `@excalidraw/excalidraw`, `@excalidraw/mermaid-to-excalidraw`, jsPDF, Lucide Icons, Flagsmith JS SDK
- **Backend:** Java 21, Spring Boot, Gradle, Spring Data JPA, MySQL 8, RestClient, `@RestControllerAdvice`
- **AI & Experimentation:** Groq API, Flagsmith Feature Flags & Experimentation
- **Cloud Deployment:** Vercel (Frontend), Railway (Backend + Managed MySQL)

---

## Quick Start (Local Setup)

### 1. Prerequisites

- **Java 21+** and Gradle Wrapper (`gradlew` / `gradlew.bat`)
- **MySQL 8+** running locally
- **Node.js 20.19+ or 22.12+** and npm
- API keys from **Groq** and **Flagsmith**

### 2. Start the Backend (`notemap-backend`)

```bash
cd notemap-backend
cp .env.example .env
```

Fill in your credentials in `notemap-backend/.env`:

```env
DB_URL=jdbc:mysql://localhost:3306/notemap?createDatabaseIfNotExist=true&serverTimezone=UTC
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
GROQ_API_KEY=your_groq_api_key
FLAGSMITH_ENVIRONMENT_KEY=your_flagsmith_server_key
APP_CORS_ALLOWED_ORIGIN=http://localhost:5173
```

Run the Spring Boot server (starts on `http://localhost:8080`):

```bash
./gradlew bootRun
```

*(On Windows PowerShell, use `.\gradlew.bat bootRun`.)*

### 3. Start the Frontend (`notemap-frontend`)

```bash
cd ../notemap-frontend
npm install
```

Create a `notemap-frontend/.env` file with your local backend URL and Flagsmith client key:

```env
VITE_API_BASE_URL=http://localhost:8080/api/notes
VITE_FLAGSMITH_CLIENT_KEY=your_flagsmith_client_key
```

Start the Vite development server:

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Core API Endpoints

All requests require the `X-User-Id` header for anonymous workspace isolation and Flagsmith identity evaluation.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/notes/generate/text` | Generate a note from text (`{ "text": "...", "diagramType": "visual" \| "flowchart" }`). |
| `GET` | `/api/notes/history` | Retrieve all saved notes for the current `X-User-Id` workspace. |
| `GET` | `/api/notes/{id}` | Fetch a single note's summary, diagram source, and Excalidraw scene. |
| `PUT` | `/api/notes/{id}` | Save edited title, Markdown summary, and Excalidraw JSON scene. |
| `DELETE` | `/api/notes/{id}` | Permanently delete a note. |