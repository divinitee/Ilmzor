import React, { useEffect, useRef, useState } from "react";
import { useAppLang } from "@/hooks/useAppLang";
import { createEngine } from "./deepModeEngine";
import { DEEP_MAP_COPY } from "./deepModeMapCopy";
import { SAMPLE_ORDER, SAMPLE_WORDS } from "./deepModeSamples";
import "./deepModeMap.css";

// Interactive Deep Mode preview (VT-38): the approved word-family map with
// three sample words. Grammar stays Coming soon. React owns the chrome
// (tabs, word chips, labels); deepModeEngine owns the animated map.
export default function DeepModeMap() {
  const { lang } = useAppLang();
  const c = DEEP_MAP_COPY[lang] || DEEP_MAP_COPY.en;
  const [word, setWord] = useState(SAMPLE_ORDER[0]);
  const [grammar, setGrammar] = useState(false);
  const firstRun = useRef(true);
  const stageRef = useRef(null);
  const worldRef = useRef(null);
  const nodesRef = useRef(null);
  const glowRef = useRef(null);
  const lineRef = useRef(null);
  const skyRef = useRef(null);
  const fitRef = useRef(null);
  const dockRef = useRef(null);
  const crumbRef = useRef(null);

  useEffect(() => {
    const destroy = createEngine(
      {
        stage: stageRef.current, world: worldRef.current, nodesEl: nodesRef.current,
        glowLayer: glowRef.current, lineLayer: lineRef.current, sky: skyRef.current,
        fitBtn: fitRef.current, dock: dockRef.current, crumb: crumbRef.current,
      },
      SAMPLE_WORDS[word],
      c,
      { autoOpen: firstRun.current }
    );
    firstRun.current = false;
    return destroy;
    // c follows lang; the refs are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, lang]);

  return (
    <div className="dm-root">
      <header className="bar">
        <div className="brand"><b>Deep Mode</b><span>{c.brandSub}</span></div>
        <div className="seg" role="group" aria-label="Deep Mode">
          <button type="button" aria-pressed={!grammar} onClick={() => setGrammar(false)}>{c.vocab}</button>
          <button type="button" aria-pressed={grammar} onClick={() => setGrammar(true)}>{c.grammar} <small>{c.soon}</small></button>
        </div>
      </header>

      <div className="stage" ref={stageRef} aria-label={c.stageLabel}>
        <canvas className="dm-sky" ref={skyRef} aria-hidden="true" />
        <div className="proto">{c.preview}</div>
        <div className="crumb" ref={crumbRef} hidden />
        <div className="world" ref={worldRef}>
          <svg className="dm-links" viewBox="-3000 -3000 6000 6000" aria-hidden="true">
            <defs>
              <filter id="dmBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
            </defs>
            <g ref={glowRef} filter="url(#dmBlur)" />
            <g ref={lineRef} />
          </svg>
          <div ref={nodesRef} />
        </div>

        <div className="soon" hidden={!grammar}>
          <div className="card">
            <span className="tag">{c.soon}</span>
            <b>{c.grammarTitle}</b>
            <p>{c.grammarBody}</p>
            <button type="button" className="chip" onClick={() => setGrammar(false)}>{c.backVocab}</button>
          </div>
        </div>

        <div className="dock" ref={dockRef}>
          <div className="words" role="group" aria-label={c.try}>
            <span className="lbl">{c.try}</span>
            {SAMPLE_ORDER.map((w) => (
              <button key={w} type="button" className="chip" aria-pressed={word === w} onClick={() => setWord(w)}>{w}</button>
            ))}
          </div>
          <div className="tools">
            <span className="hint">{c.hint}</span>
            <button type="button" className="icon-btn" ref={fitRef} aria-label={c.fit} title={c.fit}>⤢</button>
          </div>
        </div>
      </div>
    </div>
  );
}
