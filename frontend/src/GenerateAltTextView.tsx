import { useState, useEffect } from 'react';
import './GenerateAltTextView.css';

const API_BASE = 'http://localhost:3001';

/** Shape of a DocumentImage from GET /api/images */
interface DocumentImage {
  id: string;
  filename: string;
  hasAltText: boolean;
  complexityFlag: boolean;
}

/** Shape of POST /api/alt-text/generate response */
interface GenerateResponse {
  imageAltTextId: string | null;
  imageId: string;
  altText: string | null;
  wcagCompliant: boolean;
  status: 'success' | 'complex' | 'validation_error';
  error?: string;
}

/**
 * GenerateAltTextView — UI page for UC2: GenerateImageAltText
 *
 * Phase 1 inputs:
 *   #image-select     — select eligible image
 *   #context-input    — optional context description
 *   #submit-alt-text  — generate button
 *
 * Phase 2 outputs (visible after successful generation):
 *   #alt-text-preview              — generated alt text for review
 *   #approve-alt-text              — approve/attach button
 *   #alt-text-attached-confirmation — shown after approval
 *
 * Errors:
 *   #error-complex-image       — image too complex to auto-describe
 *   #error-no-eligible-image   — all images already have alt text
 */
function GenerateAltTextView() {
  const [images, setImages] = useState<DocumentImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string>('');
  const [context, setContext] = useState<string>('');

  const [phase, setPhase] = useState<'input' | 'review' | 'confirmed' | 'error'>('input');
  const [altText, setAltText] = useState<string>('');
  const [imageAltTextId, setImageAltTextId] = useState<string>('');
  const [errorType, setErrorType] = useState<'complex' | 'no-eligible' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load images without approved alt text
  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch(`${API_BASE}/api/images`);
        if (res.ok) {
          const all: DocumentImage[] = await res.json();
          const eligible = all.filter((img) => !img.hasAltText);
          setImages(eligible);
          if (eligible.length > 0) {
            setSelectedImageId(eligible[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load images:', err);
      }
    }
    void loadImages();
  }, []);

  async function handleGenerate() {
    // Reset error/result state
    setPhase('input');
    setAltText('');
    setImageAltTextId('');
    setErrorType(null);
    setErrorMessage('');

    // UC2-S05: No eligible image
    if (images.length === 0) {
      setErrorType('no-eligible');
      setErrorMessage('No eligible images available. All images already have approved Alt Text.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/alt-text/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImageId,
          context: context.trim() || undefined,
        }),
      });

      const data: GenerateResponse = await res.json();

      if (data.status === 'complex') {
        setErrorType('complex');
        setErrorMessage(data.error ?? 'This image is too complex to auto-describe. Manual description required.');
        setPhase('error');
        return;
      }

      if (data.status === 'validation_error') {
        setErrorType('no-eligible');
        setErrorMessage(data.error ?? 'This image is not eligible for alt text generation.');
        setPhase('error');
        return;
      }

      // Success — move to review phase
      setAltText(data.altText ?? '');
      setImageAltTextId(data.imageAltTextId ?? '');
      setPhase('review');
    } catch (err) {
      console.error('Generation failed:', err);
      setErrorType('no-eligible');
      setErrorMessage('Failed to connect to the server.');
      setPhase('error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    try {
      const res = await fetch(`${API_BASE}/api/alt-text/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageAltTextId }),
      });

      if (res.ok) {
        setPhase('confirmed');
      }
    } catch (err) {
      console.error('Approval failed:', err);
    }
  }

  return (
    <div className="alt-text-container">
      <header className="alt-text-header">
        <h1>Generate Image Alt Text</h1>
        <p className="subtitle">Create WCAG-compliant alt text for document images</p>
      </header>

      <main className="alt-text-main">

        {/* ── Phase 1: Select & Generate ───────────────────────── */}
        <section className="input-section">
          <div className="control-group">
            <label htmlFor="image-select">Select Image</label>
            <select
              id="image-select"
              value={selectedImageId}
              onChange={(e) => setSelectedImageId(e.target.value)}
              disabled={images.length === 0}
            >
              {images.length === 0 ? (
                <option value="">No eligible images</option>
              ) : (
                images.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.filename}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="context-input">
              Context <span className="optional">(optional)</span>
            </label>
            <input
              id="context-input"
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the image's purpose in the document…"
            />
          </div>

          <button
            id="submit-alt-text"
            className="primary-button"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? 'Generating…' : 'Generate Alt Text'}
          </button>
        </section>

        {/* ── Errors ───────────────────────────────────────────── */}
        {errorType === 'complex' && (
          <div id="error-complex-image" className="error-message error-complex">
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {errorType === 'no-eligible' && (
          <div id="error-no-eligible-image" className="error-message error-validation">
            <span className="error-icon">❌</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Phase 2: Review & Approve ─────────────────────────── */}
        {phase === 'review' && (
          <section className="review-section">
            <h2>Review Generated Alt Text</h2>
            <div id="alt-text-preview" className="alt-text-preview">
              {altText}
            </div>
            <button
              id="approve-alt-text"
              className="approve-button"
              onClick={handleApprove}
            >
              ✓ Attach Alt Text to Image
            </button>
          </section>
        )}

        {/* ── Phase 3: Confirmation ─────────────────────────────── */}
        {phase === 'confirmed' && (
          <div id="alt-text-attached-confirmation" className="confirmation-message">
            <span className="confirmation-icon">✅</span>
            <span>Alt Text has been successfully attached to the image.</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default GenerateAltTextView;
