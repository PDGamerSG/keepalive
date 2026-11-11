"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BusinessScene } from "./business-scene";
import { mountScene } from "./mount";
import type { FocusBody, OrbitBody, Tier } from "./states";

/**
 * A live orrery of real subscribers. Hovering a body shows `tooltip(id)`; clicking
 * it calls `onPick(id)`. `focus` adds one highlighted body with `focusLabel` beside it.
 */
export function OrreryView(props: {
  bodies: OrbitBody[];
  focus?: FocusBody | null;
  focusLabel?: ReactNode;
  highlight?: Tier | null;
  interactive?: boolean;
  zoom?: number;
  offsetX?: number;
  tooltip?: (id: string) => ReactNode;
  onPick?: (id: string) => void;
  className?: string;
  label: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BusinessScene | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const { interactive, zoom, offsetX } = props;
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    const unmount = mountScene(
      mount,
      (canvas, calm) =>
        import("./business-scene").then((m) => m.createBusinessScene(canvas, { calm, interactive, zoom, offsetX })),
      (scene) => {
        sceneRef.current = scene;
        const p = latest.current;
        scene.setBodies(p.bodies);
        scene.setFocus(p.focus ?? null);
        scene.setHighlight(p.highlight ?? null);
        let current: string | null = null;
        scene.onHover((hit) => {
          const tip = tipRef.current;
          if (tip && hit) {
            tip.style.transform = `translate(${hit.x.toFixed(1)}px, ${hit.y.toFixed(1)}px)`;
            tip.dataset.side = hit.x > mount.clientWidth * 0.62 ? "left" : "right";
          }
          const id = hit?.id ?? null;
          if (id !== current) {
            current = id;
            setHover(id);
          }
        });
        scene.onPick((id) => latest.current.onPick?.(id));
        const follow = () => {
          const el = focusRef.current;
          if (el) {
            const a = scene.focusAnchor();
            el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
            el.style.opacity = String(a.show);
            el.dataset.side = a.x > mount.clientWidth * 0.62 ? "left" : "right";
          }
          raf = requestAnimationFrame(follow);
        };
        raf = requestAnimationFrame(follow);
      },
    );
    return () => {
      cancelAnimationFrame(raf);
      sceneRef.current = null;
      unmount();
    };
  }, [interactive, zoom, offsetX]);

  useEffect(() => {
    sceneRef.current?.setBodies(props.bodies);
  }, [props.bodies]);
  useEffect(() => {
    sceneRef.current?.setFocus(props.focus ?? null);
  }, [props.focus]);
  useEffect(() => {
    sceneRef.current?.setHighlight(props.highlight ?? null);
  }, [props.highlight]);

  return (
    <div className={`orrery-view ${props.className ?? ""}`} role="img" aria-label={props.label}>
      <div ref={mountRef} className="orrery-mount" />
      {props.tooltip && (
        <div ref={tipRef} className="orrery-tip" style={{ opacity: hover ? 1 : 0 }} aria-hidden="true">
          {hover && props.tooltip(hover)}
        </div>
      )}
      {props.focusLabel && (
        <div ref={focusRef} className="orrery-focus" style={{ opacity: 0 }} aria-hidden="true">
          <span>{props.focusLabel}</span>
        </div>
      )}
    </div>
  );
}
