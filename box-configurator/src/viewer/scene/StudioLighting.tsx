import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import type { QualityProfile } from '../quality';

interface StudioLightingProps {
  readonly quality: QualityProfile;
  /** Diagonale de la boîte en unités scène, pour dimensionner ombres et sol. */
  readonly diagonal: number;
  /** Altitude du sol (unités scène). */
  readonly floorY: number;
}

/**
 * Éclairage studio procédural : environnement à panneaux lumineux (aucun HDR téléchargé),
 * lumière clé avec ombres, ombre de contact au sol.
 */
export function StudioLighting({ quality, diagonal, floorY }: StudioLightingProps) {
  const extent = Math.max(diagonal, 0.05);
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[extent * 2.2, extent * 2.4, extent * 1.2]}
        intensity={2.6}
        castShadow={quality.shadows}
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.002}
        shadow-camera-near={0.01}
        shadow-camera-far={extent * 8}
        shadow-camera-left={-extent}
        shadow-camera-right={extent}
        shadow-camera-top={extent}
        shadow-camera-bottom={-extent}
      />
      <directionalLight position={[-extent * 2, extent, -extent]} intensity={0.6} />
      <Environment resolution={quality.envResolution} frames={1} background={false}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} position={[6, 1, 1]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, 1, 8]} scale={[10, 5, 1]} color="#dbe7ff" />
        <Lightformer form="ring" intensity={0.6} position={[0, 3, -6]} scale={3} color="#ffe8d6" />
      </Environment>
      <ContactShadows
        position={[0, floorY, 0]}
        opacity={0.45}
        scale={extent * 3}
        blur={2.2}
        far={extent * 1.5}
        resolution={quality.contactShadowResolution}
        frames={1}
        color="#1F2A36"
      />
    </>
  );
}
