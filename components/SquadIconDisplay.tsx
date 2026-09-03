import React from "react";
import { getSquadIconComponent } from "@/lib/squad-icons";

interface SquadIconDisplayProps {
  iconId: string;
  className?: string;
}

export default function SquadIconDisplay({ iconId, className = "w-5 h-5" }: SquadIconDisplayProps) {
  const IconComponent = getSquadIconComponent(iconId);
  return <IconComponent className={className} />;
}
