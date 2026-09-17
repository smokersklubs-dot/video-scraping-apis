import { Step } from '../Step';

/** Phase 7 : l'import d'artwork branchera l'atlas UV déjà en place sur les panneaux. */
export function ArtworkStep() {
  return (
    <Step index={6} title="Importez votre design" hint="PNG, JPG, SVG — disponible en phase 7 (Artwork Engine).">
      <div className="dropzone is-disabled" aria-disabled="true">
        <span>Zone d’import du design</span>
        <small>Le design sera positionné sur le patron et visible instantanément en 3D.</small>
      </div>
    </Step>
  );
}
