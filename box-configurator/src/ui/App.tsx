import { ConfigPanel } from './ConfigPanel';
import { Stage } from './Stage';
import { SummaryPanel } from './SummaryPanel';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-name">SKLUBS</span>
          <span className="brand-sep">/</span>
          <span className="brand-product">Box Configurator</span>
        </div>
        <span className="badge">Prototype BOX-001 · moteur paramétrique</span>
      </header>
      <main className="app-main">
        <ConfigPanel />
        <Stage />
        <SummaryPanel />
      </main>
    </div>
  );
}
