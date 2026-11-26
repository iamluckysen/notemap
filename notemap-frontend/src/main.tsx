import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/ui/ToastProvider";
import { getOrCreateUserId } from "./lib/userId";
import "./index.css";

// Anonymous identity is created before the first API call on app load.
getOrCreateUserId();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element was not found.");
}

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
