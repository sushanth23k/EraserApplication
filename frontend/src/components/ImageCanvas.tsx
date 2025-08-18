import React, { useRef, useCallback, useState, useEffect } from 'react';
import { ImageCanvasProps, DrawingTool, Shape, Coordinate, ViewportState, CanvasDrawingState } from '../types';

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  image,
  shapes,
  currentTool,
  onShapeComplete,
  onShapeUpdate,
  onToolChange,
  onClearShapes,
  canProcess,
  isProcessing,
  onProcess,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRemoveImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  const [drawingState, setDrawingState] = useState<CanvasDrawingState>({
    isDrawing: false,
    currentShape: null,
    startPoint: null
  });

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Coordinate | null>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<Coordinate | null>(null);

  // Initialize image and fit to canvas
  useEffect(() => {
    if (image && imageRef.current && containerRef.current) {
      imageRef.current.src = image.dataUrl;
      imageRef.current.onload = () => {
        fitImageToContainer();
      };
    }
  }, [image]);

  const fitImageToContainer = useCallback(() => {
    if (!image || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate scale to fit image in container while maintaining aspect ratio
    const scaleX = containerWidth / image.metadata.width;
    const scaleY = containerHeight / image.metadata.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
    
    // Center the image
    const scaledWidth = image.metadata.width * scale;
    const scaledHeight = image.metadata.height * scale;
    const translateX = (containerWidth - scaledWidth) / 2 / scale;
    const translateY = (containerHeight - scaledHeight) / 2 / scale;
    
    setViewport({
      scale,
      translateX,
      translateY
    });
  }, [image]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      fitImageToContainer();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitImageToContainer]);

  // Draw on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply viewport transformations
    ctx.scale(viewport.scale, viewport.scale);
    ctx.translate(viewport.translateX, viewport.translateY);

    // Draw image
    ctx.drawImage(img, 0, 0, image!.metadata.width, image!.metadata.height);

    // Draw shapes
    shapes.forEach(shape => {
      drawShape(ctx, shape);
    });

    // Draw current shape being drawn
    if (drawingState.currentShape) {
      drawShape(ctx, drawingState.currentShape);
    }

    ctx.restore();
  }, [viewport, shapes, drawingState.currentShape, image]);

  // Draw individual shape with improved rendering
  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    if (shape.coordinates.length === 0) return;

    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2 / viewport.scale; // Adjust line width for zoom
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set fill for shapes (semi-transparent)
    ctx.fillStyle = shape.color + '20'; // Add transparency
    // Visual indicator for selection boundaries during drawing
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = shape.isComplete ? 0 : 2 / viewport.scale;

    switch (shape.type) {
      case DrawingTool.FREEHAND:
        if (shape.coordinates.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.coordinates[0].x, shape.coordinates[0].y);
          
          // Use quadratic curves for smoother lines
          for (let i = 1; i < shape.coordinates.length - 1; i++) {
            const currentPoint = shape.coordinates[i];
            const nextPoint = shape.coordinates[i + 1];
            const controlPoint = {
              x: (currentPoint.x + nextPoint.x) / 2,
              y: (currentPoint.y + nextPoint.y) / 2
            };
            ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlPoint.x, controlPoint.y);
          }
          
          if (shape.coordinates.length > 1) {
            const lastPoint = shape.coordinates[shape.coordinates.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
          }
          
          if (shape.isComplete) {
            ctx.closePath();
            ctx.fill();
          }
          ctx.setLineDash(shape.isComplete ? [] : [6 / viewport.scale, 4 / viewport.scale]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }
        break;

      case DrawingTool.RECTANGLE:
        if (shape.coordinates.length >= 2) {
          // Support both live-draw with 2 points and completed polygon with 4 points by using bounds
          const xs = shape.coordinates.map(p => p.x);
          const ys = shape.coordinates.map(p => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          const width = maxX - minX;
          const height = maxY - minY;
          
          if (width > 0 && height > 0) {
            ctx.beginPath();
            ctx.rect(minX, minY, width, height);
            if (shape.isComplete) {
              ctx.fill();
            }
            ctx.setLineDash(shape.isComplete ? [] : [6 / viewport.scale, 4 / viewport.scale]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.shadowBlur = 0;
        }
        break;

      case DrawingTool.ELLIPSE:
        if (shape.coordinates.length >= 2) {
          let centerX: number, centerY: number, radiusX: number, radiusY: number;
          if (shape.coordinates.length > 2 || shape.isComplete) {
            // Completed ellipse converted to polygon: derive bounds from all points
            const xs = shape.coordinates.map(p => p.x);
            const ys = shape.coordinates.map(p => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            centerX = (minX + maxX) / 2;
            centerY = (minY + maxY) / 2;
            radiusX = (maxX - minX) / 2;
            radiusY = (maxY - minY) / 2;
          } else {
            // Live preview with two points
            const start = shape.coordinates[0];
            const end = shape.coordinates[shape.coordinates.length - 1];
            centerX = (start.x + end.x) / 2;
            centerY = (start.y + end.y) / 2;
            radiusX = Math.abs(end.x - start.x) / 2;
            radiusY = Math.abs(end.y - start.y) / 2;
          }
          
          if (radiusX > 0 && radiusY > 0) {
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            if (shape.isComplete) {
              ctx.fill();
            }
            ctx.setLineDash(shape.isComplete ? [] : [6 / viewport.scale, 4 / viewport.scale]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.shadowBlur = 0;
        }
        break;
    }
  }, [viewport.scale]);

  // Get mouse position relative to image coordinates
  const getImageCoordinate = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Coordinate => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Convert canvas coordinates to image coordinates
    const x = (clientX / viewport.scale) - viewport.translateX;
    const y = (clientY / viewport.scale) - viewport.translateY;
    
    // Clamp coordinates to image bounds
    const clampedX = Math.max(0, Math.min(image!.metadata.width, x));
    const clampedY = Math.max(0, Math.min(image!.metadata.height, y));
    
    return { x: clampedX, y: clampedY };
  }, [viewport, image]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Handle panning when no tool selected or with middle/right mouse
    if (currentTool === DrawingTool.NONE || e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle drawing
    if (e.button !== 0) return;

    const coord = getImageCoordinate(e);
    const newShape: Shape = {
      id: `shape_${Date.now()}`,
      type: currentTool,
      coordinates: [coord],
      isComplete: false,
      color: '#ff5252'
    };

    setDrawingState({
      isDrawing: true,
      currentShape: newShape,
      startPoint: coord
    });
  }, [currentTool, getImageCoordinate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Handle panning
    if (isPanning && lastPanPoint) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setViewport(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX / prev.scale,
        translateY: prev.translateY + deltaY / prev.scale
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle drawing
    if (!drawingState.isDrawing || !drawingState.currentShape || !drawingState.startPoint) return;

    const coord = getImageCoordinate(e);
    let updatedCoordinates: Coordinate[];

    switch (currentTool) {
      case DrawingTool.FREEHAND:
        // Add point only if it's far enough from the last point to avoid overcrowding
        const lastCoord = drawingState.currentShape.coordinates[drawingState.currentShape.coordinates.length - 1];
        const distance = Math.sqrt(Math.pow(coord.x - lastCoord.x, 2) + Math.pow(coord.y - lastCoord.y, 2));
        if (distance > 2) { // Minimum distance threshold
          updatedCoordinates = [...drawingState.currentShape.coordinates, coord];
        } else {
          return; // Don't update if too close
        }
        break;
      
      case DrawingTool.RECTANGLE:
      case DrawingTool.ELLIPSE:
        // For rectangles and ellipses, always update with start and current position
        if (drawingState.startPoint) {
          updatedCoordinates = [drawingState.startPoint, coord];
        } else {
          return;
        }
        break;
      
      default:
        return;
    }

    setDrawingState(prev => ({
      ...prev,
      currentShape: prev.currentShape ? {
        ...prev.currentShape,
        coordinates: updatedCoordinates
      } : null
    }));
  }, [drawingState.isDrawing, drawingState.currentShape, drawingState.startPoint, currentTool, getImageCoordinate, isPanning, lastPanPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Handle panning end
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    
    // Handle drawing end
    if (!drawingState.isDrawing || !drawingState.currentShape) return;

    // Complete the shape
    const completedShape: Shape = {
      ...drawingState.currentShape,
      isComplete: true
    };

    // For rectangles and ellipses, convert to closed polygon for processing
    if (currentTool === DrawingTool.RECTANGLE && completedShape.coordinates.length >= 2) {
      const start = completedShape.coordinates[0];
      const end = completedShape.coordinates[1];
      const x1 = Math.round(Math.min(start.x, end.x));
      const y1 = Math.round(Math.min(start.y, end.y));
      const x2 = Math.round(Math.max(start.x, end.x));
      const y2 = Math.round(Math.max(start.y, end.y));
      completedShape.coordinates = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 }
      ];
    } else if (currentTool === DrawingTool.ELLIPSE && completedShape.coordinates.length >= 2) {
      // Convert ellipse to polygon approximation for better processing
      const start = completedShape.coordinates[0];
      const end = completedShape.coordinates[1];
      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      const radiusX = Math.abs(end.x - start.x) / 2;
      const radiusY = Math.abs(end.y - start.y) / 2;
      
      const points: Coordinate[] = [];
      const numPoints = Math.max(16, Math.min(64, Math.floor((radiusX + radiusY) / 4))); // Adaptive point count
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        points.push({
          x: Math.round(centerX + radiusX * Math.cos(angle)),
          y: Math.round(centerY + radiusY * Math.sin(angle))
        });
      }
      completedShape.coordinates = points;
    }

    onShapeComplete(completedShape);
    
    setDrawingState({
      isDrawing: false,
      currentShape: null,
      startPoint: null
    });
  }, [drawingState.isDrawing, drawingState.currentShape, currentTool, onShapeComplete, isPanning]);

  // Zoom and pan handlers
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Zoom towards mouse position
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleFactor));
    
    // Calculate new translation to zoom towards mouse
    const scaleChange = newScale / viewport.scale;
    const newTranslateX = viewport.translateX - (mouseX / viewport.scale) * (scaleChange - 1);
    const newTranslateY = viewport.translateY - (mouseY / viewport.scale) * (scaleChange - 1);
    
    setViewport({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    });
  }, [viewport]);

  // Touch handlers for pinch-to-zoom and pan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getTouchCenter = (t1: Touch, t2: Touch): Coordinate => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });
    const getTouchDistance = (t1: Touch, t2: Touch): number => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setIsPanning(true);
        setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if (e.touches.length === 2) {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        lastTouchDistanceRef.current = getTouchDistance(t1, t2);
        lastTouchCenterRef.current = getTouchCenter(t1, t2);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanning && lastPanPoint) {
        const deltaX = e.touches[0].clientX - lastPanPoint.x;
        const deltaY = e.touches[0].clientY - lastPanPoint.y;
        setViewport(prev => ({
          ...prev,
          translateX: prev.translateX + deltaX / prev.scale,
          translateY: prev.translateY + deltaY / prev.scale,
        }));
        setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else if (e.touches.length === 2 && lastTouchDistanceRef.current && lastTouchCenterRef.current) {
        const [t1, t2] = [e.touches[0], e.touches[1]];
        const newDistance = getTouchDistance(t1, t2);
        const center = getTouchCenter(t1, t2);
        const rect = canvas.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        const scaleFactor = newDistance / lastTouchDistanceRef.current;
        const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleFactor));
        const scaleChange = newScale / viewport.scale;
        const newTranslateX = viewport.translateX - (centerX / viewport.scale) * (scaleChange - 1);
        const newTranslateY = viewport.translateY - (centerY / viewport.scale) * (scaleChange - 1);
        setViewport({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
        lastTouchDistanceRef.current = newDistance;
        lastTouchCenterRef.current = center;
      }
    };

    const onTouchEnd = () => {
      setIsPanning(false);
      setLastPanPoint(null);
      lastTouchDistanceRef.current = null;
      lastTouchCenterRef.current = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart as any);
      canvas.removeEventListener('touchmove', onTouchMove as any);
      canvas.removeEventListener('touchend', onTouchEnd as any);
      canvas.removeEventListener('touchcancel', onTouchEnd as any);
    };
  }, [isPanning, lastPanPoint, viewport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasRef.current) return;
      
      switch (e.key) {
        case '0':
          fitImageToContainer();
          break;
        case '=':
        case '+':
          setViewport(prev => ({
            ...prev,
            scale: Math.min(5, prev.scale * 1.2)
          }));
          break;
        case '-':
          setViewport(prev => ({
            ...prev,
            scale: Math.max(0.1, prev.scale * 0.8)
          }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitImageToContainer]);

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Context menu handler (disable right-click menu for panning)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  if (!image) return null;

  return (
    <div 
      ref={containerRef}
      className="canvas-wrapper"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 
               currentTool !== DrawingTool.NONE ? 'crosshair' : 'grab'
      }}
    >
      <img
        ref={imageRef}
        src={image.dataUrl}
        alt="Editing canvas"
        style={{ display: 'none' }}
        onLoad={redrawCanvas}
      />
      
      <canvas
        ref={canvasRef}
        className="image-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      
      <div className="canvas-controls">
        <button
          className="canvas-control-btn"
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, prev.scale * 0.8)) }))}
          title="Zoom out (-)"
        >
          −
        </button>
        <div className="zoom-indicator">{Math.round(viewport.scale * 100)}%</div>
        <button
          className="canvas-control-btn"
          onClick={() => setViewport(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, prev.scale * 1.2)) }))}
          title="Zoom in (+)"
        >
          +
        </button>
        <button
          className="canvas-control-btn"
          onClick={fitImageToContainer}
          title="Fit to container (0)"
        >
          Fit
        </button>
      </div>

      {/* Floating compact toolbar */}
      <div className="floating-toolbar">
        <button
          className="tool-mini"
          onClick={onUndo}
          title="Undo (⌘/Ctrl+Z)"
          disabled={!canUndo}
        >
          ↶
        </button>
        <button
          className="tool-mini"
          onClick={onRedo}
          title="Redo (⌘/Ctrl+Y)"
          disabled={!canRedo}
        >
          ↷
        </button>
        <div className="divider" />
        <button
          className={`tool-mini ${currentTool === DrawingTool.NONE ? 'active' : ''}`}
          onClick={() => onToolChange(DrawingTool.NONE)}
          title="Pan/Move"
        >
          🖐️
        </button>
        <button
          className={`tool-mini ${currentTool === DrawingTool.FREEHAND ? 'active' : ''}`}
          onClick={() => onToolChange(DrawingTool.FREEHAND)}
          title="Freehand"
        >
          ✏️
        </button>
        <button
          className={`tool-mini ${currentTool === DrawingTool.RECTANGLE ? 'active' : ''}`}
          onClick={() => onToolChange(DrawingTool.RECTANGLE)}
          title="Rectangle"
        >
          ⬛
        </button>
        <button
          className={`tool-mini ${currentTool === DrawingTool.ELLIPSE ? 'active' : ''}`}
          onClick={() => onToolChange(DrawingTool.ELLIPSE)}
          title="Ellipse"
        >
          ⭕
        </button>
        <div className="divider" />
        <button className="tool-mini" onClick={onClearShapes} title="Clear edits (eraser)">🧽</button>
        <button className="tool-mini" onClick={onRemoveImage} title="Remove image (trash)">🗑️</button>
        <button className="tool-mini primary" onClick={onProcess} title="Process" disabled={!canProcess || isProcessing}>
          {isProcessing ? '…' : '🚀'}
        </button>
      </div>
      
      <div className="canvas-instructions">
        <div>Drag to pan • Scroll to zoom • Draw to select</div>
        <div>Keys: 0=Fit, +/- =Zoom</div>
      </div>
    </div>
  );
};

export default ImageCanvas; 