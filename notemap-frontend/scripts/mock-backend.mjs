import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8080);
const notes = [];
let nextId = 1;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
  "Access-Control-Max-Age": "86400",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendNoContent(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function sendError(res, status, error, message) {
  sendJson(res, status, {
    timestamp: new Date().toISOString(),
    status,
    error,
    message,
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function getUserId(req, res) {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || !userId.trim()) {
    sendError(res, 400, "Bad Request", "Missing X-User-Id header.");
    return null;
  }
  return userId.trim();
}

function findNote(req, res, id) {
  const userId = getUserId(req, res);
  if (!userId) {
    return null;
  }

  const note = notes.find((item) => item.id === id && item.userId === userId);
  if (!note) {
    sendError(res, 404, "Not Found", "Note not found.");
    return null;
  }
  return note;
}

function publicNote(note) {
  return {
    id: note.id,
    sourceType: note.sourceType,
    title: note.title,
    summary: note.summary,
    mermaidCode: note.mermaidCode,
    excalidrawJson: note.excalidrawJson,
    createdAt: note.createdAt,
  };
}

function buildGeneratedNote(text) {
  const lower = text.toLowerCase();

  if (lower.includes("photosynthesis") || lower.includes("calvin")) {
    return {
      title: "Photosynthesis",
      summary: `## Photosynthesis

Photosynthesis converts light energy into chemical energy stored as glucose.

### Two stages
- **Light-dependent reactions** happen in the thylakoid membranes: water is split, oxygen is released, and ATP and NADPH are produced.
- **The Calvin cycle** happens in the stroma and uses ATP and NADPH to fix carbon dioxide into sugar.

### Key inputs and outputs
- Inputs: carbon dioxide, water, and light energy.
- Outputs: glucose and oxygen.
- Limiting factors: light intensity, CO₂ concentration, and temperature.

### Exam takeaway
The two stages are interdependent: the light reactions supply ATP and NADPH, while the Calvin cycle regenerates ADP and NADP⁺ for the light reactions.`,
      mermaidCode: `flowchart LR
  A["Sunlight"] --> B["Light reactions (thylakoid)"]
  B --> C["ATP + NADPH"]
  C --> D["Calvin cycle (stroma)"]
  F["CO2"] --> D
  G["H2O"] --> B
  B --> H["O2 released"]
  D --> E["Glucose"]`,
    };
  }

  if (lower.includes("react") || lower.includes("render")) {
    return {
      title: "React Rendering Pipeline",
      summary: `## React rendering pipeline

React turns component code into pixels through a predictable render-and-commit flow.

### Render phase
- Triggered by a state change, a parent render, or a context update.
- React calls component functions and builds a new element tree.
- Render code must stay pure — no side effects or external mutations.

### Commit phase
- React reconciles the new tree against the previous one.
- Only the necessary DOM mutations are applied.
- Layout effects and passive effects run after the DOM is updated.

### Performance checklist
- Keep state local to the components that need it.
- Use stable keys when rendering lists.
- Memoise expensive values with \`useMemo\` and stable callbacks with \`useCallback\`.
- Split large bundles with \`lazy\` and \`Suspense\`.`,
      mermaidCode: `flowchart TD
  A["State or props change"] --> B["Render phase"]
  B --> C["Build new element tree"]
  C --> D["Reconciliation (diff)"]
  D --> E["Commit phase"]
  E --> F["DOM mutations + effects"]
  F --> G["Browser paints"]`,
    };
  }

  if (
    lower.includes("tcp") ||
    lower.includes("handshake") ||
    lower.includes("syn")
  ) {
    return {
      title: "TCP 3-Way Handshake",
      summary: `## TCP 3-way handshake

The three-way handshake opens a reliable TCP connection before data is sent.

### The three steps
1. **SYN** — the client picks an initial sequence number and asks to connect.
2. **SYN-ACK** — the server acknowledges the client and sends its own sequence number.
3. **ACK** — the client acknowledges the server. Both sides are now synchronised.

### Why it matters
- Confirms both endpoints are reachable and ready.
- Prevents stale duplicate connection requests from opening a connection.
- Establishes the sequence numbers used for reliable, ordered delivery.

### After the handshake
TCP uses acknowledgements, retransmission timers, and flow control. Connections close with a separate four-way FIN/ACK exchange.`,
      mermaidCode: `flowchart TD
  A["Client"] -->|"1. SYN"| B["Server"]
  B -->|"2. SYN-ACK"| A
  A -->|"3. ACK"| B
  B --> C["Connection established"]
  C --> D["Reliable data transfer"]
  D --> E["Four-way FIN close"]`,
    };
  }

  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const fallbackTitle =
    firstLine && firstLine.length <= 70
      ? firstLine.replace(/[#*_`]/g, "").slice(0, 70)
      : "Visual Study Note";

  return {
    title: fallbackTitle || "Visual Study Note",
    summary: `## Key ideas

The material has been condensed into the most useful study points.

### What to remember
- Identify the central concept and the problem it solves.
- Break the process into ordered stages or causes and effects.
- Connect each stage to a concrete example or definition.
- Review the relationships in the diagram before revisiting the source.

### Quick review
Use the diagram to explain the topic aloud from memory, then check the original material for any gaps.`,
    mermaidCode: `flowchart TD
  A["Raw study material"] --> B["Key ideas"]
  B --> C["Structured summary"]
  B --> D["Visual map"]
  D --> E["Editable Excalidraw canvas"]
  C --> F["PDF export"]`,
  };
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  console.log(`${method} ${path}`);

  try {
    if (method === "GET" && path === "/") {
      sendJson(res, 200, {
        name: "NoteMap mock API",
        status: "ok",
        endpoints: [
          "POST /api/notes/generate/text",
          "GET /api/notes/history",
          "GET /api/notes/:id",
          "PUT /api/notes/:id",
          "DELETE /api/notes/:id",
        ],
      });
      return;
    }

    if (method === "GET" && path === "/favicon.ico") {
      sendNoContent(res);
      return;
    }

    if (method === "POST" && path === "/api/notes/generate/text") {
      const userId = getUserId(req, res);
      if (!userId) {
        return;
      }

      const body = await readJsonBody(req);
      if (typeof body.text !== "string" || !body.text.trim()) {
        sendError(res, 400, "Bad Request", "Text is required.");
        return;
      }
      if (body.text.length > 12_000) {
        sendError(
          res,
          400,
          "Bad Request",
          "Text must be 12,000 characters or fewer.",
        );
        return;
      }

      const generated = buildGeneratedNote(body.text);
      await new Promise((resolve) => setTimeout(resolve, 900));

      const note = {
        id: nextId,
        userId,
        sourceType: "TEXT",
        title: generated.title,
        summary: generated.summary,
        mermaidCode: generated.mermaidCode,
        excalidrawJson: null,
        createdAt: new Date().toISOString(),
      };
      nextId += 1;
      notes.push(note);

      sendJson(res, 201, publicNote(note));
      return;
    }

    if (method === "GET" && path === "/api/notes/history") {
      const userId = getUserId(req, res);
      if (!userId) {
        return;
      }

      const history = notes
        .filter((note) => note.userId === userId)
        .sort((a, b) => b.id - a.id)
        .map((note) => ({
          id: note.id,
          sourceType: note.sourceType,
          title: note.title,
          createdAt: note.createdAt,
        }));

      sendJson(res, 200, history);
      return;
    }

    const noteMatch = path.match(/^\/api\/notes\/(\d+)$/);
    if (noteMatch) {
      const id = Number(noteMatch[1]);

      if (method === "GET") {
        const note = findNote(req, res, id);
        if (note) {
          sendJson(res, 200, publicNote(note));
        }
        return;
      }

      if (method === "PUT") {
        const note = findNote(req, res, id);
        if (!note) {
          return;
        }

        const body = await readJsonBody(req);
        if (typeof body.title !== "string" || !body.title.trim()) {
          sendError(res, 400, "Bad Request", "Title is required.");
          return;
        }
        if (typeof body.summary !== "string") {
          sendError(res, 400, "Bad Request", "Summary is required.");
          return;
        }
        if (typeof body.mermaidCode !== "string") {
          sendError(res, 400, "Bad Request", "Mermaid code is required.");
          return;
        }

        note.title = body.title.trim();
        note.summary = body.summary;
        note.mermaidCode = body.mermaidCode;
        note.excalidrawJson =
          typeof body.excalidrawJson === "string"
            ? body.excalidrawJson
            : body.excalidrawJson === null
              ? null
              : note.excalidrawJson;

        sendJson(res, 200, publicNote(note));
        return;
      }

      if (method === "DELETE") {
        const note = findNote(req, res, id);
        if (!note) {
          return;
        }
        notes.splice(notes.indexOf(note), 1);
        sendNoContent(res);
        return;
      }
    }

    if (method === "GET" && path === "/health") {
      sendJson(res, 200, {
        status: "ok",
        notes: notes.length,
        requestId: randomUUID(),
      });
      return;
    }

    sendError(res, 404, "Not Found", `No route for ${method} ${path}.`);
  } catch (error) {
    sendError(
      res,
      500,
      "Internal Server Error",
      error instanceof Error ? error.message : "Unexpected server error.",
    );
  }
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the real backend (or any other process using port ${PORT}) before running the mock API.`,
    );
  } else {
    console.error("Mock API failed to start:", error);
  }
  process.exitCode = 1;
});

server.listen(PORT, () => {
  console.log(`NoteMap mock API listening on http://localhost:${PORT}`);
  console.log("CORS enabled for all origins; data is stored in memory.");
});
