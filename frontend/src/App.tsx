import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import RewriteContentView from './RewriteContentView';
import GenerateAltTextView from './GenerateAltTextView';
import AuditDocumentView from './AuditDocumentView';
import './App.css';

/**
 * Root application component.
 *
 * Routes:
 *   /          → UC1: RewriteContentView
 *   /alt-text  → UC2: GenerateAltTextView
 *   /audit     → UC3: AuditDocumentView
 */
function App() {
  return (
    <BrowserRouter>
      <nav className="app-nav">
        <Link to="/" className="nav-link">Rewrite Content</Link>
        <Link to="/alt-text" className="nav-link">Generate Alt Text</Link>
        <Link to="/audit" className="nav-link">Accessibility Audit</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RewriteContentView />} />
        <Route path="/alt-text" element={<GenerateAltTextView />} />
        <Route path="/audit" element={<AuditDocumentView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
