// The five practice stages, as the map renders them. Order is the ladder:
// recognise -> construct -> manipulate -> produce with constraints -> produce freely.
//
// `demand` (1-5) is the ladder's own difficulty, not a property of the items.
// A student is doing strictly more work at each step: choosing among four given
// forms is not the same task as producing one unaided. It is shown as a filled
// ramp on the node so the ordering is visible before you commit to a round —
// the CEFR level on the topic node above answers a different question (how hard
// is this grammar), and the two are deliberately separate.
import { MousePointerClick, Hammer, Repeat, PenLine, MessagesSquare } from "lucide-react";

export const PRACTICE_STAGES = [
  { id: "choose",    name: "Choose",    icon: MousePointerClick, demand: 1, blurb: "Spot the right form" },
  { id: "build",     name: "Build",     icon: Hammer,            demand: 2, blurb: "Make it yourself" },
  { id: "transform", name: "Transform", icon: Repeat,            demand: 3, blurb: "Change the sentence" },
  { id: "create",    name: "Create",    icon: PenLine,           demand: 4, blurb: "Write your own",  ai: true },
  { id: "express",   name: "Express",   icon: MessagesSquare,    demand: 5, blurb: "Use it freely",   ai: true },
];

export const MAX_DEMAND = 5;
