/* Sandbox-only entry: mounts the real screens from src/ with a hash router. */
import { createRoot } from "react-dom/client";
import { AppStateProvider } from "@/lib/store";
import { usePath } from "@/lib/nav";
import { HomeScreen } from "@/modules/home/HomeScreen";
import { GoScreen } from "@/modules/go/GoScreen";
import { VisionScreen } from "@/modules/vision/VisionScreen";
import { UrbanScreen } from "@/modules/urban/UrbanScreen";
import { ImpactScreen } from "@/modules/impact/ImpactScreen";

function Router() {
  const p = usePath();
  if (p.startsWith("/go")) return <GoScreen />;
  if (p.startsWith("/vision")) return <VisionScreen />;
  if (p.startsWith("/urban")) return <UrbanScreen />;
  if (p.startsWith("/impact")) return <ImpactScreen />;
  return <HomeScreen />;
}

createRoot(document.getElementById("root")!).render(<AppStateProvider><Router /></AppStateProvider>);
