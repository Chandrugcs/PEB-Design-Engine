import React, { useId } from "react";
import { PebOutputs, PebParams } from "../types";
import { Layout } from "lucide-react";

interface CadDrawingsProps {
  outputs: PebOutputs;
  params: PebParams;
}

export function useCadGeometry(outputs: PebOutputs, params: PebParams) {
  const rawSpan = typeof params.span === "number" ? params.span : parseFloat(params.span as any) || 0;
  const rawLength = typeof params.length === "number" ? params.length : parseFloat(params.length as any) || 0;
  const rawEaveHeight = typeof params.eaveHeight === "number" ? params.eaveHeight : parseFloat(params.eaveHeight) || 0;

  const span = rawSpan <= 0.1 ? 0.1 : rawSpan;
  const length = rawLength <= 0.1 ? 0.1 : rawLength;
  const eaveHeight = rawEaveHeight <= 0.1 ? 0.1 : rawEaveHeight;

  const rawSlope = typeof params.slope === "number" ? params.slope : parseFloat(params.slope as any) || 0;
  const slope = Math.max(0.1, Math.min(80, rawSlope));
  const deadLoad = typeof params.deadLoad === "number" ? params.deadLoad : parseFloat(params.deadLoad as any) || 0;
  const liveLoad = typeof params.liveLoad === "number" ? params.liveLoad : parseFloat(params.liveLoad as any) || 0;

  const numBays = outputs.numBays;
  const endBaySpacing = outputs.endBaySpacing;
  const interiorBaySpacing = outputs.interiorBaySpacing;
  const purlinProfile = outputs.purlinProfile;

  const pMarginLeft = 35;
  const pMarginRight = 195;
  const pMarginTop = 30;
  const pMarginBottom = 290;

  const framesList = [];
  const baysNum = numBays;
  for (let i = 0; i <= baysNum; i++) framesList.push(i);

  const frameYPositions = [];
  let cumulativeY = pMarginTop;
  frameYPositions.push(cumulativeY);
  for (let i = 1; i <= baysNum; i++) {
    const dist = (i === 1 || i === baysNum) ? endBaySpacing : interiorBaySpacing;
    const yStep = (dist / length) * 260;
    cumulativeY += yStep;
    frameYPositions.push(cumulativeY);
  }

  const firstBayY1 = frameYPositions[0];
  const firstBayY2 = frameYPositions[1];
  const lastBayY1 = frameYPositions[baysNum - 1];
  const lastBayY2 = frameYPositions[baysNum];

  const slopeRad = (slope * Math.PI) / 180;
  const halfSlopeLength = (span / 2) / Math.cos(slopeRad);
  const loadMultiplier = Math.max(0.7, Math.min(1.6, (deadLoad + liveLoad) / 1.0));
  const idealPurlinCc = 1.40 / Math.sqrt(loadMultiplier);
  let numPurlinSpaces = Math.max(2, Math.round(halfSlopeLength / idealPurlinCc));
  if (numPurlinSpaces > 200) numPurlinSpaces = 200;
  const accuratePurlinCc = halfSlopeLength / numPurlinSpaces;

  const planStepX = 80 / numPurlinSpaces;

  const purlinLinesIndices = [];
  for (let p = 1; p < numPurlinSpaces; p++) purlinLinesIndices.push(p);

  const hApexCalc = (span / 2) * Math.sin(slope * Math.PI / 180);
  let hScale = (162.5 * 1.1 * 1.15) / Math.max(12, eaveHeight + hApexCalc);
  if (!isFinite(hScale) || hScale > 5000) hScale = 5000;
  let wScale = (188.5 * 1.1 * 1.15) / span;
  if (!isFinite(wScale) || wScale > 5000) wScale = 5000;

  const gBaseY = 150;
  const gEaveY = gBaseY - (eaveHeight * hScale);
  const gApexY = gEaveY - (hApexCalc * hScale);

  const gLeftX = 45;
  const gRightX = 45 + (span * wScale);
  const gMidX = 45 + ((span / 2) * wScale);

  const cTopMm = (outputs.colTopD / 1000) * hScale;
  const cBotMm = (outputs.colBaseD / 1000) * hScale;
  const rStMm = (outputs.rafSt / 1000) * hScale;
  const rMdMm = (outputs.rafMd / 1000) * hScale;
  const rEnMm = (outputs.rafEn / 1000) * hScale;

  const footingW = 24;
  const fdnDepthM = outputs.foundationDepth;
  const footingH = Math.max(16, fdnDepthM * 20);

  const gMidpointLeftX = gLeftX + ((gMidX - gLeftX) * 0.5);
  const gMidpointLeftY = gEaveY + ((gApexY - gEaveY) * 0.5);

  const gMidpointRightX = gRightX - ((gRightX - gMidX) * 0.5);
  const gMidpointRightY = gEaveY + ((gApexY - gEaveY) * 0.5);

  const PL_W = outputs.basePlateLength;
  const PL_H = outputs.basePlateWidth;
  const PL_T = outputs.basePlateT;
  const BOLT_D = outputs.boltDiameter;
  const BOLT_EDGE = outputs.boltEdge;
  const BOLT_LENGTH = Math.max(600, Math.round(BOLT_D * 25));

  const vW = 160;
  const vH = 120;
  const pad = 22;

  const scaleX = PL_W > 1 ? (vW - pad * 2) / PL_W : 1;
  const scaleY = PL_H > 1 ? (vH - pad * 2) / PL_H : 1;
  let sc = Math.min(scaleX, scaleY);
  if (isNaN(sc) || !isFinite(sc)) sc = 1;

  const pw = PL_W * sc;
  const ph = PL_H * sc;
  const ox = (vW - pw) / 2;
  const oy = (vH - ph) / 2;

  const bex = BOLT_EDGE * sc;
  const bey = BOLT_EDGE * sc;
  const br = (BOLT_D / 2) * sc;

  const bolts: [number, number][] = [
    [ox + bex, oy + bey],
    [ox + pw - bex, oy + bey],
    [ox + bex, oy + ph - bey],
    [ox + pw - bex, oy + ph - bey],
  ];

  const colW = outputs.colFlgW * sc;
  const colH = outputs.colFlgW * sc;
  const cx = ox + pw / 2 - colW / 2;
  const cy = oy + ph / 2 - colH / 2;

  return {
    span, length, eaveHeight, numBays, endBaySpacing, interiorBaySpacing, purlinProfile,
    pMarginLeft, pMarginRight, pMarginTop, pMarginBottom, framesList, baysNum, frameYPositions,
    firstBayY1, firstBayY2, lastBayY1, lastBayY2, numPurlinSpaces, accuratePurlinCc, planStepX,
    purlinLinesIndices, gBaseY, gEaveY, gApexY, gLeftX, gRightX, gMidX, cTopMm, cBotMm, rStMm, rMdMm, rEnMm,
    footingW, footingH, gMidpointLeftX, gMidpointLeftY, gMidpointRightX, gMidpointRightY,
    PL_W, PL_H, PL_T, BOLT_D, BOLT_EDGE, BOLT_LENGTH, pw, ph, ox, oy, bex, bey, br, bolts, colW, colH, cx, cy,
    mKnee: outputs.mKnee, mRidge: outputs.mRidge, mBase: outputs.mBase
  };
}

export function PlanViewSvg({ geo, idPrefix }: { geo: any; idPrefix: string }) {
  const {
    pMarginLeft, pMarginRight, pMarginTop, pMarginBottom, framesList, baysNum, frameYPositions,
    firstBayY1, firstBayY2, lastBayY1, lastBayY2, numPurlinSpaces, accuratePurlinCc, planStepX,
    purlinLinesIndices, purlinProfile, endBaySpacing, interiorBaySpacing, length
  } = geo;
  const arrowStartId = `${idPrefix}-plan-s`;
  const arrowEndId = `${idPrefix}-plan-e`;

  return (
    <svg viewBox="0 0 240 340" className="w-full text-slate-800 dark:text-slate-200" style={{ height: "340px", background: "var(--cad-bg)" }}>
      <defs>
        <marker id={arrowStartId} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 5 L 10 2 L 10 8 z" fill="currentColor" />
        </marker>
        <marker id={arrowEndId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 10 5 L 0 2 L 0 8 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Border Outline */}
      <rect x={pMarginLeft} y={pMarginTop} width={160} height={260} fill="none" stroke="currentColor" strokeWidth={1} />
      
      {/* Center Line */}
      <line x1={115} y1={pMarginTop} x2={115} y2={pMarginBottom} className="stroke-rose-500 dark:stroke-rose-400" strokeWidth={1} strokeDasharray="4,4" />

      {/* Frame Positions & Girth Lines */}
      {framesList.map((i: number) => {
        const yPos = frameYPositions[i];
        const isFirst = i === 0;
        return (
          <g key={i}>
            <rect x={pMarginLeft - 5} y={yPos - 3} width={5} height={6} fill="none" stroke="currentColor" strokeWidth={0.8} />
            <rect x={pMarginRight} y={yPos - 3} width={5} height={6} fill="none" stroke="currentColor" strokeWidth={0.8} />
            <line x1={pMarginLeft} y1={yPos} x2={pMarginRight} y2={yPos} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.8} />
            <text x={8} y={yPos + 3} className="fill-slate-500 dark:fill-slate-400 font-mono text-[8px] font-bold">FR-{i + 1}</text>

            {isFirst && (
              <g className="text-sky-600 dark:text-sky-400">
                <line x1={205} y1={yPos} x2={205} y2={frameYPositions[1]} stroke="currentColor" strokeWidth={0.9} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
                <text x={214} y={(yPos + frameYPositions[1]) / 2} fill="currentColor" className="font-mono text-[8px] font-black" transform={`rotate(90 214 ${(yPos + frameYPositions[1]) / 2})`} textAnchor="middle">
                  {endBaySpacing.toFixed(2)}M
                </text>
                <line x1={195} y1={yPos} x2={208} y2={yPos} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
                <line x1={195} y1={frameYPositions[1]} x2={208} y2={frameYPositions[1]} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
              </g>
            )}

            {isFirst && baysNum > 2 && (
              <g className="text-sky-600 dark:text-sky-400">
                <line x1={205} y1={frameYPositions[2]} x2={205} y2={frameYPositions[3]} stroke="currentColor" strokeWidth={0.9} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
                <text x={214} y={(frameYPositions[2] + frameYPositions[3]) / 2} fill="currentColor" className="font-mono text-[8px] font-black" transform={`rotate(90 214 ${(frameYPositions[2] + frameYPositions[3]) / 2})`} textAnchor="middle">
                  {interiorBaySpacing.toFixed(2)}M
                </text>
                <line x1={195} y1={frameYPositions[2]} x2={208} y2={frameYPositions[2]} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
                <line x1={195} y1={frameYPositions[3]} x2={208} y2={frameYPositions[3]} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
              </g>
            )}
          </g>
        );
      })}

      {/* Tension Cross-bracings Rods */}
      <line x1={35} y1={firstBayY1} x2={115} y2={firstBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={115} y1={firstBayY1} x2={35} y2={firstBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={115} y1={firstBayY1} x2={195} y2={firstBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={195} y1={firstBayY1} x2={115} y2={firstBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />

      <line x1={35} y1={lastBayY1} x2={115} y2={lastBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={115} y1={lastBayY1} x2={35} y2={lastBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={115} y1={lastBayY1} x2={195} y2={lastBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />
      <line x1={195} y1={lastBayY1} x2={115} y2={lastBayY2} stroke="currentColor" strokeWidth={1} strokeDasharray="3,3" className="stroke-slate-600 dark:stroke-slate-400" />

      {/* Purlins Grid Lines */}
      {purlinLinesIndices.map((p: number) => {
        const xLeft = 35 + (p * planStepX);
        const xRight = 115 + (p * planStepX);
        return (
          <g key={p}>
            <line x1={xLeft} y1={pMarginBottom} x2={xLeft} y2={pMarginTop} stroke="currentColor" strokeWidth={0.6} strokeDasharray="2,2" className="stroke-slate-400 dark:stroke-slate-600 opacity-50" />
            <line x1={xRight} y1={pMarginBottom} x2={xRight} y2={pMarginTop} stroke="currentColor" strokeWidth={0.6} strokeDasharray="2,2" className="stroke-slate-400 dark:stroke-slate-600 opacity-50" />
          </g>
        );
      })}

      {numPurlinSpaces > 1 && (
        <g className="text-teal-600 dark:text-teal-400">
          <line x1={35 + planStepX} y1={16} x2={35 + (2 * planStepX)} y2={16} stroke="currentColor" strokeWidth={0.9} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
          <text x={(35 + planStepX + 35 + (2 * planStepX)) / 2} y={11} fill="currentColor" className="font-mono text-[9px] font-black" textAnchor="middle">
            {accuratePurlinCc.toFixed(2)}m
          </text>
          <line x1={35 + planStepX} y1={13} x2={35 + planStepX} y2={30} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
          <line x1={35 + (2 * planStepX)} y1={13} x2={35 + (2 * planStepX)} y2={30} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
        </g>
      )}

      {/* Profile Label */}
      <g transform={`translate(${35 + 2 * planStepX + 4}, 155) rotate(-90)`} className="fill-slate-500 dark:fill-slate-400">
        <text x={0} y={1} fill="currentColor" className="font-mono text-[9px] font-bold" textAnchor="middle" letterSpacing="0.2px">
          {purlinProfile.split(" ")[0]}
        </text>
      </g>

      {/* Building Total Length Dimension */}
      <g className="text-slate-800 dark:text-sky-400">
        <line x1={228} y1={pMarginTop} x2={228} y2={pMarginBottom} stroke="currentColor" strokeWidth={0.8} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
        <text x={236} y={pMarginTop + 130} fill="currentColor" className="font-mono text-[10px] font-black" transform={`rotate(90 236 ${pMarginTop + 130})`} textAnchor="middle">
          {length.toFixed(1)} m
        </text>
      </g>
    </svg>
  );
}

export function FrameElevationSvg({ geo, idPrefix }: { geo: any; idPrefix: string }) {
  const {
    gBaseY, gEaveY, gApexY, gLeftX, gRightX, gMidX, cTopMm, cBotMm, rStMm, rMdMm, rEnMm,
    footingW, footingH, gMidpointLeftX, gMidpointLeftY, gMidpointRightX, gMidpointRightY,
    span, eaveHeight, mKnee, mRidge, mBase
  } = geo;
  const arrowStartId = `${idPrefix}-elev-s`;
  const arrowEndId = `${idPrefix}-elev-e`;

  return (
    <svg viewBox="-10 -65 315 250" className="w-full text-slate-800 dark:text-slate-200" style={{ height: "213px", background: "var(--cad-bg)" }}>
      <defs>
        <marker id={arrowStartId} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 0 5 L 10 2 L 10 8 z" fill="currentColor" />
        </marker>
        <marker id={arrowEndId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 10 5 L 0 2 L 0 8 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Ground Line */}
      <line x1={5} y1={gBaseY} x2={275} y2={gBaseY} className="stroke-slate-500 dark:stroke-slate-400" strokeWidth={1.5} />

      {/* Footings Draft */}
      <rect x={gLeftX - footingW / 2} y={gBaseY} width={footingW} height={footingH} fill="none" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={1} />
      <rect x={gRightX - footingW / 2} y={gBaseY} width={footingW} height={footingH} fill="none" className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={1} />

      {/* Columns Polygon Drafts */}
      <polygon points={`${gLeftX},${gBaseY} ${gLeftX + cBotMm},${gBaseY} ${gLeftX + cTopMm},${gEaveY} ${gLeftX},${gEaveY}`} className="fill-slate-200/60 dark:fill-slate-800/40" stroke="currentColor" strokeWidth={1.2} />
      <polygon points={`${gRightX},${gBaseY} ${gRightX - cBotMm},${gBaseY} ${gRightX - cTopMm},${gEaveY} ${gRightX},${gEaveY}`} className="fill-slate-200/60 dark:fill-slate-800/40" stroke="currentColor" strokeWidth={1.2} />

      {/* Tapered Rafter Polygons */}
      <polygon points={`${gLeftX},${gEaveY} ${gMidpointLeftX},${gMidpointLeftY} ${gMidpointLeftX},${gMidpointLeftY + rMdMm} ${gLeftX},${gEaveY + rStMm}`} className="fill-slate-300/40 dark:fill-slate-700/30" stroke="currentColor" strokeWidth={1.2} />
      <polygon points={`${gMidpointLeftX},${gMidpointLeftY} ${gMidX},${gApexY} ${gMidX},${gApexY + rEnMm} ${gMidpointLeftX},${gMidpointLeftY + rMdMm}`} className="fill-slate-300/40 dark:fill-slate-700/30" stroke="currentColor" strokeWidth={1.2} />

      <polygon points={`${gRightX},${gEaveY} ${gMidpointRightX},${gMidpointRightY} ${gMidpointRightX},${gMidpointRightY + rMdMm} ${gRightX},${gEaveY + rStMm}`} className="fill-slate-300/40 dark:fill-slate-700/30" stroke="currentColor" strokeWidth={1.2} />
      <polygon points={`${gMidpointRightX},${gMidpointRightY} ${gMidX},${gApexY} ${gMidX},${gApexY + rEnMm} ${gMidpointRightX},${gMidpointRightY + rMdMm}`} className="fill-slate-300/40 dark:fill-slate-700/30" stroke="currentColor" strokeWidth={1.2} />

      {/* Span Width Measurement Details */}
      <line x1={gLeftX} y1={gBaseY + footingH + 8} x2={gRightX} y2={gBaseY + footingH + 8} stroke="currentColor" strokeWidth={0.8} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
      <text x={gMidX} y={gBaseY + footingH + 17} fill="currentColor" className="font-mono text-[10px] font-bold" textAnchor="middle">{span.toFixed(1)} m</text>

      {/* Eave Clear Height Measurement Details */}
      <line x1={20} y1={gBaseY} x2={20} y2={gEaveY} stroke="currentColor" strokeWidth={0.8} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
      <text x={13} y={(gBaseY + gEaveY) / 2 + 3} fill="currentColor" className="font-mono text-[10px] font-bold" transform={`rotate(-90 13 ${(gBaseY + gEaveY) / 2 + 3})`} textAnchor="middle">{eaveHeight.toFixed(1)} m</text>
      <line x1={16} y1={gBaseY} x2={gLeftX} y2={gBaseY} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />
      <line x1={16} y1={gEaveY} x2={gLeftX} y2={gEaveY} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.5} />

      {/* Kneeling and Ridge Bending Moment Loads */}
      <g className="font-mono text-[9px] font-bold">
        <text x={gRightX - 5} y={gEaveY + 14} textAnchor="end" className="fill-rose-600 dark:fill-rose-400">↗ Mk: {mKnee} kNm</text>
        <text x={gMidX} y={gApexY - 6} textAnchor="middle" className="fill-rose-600 dark:fill-rose-400">↓ Mr: {mRidge} kNm</text>
        <text x={gLeftX + 6} y={gBaseY - 6} textAnchor="start" className="fill-rose-600 dark:fill-rose-400">← Mb: {mBase} kNm</text>
      </g>
    </svg>
  );
}

export function AnchorPlateSvg({ geo, idPrefix }: { geo: any; idPrefix: string }) {
  const { ox, oy, pw, ph, cx, cy, colW, colH, bolts, bex, bey, br, PL_T, PL_W, PL_H, BOLT_D, BOLT_EDGE, BOLT_LENGTH } = geo;
  const arrowStartId = `${idPrefix}-ap-s`;
  const arrowEndId = `${idPrefix}-ap-e`;

  return (
    <svg viewBox="0 0 160 120" className="w-full text-slate-800 dark:text-slate-200" style={{ height: "120px", background: "var(--cad-bg)" }}>
      <defs>
        <marker id={arrowStartId} viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,5 L10,2 L10,8z" fill="currentColor" />
        </marker>
        <marker id={arrowEndId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M10,5 L0,2 L0,8z" fill="currentColor" />
        </marker>
      </defs>

      {/* Main plate rect outline */}
      <rect x={ox} y={oy} width={pw} height={ph} fill="none" stroke="currentColor" strokeWidth={1} />
      
      {/* Column Base outline */}
      <rect x={cx} y={cy} width={colW} height={colH} fill="none" stroke="currentColor" strokeWidth={0.8} strokeDasharray="3,2" className="opacity-50" />

      {/* Cross Centerlines */}
      <line x1={ox} y1={oy + ph / 2} x2={ox + pw} y2={oy + ph / 2} className="stroke-slate-500 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="4,2" />
      <line x1={ox + pw / 2} y1={oy} x2={ox + pw / 2} y2={oy + ph} className="stroke-slate-500 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="4,2" />

      {/* Bolts Positions */}
      {bolts.map(([bx, by]: [number, number], index: number) => (
        <g key={index}>
          <circle cx={bx} cy={by} r={br} fill="none" stroke="currentColor" strokeWidth={0.8} />
          <line x1={bx - br * 1.5} y1={by} x2={bx + br * 1.5} y2={by} className="stroke-slate-500 dark:stroke-slate-600" strokeWidth={0.4} />
          <line x1={bx} y1={by - br * 1.5} x2={bx} y2={by + br * 1.5} className="stroke-slate-500 dark:stroke-slate-600" strokeWidth={0.4} />
        </g>
      ))}

      <text x={ox + pw / 2} y={oy + ph / 2 + 1} textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 font-mono text-[5px]">
        4 × Ø{BOLT_D} X{BOLT_LENGTH}mmL J-Bolts
      </text>

      {/* Hardware Pitch Metrics */}
      <g className="text-rose-600 dark:text-rose-400">
        <line x1={ox + bex} y1={oy + ph + 9} x2={ox + pw - bex} y2={oy + ph + 9} stroke="currentColor" strokeWidth={0.8} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
        <line x1={ox + bex} y1={oy + ph - bey} x2={ox + bex} y2={oy + ph + 11} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="2,1" />
        <line x1={ox + pw - bex} y1={oy + ph - bey} x2={ox + pw - bex} y2={oy + ph + 11} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="2,1" />
        <text x={ox + pw / 2} y={oy + ph + 16} textAnchor="middle" fill="currentColor" className="font-mono text-[6px] font-bold">PITCH: {PL_W - 2 * BOLT_EDGE} mm</text>
      </g>

      {/* Gauge measurement */}
      <g className="text-rose-600 dark:text-rose-400">
        <line x1={ox + pw + 9} y1={oy + bey} x2={ox + pw + 9} y2={oy + ph - bey} stroke="currentColor" strokeWidth={0.8} markerStart={`url(#${arrowStartId})`} markerEnd={`url(#${arrowEndId})`} />
        <line x1={ox + pw - bex} y1={oy + bey} x2={ox + pw + 11} y2={oy + bey} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="2,1" />
        <line x1={ox + pw - bex} y1={oy + ph - bey} x2={ox + pw + 11} y2={oy + ph - bey} className="stroke-slate-400 dark:stroke-slate-600" strokeWidth={0.4} strokeDasharray="2,1" />
        <text x={ox + pw + 13} y={oy + ph / 2} fill="currentColor" className="font-mono text-[6px] font-bold" transform={`rotate(90 ${ox + pw + 13} ${oy + ph / 2})`} textAnchor="middle">
          GAUGE: {PL_H - 2 * BOLT_EDGE} mm
        </text>
      </g>
    </svg>
  );
}

export default function CadDrawings({ outputs, params }: CadDrawingsProps) {
  const geo = useCadGeometry(outputs, params);
  const idPrefix = useId();

  return (
    <div className="custom-panel w-full h-full flex flex-col" id="peb-cad-drawings">
      <div className="panel-header-block flex items-center gap-2 select-none shrink-0">
        <Layout className="w-4 h-4 text-emerald-400" />
        <span>Live Engineering Blueprints</span>
      </div>
      <div className="panel-body-content flex-grow overflow-y-auto lg:scrollbar-none min-h-0 space-y-4 pr-1">

        {/* Roof Plan layout */}
        <div className="custom-cad-container rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-inner">
          <div className="custom-cad-title text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex justify-between border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5 mb-2 select-none">
            <span>Roof Plan & Shear Bracing Details</span>
          </div>
          <PlanViewSvg geo={geo} idPrefix={idPrefix} />
        </div>

        {/* Rigid Portal Frame Section drawing vertical tapered elevation */}
        <div className="custom-cad-container rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-inner">
          <div className="custom-cad-title text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex justify-between border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5 mb-2 select-none">
            <span>Critical Frame Elevation Profile</span>
          </div>
          <FrameElevationSvg geo={geo} idPrefix={idPrefix} />
        </div>

        {/* Anchor Plate Gauge and Pitch */}
        <div className="custom-cad-container rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-inner">
          <div className="custom-cad-title text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex justify-between border-b border-dashed border-slate-300 dark:border-slate-700 pb-1.5 mb-2 select-none">
            <span>Anchors Coordinates Matrix</span>
          </div>
          <AnchorPlateSvg geo={geo} idPrefix={idPrefix} />
        </div>

      </div>
    </div>
  );
}
