import { useEffect, useState } from "react";
import { readSkillCache, fetchSkillState, SKILLSTATE_EVENT } from "@/lib/progress/progressClient";

// Server SkillState for a user. Renders the per-account cache instantly,
// then the server response replaces it. Returns null until something exists.
export function useSkillState(user) {
  const email = user?.email;
  const [state, setState] = useState(() => readSkillCache(email));

  useEffect(() => {
    if (!email) return;
    setState(readSkillCache(email));
    fetchSkillState(email).then(setState).catch((e) => console.error("getSkillState failed", e));
    const onUpdate = (e) => { if (e.detail?.email === email) setState(e.detail); };
    window.addEventListener(SKILLSTATE_EVENT, onUpdate);
    return () => window.removeEventListener(SKILLSTATE_EVENT, onUpdate);
  }, [email]);

  return state;
}