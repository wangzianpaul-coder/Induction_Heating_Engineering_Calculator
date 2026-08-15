import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { EngineeringApp } from "./App.js";
import { ENGINEERING_UI_APPLICATION } from "./application-adapter.js";

export function mountEngineeringApplication(container: HTMLElement): void {
  createRoot(container).render(
    <StrictMode>
      <EngineeringApp application={ENGINEERING_UI_APPLICATION} />
    </StrictMode>,
  );
}

export function mountDefaultEngineeringApplication(): void {
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("The UI root element is missing.");
  }
  mountEngineeringApplication(container);
}
