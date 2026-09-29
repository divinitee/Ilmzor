import { useEffect, useState } from "react";
import { readSkillCache, fetchSkillState, SKILLSTATE_EVENT } from "@/lib/progress/progressClient";

// Server SkillState for a user, plus whether the last server read failed.
// Renders the per-account cache instantly, then the server response replaces it.
export function useSkillStateWithStatus(user) {
  const email = user?.email;
  const [state, setState] = useState(() => readSkillCache(email));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!email) return;
    setState(readSkillCache(email));
    setError(false);
    fetchSkillState(email)
      .then(setState)
      .catch((e) => { console.error("getSkillState failed", e); setError(true); });
    const onUpdate = (e) => { if (e.detail?.email === email) { setState(e.detail); setError(false); } };
    window.addEventListener(SKILLSTATE_EVENT, onUpdate);
    return () => window.removeEventListener(SKILLSTATE_EVENT, onUpdate);
  }, [email]);

  return { state, error };
}

// Returns null until something exists.
export function useSkillState(user) {
  return useSkillStateWithStatus(user).state;
}