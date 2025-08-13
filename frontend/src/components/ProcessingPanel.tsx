import React from 'react';
import { ProcessingPanelProps } from '../types';

const ProcessingPanel: React.FC<ProcessingPanelProps> = ({
  isProcessing,
  objectPrompt,
  onObjectPromptChange,
  numInferenceSteps,
  onNumInferenceStepsChange,
  guidanceScale,
  onGuidanceScaleChange,
  seed,
  onSeedChange,
  onProcess,
  canProcess,
  processedResult,
  onDownload
}) => {
  return (
    <div className="processing-panel">
      <div className="processing-section">
        <div className="section-title">
          <span className="title-icon">🎯</span>
          Prompt (optional)
        </div>
        <input
          type="text"
          className="text-input"
          placeholder="Describe the object to remove (optional)"
          value={objectPrompt}
          onChange={(e) => onObjectPromptChange(e.target.value)}
          disabled={isProcessing}
        />
        <div className="field-row" style={{ marginTop: '0.75rem' }}>
          <label className="field-label">Clarity (Steps)</label>
          <input
            type="number"
            className="text-input"
            value={numInferenceSteps}
            min={1}
            max={100}
            step={1}
            onChange={(e) => onNumInferenceStepsChange(parseInt(e.target.value || '0', 10))}
            disabled={isProcessing}
          />
        </div>
        <div className="field-row">
          <label className="field-label">Guidance</label>
          <input
            type="number"
            className="text-input"
            value={guidanceScale}
            min={1}
            max={20}
            step={0.1}
            onChange={(e) => onGuidanceScaleChange(parseFloat(e.target.value || '0'))}
            disabled={isProcessing}
          />
        </div>
        <div className="field-row">
          <label className="field-label">Seed (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="text-input"
              placeholder="Leave blank for random"
              value={seed}
              onChange={(e) => onSeedChange(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => onSeedChange('')}
            >
              Random
            </button>
          </div>
        </div>
        
        <button
          className={`process-button ${canProcess ? 'enabled' : 'disabled'}`}
          onClick={onProcess}
          disabled={!canProcess}
        >
          {isProcessing ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            <>
              <span className="button-icon">🚀</span>
              Remove Object
            </>
          )}
        </button>

        {processedResult && (
          <button
            className="download-button"
            onClick={onDownload}
            title="Download edited image"
          >
            <span className="button-icon">⬇️</span>
            Download Edited Image
          </button>
        )}
        
        <div className="processing-info">
          <div className="info-item">
            <span className="info-label">AI Model:</span>
            <span className="info-value">Advanced Inpainting</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingPanel; 