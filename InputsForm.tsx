import React, { useState, useEffect } from "react";
import { PebParams } from "../types";
import { Sliders, Anchor, Activity, Box, Settings, RefreshCw, CheckCircle } from "lucide-react";

interface InputsFormProps {
  params: PebParams;
  onChange: (update: Partial<PebParams>) => void;
  calculatedBaySpacingText: string;
  dimUnit: 'ft' | 'm';
  setDimUnit: (unit: 'ft' | 'm') => void;
}

export default function InputsForm({ params, onChange, calculatedBaySpacingText, dimUnit, setDimUnit }: InputsFormProps) {
  const M_TO_FT = 3.28084;

  const toDisplay = (meters: number | string) => {
    if (meters === '' || meters === undefined || meters === null) return '';
    const num = Number(meters);
    if (isNaN(num)) return '';
    const v = dimUnit === 'ft' ? num * M_TO_FT : num;
    return Math.round(v * 100) / 100;
  };

  // Helper to clean up typed numeric text
  const cleanNumericInput = (val: string) => {
    // Keep only numbers and a single decimal point
    let clean = val.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    // Strip leading zeros if followed by other digits (e.g., "07" -> "7")
    clean = clean.replace(/^0+(?=\d)/, '');
    return clean;
  };

  // Local string and numeric states to hold form values until committed
  const [localProjectName, setLocalProjectName] = useState('');
  const [localSpan, setLocalSpan] = useState('');
  const [localLength, setLocalLength] = useState('');
  const [localEaveHeight, setLocalEaveHeight] = useState('');
  const [localSlope, setLocalSlope] = useState('');
  const [localSoilSbc, setLocalSoilSbc] = useState('');
  const [localDeadLoad, setLocalDeadLoad] = useState('');
  const [localLiveLoad, setLocalLiveLoad] = useState('');
  
  const [localWindZone, setLocalWindZone] = useState<number | "">(39);
  const [localTerrainClass, setLocalTerrainClass] = useState<number | "">(1);
  const [localGlobalStrategy, setLocalGlobalStrategy] = useState<string>("highly-optimized");
  const [localCraneCapacity, setLocalCraneCapacity] = useState<number | "">(0);

  // Sync initial values from props
  useEffect(() => {
    setLocalProjectName(params.projectName);
  }, [params.projectName]);

  useEffect(() => {
    setLocalSpan(toDisplay(params.span).toString());
  }, [params.span, dimUnit]);

  useEffect(() => {
    setLocalLength(toDisplay(params.length).toString());
  }, [params.length, dimUnit]);

  useEffect(() => {
    setLocalEaveHeight(toDisplay(params.eaveHeight).toString());
  }, [params.eaveHeight, dimUnit]);

  useEffect(() => {
    setLocalSlope(params.slope === '' || params.slope === undefined || params.slope === null ? '' : params.slope.toString());
  }, [params.slope]);

  useEffect(() => {
    setLocalSoilSbc(params.soilSbc === '' || params.soilSbc === undefined || params.soilSbc === null ? '' : params.soilSbc.toString());
  }, [params.soilSbc]);

  useEffect(() => {
    setLocalDeadLoad(params.deadLoad === '' || params.deadLoad === undefined || params.deadLoad === null ? '' : params.deadLoad.toString());
  }, [params.deadLoad]);

  useEffect(() => {
    setLocalLiveLoad(params.liveLoad === '' || params.liveLoad === undefined || params.liveLoad === null ? '' : params.liveLoad.toString());
  }, [params.liveLoad]);

  useEffect(() => {
    setLocalWindZone(params.windZone);
  }, [params.windZone]);

  useEffect(() => {
    setLocalTerrainClass(params.terrainClass);
  }, [params.terrainClass]);

  useEffect(() => {
    setLocalGlobalStrategy(params.globalStrategy);
  }, [params.globalStrategy]);

  useEffect(() => {
    setLocalCraneCapacity(params.craneCapacity);
  }, [params.craneCapacity]);

  // Handle typed numeric inputs locally
  const handleLocalChange = (id: 'span' | 'length' | 'eaveHeight' | 'slope' | 'soilSbc' | 'deadLoad' | 'liveLoad', val: string) => {
    const cleaned = cleanNumericInput(val);

    if (id === 'span') setLocalSpan(cleaned);
    else if (id === 'length') setLocalLength(cleaned);
    else if (id === 'eaveHeight') setLocalEaveHeight(cleaned);
    else if (id === 'slope') setLocalSlope(cleaned);
    else if (id === 'soilSbc') setLocalSoilSbc(cleaned);
    else if (id === 'deadLoad') setLocalDeadLoad(cleaned);
    else if (id === 'liveLoad') setLocalLiveLoad(cleaned);
  };

  // State to track if there are uncommitted changes
  const isChanged = 
    localProjectName !== params.projectName ||
    localSpan !== toDisplay(params.span).toString() ||
    localLength !== toDisplay(params.length).toString() ||
    localEaveHeight !== toDisplay(params.eaveHeight).toString() ||
    localSlope !== (params.slope === '' || params.slope === undefined || params.slope === null ? '' : params.slope.toString()) ||
    localSoilSbc !== (params.soilSbc === '' || params.soilSbc === undefined || params.soilSbc === null ? '' : params.soilSbc.toString()) ||
    localDeadLoad !== (params.deadLoad === '' || params.deadLoad === undefined || params.deadLoad === null ? '' : params.deadLoad.toString()) ||
    localLiveLoad !== (params.liveLoad === '' || params.liveLoad === undefined || params.liveLoad === null ? '' : params.liveLoad.toString()) ||
    localWindZone !== params.windZone ||
    localTerrainClass !== params.terrainClass ||
    localGlobalStrategy !== params.globalStrategy ||
    localCraneCapacity !== params.craneCapacity;

  const commitChanges = () => {
    const parsedSpan = Number(localSpan) || 0;
    const parsedLength = Number(localLength) || 0;
    const parsedEaveHeight = Number(localEaveHeight) || 0;
    const parsedSlope = Number(localSlope) || 0;
    const parsedSoilSbc = Number(localSoilSbc) || 0;
    const parsedDeadLoad = Number(localDeadLoad) || 0;
    const parsedLiveLoad = Number(localLiveLoad) || 0;

    const spanMeters = dimUnit === 'ft' ? parsedSpan / M_TO_FT : parsedSpan;
    const lengthMeters = dimUnit === 'ft' ? parsedLength / M_TO_FT : parsedLength;
    const eaveHeightMeters = dimUnit === 'ft' ? parsedEaveHeight / M_TO_FT : parsedEaveHeight;

    const update: Partial<PebParams> = {
      projectName: localProjectName,
      span: Math.round(spanMeters * 1000) / 1000,
      length: Math.round(lengthMeters * 1000) / 1000,
      eaveHeight: Math.round(eaveHeightMeters * 1000) / 1000,
      slope: parsedSlope,
      soilSbc: parsedSoilSbc,
      deadLoad: parsedDeadLoad,
      liveLoad: parsedLiveLoad,
      windZone: localWindZone === '' ? '' : Number(localWindZone),
      terrainClass: localTerrainClass === '' ? '' : Number(localTerrainClass),
      globalStrategy: localGlobalStrategy,
      craneCapacity: localCraneCapacity === '' ? '' : Number(localCraneCapacity)
    };

    // Auto-align optimizer strategies based on the strategy selection
    if (localGlobalStrategy === 'ultra-lean') {
      update.optCol = 'min';
      update.optRaf = 'min';
      update.optSecondary = 'light';
    } else if (localGlobalStrategy === 'highly-optimized' || localGlobalStrategy === 'balanced') {
      update.optCol = 'opt';
      update.optRaf = 'opt';
      update.optSecondary = 'continuous';
    } else if (localGlobalStrategy === 'safe') {
      update.optCol = 'stiff';
      update.optRaf = 'stiff';
      update.optSecondary = 'heavy';
    } else if (localGlobalStrategy === 'heavy') {
      update.optCol = 'heavy';
      update.optRaf = 'heavy';
      update.optSecondary = 'heavy';
    }

    onChange(update);
  };

  // Auto-commit changes to parent
  useEffect(() => {
    if (isChanged) {
      const timer = setTimeout(() => {
        commitChanges();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    isChanged, 
    localProjectName, 
    localSpan, 
    localLength, 
    localEaveHeight, 
    localSlope, 
    localSoilSbc, 
    localDeadLoad, 
    localLiveLoad, 
    localWindZone, 
    localTerrainClass, 
    localGlobalStrategy, 
    localCraneCapacity, 
    dimUnit, 
    onChange
  ]);

  return (
    <div className="custom-panel w-full h-full flex flex-col" id="peb-inputs-form">
      <div className="panel-header-block flex items-center gap-2 select-none shrink-0">
        <Sliders className="w-4 h-4 text-sky-400" />
        <span>Design Parameters</span>
        {isChanged && (
          <button 
            onClick={commitChanges}
            className="ml-auto text-[9px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded hover:bg-amber-500 uppercase tracking-wider flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Update
          </button>
        )}
      </div>
      
      <div className="panel-body-content flex-grow overflow-y-auto lg:scrollbar-none min-h-0 space-y-4 pr-1 pb-4">
        {/* Project Name Input */}
        <div className="custom-input-group">
          <label htmlFor="projectName" className="flex items-center gap-1">
            <Box className="w-3.5 h-3.5 text-slate-400" />
            <span>Project Name</span>
          </label>
          <input
            type="text"
            id="projectName"
            className="project-input-text bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            value={localProjectName}
            onChange={(e) => setLocalProjectName(e.target.value)}
          />
        </div>

        <div className="custom-divider"></div>

        {/* Units Selection */}
        <div className="custom-input-group">
          <label htmlFor="dimUnit" className="flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Input Unit</span>
          </label>
          <select
            id="dimUnit"
            value={dimUnit}
            onChange={(e) => setDimUnit(e.target.value as 'ft' | 'm')}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="ft">Feet (ft)</option>
            <option value="m">Meters (m)</option>
          </select>
        </div>

        {/* Building Dimensions */}
        <div className="custom-input-group">
          <label htmlFor="span">
            Building Span <span className="text-[10px] lowercase text-slate-400">({dimUnit})</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="span"
            value={localSpan}
            onChange={(e) => handleLocalChange('span', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-input-group">
          <label htmlFor="length">
            Total Length <span className="text-[10px] lowercase text-slate-400">({dimUnit})</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="length"
            value={localLength}
            onChange={(e) => handleLocalChange('length', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-input-group">
          <label htmlFor="eaveHeight">
            Clear Eave Ht <span className="text-[10px] lowercase text-slate-400">({dimUnit})</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="eaveHeight"
            value={localEaveHeight}
            onChange={(e) => handleLocalChange('eaveHeight', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-input-group opacity-95">
          <label className="text-slate-700 dark:text-slate-300 font-bold">
            Frame Spacing <span className="text-[10px] lowercase text-slate-400">(Auto)</span>
          </label>
          <input
            type="text"
            id="bay_sp_display"
            className="text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-900 border-dashed animate-none font-bold"
            style={{ pointerEvents: "none" }}
            readOnly
            value={calculatedBaySpacingText}
          />
        </div>

        <div className="custom-input-group">
          <label htmlFor="slope">
            Roof Pitch <span className="text-[10px] lowercase text-slate-400">(Deg)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="slope"
            value={localSlope}
            onChange={(e) => handleLocalChange('slope', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-divider"></div>

        {/* Environmental Loads */}
        <div className="custom-input-group">
          <label htmlFor="windZone">Basic Wind (Vb)</label>
          <select
            id="windZone"
            value={localWindZone}
            onChange={(e) => setLocalWindZone(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="33">33 m/s (Zone 1)</option>
            <option value="39">39 m/s (Zone 2)</option>
            <option value="44">44 m/s (Zone 3)</option>
            <option value="47">47 m/s (Zone 4)</option>
            <option value="50">50 m/s (Zone 5)</option>
            <option value="55">55 m/s (Zone 6)</option>
          </select>
        </div>

        <div className="custom-input-group">
          <label htmlFor="terrainClass">Terrain Class</label>
          <select
            id="terrainClass"
            value={localTerrainClass}
            onChange={(e) => setLocalTerrainClass(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="1">Category 1</option>
            <option value="2">Category 2</option>
            <option value="3">Category 3</option>
          </select>
        </div>

        <div className="custom-input-group">
          <label htmlFor="soilSbc">
            Soil SBC <span className="text-[10px] lowercase text-slate-400">(kN/m²)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="soilSbc"
            value={localSoilSbc}
            onChange={(e) => handleLocalChange('soilSbc', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-divider"></div>

        {/* Optimization Options Section */}
        <div className="custom-opt-section p-3 mb-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="custom-opt-title text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wider border-b pb-1 border-slate-300 dark:border-slate-700 mb-2">
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Optimization Control</span>
          </div>

          <div className="custom-input-group">
            <label htmlFor="globalStrategy">Sizing Method</label>
            <select
              id="globalStrategy"
              value={localGlobalStrategy === 'balanced' ? 'highly-optimized' : localGlobalStrategy}
              onChange={(e) => setLocalGlobalStrategy(e.target.value)}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="ultra-lean">Ultra-Lean (UR 0.98)</option>
              <option value="highly-optimized">Highly Optimized (UR 0.88)</option>
              <option value="safe">Conservative (UR 0.75)</option>
              <option value="heavy">Industrial Grade (UR 0.60)</option>
            </select>
          </div>
        </div>

        <div className="custom-divider"></div>

        {/* Gravity payloads & Crane load */}
        <div className="custom-input-group">
          <label htmlFor="craneCapacity" className="flex items-center gap-1">
            <Anchor className="w-3.5 h-3.5 text-slate-400" />
            <span>Crane Load System</span>
          </label>
          <select
            id="craneCapacity"
            value={localCraneCapacity}
            onChange={(e) => setLocalCraneCapacity(e.target.value === '' ? '' : Number(e.target.value))}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          >
            <option value="0">0 (No Crane)</option>
            <option value="5">5 Tons Capacity</option>
            <option value="7.5">7.5 Tons Capacity</option>
            <option value="10">10 Tons Capacity</option>
          </select>
        </div>

        <div className="custom-input-group">
          <label htmlFor="deadLoad">
            Dead Load <span className="text-[10px] lowercase text-slate-400">(kN/m²)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="deadLoad"
            value={localDeadLoad}
            onChange={(e) => handleLocalChange('deadLoad', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

        <div className="custom-input-group">
          <label htmlFor="liveLoad">
            Live Load <span className="text-[10px] lowercase text-slate-400">(kN/m²)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            id="liveLoad"
            value={localLiveLoad}
            onChange={(e) => handleLocalChange('liveLoad', e.target.value)}
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
            placeholder="0"
          />
        </div>

      </div>
    </div>
  );
}
