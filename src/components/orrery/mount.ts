/**
 * Mounts a canvas into `mount`, builds a scene once three.js has loaded, and tears
 * it down again. Without WebGL the mount gets `is-flat` and draws its CSS fallback.
 */
export function mountScene<T extends { dispose(): void }>(
  mount: HTMLElement,
  create: (canvas: HTMLCanvasElement, calm: boolean) => Promise<T>,
  onReady?: (scene: T) => void,
): () => void {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  mount.appendChild(canvas);
  let alive = true;
  let scene: T | null = null;

  import("./engine")
    .then(({ webglAvailable }) => {
      if (!alive) return null;
      if (!webglAvailable()) throw new Error("WebGL is not available");
      return create(canvas, calm);
    })
    .then((created) => {
      if (!created) return;
      if (!alive) return created.dispose();
      scene = created;
      mount.classList.add("is-ready");
      onReady?.(created);
    })
    .catch((error) => {
      if (!alive) return;
      console.warn("KeepAlive: 3D view unavailable, showing the flat version.", error);
      mount.classList.add("is-flat");
    });

  return () => {
    alive = false;
    scene?.dispose();
    canvas.remove();
    mount.classList.remove("is-ready", "is-flat");
  };
}
