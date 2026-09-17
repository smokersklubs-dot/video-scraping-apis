import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

declare global {
  interface Window {
    __sklubsViewer?: { camera: unknown; scene: unknown; controls: unknown };
  }
}

/** Expose la scène en développement uniquement (diagnostic, tests navigateur). */
export function DevProbe() {
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__sklubsViewer = { camera, scene, controls };
    return () => {
      delete window.__sklubsViewer;
    };
  }, [camera, scene, controls]);
  return null;
}
