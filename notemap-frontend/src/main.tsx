import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/ui/ToastProvider";
import { initFlagsmith } from "./lib/flagsmith";
import "./index.css";

// Anonymous identity and Flagsmith are initialised before the first API call.
initFlagsmith();

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
