import type { ReactNode } from 'react';

interface StepProps {
  readonly index: number;
  readonly title: string;
  readonly hint?: string;
  readonly children: ReactNode;
}

/** Bloc d'étape du parcours client : numéro, titre, contenu. */
export function Step({ index, title, hint, children }: StepProps) {
  return (
    <section className="step" aria-labelledby={`step-${index}`}>
      <header className="step-header">
        <span className="step-index">{index}</span>
        <div>
          <h2 id={`step-${index}`} className="step-title">
            {title}
          </h2>
          {hint ? <p className="step-hint">{hint}</p> : null}
        </div>
      </header>
      <div className="step-body">{children}</div>
    </section>
  );
}
