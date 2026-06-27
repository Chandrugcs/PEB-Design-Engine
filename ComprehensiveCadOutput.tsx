import React, { useId } from "react";
import { PebOutputs, PebParams } from "./types";
import { FileText, Download, Printer } from "lucide-react";

interface ComprehensiveCadOutputProps {
  outputs: PebOutputs;
  params: PebParams;
}

export function ComprehensiveCadOutput({
  outputs,
  params,
}: ComprehensiveCadOutputProps) {
  const idPrefix = useId();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Implementation for PDF export
    const element = document.getElementById("comprehensive-cad-drawing");
    if (element) {
      const printWindow = window.open("", "", "width=1200,height=800");
      if (printWindow) {
        printWindow.document.write(element.innerHTML);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-950 rounded-lg shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 border-b-4 border-blue-600">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold">PEB STRUCTURAL DRAWING</h1>
              <p className="text-slate-300 text-sm">Professional Engineering Blueprints</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Project Name</p>
            <p className="font-semibold">{params.projectName || "N/A"}</p>
          </div>
          <div>
            <p className="text-slate-400">Drawing Date</p>
            <p className="font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-slate-400">Revision</p>
            <p className="font-semibold">A</p>
          </div>
          <div>
            <p className="text-slate-400">Scale</p>
            <p className="font-semibold">As Shown</p>
          </div>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div id="comprehensive-cad-drawing" className="p-8 bg-slate-50 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Building Dimensions & Key Parameters */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-blue-500 pb-2">
              BUILDING DIMENSIONS
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Span (Clear Width):</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {typeof params.span === "number" ? params.span : parseFloat(params.span as any) || 0} m
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Length (Bay to Bay):</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {typeof params.length === "number" ? params.length : parseFloat(params.length as any) || 0} m
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Eave Height:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {typeof params.eaveHeight === "number" ? params.eaveHeight : parseFloat(params.eaveHeight) || 0} m
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Roof Slope:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {typeof params.slope === "number" ? params.slope : parseFloat(params.slope as any) || 0}°
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Number of Bays:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{outputs.numBays}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">End Bay Spacing:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {outputs.endBaySpacing.toFixed(2)} m
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Interior Bay Spacing:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {outputs.interiorBaySpacing.toFixed(2)} m
                </span>
              </div>
            </div>
          </div>

          {/* Load & Environmental Data */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-orange-500 pb-2">
              LOADS & ENVIRONMENT
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Dead Load:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {typeof params.deadLoad === "number" ? params.deadLoad : parseFloat(params.deadLoad as any) || 0} kN/m²
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Live Load:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {typeof params.liveLoad === "number" ? params.liveLoad : parseFloat(params.liveLoad as any) || 0} kN/m²
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Wind Zone:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {typeof params.windZone === "number" ? params.windZone : parseFloat(params.windZone as any) || 0} m/s
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Wind Pressure:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {outputs.windPressure.toFixed(2)} kN/m²
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Terrain Class:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">{params.terrainClass}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Soil SBC:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {typeof params.soilSbc === "number" ? params.soilSbc : parseFloat(params.soilSbc as any) || 0} kN/m²
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Crane Capacity:</span>
                <span className="text-orange-600 dark:text-orange-400 font-bold">
                  {typeof params.craneCapacity === "number" ? params.craneCapacity : parseFloat(params.craneCapacity as any) || 0} Tons
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Material & Structural Member Data */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Material Specifications */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-purple-500 pb-2">
              MATERIAL SPECIFICATIONS
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Steel Grade:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{params.steelGrade}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Total Steel Mass:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {outputs.totalSteelMass.toFixed(2)} kg
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Steel Density:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {outputs.steelDensity.toFixed(2)} kg/m³
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Foundation Volume:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {outputs.totalFoundationVolume.toFixed(2)} m³
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Bolt Grade:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{outputs.boltGrade}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Optimization Strategy:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{params.globalStrategy}</span>
              </div>
            </div>
          </div>

          {/* Structural Members Profile */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-red-500 pb-2">
              CRITICAL MEMBERS & PROFILES
            </h2>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Purlin Profile:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{outputs.purlinProfile}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Girt Profile:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{outputs.girtProfile}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Column Flange Width:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{outputs.colFlgW} mm</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Rafter Flange Width:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">{outputs.rafFlgW} mm</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-semibold">Base Plate L×W×T:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {outputs.basePlateLength}×{outputs.basePlateWidth}×{outputs.basePlateT} mm
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Bolt Ø×Gauge×Pitch:</span>
                <span className="text-red-600 dark:text-red-400 font-bold">
                  {outputs.boltDiameter}×{outputs.boltGauge}×{outputs.boltPitch} mm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Design Forces & Moments */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-green-500 pb-2">
            CRITICAL DESIGN MOMENTS (kNm)
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Base Moment</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{outputs.mBase.toFixed(2)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mbase</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Knee Moment</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{outputs.mKnee.toFixed(2)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mknee</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Ridge Moment</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{outputs.mRidge.toFixed(2)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mridge</p>
            </div>
          </div>
        </div>

        {/* Foundation Details */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-indigo-500 pb-2">
            FOUNDATION DETAILS
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Footing Dimensions</p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Width:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {outputs.foundationWidth.toFixed(2)} m
                  </span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Length:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {outputs.foundationLength.toFixed(2)} m
                  </span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Depth:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    {outputs.foundationDepth.toFixed(2)} m
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Base Plate & Bolts</p>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Plate T/H:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{outputs.basePlateT} mm</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Bolt Edge:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{outputs.boltEdge} mm</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-slate-100 dark:bg-slate-700/50 rounded">
                  <span>Bolt Qty:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">4 per frame</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill of Materials Summary */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-300 dark:border-slate-600 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 border-b-2 border-cyan-500 pb-2">
            BILL OF MATERIALS (BOM) SUMMARY
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-slate-200 dark:bg-slate-700 border-b-2 border-cyan-500">
                  <th className="p-2 text-left font-bold">Item</th>
                  <th className="p-2 text-left font-bold">Profile</th>
                  <th className="p-2 text-right font-bold">Qty</th>
                  <th className="p-2 text-right font-bold">Weight (kg)</th>
                  <th className="p-2 text-right font-bold">Unit</th>
                  <th className="p-2 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {outputs.bomItems.slice(0, 10).map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.profile}</td>
                    <td className="p-2 text-right">{item.qty}</td>
                    <td className="p-2 text-right">{item.weight.toFixed(2)}</td>
                    <td className="p-2 text-right">{item.unit}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          item.ok
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {item.ok ? "✓ OK" : "✗ FAIL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            Total Items: {outputs.bomItems.length} | Total Steel: {outputs.totalSteelMass.toFixed(2)} kg
          </p>
        </div>

        {/* Design Verification & Warnings */}
        {outputs.warnings && outputs.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 p-6 rounded-lg mb-8">
            <h2 className="text-lg font-bold text-yellow-800 dark:text-yellow-300 mb-3">⚠ DESIGN NOTES & WARNINGS</h2>
            <ul className="space-y-2 text-sm font-mono">
              {outputs.warnings.map((warning, idx) => (
                <li key={idx} className="flex gap-2 text-yellow-700 dark:text-yellow-200">
                  <span>•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer & Certification */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-lg border-t-4 border-blue-600 mt-8">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold mb-2">DRAWING INFORMATION</p>
              <div className="text-xs space-y-1 font-mono">
                <p>Scale: As Shown | Units: Metric (mm, m)</p>
                <p>Generated: {new Date().toLocaleString()}</p>
                <p>Software: PEB Design Engine v1.0</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">CERTIFICATION</p>
              <div className="text-xs space-y-1 font-mono">
                <p>This drawing is computer-generated and for reference only.</p>
                <p>Subject to design review and site-specific verification.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComprehensiveCadOutput;
