import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Code2,
  GitCompareArrows,
  GitPullRequest,
  Globe2,
  KeyRound,
  LayoutList,
  LifeBuoy,
  Map as MapIcon,
  Rocket,
  Settings,
  Terminal,
  Wand2,
} from "lucide-react";

import overview from "./content/overview.md?raw";
import gettingStarted from "./content/getting-started.md?raw";
import interactiveMap from "./content/interactive-map.md?raw";
import creatingModels from "./content/creating-models.md?raw";
import modelDashboard from "./content/model-dashboard.md?raw";
import results from "./content/results.md?raw";
import comparison from "./content/comparison.md?raw";
import settings from "./content/settings.md?raw";
import apiAccess from "./content/api-access.md?raw";
import troubleshooting from "./content/troubleshooting.md?raw";
import architecture from "./content/architecture.md?raw";
import installation from "./content/installation.md?raw";
import contributing from "./content/contributing.md?raw";

export interface DocSection {
  slug: string;
  title: string;
  icon: LucideIcon;
  content: string;
}

export interface DocGroup {
  title: string;
  sections: DocSection[];
}

export const DOC_GROUPS: DocGroup[] = [
  {
    title: "User guide",
    sections: [
      { slug: "overview", title: "Overview", icon: BookOpen, content: overview },
      { slug: "getting-started", title: "Getting started", icon: Rocket, content: gettingStarted },
      { slug: "interactive-map", title: "Interactive map", icon: Globe2, content: interactiveMap },
      { slug: "creating-models", title: "Creating a model", icon: Wand2, content: creatingModels },
      { slug: "managing-models", title: "Managing models", icon: LayoutList, content: modelDashboard },
      { slug: "results", title: "Viewing results", icon: MapIcon, content: results },
      { slug: "comparison", title: "Comparing models", icon: GitCompareArrows, content: comparison },
      { slug: "settings", title: "Settings & feedback", icon: Settings, content: settings },
      { slug: "api-access", title: "API access", icon: KeyRound, content: apiAccess },
      { slug: "troubleshooting", title: "Troubleshooting & FAQ", icon: LifeBuoy, content: troubleshooting },
    ],
  },
  {
    title: "Developer guide",
    sections: [
      { slug: "architecture", title: "Architecture", icon: Code2, content: architecture },
      { slug: "installation", title: "Installation", icon: Terminal, content: installation },
      { slug: "contributing", title: "Contributing", icon: GitPullRequest, content: contributing },
    ],
  },
];

export const DOC_SECTIONS: DocSection[] = DOC_GROUPS.flatMap((g) => g.sections);
