// The five practice stages, as the map renders them. Order is the ladder:
// recognise -> construct -> manipulate -> produce with constraints -> produce freely.
import { MousePointerClick, Hammer, Repeat, PenLine, MessagesSquare } from "lucide-react";

export const PRACTICE_STAGES = [
  { id: "choose",    name: "Choose",    icon: MousePointerClick, blurb: "Spot the right form" },
  { id: "build",     name: "Build",     icon: Hammer,            blurb: "Make it yourself" },
  { id: "transform", name: "Transform", icon: Repeat,            blurb: "Change the sentence" },
  { id: "create",    name: "Create",    icon: PenLine,           blurb: "Write your own",  ai: true },
  { id: "express",   name: "Express",   icon: MessagesSquare,    blurb: "Use it freely",   ai: true },
];
