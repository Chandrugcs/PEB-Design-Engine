import React, { useRef, useEffect, useState } from 'react';
import {
  Download,
  Settings,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Layers,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface CADDrawing {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layers: CADLayer[];
}

interface CADLayer {
  id: string;
  name: string;
  color: string;
  lineweight: number;
  visible: boolean;
  locked: boolean;
}

interface DrawingElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'arc' | 'polygon' | 'dimension' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  lineweight: number;
  layer: string;
  properties?: Record<string, any>;
}

export const CADFabricationSheet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<string>('0');
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [drawings, setDrawings] = useState<CADDrawing[]>([
    {
      id: 'main',
      name: 'Main Drawing',
      visible: true,
      locked: false,
      layers: [
        { id: '0', name: 'Foundation', color: '#0284c7', lineweight: 2, visible: true, locked: false },
        { id: '1', name: 'Columns', color: '#059669', lineweight: 2, visible: true, locked: false },
        { id: '2', name: 'Roof', color: '#dc2626', lineweight: 1.5, visible: true, locked: false },
        { id: '3', name: 'Dimensions', color: '#7c3aed', lineweight: 0.5, visible: true, locked: false },
        { id: '4', name: 'Text', color: '#000000', lineweight: 0, visible: true, locked: false },
      ],
    },
  ]);

  const [elements, setElements] = useState<DrawingElement[]>([
    // Foundation elements
    {
      id: 'foundation-1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      color: '#0284c7',
      lineweight: 3,
      layer: '0',
    },
    // Columns
    {
      id: 'column-1',
      type: 'rectangle',
      x: 200,
      y: 150,
      width: 60,
      height: 450,
      color: '#059669',
      lineweight: 2,
      layer: '1',
    },
    {
      id: 'column-2',
      type: 'rectangle',
      x: 750,
      y: 150,
      width: 60,
      height: 450,
      color: '#059669',
      lineweight: 2,
      layer: '1',
    },
    // Roof elements
    {
      id: 'roof-1',
      type: 'polygon',
      x: 150,
      y: 150,
      width: 800,
      height: 100,
      color: '#dc2626',
      lineweight: 2,
      layer: '2',
    },
    // Dimensions
    {
      id: 'dim-1',
      type: 'dimension',
      x: 100,
      y: 50,
      width: 800,
      color: '#7c3aed',
      lineweight: 1,
      layer: '3',
      properties: { value: '8000 mm', unit: 'mm' },
    },
  ]);

  // Draw CAD-style background grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 50 * zoom;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = panX % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = panY % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Grid points
    ctx.fillStyle = '#d1d5db';
    for (let x = panX % gridSize; x < width; x += gridSize) {
      for (let y = panY % gridSize; y < height; y += gridSize) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  };

  // Draw dimension lines and text
  const drawDimension = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, width, color, properties } = element;
    const scaledX = (x + panX) * scale;
    const scaledY = (y + panY) * scale;
    const scaledWidth = (width || 0) * scale;

    // Dimension line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY);
    ctx.stroke();
    ctx.setLineDash([]);

    // End caps
    const capSize = 8;
    ctx.fillStyle = color;
    ctx.fillRect(scaledX - capSize / 2, scaledY - capSize / 2, capSize, capSize);
    ctx.fillRect(scaledX + scaledWidth - capSize / 2, scaledY - capSize / 2, capSize, capSize);

    // Dimension text
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${properties?.value || '0 mm'}`,
      scaledX + scaledWidth / 2,
      scaledY - 15
    );
  };

  // Draw rectangle
  const drawRectangle = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, width, height, color, lineweight } = element;
    const scaledX = (x + panX) * scale;
    const scaledY = (y + panY) * scale;
    const scaledWidth = (width || 0) * scale;
    const scaledHeight = (height || 0) * scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineweight * 2;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
  };

  // Draw polygon (roof profile)
  const drawPolygon = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, width, height, color, lineweight } = element;
    const scaledX = (x + panX) * scale;
    const scaledY = (y + panY) * scale;
    const scaledWidth = (width || 0) * scale;
    const scaledHeight = (height || 0) * scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineweight * 2;
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth / 2, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight);
    ctx.stroke();
  };

  // Main draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (gridVisible) {
      drawGrid(ctx, width, height);
    }

    // Draw all elements
    const scale = zoom;
    elements.forEach((element) => {
      const layer = drawings[0]?.layers.find((l) => l.id === element.layer);
      if (layer && layer.visible) {
        switch (element.type) {
          case 'rectangle':
            drawRectangle(ctx, element, scale);
            break;
          case 'polygon':
            drawPolygon(ctx, element, scale);
            break;
          case 'dimension':
            drawDimension(ctx, element, scale);
            break;
        }
      }
    });

    // Draw axis indicator
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(60, 20);
    ctx.stroke();

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(20, 60);
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('X', 65, 25);
    ctx.fillText('Y', 15, 75);
  }, [zoom, panX, panY, gridVisible, elements, drawings]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - mousePos.x;
      const deltaY = e.clientY - mousePos.y;
      setPanX(panX + deltaX);
      setPanY(panY + deltaY);
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const toggleLayer = (layerId: string) => {
    setDrawings(
      drawings.map((drawing) => ({
        ...drawing,
        layers: drawing.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        ),
      }))
    );
  };

  const exportPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'fabrication-sheet.png';
    link.click();
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Left Panel - Layers */}
      <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2 text-sky-400">
            <Layers size={18} />
            <h3 className="font-semibold">Layers</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drawings[0]?.layers.map((layer) => (
            <div
              key={layer.id}
              className={`p-3 rounded border-2 cursor-pointer transition ${
                selectedLayer === layer.id
                  ? 'bg-slate-800 border-sky-500'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setSelectedLayer(layer.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-300">{layer.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayer(layer.id);
                  }}
                  className="text-slate-400 hover:text-sky-400"
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: layer.color, borderColor: layer.color }}
                />
                <span className="text-xs text-slate-500">{layer.color}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-16 bg-slate-900 border-b border-slate-700 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-sky-400">CAD Fabrication Sheet</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View Controls */}
            <button
              onClick={handleResetView}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>

            <span className="text-sm text-slate-400 w-12 text-center">
              {(zoom * 100).toFixed(0)}%
            </span>

            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>

            <div className="w-px h-6 bg-slate-700" />

            <button
              onClick={() => setGridVisible(!gridVisible)}
              className={`p-2 rounded transition ${
                gridVisible ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-sky-400'
              }`}
              title="Toggle Grid"
            >
              <Grid3x3 size={18} />
            </button>

            <div className="w-px h-6 bg-slate-700" />

            <button
              onClick={exportPDF}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition flex items-center gap-2"
              title="Export as Image"
            >
              <Download size={18} />
            </button>

            <button className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-white relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1400}
            height={750}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />

          {/* Coordinate Display */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-2 rounded text-xs text-slate-400 font-mono">
            X: {(mousePos.x / zoom).toFixed(2)} Y: {(mousePos.y / zoom).toFixed(2)}
          </div>

          {/* Status Bar */}
          <div className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-2 rounded text-xs text-slate-400">
            {elements.length} Objects
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="h-8 bg-slate-900 border-t border-slate-700 px-6 flex items-center justify-between text-xs text-slate-400">
          <div>Ready</div>
          <div>Sheet: A3 Landscape | Scale 1:100</div>
        </div>
      </div>
    </div>
  );
};

export default CADFabricationSheet;
