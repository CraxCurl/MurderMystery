import {
  Search,
  Terminal,
  Cpu,
  Shield,
  Zap,
  Code,
  Database,
  Eye,
  Lock,
  Key,
  Activity,
  Brain,
  Compass,
  Globe,
  Radio,
  Skull,
  Flame,
  Layers,
  Bot,
  Crosshair,
  Fingerprint,
  FolderGit2,
  Bug,
  Wifi,
  LucideIcon,
} from "lucide-react";

export interface SquadIconItem {
  id: string;
  name: string;
  category: "Detective" | "Tech" | "Tactical" | "Cyber";
  icon: LucideIcon;
}

export const SQUAD_ICONS: SquadIconItem[] = [
  // Detective & Forensics
  { id: "search", name: "Cyber Sleuths", category: "Detective", icon: Search },
  { id: "fingerprint", name: "Forensics Unit", category: "Detective", icon: Fingerprint },
  { id: "eye", name: "Watchtower Recon", category: "Detective", icon: Eye },
  { id: "compass", name: "Navigators", category: "Detective", icon: Compass },
  { id: "skull", name: "Crime Scene Techs", category: "Detective", icon: Skull },
  { id: "folder-git", name: "Git Auditors", category: "Detective", icon: FolderGit2 },

  // Tech & Code
  { id: "terminal", name: "Terminal Hackers", category: "Tech", icon: Terminal },
  { id: "cpu", name: "Neural Architects", category: "Tech", icon: Cpu },
  { id: "code", name: "Syntax Operators", category: "Tech", icon: Code },
  { id: "database", name: "Memory Vault", category: "Tech", icon: Database },
  { id: "brain", name: "Deep Thinkers", category: "Tech", icon: Brain },
  { id: "bug", name: "Exploit Hunters", category: "Tech", icon: Bug },

  // Cyber & Security
  { id: "shield", name: "Guardrail Security", category: "Cyber", icon: Shield },
  { id: "lock", name: "Cryptographers", category: "Cyber", icon: Lock },
  { id: "key", name: "Root Access", category: "Cyber", icon: Key },
  { id: "bot", name: "Agentic Systems", category: "Cyber", icon: Bot },
  { id: "globe", name: "Net Intelligence", category: "Cyber", icon: Globe },
  { id: "wifi", name: "Signal Breakers", category: "Cyber", icon: Wifi },

  // Tactical & Performance
  { id: "zap", name: "Quantum Shock", category: "Tactical", icon: Zap },
  { id: "crosshair", name: "Precision Strike", category: "Tactical", icon: Crosshair },
  { id: "activity", name: "Telemetry Unit", category: "Tactical", icon: Activity },
  { id: "flame", name: "Overclock Unit", category: "Tactical", icon: Flame },
  { id: "radio", name: "Frequency Scanner", category: "Tactical", icon: Radio },
  { id: "layers", name: "Vector Matrix", category: "Tactical", icon: Layers },
];

export function getSquadIconComponent(iconId: string): LucideIcon {
  const item = SQUAD_ICONS.find((i) => i.id === iconId || i.name === iconId);
  return item ? item.icon : Search;
}
