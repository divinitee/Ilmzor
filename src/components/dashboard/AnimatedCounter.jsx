import React, { useEffect, useState } from "react";
import { animate } from "framer-motion";

export default function AnimatedCounter({ value, duration = 1.2, className }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span className={className}>{display.toLocaleString()}</span>;
}