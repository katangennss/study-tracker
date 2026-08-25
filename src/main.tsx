import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { initTheme } from "./lib/theme";
import { AuthProvider } from "./lib/auth";
import { ActiveGroupProvider } from "./lib/activeGroup";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ActiveGroupProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ActiveGroupProvider>
    </AuthProvider>
  </StrictMode>
);
