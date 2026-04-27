import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './AuditDocumentView.css';

const API_BASE = 'http://localhost:3001';

type Severity = 'Critical' | 'Serious' | 'Minor';

interface Violation {
  ruleId: string;
  severity: Severity;
  description: string;
}

interface AuditResponse {
  auditReportId: string | null;
  documentId: string;
  guidelinesVersion: string;
  violations: Violation[];
  status: 'complete' | 'validation_error' | 'error';
  error?: string;
}

/**
 * AuditDocumentView — UI page for UC3: AuditDocumentForAccessibility
 *
 * Reads documentId from URL query string: /audit?documentId=<id>
 *
 * Inputs:
 *   #run-audit                  — trigger audit button
 *
 * Outputs:
 *   #audit-report               — report container (shown after success)
 *   #violation-list             — <ul> of violations
 *   [data-severity]             — severity label on each <li>
 *   [data-rule-id]              — WCAG rule citation on each <li>
 *   #audit-summary-critical     — critical count
 *   #audit-summary-serious      — serious count
 *   #audit-summary-minor        — minor count
 *   #no-violations-message      — shown when violations = 0
 *
 * Errors:
 *   #error-no-document          — shown on validation_error
 */
function AuditDocumentView() {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('documentId') ?? '';

  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [guidelinesVersion, setGuidelinesVersion] = useState<string>('');
  const [errorType, setErrorType] = useState<'no-document' | 'server' | null>(null);

  async function handleRunAudit() {
    setPhase('scanning');
    setViolations([]);
    setErrorType(null);

    if (!documentId) {
      setPhase('error');
      setErrorType('no-document');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      const data: AuditResponse = await res.json();

      if (data.status === 'validation_error') {
        setPhase('error');
        setErrorType('no-document');
        return;
      }

      if (data.status === 'error') {
        setPhase('error');
        setErrorType('server');
        return;
      }

      setViolations(data.violations);
      setGuidelinesVersion(data.guidelinesVersion);
      setPhase('done');
    } catch {
      setPhase('error');
      setErrorType('server');
    }
  }

  const criticalCount = violations.filter(v => v.severity === 'Critical').length;
  const seriousCount  = violations.filter(v => v.severity === 'Serious').length;
  const minorCount    = violations.filter(v => v.severity === 'Minor').length;

  return (
    <div className="audit-container">
      <header className="audit-header">
        <h1>Accessibility Audit</h1>
        <p className="subtitle">WCAG 2.2 AA document accessibility report</p>
      </header>

      <main className="audit-main">

        {/* ── Trigger ───────────────────────────────────────── */}
        <section className="audit-trigger-section">
          <button
            id="run-audit"
            className="audit-button"
            onClick={handleRunAudit}
            disabled={phase === 'scanning'}
          >
            {phase === 'scanning' ? 'Scanning…' : 'Run Accessibility Audit'}
          </button>
          {documentId && (
            <span className="document-id-label">Document: <code>{documentId}</code></span>
          )}
        </section>

        {/* ── Error: no document ────────────────────────────── */}
        {phase === 'error' && errorType === 'no-document' && (
          <div id="error-no-document" className="error-message error-no-doc">
            <span className="error-icon">❌</span>
            <span>No valid document is available. Please load a document before running an audit.</span>
          </div>
        )}

        {/* ── Error: server ─────────────────────────────────── */}
        {phase === 'error' && errorType === 'server' && (
          <div className="error-message error-server">
            <span className="error-icon">⚠️</span>
            <span>The audit could not be completed. Please try again.</span>
          </div>
        )}

        {/* ── Audit Report ──────────────────────────────────── */}
        {phase === 'done' && (
          <section id="audit-report" className="audit-report">

            {/* Summary bar */}
            <div className="audit-summary">
              <h2>Audit Report
                <span className="guidelines-version">{guidelinesVersion}</span>
              </h2>
              <div className="summary-counts">
                <span id="audit-summary-critical" className="count-badge critical">
                  Critical: {criticalCount}
                </span>
                <span id="audit-summary-serious" className="count-badge serious">
                  Serious: {seriousCount}
                </span>
                <span id="audit-summary-minor" className="count-badge minor">
                  Minor: {minorCount}
                </span>
              </div>
            </div>

            {/* No violations */}
            {violations.length === 0 && (
              <div id="no-violations-message" className="no-violations">
                <span className="check-icon">✅</span>
                <span>No accessibility violations found. This document passes WCAG 2.2 AA checks.</span>
              </div>
            )}

            {/* Violation list */}
            {violations.length > 0 && (
              <ul id="violation-list" className="violation-list">
                {violations.map((v, idx) => (
                  <li
                    key={idx}
                    className={`violation-item severity-${v.severity.toLowerCase()}`}
                    data-severity={v.severity}
                    data-rule-id={v.ruleId}
                  >
                    <div className="violation-header">
                      <span className={`severity-badge ${v.severity.toLowerCase()}`}>
                        {v.severity}
                      </span>
                      <code className="rule-id">WCAG {v.ruleId}</code>
                    </div>
                    <p className="violation-description">{v.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default AuditDocumentView;
