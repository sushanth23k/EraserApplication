import React, { useState, useCallback } from 'react';
import './styles/App.css';
import { 
  UploadedImage, 
  Shape, 
  DrawingTool, 
  ProcessedResult,
  Coordinate,
  Region
} from './types';
import { apiService, fileToDataUrl, validateImageFile, downloadBlob } from './services/api';
import ImageUpload from './components/ImageUpload';
import ImageCanvas from './components/ImageCanvas'
import ProcessingPanel from './components/ProcessingPanel'
import ResultsPanel from './components/ResultsPanel'

function App() {
  const [currentImage, setCurrentImage] = useState<UploadedImage | null>(null);
  const [currentTool, setCurrentTool] = useState<DrawingTool>(DrawingTool.NONE);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [objectPrompt, setObjectPrompt] = useState('');
  const [numInferenceSteps, setNumInferenceSteps] = useState<number>(50);
  const [guidanceScale, setGuidanceScale] = useState<number>(7.5);
  const [seed, setSeed] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Convert to data URL
      const dataUrl = await fileToDataUrl(file);

      // Upload to backend for validation
      const response = await apiService.uploadImage(dataUrl);

      if (response.success && response.metadata) {
        const uploadedImage: UploadedImage = {
          dataUrl,
          metadata: response.metadata,
          file
        };

        setCurrentImage(uploadedImage);
        setShapes([]);
        setProcessedResult(null);
        setCurrentTool(DrawingTool.NONE);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Handle shape completion
  const handleShapeComplete = useCallback((shape: Shape) => {
    setHistory(prev => [...prev, shapes]);
    setRedoStack([]);
    setShapes(prev => [...prev, shape]);
  }, [shapes]);

  // Handle shape updates
  const handleShapeUpdate = useCallback((shapeId: string, coordinates: Coordinate[]) => {
    setShapes(prev => prev.map(shape => 
      shape.id === shapeId 
        ? { ...shape, coordinates }
        : shape
    ));
  }, []);

  // Clear all shapes
  const handleClearShapes = useCallback(() => {
    if (shapes.length > 0) {
      setHistory(prev => [...prev, shapes]);
      setRedoStack([]);
    }
    setShapes([]);
    setProcessedResult(null);
  }, [shapes]);

  const handleUndo = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];
      setRedoStack(prev => [...prev, shapes]);
      setShapes(last);
      return prevHistory.slice(0, prevHistory.length - 1);
    });
  }, [shapes]);

  const handleRedo = useCallback(() => {
    setRedoStack(prevRedo => {
      if (prevRedo.length === 0) return prevRedo;
      const next = prevRedo[prevRedo.length - 1];
      setHistory(prev => [...prev, shapes]);
      setShapes(next);
      return prevRedo.slice(0, prevRedo.length - 1);
    });
  }, [shapes]);

  const handleRemoveImage = useCallback(() => {
    setCurrentImage(null);
    setShapes([]);
    setHistory([]);
    setRedoStack([]);
    setProcessedResult(null);
    setCurrentTool(DrawingTool.NONE);
  }, []);

  // Convert completed shapes to rectangular regions for cumulative masking
  const shapesToRegions = useCallback((allShapes: Shape[]): Region[] => {
    const regions: Region[] = [];
    for (const shape of allShapes) {
      if (!shape.isComplete || shape.coordinates.length < 2) continue;
      const xs = shape.coordinates.map(p => p.x);
      const ys = shape.coordinates.map(p => p.y);
      const minX = Math.floor(Math.max(0, Math.min(...xs)));
      const minY = Math.floor(Math.max(0, Math.min(...ys)));
      const maxX = Math.ceil(Math.max(...xs));
      const maxY = Math.ceil(Math.max(...ys));
      const width = Math.max(0, maxX - minX);
      const height = Math.max(0, maxY - minY);
      if (width > 0 && height > 0) {
        regions.push({ x: minX, y: minY, width, height });
      }
    }
    return regions;
  }, []);

  // Process image with AI
  const handleProcess = useCallback(async () => {
    if (!currentImage || shapes.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Use all shapes to build cumulative rectangular regions
      const regions = shapesToRegions(shapes);
      // Fallback coordinates for backward compatibility (first shape polygon)
      const primaryShape = shapes[0];
      
      const response = await apiService.processImage(
        currentImage.dataUrl,
        primaryShape.coordinates,
        {
          prompt: objectPrompt || undefined,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
          seed: seed,
          regions: regions,
        }
      );

      if (response.success && response.processed_image) {
        const result: ProcessedResult = {
          originalImage: currentImage.dataUrl,
          processedImage: response.processed_image,
          coordinates: primaryShape.coordinates,
          description: objectPrompt,
          regions: regions
        };

        setProcessedResult(result);
      } else {
        throw new Error(response.error || 'Processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, shapes, objectPrompt, numInferenceSteps, guidanceScale, seed]);

  // Download processed image
  const handleDownload = useCallback(async () => {
    if (!processedResult) return;

    try {
      const blob = await apiService.downloadImage(processedResult.processedImage);
      const filename = `edited_${Date.now()}.png`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  }, [processedResult]);

  const dataUrlToFile = useCallback(async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    return file;
  }, []);

  const getImageDimensions = useCallback((src: string) => {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const handleTransferToEditor = useCallback(async () => {
    if (!processedResult) return;
    try {
      const filename = `transferred_${Date.now()}.png`;
      const file = await dataUrlToFile(processedResult.processedImage, filename);
      const dims = await getImageDimensions(processedResult.processedImage);
      const uploadedImage: UploadedImage = {
        dataUrl: processedResult.processedImage,
        metadata: {
          width: dims.width,
          height: dims.height,
          format: file.type.includes('png') ? 'png' : 'jpeg',
          mode: 'RGBA'
        },
        file
      };
      setCurrentImage(uploadedImage);
      setShapes([]);
      setHistory([]);
      setRedoStack([]);
      setProcessedResult(null);
      setCurrentTool(DrawingTool.NONE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to transfer image');
    }
  }, [processedResult, dataUrlToFile, getImageDimensions]);

  const canProcess = currentImage && shapes.length > 0 && !isProcessing;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">AI Eraser</h1>
      </header>

      <main className="app-main three-col" style={{ position: 'relative' }}>
        {/* Transfer button between editor and results */}
        {processedResult && (
          <button
            className="transfer-button"
            onClick={handleTransferToEditor}
            title="Replace editor image with result (←)"
          >
            ←
          </button>
        )}

        {/* Part 1: Editor (40%) */}
        <section className="editor-section">
          <div className="canvas-container">
            {currentImage ? (
              <ImageCanvas
                image={currentImage}
                shapes={shapes}
                currentTool={currentTool}
                onShapeComplete={handleShapeComplete}
                onShapeUpdate={handleShapeUpdate}
                onToolChange={setCurrentTool}
                onClearShapes={handleClearShapes}
                canProcess={!!canProcess}
                isProcessing={isProcessing}
                onProcess={handleProcess}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={history.length > 0}
                canRedo={redoStack.length > 0}
                onRemoveImage={handleRemoveImage}
              />
            ) : (
              <ImageUpload
                onImageUpload={handleImageUpload}
                isUploading={isUploading}
                error={error}
              />
            )}
          </div>
        </section>

        {/* Part 2: Configuration (20-25%) */}
        <section className="config-section">
          <ProcessingPanel
            isProcessing={isProcessing}
            objectPrompt={objectPrompt}
            onObjectPromptChange={setObjectPrompt}
            numInferenceSteps={numInferenceSteps}
            onNumInferenceStepsChange={setNumInferenceSteps}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            seed={seed}
            onSeedChange={setSeed}
            onProcess={handleProcess}
            canProcess={!!canProcess}
            processedResult={processedResult}
            onDownload={handleDownload}
          />
        </section>

        {/* Part 3: Results (40%) */}
        <section className="results-section">
          <ResultsPanel processedResult={processedResult} />
        </section>
      </main>

      {/* Global Error Display */}
      {error && (
        <div 
          className="error-message"
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 1000,
            maxWidth: '400px'
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '10px',
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App; 