import React, { useState, useCallback } from 'react';
import { ResultsPanelProps } from '../types';

const ResultsPanel: React.FC<ResultsPanelProps> = ({ processedResult }) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'full'>('side-by-side');
  const [showOriginal, setShowOriginal] = useState(true);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load:', e);
  }, []);

  if (!processedResult) {
    return (
      <div className="processing-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon">🖼️</div>
          <div className="empty-title">No results yet</div>
          <div className="empty-subtitle">Run "Remove Object" to see results here</div>
        </div>
      </div>
    );
  }

  return (
    <div className="processing-panel">
      <div className="processing-section">
        <div className="section-title">
          <span className="title-icon">✨</span>
          Results
          <div className="view-controls">
            <button
              className={`view-control ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
              title="Side by side view"
            >
              📊
            </button>
            <button
              className={`view-control ${viewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setViewMode('overlay')}
              title="Overlay view"
            >
              🔄
            </button>
            <button
              className={`view-control ${viewMode === 'full' ? 'active' : ''}`}
              onClick={() => setViewMode('full')}
              title="Full size view"
            >
              🖼️
            </button>
          </div>
        </div>

        <div className="results-container">
          {viewMode === 'side-by-side' && (
            <div className="comparison-view">
              <div className="comparison-image">
                <div className="comparison-label">
                  <span className="label-icon">📷</span>
                  Original
                </div>
                <div className="image-container">
                  <img
                    src={processedResult.originalImage}
                    alt="Original"
                    className="comparison-img original"
                    onError={handleImageError}
                  />
                </div>
              </div>
              <div className="comparison-image">
                <div className="comparison-label">
                  <span className="label-icon">✨</span>
                  Edited
                </div>
                <div className="image-container">
                  <img
                    src={processedResult.processedImage}
                    alt="Processed"
                    className="comparison-img processed scaled-120"
                    onError={handleImageError}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'overlay' && (
            <div className="overlay-view">
              <div className="overlay-container">
                <img
                  src={showOriginal ? processedResult.originalImage : processedResult.processedImage}
                  alt={showOriginal ? 'Original' : 'Processed'}
                  className={`overlay-img ${showOriginal ? 'original' : 'processed scaled-120'}`}
                  onError={handleImageError}
                />
                <div className="overlay-toggle">
                  <button
                    className={`toggle-btn ${showOriginal ? 'active' : ''}`}
                    onClick={() => setShowOriginal(true)}
                  >
                    Original
                  </button>
                  <button
                    className={`toggle-btn ${!showOriginal ? 'active' : ''}`}
                    onClick={() => setShowOriginal(false)}
                  >
                    Edited
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'full' && (
            <div className="full-view">
              <div className="full-image-container">
                <img
                  src={processedResult.processedImage}
                  alt="Processed result"
                  className="full-img"
                  onError={handleImageError}
                />
              </div>
              <div className="image-info">
                <span className="info-label">Result:</span>
                <span className="info-value">Object successfully removed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;

