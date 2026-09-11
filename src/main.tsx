import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureUtms } from "./lib/utmCapture";
import { captureContactId } from "./lib/contactIdentity";
import { loadMetaPixel } from "./lib/metaPixel";

// Identidad primero: quita `?k=` de la URL antes de que captureUtms() guarde landing_url
captureContactId();
captureUtms();

const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
if (pixelId) {
  loadMetaPixel(pixelId);
}

createRoot(document.getElementById("root")!).render(<App />);
