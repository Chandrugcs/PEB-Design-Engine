import React from "react";
import { PebOutputs } from "../types";
import { AlertTriangle, TrendingUp, Compass, Ruler } from "lucide-react";

interface BomDetailsProps {
  outputs: PebOutputs;
  globalStrategy?: string;
  dimUnit?: 'ft' | 'm';
}

export default function BomDetails({ outputs, dimUnit = 'ft' }: BomDetailsProps) {
  const failingItems = outputs.bomItems.filter((item) => !item.ok);

  const densityInKgSqft = outputs.steelDensity / 10.76391;
  const totalWeight = outputs.totalSteelMass / 1000;

  return (
    <div className="custom-panel w-full h-full flex flex-col" id="peb-bom-details">
      {/* Metrics Bar with Icons */}
      <div className="custom-metrics-bar grid grid-cols-3 border-b border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 font-mono shrink-0">
        <div className="custom-metric-box flex flex-col items-center justify-center p-3 border-r border-slate-300 dark:border-slate-700 select-none">
          <span className="custom-m-label flex items-center justify-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
            <Compass className="w-3 h-3 text-sky-500" />
            <span>Wind Pressure</span>
          </span>
          <span className="custom-m-val text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {outputs.windPressure.toFixed(3)}
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">kN/m²</span>
          </span>
        </div>

        <div className="custom-metric-box flex flex-col items-center justify-center p-3 border-r border-slate-300 dark:border-slate-700 select-none">
          <span className="custom-m-label flex items-center justify-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Steel Density</span>
          </span>
          <span className="custom-m-val text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {densityInKgSqft.toFixed(2)}
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">kg/sqft</span>
          </span>
        </div>

        <div className="custom-metric-box flex flex-col items-center justify-center p-3 select-none">
          <span className="custom-m-label flex items-center justify-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400 tracking-wider">
            <Ruler className="w-3 h-3 text-indigo-500" />
            <span>Total Weight</span>
          </span>
          <span className="custom-m-val text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {(outputs.totalSteelMass / 1000).toFixed(2)}
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">MT</span>
          </span>
        </div>
      </div>

      {/* Bill of Material Heading */}
      <div className="panel-header-block bom-title-block select-none text-center font-bold font-mono tracking-wider bg-slate-900 text-white dark:bg-slate-950 dark:text-slate-100 p-2 text-xs uppercase shrink-0">
        BILL OF MATERIAL & COMPLIANCE MATRIX
      </div>

      {/* Bill of Material Scrollable Table */}
      <div className="custom-table-wrapper select-none overflow-auto flex-grow min-h-0">
        <table className="custom-table w-full min-w-[450px] text-[11px] font-mono border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b-2 border-slate-300 dark:border-slate-700">
              <th className="p-2 text-center w-8">No.</th>
              <th className="p-2 text-left">Component Name</th>
              <th className="p-2 text-left">Engineering Profile Specs</th>
              <th className="p-2 text-right">Quantity</th>
              <th className="p-2 text-right">Estimated Mass</th>
              <th className="p-2 text-center w-24">Ratio Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {outputs.bomItems.map((item, index) => {
              const bgBadge = item.ok 
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60" 
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60";
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                  <td className="p-2 text-center text-slate-700 dark:text-slate-400 font-bold">{index + 1}</td>
                  <td className="p-2 font-bold text-slate-900 dark:text-slate-100">{item.name}</td>
                  <td className="p-2 text-slate-950 dark:text-slate-50 text-[11.5px] font-bold leading-tight">
                    {item.profile}
                  </td>
                  <td className="p-2 text-right text-slate-900 dark:text-slate-100 font-bold whitespace-nowrap">{item.qty}</td>
                  <td className="p-2 text-right text-slate-950 dark:text-slate-100 font-black whitespace-nowrap">
                    {item.weight.toLocaleString()} {item.unit}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10.5px] font-black tracking-wide ${bgBadge} capitalize`}>
                      {item.ratio}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Redflag critical note warnings */}
      {(failingItems.length > 0 || outputs.warnings.length > 0) && (
        <div className="custom-redflag-box shrink-0 mt-3 border-2 border-dashed border-rose-500/50 bg-rose-500/10 p-3 rounded flex flex-col gap-2">
          <div className="custom-rf-header text-rose-600 dark:text-rose-400 font-black flex items-center gap-2 text-xs uppercase font-mono tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>DESIGN COMPLIANCE & WARNINGS</span>
          </div>
          <div className="custom-rf-list flex flex-col gap-1.5 text-[10.5px] text-rose-700 dark:text-rose-300 font-medium font-mono leading-tight">
            {failingItems.map((item) => (
              <div key={item.id} className="flex items-start gap-1">
                <span className="text-rose-500 font-black shrink-0">•</span>
                <span>
                  <strong className="uppercase">{item.name}:</strong>{" "}
                  {item.msg || "Specification structural limit state checks violated."}
                </span>
              </div>
            ))}
            {outputs.warnings.map((w, index) => (
              <div key={index} className="flex items-start gap-1">
                <span className="text-amber-500 font-black shrink-0">!</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
