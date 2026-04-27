import { useState, useEffect } from 'react'
import './App.css'

/**
 * API response shape from POST /api/rewrite
 */
interface RewriteResponse {
  originalText: string;
  rewrittenText: string | null;
  calculatedGradeLevel: number | null;
  latencyMs: number | null;
  status: 'success' | 'ambiguous' | 'validation_error';
  error?: string;
}

/**
 * Document shape from GET /api/document/default
 */
interface DocumentResponse {
  id: string;
  sourceText: string;
}

const API_BASE = 'http://localhost:3001';

/**
 * RewriteContentView — Main UI page for UC1: RewriteContentForTargetAudience
 *
 * Inputs:
 *   #source-text         — Read-only textarea showing loaded document
 *   #audience-profile    — Select dropdown for audience profile
 *   #target-grade        — Number input for target reading grade
 *   #submit-rewrite      — Submit button
 *
 * Outputs:
 *   #original-text-panel   — Original text panel (side-by-side)
 *   #rewritten-draft-panel — Rewritten draft panel (side-by-side)
 *   #reading-level-indicator — Calculated grade level display
 *
 * Errors:
 *   #error-ambiguous     — Ambiguity error message
 *   #error-validation    — Validation error message
 */
function RewriteContentView() {
  // Document state
  const [documentId, setDocumentId] = useState<string>('');
  const [sourceText, setSourceText] = useState<string>('');

  // Input state
  const [audienceProfile, setAudienceProfile] = useState<string>('Pediatric');
  const [targetGrade, setTargetGrade] = useState<string>('6');

  // Result state
  const [rewrittenText, setRewrittenText] = useState<string | null>(null);
  const [calculatedGrade, setCalculatedGrade] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Error state
  const [errorType, setErrorType] = useState<'ambiguous' | 'validation' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load default document on mount
  useEffect(() => {
    async function loadDocument() {
      try {
        const res = await fetch(`${API_BASE}/api/document/default`);
        if (res.ok) {
          const data: DocumentResponse = await res.json();
          setDocumentId(data.id);
          setSourceText(data.sourceText);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      }
    }
    void loadDocument();
  }, []);

  /**
   * Handle rewrite submission.
   * Calls POST /api/rewrite and updates UI state based on response.
   */
  async function handleSubmit() {
    // Reset previous results
    setRewrittenText(null);
    setCalculatedGrade(null);
    setLatencyMs(null);
    setErrorType(null);
    setErrorMessage('');
    setStatus('loading');

    try {
      const res = await fetch(`${API_BASE}/api/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          audienceProfile,
          targetGradeLevel: Number(targetGrade),
        }),
      });

      const data: RewriteResponse = await res.json();

      if (data.status === 'validation_error') {
        setErrorType('validation');
        setErrorMessage(data.error ?? 'Source text is missing');
        setStatus('error');
        return;
      }

      if (data.status === 'ambiguous') {
        setErrorType('ambiguous');
        setErrorMessage(data.error ?? 'The text is too ambiguous to rewrite safely');
        setStatus('error');
        return;
      }

      // Success
      setRewrittenText(data.rewrittenText);
      setCalculatedGrade(data.calculatedGradeLevel);
      setLatencyMs(data.latencyMs);
      setStatus('success');
    } catch (err) {
      console.error('Rewrite request failed:', err);
      setErrorType('validation');
      setErrorMessage('Failed to connect to the server');
      setStatus('error');
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Access &amp; Tone Rewriter</h1>
        <p className="subtitle">Rewrite content for your target audience</p>
      </header>

      <main className="app-main">
        {/* Input Section */}
        <section className="input-section">
          <div className="source-text-container">
            <label htmlFor="source-text">Source Document</label>
            <textarea
              id="source-text"
              value={sourceText}
              readOnly
              placeholder="Loading document..."
              rows={8}
            />
          </div>

          <div className="controls-row">
            <div className="control-group">
              <label htmlFor="audience-profile">Audience Profile</label>
              <select
                id="audience-profile"
                value={audienceProfile}
                onChange={(e) => setAudienceProfile(e.target.value)}
              >
                <option value="Pediatric">Pediatric</option>
                <option value="Legal">Legal</option>
                <option value="Layperson">Layperson</option>
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="target-grade">Target Reading Grade</label>
              <input
                id="target-grade"
                type="number"
                min="1"
                max="20"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                placeholder="e.g., 6"
              />
            </div>

            <button
              id="submit-rewrite"
              onClick={handleSubmit}
              disabled={status === 'loading'}
              className="submit-button"
            >
              {status === 'loading' ? 'Rewriting...' : 'Rewrite'}
            </button>
          </div>
        </section>

        {/* Error Messages */}
        {errorType === 'ambiguous' && (
          <div id="error-ambiguous" className="error-message error-ambiguous">
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {errorType === 'validation' && (
          <div id="error-validation" className="error-message error-validation">
            <span className="error-icon">❌</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Results Section — Side-by-side panels */}
        {status === 'success' && rewrittenText && (
          <section className="results-section" data-latency={latencyMs}>
            <div className="results-header">
              <div
                id="reading-level-indicator"
                className="reading-level"
                data-grade={calculatedGrade}
              >
                Reading Level: Grade {calculatedGrade}
              </div>
              <div className="latency-indicator">
                Generated in {latencyMs}ms
              </div>
            </div>

            <div className="panels-container">
              <div id="original-text-panel" className="text-panel original-panel">
                <h3>Original Text</h3>
                <div className="panel-content">{sourceText}</div>
              </div>

              <div id="rewritten-draft-panel" className="text-panel rewritten-panel">
                <h3>Rewritten Draft</h3>
                <div className="panel-content">{rewrittenText}</div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default RewriteContentView
