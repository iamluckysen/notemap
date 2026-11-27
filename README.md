# NoteMap — AI Visual Study Boards & Interactive Note Workspace

NoteMap converts raw study notes, lecture transcripts, and textbook passages into structured Markdown summaries paired with editable **Excalidraw visual boards** and **Mermaid flowcharts**.

---

## Features

- **Dual Diagram Generation Modes:**
  - **Visual Board:** Generates color-coded concept cards, labeled border-to-border relationships, layout-aware positioning (`mindmap`, `comparison`, `process`, `architecture`), and sticky-note callouts rendered natively on Excalidraw.
  - **Flowchart:** Generates structured Mermaid.js (`flowchart TD`) diagrams automatically converted into editable Excalidraw shapes.
- **Interactive Infinite Canvas:** Drag, recolor, annotate, and rearrange AI-generated nodes on Excalidraw with full scene persistence (`PUT /api/notes/{id}`) and one-click diagram reset.
- **Split-Pane Study Workspace:** Resizable workspace with live Markdown preview, inline editing, and `Ctrl/Cmd + S` save shortcuts.
- **Feature Flag Experimentation (Flagsmith):** Dynamically switches between `concise` and `detailed` generation styles per user (`note_generation_style`) and tracks PDF export conversions (`note_exported`).
- **One-Click PDF Export:** Exports the formatted title, summary bullets, and high-resolution Excalidraw diagram into a downloadable PDF.

---

## Architecture

```text
React + TypeScript + Excalidraw  (notemap-frontend)
        │  POST /api/notes/generate/text  { text, diagramType }
        ▼
Spring Boot + MySQL + GlobalExceptionHandler  (notemap-backend)
        │  Evaluates Flagsmith flag: note_generation_style
        ▼
Groq LLM API (Structured JSON Schema Enforcement)
        │  Returns { title, summary, visualDiagram | mermaidCode }
        ▼
Excalidraw Scene Builders (visualNoteToExcalidraw / excalidrawScene)
```

---

## Repository Structure

```text
notemap/
├─ notemap-backend/     # Java Spring Boot REST API, MySQL persistence, Groq AI & Flagsmith integration
├─ notemap-frontend/    # React + TypeScript + Excalidraw workspace & PDF exporter
└─ README.md            # Project overview and full-stack setup guide
```

---

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, `@excalidraw/excalidraw`, `@excalidraw/mermaid-to-excalidraw`, jsPDF, Lucide Icons
- **Backend:** Java, Spring Boot, Spring Data JPA, MySQL, RestClient, `@RestControllerAdvice`
- **AI & Feature Management:** Groq API, Flagsmith

---

## Quick Start

### 1. Prerequisites

- **Java 17+** and Maven Wrapper (`mvnw` / `mvnw.cmd`)
- **MySQL 8+** running locally
- **Node.js 20.19+ or 22.12+** and npm

### 2. Start the Backend (`notemap-backend`)

```bash
cd notemap-backend
cp .env.example .env
```

Fill in your credentials in `notemap-backend/.env`:

```env
DB_URL=jdbc:mysql://localhost:3306/notemap
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
GROQ_API_KEY=your_groq_api_key
FLAGSMITH_ENVIRONMENT_KEY=your_flagsmith_server_key
```

Run the Spring Boot server (starts on `http://localhost:8080`):

```bash
./mvnw spring-boot:run
```

*(On Windows PowerShell, use `.\mvnw.cmd spring-boot:run`.)*

### 3. Start the Frontend (`notemap-frontend`)

```bash
cd ../notemap-frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> For detailed frontend scripts, mock API mode, environment variables, and troubleshooting, see [`notemap-frontend/README.md`](./notemap-frontend/README.md).

---

## Core API Endpoints

All requests require the `X-User-Id` header for workspace isolation.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/notes/generate/text` | Generate a note from text (`{ "text": "...", "diagramType": "visual" \| "flowchart" }`). |
| `GET` | `/api/notes/history` | Retrieve all saved notes for the current user. |
| `GET` | `/api/notes/{id}` | Fetch a single note's summary, diagram source, and Excalidraw scene. |
| `PUT` | `/api/notes/{id}` | Save edited title, Markdown summary, and Excalidraw JSON scene. |
| `DELETE` | `/api/notes/{id}` | Permanently delete a note. |