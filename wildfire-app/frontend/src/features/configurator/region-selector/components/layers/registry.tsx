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
    titleKey: string;
    subtitleKey: string;
    icon: ReactNode;
}

export const LAYERS: LayerDef[] = [
    { id: 1, title: "Model Initialization", subtitle: "Name and simulation timeframe", titleKey: "configurator.registry.layer1Title", subtitleKey: "configurator.registry.layer1Subtitle", icon: <FileText className="w-4 h-4" /> },
    { id: 2, title: "Area Selection", subtitle: "Define where the model lives", titleKey: "configurator.registry.layer2Title", subtitleKey: "configurator.registry.layer2Subtitle", icon: <MapPin className="w-4 h-4" /> },
    { id: 3, title: "Risk Components", subtitle: "Choose which signals feed the model", titleKey: "configurator.registry.layer3Title", subtitleKey: "configurator.registry.layer3Subtitle", icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 4, title: "Final Review", subtitle: "Sanity check before run", titleKey: "configurator.registry.layer4Title", subtitleKey: "configurator.registry.layer4Subtitle", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 5, title: "Save & Calculate", subtitle: "Persist and start the run", titleKey: "configurator.registry.layer5Title", subtitleKey: "configurator.registry.layer5Subtitle", icon: <Save className="w-4 h-4" /> },
];

export const LAYER_COUNT = LAYERS.length;
