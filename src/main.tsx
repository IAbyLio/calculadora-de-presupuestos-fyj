import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureUtms } from "./lib/utmCapture";
import { loadMetaPixel } from "./lib/metaPixel";

captureUtms();

const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
if (pixelId) {
  loadMetaPixel(pixelId);
}

createRoot(document.getElementById("root")!).render(<App />);
