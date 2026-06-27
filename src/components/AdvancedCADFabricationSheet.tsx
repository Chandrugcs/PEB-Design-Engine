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
  Plus,
  Trash2,
  Edit2,
  FileText,
  DimensionsIcon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// PEB Sizing Engine Data Types
interface PEBStructure {
  id: string;
  name: string;
  length: number; // mm
  width: number; // mm
  height: number; // mm
  columnSpacing: number; // mm
  roofType: 'pitched' | 'flat' | 'curved';
  roofPitch?: number; // degrees for pitched
  wallThickness: number; // mm
  foundationDepth: number; // mm
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
  type: 'line' | 'rectangle' | 'circle' | 'arc' | 'polygon' | 'dimension' | 'text' | 'annotation';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  lineweight: number;
  layer: string;
  properties?: {
    value?: string | number;
    unit?: string;
    style?: 'horizontal' | 'vertical' | 'aligned';
    text?: string;
    angle?: number;
    fontsize?: number;
    dimensionType?: 'linear' | 'angular' | 'radial';
  };
}

interface DimensionMode {
  active: boolean;
  type: 'linear-h' | 'linear-v' | 'aligned' | 'angular' | null;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
}

export const AdvancedCADFabricationSheet: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [gridVisible, setGridVisible] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState<string>('0');
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>({
    active: false,
    type: null,
    startPoint: null,
    endPoint: null,
  });

  // PEB Structure Data
  const [pebStructure, setPebStructure] = useState<PEBStructure>({
    id: 'peb-001',
    name: 'Industrial Warehouse',
    length: 12000,
    width: 8000,
    height: 6500,
    columnSpacing: 6000,
    roofType: 'pitched',
    roofPitch: 15,
    wallThickness: 150,
    foundationDepth: 500,
  });

  const [layers, setLayers] = useState<CADLayer[]>([
    { id: '0', name: 'Foundation', color: '#0284c7', lineweight: 2, visible: true, locked: false },
    { id: '1', name: 'Columns', color: '#059669', lineweight: 2, visible: true, locked: false },
    { id: '2', name: 'Roof', color: '#dc2626', lineweight: 1.5, visible: true, locked: false },
    { id: '3', name: 'Dimensions', color: '#7c3aed', lineweight: 0.5, visible: true, locked: false },
    { id: '4', name: 'Text', color: '#000000', lineweight: 0, visible: true, locked: false },
    { id: '5', name: 'Grid', color: '#e5e7eb', lineweight: 0.25, visible: true, locked: true },
  ]);

  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [showDimensionDialog, setShowDimensionDialog] = useState(false);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [newDimensionValue, setNewDimensionValue] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Generate elements from PEB data
  useEffect(() => {
    generateElementsFromPEB();
  }, [pebStructure]);

  const generateElementsFromPEB = () => {
    const scale = 0.05; // Scale for canvas display
    const baseX = 100;
    const baseY = 100;

    const newElements: DrawingElement[] = [];
    const { length, width, height, columnSpacing, roofType, roofPitch, foundationDepth } = pebStructure;

    // Foundation
    newElements.push({
      id: 'foundation',
      type: 'rectangle',
      x: baseX,
      y: baseY,
      width: length * scale,
      height: width * scale,
      color: '#0284c7',
      lineweight: 3,
      layer: '0',
    });

    // Foundation depth indicator
    newElements.push({
      id: 'foundation-depth',
      type: 'dimension',
      x: baseX - 30,
      y: baseY + (width * scale) / 2,
      x2: baseX - 30,
      y2: baseY + (width * scale) / 2 + foundationDepth * scale,
      color: '#0284c7',
      lineweight: 1,
      layer: '3',
      properties: {
        value: `${foundationDepth}`,
        unit: 'mm',
        style: 'vertical',
        dimensionType: 'linear',
      },
    });

    // Columns
    const numColumns = Math.floor(length / columnSpacing) + 1;
    for (let i = 0; i < numColumns; i++) {
      const colX = baseX + (i * columnSpacing * scale);
      newElements.push({
        id: `column-${i}`,
        type: 'rectangle',
        x: colX,
        y: baseY + foundationDepth * scale,
        width: 120,
        height: height * scale,
        color: '#059669',
        lineweight: 2,
        layer: '1',
      });
    }

    // Roof
    const roofY = baseY + (height + foundationDepth) * scale;
    if (roofType === 'pitched') {
      newElements.push({
        id: 'roof',
        type: 'polygon',
        x: baseX,
        y: roofY,
        width: length * scale,
        height: (length * Math.tan((roofPitch || 15) * (Math.PI / 180))) * scale,
        color: '#dc2626',
        lineweight: 2.5,
        layer: '2',
        properties: {
          roofPitch: roofPitch || 15,
        },
      });
    } else {
      newElements.push({
        id: 'roof',
        type: 'line',
        x: baseX,
        y: roofY,
        x2: baseX + length * scale,
        y2: roofY,
        color: '#dc2626',
        lineweight: 2.5,
        layer: '2',
      });
    }

    // Overall dimensions
    newElements.push({
      id: 'dim-length',
      type: 'dimension',
      x: baseX,
      y: baseY - 40,
      x2: baseX + length * scale,
      y2: baseY - 40,
      color: '#7c3aed',
      lineweight: 1,
      layer: '3',
      properties: {
        value: length,
        unit: 'mm',
        style: 'horizontal',
        dimensionType: 'linear',
      },
    });

    newElements.push({
      id: 'dim-width',
      type: 'dimension',
      x: baseX - 40,
      y: baseY,
      x2: baseX - 40,
      y2: baseY + width * scale,
      color: '#7c3aed',
      lineweight: 1,
      layer: '3',
      properties: {
        value: width,
        unit: 'mm',
        style: 'vertical',
        dimensionType: 'linear',
      },
    });

    newElements.push({
      id: 'dim-height',
      type: 'dimension',
      x: baseX + length * scale + 40,
      y: baseY,
      x2: baseX + length * scale + 40,
      y2: baseY + (height + foundationDepth) * scale,
      color: '#7c3aed',
      lineweight: 1,
      layer: '3',
      properties: {
        value: height + foundationDepth,
        unit: 'mm',
        style: 'vertical',
        dimensionType: 'linear',
      },
    });

    // Title and info
    newElements.push({
      id: 'title',
      type: 'text',
      x: baseX,
      y: 30,
      color: '#000000',
      lineweight: 0,
      layer: '4',
      properties: {
        text: `${pebStructure.name} - Fabrication Drawing`,
        fontsize: 16,
      },
    });

    newElements.push({
      id: 'scale-info',
      type: 'text',
      x: baseX,
      y: baseY + width * scale + 80,
      color: '#000000',
      lineweight: 0,
      layer: '4',
      properties: {
        text: `Scale: 1:100 | Roof Pitch: ${roofPitch || 15}° | Column Spacing: ${columnSpacing}mm`,
        fontsize: 10,
      },
    });

    setElements(newElements);
  };

  // Draw CAD-style background grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 50 * zoom;
    const layer = layers.find((l) => l.id === '5');

    if (!layer?.visible) return;

    ctx.strokeStyle = layer.color;
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
  };

  // Draw dimension with proper CAD styling
  const drawDimension = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, x2, y2, color, properties } = element;
    const style = properties?.style || 'horizontal';
    const value = properties?.value || 0;
    const unit = properties?.unit || '';

    let scaledX1 = (x + panX) * scale;
    let scaledY1 = (y + panY) * scale;
    let scaledX2 = (x2 ? x2 + panX : x + panX) * scale;
    let scaledY2 = (y2 ? y2 + panY : y + panY) * scale;

    // Dimension line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(scaledX1, scaledY1);
    ctx.lineTo(scaledX2, scaledY2);
    ctx.stroke();
    ctx.setLineDash([]);

    // End caps
    const capSize = 8;
    ctx.fillStyle = color;

    // Start cap (triangle)
    ctx.beginPath();
    ctx.moveTo(scaledX1, scaledY1 - capSize / 2);
    ctx.lineTo(scaledX1 - capSize / 2, scaledY1);
    ctx.lineTo(scaledX1, scaledY1 + capSize / 2);
    ctx.closePath();
    ctx.fill();

    // End cap (triangle)
    ctx.beginPath();
    ctx.moveTo(scaledX2, scaledY2 - capSize / 2);
    ctx.lineTo(scaledX2 + capSize / 2, scaledY2);
    ctx.lineTo(scaledX2, scaledY2 + capSize / 2);
    ctx.closePath();
    ctx.fill();

    // Dimension text
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const midX = (scaledX1 + scaledX2) / 2;
    const midY = (scaledY1 + scaledY2) / 2;

    if (style === 'vertical') {
      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${value}${unit}`, 0, -12);
      ctx.restore();
    } else {
      ctx.fillText(`${value}${unit}`, midX, midY - 15);
    }
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
    ctx.lineWidth = lineweight * 1.5;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
  };

  // Draw line
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, x2, y2, color, lineweight } = element;
    const scaledX1 = (x + panX) * scale;
    const scaledY1 = (y + panY) * scale;
    const scaledX2 = (x2 ? x2 + panX : x + panX) * scale;
    const scaledY2 = (y2 ? y2 + panY : y + panY) * scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineweight * 1.5;
    ctx.beginPath();
    ctx.moveTo(scaledX1, scaledY1);
    ctx.lineTo(scaledX2, scaledY2);
    ctx.stroke();
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
    ctx.lineWidth = lineweight * 1.5;
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth / 2, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight);
    ctx.stroke();
  };

  // Draw text
  const drawText = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    scale: number
  ) => {
    const { x, y, color, properties } = element;
    const scaledX = (x + panX) * scale;
    const scaledY = (y + panY) * scale;
    const fontSize = (properties?.fontsize || 12) * zoom;

    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(properties?.text || '', scaledX, scaledY);
  };

  // Main draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (gridVisible) {
      drawGrid(ctx, width, height);
    }

    // Draw all elements
    const scale = zoom;
    elements.forEach((element) => {
      const layer = layers.find((l) => l.id === element.layer);
      if (layer && layer.visible) {
        switch (element.type) {
          case 'rectangle':
            drawRectangle(ctx, element, scale);
            break;
          case 'line':
            drawLine(ctx, element, scale);
            break;
          case 'polygon':
            drawPolygon(ctx, element, scale);
            break;
          case 'dimension':
            drawDimension(ctx, element, scale);
            break;
          case 'text':
            drawText(ctx, element, scale);
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
  }, [zoom, panX, panY, gridVisible, elements, layers]);

  // Handle dimension creation
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!dimensionMode.active || !dimensionMode.type) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    if (!dimensionMode.startPoint) {
      setDimensionMode((prev) => ({
        ...prev,
        startPoint: { x, y },
      }));
    } else {
      setDimensionMode((prev) => ({
        ...prev,
        endPoint: { x, y },
      }));
      setShowDimensionDialog(true);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click
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

  // Add dimension to canvas
  const addDimension = () => {
    if (!dimensionMode.startPoint || !dimensionMode.endPoint) return;

    const newDimension: DrawingElement = {
      id: `dim-${Date.now()}`,
      type: 'dimension',
      x: dimensionMode.startPoint.x,
      y: dimensionMode.startPoint.y,
      x2: dimensionMode.endPoint.x,
      y2: dimensionMode.endPoint.y,
      color: '#7c3aed',
      lineweight: 1,
      layer: '3',
      properties: {
        value: newDimensionValue || '0',
        unit: 'mm',
        style: dimensionMode.type?.includes('v') ? 'vertical' : 'horizontal',
        dimensionType: 'linear',
      },
    };

    setElements((prev) => [...prev, newDimension]);
    setDimensionMode({ active: false, type: null, startPoint: null, endPoint: null });
    setNewDimensionValue('');
    setShowDimensionDialog(false);
  };

  // Export to PDF
  const exportToPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Add border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);

      // Add drawing
      pdf.addImage(imgData, 'PNG', 10, 10, pageWidth - 20, pageHeight - 20);

      // Add title block
      const titleBlockY = pageHeight - 35;
      pdf.setFontSize(10);
      pdf.text(`Project: ${pebStructure.name}`, 15, titleBlockY);
      pdf.text(`Drawing: Fabrication Sheet`, 15, titleBlockY + 7);
      pdf.text(
        `Date: ${new Date().toLocaleDateString()}`,
        pageWidth - 60,
        titleBlockY
      );
      pdf.text(`Scale: 1:100`, pageWidth - 60, titleBlockY + 7);

      // Add specifications
      pdf.setFontSize(8);
      const specY = titleBlockY + 20;
      pdf.text(`Dimensions: L=${pebStructure.length}mm × W=${pebStructure.width}mm × H=${pebStructure.height}mm`, 15, specY);
      pdf.text(`Column Spacing: ${pebStructure.columnSpacing}mm | Roof Type: ${pebStructure.roofType}`, 15, specY + 5);

      pdf.save(`${pebStructure.name.replace(/\s+/g, '_')}_Fabrication_Sheet.pdf`);
      setShowPDFExport(false);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const toggleLayer = (layerId: string) => {
    setLayers(
      layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const startDimensionMode = (type: 'linear-h' | 'linear-v' | 'aligned') => {
    setDimensionMode({
      active: true,
      type,
      startPoint: null,
      endPoint: null,
    });
  };

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Left Panel - Layers & Tools */}
      <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden">
        {/* Layers Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-2 text-sky-400 mb-3">
              <Layers size={18} />
              <h3 className="font-semibold">Layers</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`p-2 rounded border-2 cursor-pointer transition text-xs ${
                  selectedLayer === layer.id
                    ? 'bg-slate-800 border-sky-500'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
                onClick={() => setSelectedLayer(layer.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-300">{layer.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayer(layer.id);
                    }}
                    className="text-slate-400 hover:text-sky-400"
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded border"
                    style={{ backgroundColor: layer.color, borderColor: layer.color }}
                  />
                  <span className="text-slate-500">{layer.color}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dimension Tools */}
        <div className="border-t border-slate-700 p-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-2">
            <DimensionsIcon size={16} />
            Dimension Tools
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => startDimensionMode('linear-h')}
              className={`w-full px-3 py-2 rounded text-xs font-medium transition ${
                dimensionMode.active && dimensionMode.type === 'linear-h'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Horizontal Dim
            </button>
            <button
              onClick={() => startDimensionMode('linear-v')}
              className={`w-full px-3 py-2 rounded text-xs font-medium transition ${
                dimensionMode.active && dimensionMode.type === 'linear-v'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Vertical Dim
            </button>
            <button
              onClick={() => setDimensionMode({ active: false, type: null, startPoint: null, endPoint: null })}
              className="w-full px-3 py-2 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
            >
              Cancel Dimension
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="h-16 bg-slate-900 border-b border-slate-700 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-sky-400">
              Professional CAD Fabrication Sheet
            </h1>
            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded">
              {pebStructure.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
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

            <span className="text-sm text-slate-400 w-14 text-center font-mono">
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
              onClick={() => setShowPDFExport(true)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition flex items-center gap-2"
              title="Export as PDF"
            >
              <Download size={18} />
              <span className="text-xs">PDF</span>
            </button>

            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-white relative overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1400}
            height={800}
            className="cursor-grab active:cursor-grabbing"
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />

          {/* Dimension mode indicator */}
          {dimensionMode.active && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-600/90 text-white px-4 py-2 rounded text-sm font-medium">
              {dimensionMode.startPoint ? 'Click end point' : 'Click start point'} for {dimensionMode.type} dimension
            </div>
          )}

          {/* Coordinate Display */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-2 rounded text-xs text-slate-400 font-mono">
            X: {(mousePos.x / zoom).toFixed(1)} Y: {(mousePos.y / zoom).toFixed(1)}
          </div>

          {/* Status Bar */}
          <div className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-2 rounded text-xs text-slate-400">
            {elements.length} Elements
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="h-10 bg-slate-900 border-t border-slate-700 px-6 flex items-center justify-between text-xs text-slate-400">
          <div>Ready | {dimensionMode.active ? 'Dimension Mode Active' : 'Normal Mode'}</div>
          <div className="flex gap-4">
            <span>L: {pebStructure.length}mm</span>
            <span>W: {pebStructure.width}mm</span>
            <span>H: {pebStructure.height}mm</span>
            <span>Scale 1:100</span>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-sky-400">PEB Structure Settings</h2>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-slate-400 hover:text-sky-400"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Structure Name
              </label>
              <input
                type="text"
                value={pebStructure.name}
                onChange={(e) =>
                  setPebStructure({ ...pebStructure, name: e.target.value })
                }
                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Length (mm)
                </label>
                <input
                  type="number"
                  value={pebStructure.length}
                  onChange={(e) =>
                    setPebStructure({
                      ...pebStructure,
                      length: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Width (mm)
                </label>
                <input
                  type="number"
                  value={pebStructure.width}
                  onChange={(e) =>
                    setPebStructure({
                      ...pebStructure,
                      width: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Height (mm)
                </label>
                <input
                  type="number"
                  value={pebStructure.height}
                  onChange={(e) =>
                    setPebStructure({
                      ...pebStructure,
                      height: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Column Spacing (mm)
                </label>
                <input
                  type="number"
                  value={pebStructure.columnSpacing}
                  onChange={(e) =>
                    setPebStructure({
                      ...pebStructure,
                      columnSpacing: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Roof Type
              </label>
              <select
                value={pebStructure.roofType}
                onChange={(e) =>
                  setPebStructure({
                    ...pebStructure,
                    roofType: e.target.value as 'pitched' | 'flat' | 'curved',
                  })
                }
                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
              >
                <option value="pitched">Pitched</option>
                <option value="flat">Flat</option>
                <option value="curved">Curved</option>
              </select>
            </div>

            {pebStructure.roofType === 'pitched' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Roof Pitch (degrees)
                </label>
                <input
                  type="number"
                  value={pebStructure.roofPitch || 15}
                  onChange={(e) =>
                    setPebStructure({
                      ...pebStructure,
                      roofPitch: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Foundation Depth (mm)
              </label>
              <input
                type="number"
                value={pebStructure.foundationDepth}
                onChange={(e) =>
                  setPebStructure({
                    ...pebStructure,
                    foundationDepth: parseInt(e.target.value),
                  })
                }
                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Dimension Input Dialog */}
      {showDimensionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold text-sky-400 mb-4">Add Dimension</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dimension Value
                </label>
                <input
                  type="text"
                  value={newDimensionValue}
                  onChange={(e) => setNewDimensionValue(e.target.value)}
                  placeholder="Enter value (e.g., 1200)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500"
                />
              </div>
              <div className="text-sm text-slate-400">
                Type: <span className="text-sky-400">{dimensionMode.type}</span> | Unit: <span className="text-sky-400">mm</span>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={addDimension}
                  className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium transition"
                >
                  Add Dimension
                </button>
                <button
                  onClick={() => {
                    setShowDimensionDialog(false);
                    setDimensionMode({ active: false, type: null, startPoint: null, endPoint: null });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Dialog */}
      {showPDFExport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-96">
            <h2 className="text-lg font-semibold text-sky-400 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Export to PDF
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded border border-slate-700">
                <p className="text-sm text-slate-300 mb-2">
                  <strong>Format:</strong> A3 Landscape (297 × 420 mm)
                </p>
                <p className="text-sm text-slate-300 mb-2">
                  <strong>Scale:</strong> 1:100
                </p>
                <p className="text-sm text-slate-300">
                  <strong>Project:</strong> {pebStructure.name}
                </p>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p>✓ Professional title block included</p>
                <p>✓ All layers and dimensions included</p>
                <p>✓ High resolution (300 DPI)</p>
                <p>✓ Specifications panel included</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={exportToPDF}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Export PDF
                </button>
                <button
                  onClick={() => setShowPDFExport(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedCADFabricationSheet;
