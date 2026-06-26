import { useState, useEffect, useId } from "react";
import { PebParams, PebOutputs } from "./types";
import { useCadGeometry, PlanViewSvg, FrameElevationSvg, AnchorPlateSvg } from "./components/CadDrawings";
import { getWindPressure } from "./calculations";
import InputsForm from "./components/InputsForm";
import BomDetails from "./components/BomDetails";
import CadDrawings from "./components/CadDrawings";
import { 
  Printer, 
  Sun, 
  Moon, 
  Eye, 
  TrendingUp, 
  Box, 
  Cpu, 
  ChevronRight, 
  CheckCircle,
  FileText,
  Sliders,
  Gauge,
  Sparkles
} from "lucide-react";

// The calculation is imported from "./calculations"
import { calculatePEB as calcEngine } from "./calculations";

export default function App() {
  const [params, setParams] = useState<PebParams>({
    projectName: "PEB Sizing & Optimization Log Sheet",
    span: 21.336,
    length: 45.72,
    eaveHeight: 7.315,
    slope: 5.0,
    windZone: 39,
    terrainClass: 1,
    soilSbc: 150,
    deadLoad: 0.25,
    liveLoad: 0.75,
    craneCapacity: 0,
    steelGrade: "E350",
    globalStrategy: "highly-optimized",
    optCol: "opt",
    optRaf: "opt",
    optSecondary: "continuous"
  });

  const [activeTab, setActiveTab] = useState<'design' | 'bom' | 'drawings'>('design');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);
  const [dimUnit, setDimUnit] = useState<'ft' | 'm'>('ft');
  const [showHeader, setShowHeader] = useState<boolean>(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setShowHeader(false);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const outputs = calcEngine(params);

  const baySpacingDisplayText = dimUnit === 'ft'
    ? `${(outputs.interiorBaySpacing * 3.28084).toFixed(2)} FT`
    : `${outputs.interiorBaySpacing.toFixed(2)} M`;

  const handleParamChange = (update: Partial<PebParams>) => {
    setParams(prev => ({ ...prev, ...update }));
  };

  const handlePrint = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();

  // Full-featured sub-component rendering the A4-conforming paper sheets
  const ReportContent = () => {
    const reportGeo = useCadGeometry(outputs, params);
    const reportIdPrefix = useId();

    const formatNum = (v: any) => {
      if (v === "" || v === undefined || v === null) return "0.00";
      const num = Number(v);
      return isNaN(num) ? "0.00" : num.toFixed(2);
    };
    
    return (
      <div className="report-box p-4 bg-white text-slate-900 border-2 border-slate-900 font-mono shadow-sm rounded-sm">
        <div className="report-top-half select-none">
          <div className="report-header-row border-b-2 border-slate-900 pb-3 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h1 className="report-title text-sm md:text-base font-black tracking-wider uppercase text-slate-900">
                PEB STRUCTURAL DESIGN AND TAKE-OFF SPECIFICATION REPORT
              </h1>
              <p className="report-subtitle text-[10px] text-slate-500 font-bold uppercase mt-1">
                Calculations Engine: IS 800:2007 steel standard limit-state envelopes
              </p>
            </div>
            <div className="report-meta text-[11px] leading-relaxed text-right font-medium text-slate-700 whitespace-nowrap">
              <div><strong>Project:</strong> {params.projectName}</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <h2 className="report-section-title text-[11px] font-black uppercase text-slate-800 border-b border-dashed border-slate-400 pb-1 mb-2">
            Section 1: Sizing Baseline parameters
          </h2>
          <div className="report-table-wrap overflow-x-auto mb-4">
            <table className="report-table w-full min-w-[500px] text-[10px] border border-slate-900 text-left">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Span Width:</strong> {formatNum(params.span)} m</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Building Length:</strong> {formatNum(params.length)} m</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Clear Eave Ht:</strong> {formatNum(params.eaveHeight)} m</td>
                  <td className="p-1 px-2"><strong>Frame Spacing:</strong> End: {outputs.endBaySpacing.toFixed(2)}m / Int: {outputs.interiorBaySpacing.toFixed(2)}m</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Roof Pitch:</strong> {formatNum(params.slope)}°</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Wind Velocity:</strong> {params.windZone} m/s</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Terrain Class:</strong> Cat {params.terrainClass}</td>
                  <td className="p-1 px-2"><strong>Soil SBC:</strong> {params.soilSbc} kN/m²</td>
                </tr>
                <tr className="border-b border-slate-900">
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Dead Load:</strong> {formatNum(params.deadLoad)} kN/m²</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Live Load:</strong> {formatNum(params.liveLoad)} kN/m²</td>
                  <td className="p-1 px-2 border-r border-slate-900"><strong>Overhead Crane:</strong> {params.craneCapacity} Tons</td>
                  <td className="p-1 px-2"><strong>Steel Grade:</strong> {params.steelGrade}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="report-section-title text-[11px] font-black uppercase text-slate-800 border-b border-dashed border-slate-400 pb-1 mb-2">
            Section 2: Component quantities index
          </h2>
          <div className="report-table-wrap overflow-x-auto mb-4">
            <table className="report-table report-table-s2 w-full min-w-[550px] text-[9.5px] border border-slate-900 text-left">
              <thead className="bg-slate-100 border-b border-slate-900 font-bold">
                <tr>
                  <th className="p-1.5 px-2 border-r border-slate-900 w-8 text-center">No.</th>
                  <th className="p-1.5 px-2 border-r border-slate-900">Component</th>
                  <th className="p-1.5 px-2 border-r border-slate-900">Framing Configuration Specs</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 text-right w-16">Qty</th>
                  <th className="p-1.5 px-2 border-r border-slate-900 text-right w-24">Mass</th>
                  <th className="p-1.5 px-2 text-center w-20">Limit Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {outputs.bomItems.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-900">
                    <td className="p-1.5 px-2 border-r border-slate-900 text-center">{index + 1}</td>
                    <td className="p-1.5 px-2 border-r border-slate-900 font-bold uppercase">{item.name}</td>
                    <td className="p-1.5 px-2 border-r border-slate-900">{item.profile}</td>
                    <td className="p-1.5 px-2 border-r border-slate-900 text-right">{item.qty}</td>
                    <td className="p-1.5 px-2 border-r border-slate-900 text-right font-bold">{item.weight.toLocaleString()} {item.unit}</td>
                    <td className="p-1.5 px-2 text-center font-bold">{item.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-summary mt-2 p-2 bg-slate-50 border border-slate-900 rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px] font-black text-center uppercase select-none">
            <div className="text-left sm:text-center shrink-0">Wind Pressure: {outputs.windPressure.toFixed(3)} kN/m²</div>
            <div className="shrink-0">Steel Density: {(dimUnit === 'ft' ? (outputs.steelDensity / 10.76391) : outputs.steelDensity).toFixed(2)} {dimUnit === 'ft' ? 'kg/sqft' : 'kg/m²'}</div>
            <div className="text-right sm:text-center font-bold text-slate-950 shrink-0">Total Steel: {(outputs.totalSteelMass / 1000).toFixed(2)} MT</div>
          </div>
        </div>

        <div className="report-bottom-half block print:block mt-6">
          <h2 className="report-section-title text-[11px] font-black uppercase text-slate-800 border-b border-dashed border-slate-400 pb-1 mb-2">
            Section 3: Live Engineering blueprints
          </h2>
          <div className="report-blueprints-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="report-bp-box p-2 border border-slate-950 rounded-sm bg-white text-center flex flex-col justify-between sm:row-span-2">
              <span className="lbl text-[8px] font-bold uppercase tracking-wider block mb-1">Roof Plan Layout</span>
              <div className="report-bp-viewport flex items-center justify-center min-h-[200px] sm:min-h-[290px]">
                <PlanViewSvg geo={reportGeo} idPrefix={`rep-p-${reportIdPrefix}`} />
              </div>
            </div>
            <div className="report-bp-box p-2 border border-slate-950 rounded-sm bg-white text-center flex flex-col justify-between">
              <span className="lbl text-[8px] font-bold uppercase tracking-wider block mb-1">Elevation Drawing View</span>
              <div className="report-bp-viewport flex items-center justify-center min-h-[120px]">
                <FrameElevationSvg geo={reportGeo} idPrefix={`rep-e-${reportIdPrefix}`} />
              </div>
            </div>
            <div className="report-bp-box p-2 border border-slate-950 rounded-sm bg-white text-center flex flex-col justify-between">
              <span className="lbl text-[8px] font-bold uppercase tracking-wider block mb-1">Anchor Bolt Pitch Layout</span>
              <div className="report-bp-viewport flex items-center justify-center min-h-[120px]">
                <AnchorPlateSvg geo={reportGeo} idPrefix={`rep-a-${reportIdPrefix}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col transition-colors duration-250 font-mono" style={{ background: "var(--body-bg-color)" }} id="peb-master-app">
      
      {/* Upper header action navigation panel */}
      <header className={`no-print app-header bg-slate-900 border-b-2 border-slate-800 text-white dark:bg-slate-950 transition-all duration-300 ease-in-out ${showHeader ? "opacity-100 max-h-[500px] p-4" : "opacity-0 max-h-0 p-0 overflow-hidden border-b-0 pointer-events-none"}`}>
        <div className="w-full max-w-7xl lg:max-w-none lg:px-6 mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 select-none">
            <div className="bg-sky-500 text-slate-950 p-2 rounded-lg font-black tracking-tighter text-sm flex items-center gap-1 shadow-md shrink-0">
              <Cpu className="w-4 h-4 animate-spin-slow" />
              <span>PEB v2</span>
            </div>
            <div>
              <h1 className="text-xs md:text-sm font-black font-mono tracking-wider uppercase m-0 flex items-center gap-1.5 text-slate-100">
                PEB SIZING & OPTIMIZATION MATRIX
              </h1>
              <p className="font-mono uppercase tracking-widest text-[9px] text-slate-400 m-0 mt-0.5">
                IS 800:2007 LIMIT STATE DESIGN METHOD | CAD ENGINE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Theme Toggle Button */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg border-2 border-slate-700 bg-slate-800 hover:bg-slate-750 transition text-slate-300 hover:text-slate-100 cursor-pointer flex items-center justify-center"
              title="Toggle Theme Mode"
              id="theme-toggler-btn"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
            </button>

            {/* Print & Preview Button */}
            <button 
              onClick={() => setShowMobilePreview(true)} 
              className="btn-print px-3 py-1 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 border-2 border-sky-800 text-white font-bold h-9 rounded text-[10px] uppercase select-none tracking-wider gap-1.5 cursor-pointer shadow-lg shadow-sky-500/10 flex items-center justify-center transition"
              id="main-preview-trigger"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>PREVIEW & PRINT</span>
            </button>

            {/* Collapse Button for Mobile space maximization */}
            <button
              onClick={() => setShowHeader(false)}
              className="lg:hidden px-2.5 h-9 bg-slate-800 hover:bg-slate-700 hover:text-white border-2 border-slate-700 text-slate-350 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
              title="Collapse header to maximize main area"
            >
              <span>Hide ▲</span>
            </button>
          </div>
        </div>
      </header>

      {/* Minimal replacement strip when header is auto-hidden/collapsed on mobile */}
      {!showHeader && (
        <div className="no-print lg:hidden w-full bg-slate-900 border-b border-slate-800 px-4 py-1.5 flex justify-between items-center transition-all duration-200">
          <div className="flex items-center gap-2 select-none text-[10px] font-bold text-slate-300 tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-sky-400 animate-spin-slow animate-pulse" />
            <span className="uppercase font-mono">PEB MATRIX</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-sky-450" />}
            </button>
            <button
              onClick={() => setShowMobilePreview(true)}
              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-550 rounded text-white text-[9px] font-bold uppercase tracking-wider cursor-pointer"
            >
              Print
            </button>
            <button 
              onClick={() => setShowHeader(true)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded text-[9px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-0.5"
            >
              <span>Menu ▽</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Tabs selectors on low-resolutions */}
      <div className="no-print lg:hidden sticky top-0 z-45 w-full px-2 py-3 border-b-2 border-slate-300 dark:border-slate-800 shadow-md" style={{ backgroundColor: "var(--body-bg-color)" }}>
        <div className="grid grid-cols-4 gap-1 rounded bg-slate-200 dark:bg-slate-900 p-1">
          <button 
            onClick={() => setActiveTab('design')} 
            className={`py-2 rounded font-mono text-[12px] font-black uppercase tracking-wider text-center cursor-pointer transition ${activeTab === 'design' ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-350 shadow-md' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
          >
            PARAMS
          </button>
          <button 
            onClick={() => setActiveTab('bom')} 
            className={`py-2 rounded font-mono text-[12px] font-black uppercase tracking-wider text-center cursor-pointer transition ${activeTab === 'bom' ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-350 shadow-md' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
          >
            BOM
          </button>
          <button 
            onClick={() => setActiveTab('drawings')} 
            className={`py-2 rounded font-mono text-[12px] font-black uppercase tracking-wider text-center cursor-pointer transition ${activeTab === 'drawings' ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-sky-350 shadow-md' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
          >
            DRAWING
          </button>
          <button 
            onClick={() => setActiveTab('ai')} 
            className={`py-2 rounded font-mono text-[12px] font-black uppercase tracking-wider text-center cursor-pointer transition flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'}`}
          >
            <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>AI</span>
          </button>
        </div>
      </div>

      {/* Primary Dashboard viewport panels */}
      <main className="no-print app-main w-full max-w-7xl lg:max-w-none lg:px-6 mx-auto px-4 py-2 flex-grow min-h-0 flex flex-col lg:flex lg:flex-col">
        
        {/* Mobile active content switcher */}
        <div className="lg:hidden flex-grow min-h-0 flex flex-col">
          {activeTab === 'design' && (
            <div className="flex-grow min-h-0 flex flex-col">
              <InputsForm 
                params={params} 
                onChange={handleParamChange} 
                calculatedBaySpacingText={baySpacingDisplayText} 
                dimUnit={dimUnit}
                setDimUnit={setDimUnit}
              />
            </div>
          )}
          {activeTab === 'bom' && (
            <div className="flex-grow min-h-0 flex flex-col">
              <BomDetails outputs={outputs} globalStrategy={params.globalStrategy} dimUnit={dimUnit} />
            </div>
          )}
          {activeTab === 'drawings' && (
            <div className="flex-grow min-h-0 flex flex-col">
              <CadDrawings outputs={outputs} params={params} />
            </div>
          )}
        </div>

        {/* Desktop bento layout: equal scroll panels side by side */}
        <div className="hidden lg:flex gap-4 flex-grow h-full min-h-0 items-stretch">
          <div className="flex-[0.8_1_0%] min-w-0 h-full min-h-0 transition-all duration-300">
            <InputsForm 
              params={params} 
              onChange={handleParamChange} 
              calculatedBaySpacingText={baySpacingDisplayText} 
              dimUnit={dimUnit}
              setDimUnit={setDimUnit}
            />
          </div>
          <div className="flex-[1.4_1_0%] min-w-0 h-full min-h-0 transition-all duration-300">
            <BomDetails outputs={outputs} globalStrategy={params.globalStrategy} dimUnit={dimUnit} />
          </div>
          <div className="flex-[0.8_1_0%] min-w-0 h-full min-h-0 transition-all duration-300">
            <CadDrawings outputs={outputs} params={params} />
          </div>
        </div>
      </main>

      {/* Isolated Print page rendering canvas, omitted on screen browsers */}
      <section id="print-canvas" className="hidden print:block w-full p-0 m-0 bg-white text-slate-950">
        <ReportContent />
        <footer className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[8px] uppercase tracking-widest text-slate-500 font-mono">
          <div>COMPUTED BY CHANDRASHEKAR G. &copy; {currentYear}</div>
          <div>IS 800:2007 OPTIMIZATION log MATRIX</div>
        </footer>
      </section>

      {/* High contrast overlay report printing and preview portal modal */}
      {showMobilePreview && (
        <div className="preview-modal-overlay fixed inset-0 z-55 overflow-y-auto bg-slate-950/95 flex flex-col" id="preview-modal-container">
          {/* Top controller rail */}
          <div className="preview-modal-bar sticky top-0 z-10 flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 text-white">
            <span className="label font-mono text-xs font-bold text-sky-400 tracking-wider uppercase flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>REPORT PRINT PREVIEW</span>
            </span>
            <div className="flex items-center gap-3">
              <button 
                className="print-btn px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow transition"
                onClick={() => {
                  setShowMobilePreview(false);
                  setTimeout(handlePrint, 120);
                }}
                id="modal-print-trigger"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
              <button 
                className="close-btn px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-bold rounded border border-slate-700 cursor-pointer transition"
                onClick={() => setShowMobilePreview(false)}
                id="modal-close-trigger"
              >
                Close
              </button>
            </div>
          </div>

          {/* Interactive draft preview canvas page area */}
          <div className="preview-paper-wrap flex-grow p-4 md:p-8 flex items-start justify-center overflow-x-auto bg-slate-900/60">
            <div className="preview-paper w-full max-w-4xl bg-white text-slate-900 p-6 md:p-8 shadow-2xl rounded border border-slate-300 min-w-[320px]">
              <ReportContent />
              <p className="report-footer-note mt-4 text-[9px] text-slate-400 tracking-wider text-center uppercase font-mono border-t border-dashed border-slate-300 pt-3 select-none">
                COMPUTED BY CHANDRASHEKAR G. &copy; {currentYear}. GENERATED LIVE FROM PEB SIZING &amp; OPTIMIZATION MATRIX.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen bottom information footer bar */}
      <footer className="no-print footer-bar bg-slate-900 border-t border-slate-800 p-3 text-center text-[10px] text-slate-400 dark:bg-slate-950 font-mono uppercase tracking-widest select-none">
        <div className="w-full max-w-7xl lg:max-w-none lg:px-6 mx-auto flex flex-col sm:flex-row justify-between items-center gap-1">
          <p className="m-0">© {currentYear} CHANDRASHEKAR G. ALL RIGHTS RESERVED.</p>
          <p className="m-0 text-slate-500 text-[9px] flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>IS 800:2007 COMPLIANT DESIGN MATRICES</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
