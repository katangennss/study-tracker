import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { initTheme } from "./lib/theme";
import { AuthProvider } from "./lib/auth";
import { ActiveGroupProvider } from "./lib/activeGroup";
import { LanguageProvider } from "./lib/i18n";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <ActiveGroupProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ActiveGroupProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
