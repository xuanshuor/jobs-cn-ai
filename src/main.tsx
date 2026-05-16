import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { dataSourceCatalog } from "./data/registry";
import "./index.css";

const el = document.getElementById("root");
if (!el) {
  document.body.innerHTML = `<p style="padding:24px;font-family:Inter,'Noto Sans SC',system-ui,sans-serif">找不到 #root 节点，请检查 index.html。</p>`;
} else {
  createRoot(el).render(
    <StrictMode>
      <App dataSource={dataSourceCatalog[0]} />
    </StrictMode>,
  );
}
