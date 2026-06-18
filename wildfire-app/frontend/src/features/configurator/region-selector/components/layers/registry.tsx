import {
    FileText,
    MapPin,
    SlidersHorizontal,
    ClipboardCheck,
    Save,
} from "lucide-react";
import type { ReactNode } from "react";

interface LayerDef {
    id: number;
    title: string;
    subtitle: string;
    icon: ReactNode;
}

export const LAYERS: LayerDef[] = [
    { id: 1, title: "Model Initialization", subtitle: "Name and simulation timeframe", icon: <FileText className="w-4 h-4" /> },
    { id: 2, title: "Area Selection", subtitle: "Define where the model lives", icon: <MapPin className="w-4 h-4" /> },
    { id: 3, title: "Risk Components", subtitle: "Choose which signals feed the model", icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 4, title: "Final Review", subtitle: "Sanity check before run", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 5, title: "Save & Calculate", subtitle: "Persist and start the run", icon: <Save className="w-4 h-4" /> },
];

export const LAYER_COUNT = LAYERS.length;
