// Core data types
export interface Coordinate {
  x: number;
  y: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  mode: string;
}

export interface UploadedImage {
  dataUrl: string;
  metadata: ImageMetadata;
  file: File;
}

export interface ProcessedResult {
  originalImage: string;
  processedImage: string;
  coordinates: Coordinate[];
  description?: string;
  regions?: Region[];
}

// Drawing tools and shapes
export enum DrawingTool {
  NONE = 'none',
  FREEHAND = 'freehand',
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse'
}

export interface Shape {
  id: string;
  type: DrawingTool;
  coordinates: Coordinate[];
  isComplete: boolean;
  color: string;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// API related types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface UploadResponse extends ApiResponse {
  metadata?: ImageMetadata;
}

export interface ProcessResponse extends ApiResponse {
  processed_image?: string;
}

// Application state
export interface AppState {
  currentImage: UploadedImage | null;
  currentTool: DrawingTool;
  shapes: Shape[];
  isProcessing: boolean;
  processedResult: ProcessedResult | null;
  error: string | null;
}

// Component props
export interface ImageCanvasProps {
  image: UploadedImage | null;
  shapes: Shape[];
  currentTool: DrawingTool;
  onShapeComplete: (shape: Shape) => void;
  onShapeUpdate: (shapeId: string, coordinates: Coordinate[]) => void;
  // Floating toolbar integration
  onToolChange: (tool: DrawingTool) => void;
  onClearShapes: () => void;
  canProcess: boolean;
  isProcessing: boolean;
  onProcess: () => void;
  // History controls
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Remove current image entirely
  onRemoveImage: () => void;
}

export interface ToolbarProps {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  onClearShapes: () => void;
  canProcess: boolean;
  isProcessing: boolean;
  onProcess: () => void;
}

export interface ProcessingPanelProps {
  isProcessing: boolean;
  objectPrompt: string;
  onObjectPromptChange: (prompt: string) => void;
  numInferenceSteps: number;
  onNumInferenceStepsChange: (steps: number) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (scale: number) => void;
  seed: string;
  onSeedChange: (seed: string) => void;
  onProcess: () => void;
  canProcess: boolean;
  processedResult: ProcessedResult | null;
  onDownload: () => void;
}

export interface ResultsPanelProps {
  processedResult: ProcessedResult | null;
}

export interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

// Viewport and canvas
export interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface CanvasDrawingState {
  isDrawing: boolean;
  currentShape: Shape | null;
  startPoint: Coordinate | null;
} 