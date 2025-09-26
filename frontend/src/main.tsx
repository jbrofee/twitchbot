import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WebSocketProvider } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebSocketProvider children />
  </StrictMode>
);
