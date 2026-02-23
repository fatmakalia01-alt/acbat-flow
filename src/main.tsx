import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("MAIN VERSION: FIXED_REF_v6");
createRoot(document.getElementById("root")!).render(React.createElement(App, null));
