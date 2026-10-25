import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { ErrorReportUtils } from "@/app/errorReport.utils";
import { SoundPlayer } from "@/components/sound/_utils/soundPlayer.utils";
import "@/index.css";

// Before the app: a crash while it starts is worth knowing about too.
ErrorReportUtils.install();
SoundPlayer.listenForPresses();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
