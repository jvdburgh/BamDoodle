import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { ErrorReportUtils } from "@/app/errorReport.utils";
import { RouteUtils } from "@/app/route.utils";
import "@/index.css";

// Before the app: a crash while it starts is worth knowing about too.
ErrorReportUtils.install();

// An old `/join/BKZW` link: the room's short address is the one to see and share.
const route = RouteUtils.route(window.location.pathname);
if (route.kind === "redirect") window.history.replaceState(null, "", route.to);

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
