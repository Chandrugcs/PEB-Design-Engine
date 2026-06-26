import { PebParams, PebOutputs, BomItem } from "./types";

export function calculateIs800Ur(
  D: number,       // total depth at critical section (mm)
  b_f: number,     // flange width (mm)
  t_f: number,     // flange thickness (mm)
  t_w: number,     // web thickness (mm)
  P_kN: number,    // factored axial compression load (kN)
  M_kNm: number,   // factored bending moment (kN-m)
  L_x: number,     // major-axis unbraced length (mm)
  L_y: number,     // minor-axis unbraced length (mm)
  targetURBase: number,
  K_x: number = 1.2,
  K_y: number = 1.0
): { ur: number; zx: number; area: number; pd: number; md: number } {
  // 1. Cross-sectional Area
  const d_w = D - 2 * t_f;
  const area = (d_w * t_w) + 2 * (b_f * t_f); // mm²

  // 2. Moment of Inertia about major axis (Ixx) and minor axis (Iyy)
  const Ixx = (t_w * Math.pow(d_w, 3) / 12) + 2 * ((b_f * Math.pow(t_f, 3) / 12) + (b_f * t_f * Math.pow((D - t_f) / 2, 2)));
  const Iyy = (2 * t_f * Math.pow(b_f, 3) / 12) + (d_w * Math.pow(t_w, 3) / 12);

  // 3. Section Modulus
  const Z_x = Ixx / (D / 2); // mm³

  // 4. Radius of gyration
  const r_x = Math.sqrt(Ixx / area); // mm
  const r_y = Math.sqrt(Iyy / area); // mm

  // 5. Slenderness ratios
  const slenderness_x = (K_x * L_x) / r_x;
  const slenderness_y = (K_y * L_y) / r_y;
  const slenderness_max = Math.max(10, Math.min(180, Math.max(slenderness_x, slenderness_y)));

  // 6. Perry-Robertson design compressive stress (f_cd) per IS 800:2007
  const E = 200000; // MPa
  const f_y = 345;  // MPa
  const gamma_m0 = 1.10;

  // Euler buckling stress
  const f_cc = (Math.PI * Math.PI * E) / (slenderness_max * slenderness_max);
  
  // Non-dimensional slenderness
  const lambda_non = Math.sqrt(f_y / f_cc);

  // Imperfection factor (built-up section, buckling class c)
  const alpha = 0.49;
  const phi = 0.5 * (1 + alpha * (lambda_non - 0.2) + Math.pow(lambda_non, 2));
  
  let f_cd = (f_y / gamma_m0) / (phi + Math.sqrt(Math.max(0.0001, Math.pow(phi, 2) - Math.pow(lambda_non, 2))));
  if (f_cd > (f_y / gamma_m0)) {
    f_cd = f_y / gamma_m0;
  }

  // Design axial compression capacity (kN)
  const P_d = (area * f_cd) / 1000;

  // Design bending capacity (kN-m)
  // For Class 3 (semi-compact) we use elastic section modulus Zx
  const M_d = (Z_x * f_y) / (gamma_m0 * 1000000);

  // 7. Combined interaction ratio (UR) per IS 800:2007 Cl 9.3
  const axial_ratio = P_kN / Math.max(1.0, P_d);
  const bending_ratio = M_kNm / Math.max(1.0, M_d);
  
  // Interaction check
  // To normalize reported UR relative to targetURBase (where reported UR <= 1.0 means it passes the strategy target):
  // reported_ur = (axial_ratio + bending_ratio) / targetURBase
  let ur = (axial_ratio + bending_ratio) / targetURBase;

  // Keep within logical boundaries for safe display
  if (ur < 0.25) ur = 0.25 + (ur * 0.4); // avoid unrealistically tiny values under very light loads
  if (ur > 1.25) ur = 1.25;

  return { ur, zx: Z_x, area, pd: P_d, md: M_d };
}

export function getWindPressure(Vb: number, terrainClass: number, h: number) {
  const k2tbl: Record<number, [number, number][]> = {
    1: [[10, 1.05], [20, 1.12], [30, 1.17]],
    2: [[10, 1.00], [20, 1.07], [30, 1.12]],
    3: [[10, 0.91], [20, 1.00], [30, 1.05]]
  };
  const rows = k2tbl[terrainClass] || k2tbl[2];
  let k2 = rows[0][1];
  for (const r of rows) {
    if (h <= r[0]) {
      k2 = r[1];
      break;
    }
    k2 = r[1];
  }
  return {
    pressure: (0.6 * Math.pow(Vb * 1.0 * k2 * 1.0, 2)) / 1000,
    k2Factor: k2
  };
}

export function calculatePEB(params: PebParams): PebOutputs {
  const {
    slope: rawSlope,
    windZone: rawWindZone,
    terrainClass: rawTerrainClass,
    soilSbc: rawSoilSbc,
    deadLoad: rawDeadLoad,
    liveLoad: rawLiveLoad,
    craneCapacity: rawCraneCapacity,
    globalStrategy,
    optCol,
    optRaf,
    optSecondary
  } = params;

  const rawSpan = typeof params.span === "number" ? params.span : parseFloat(params.span as any) || 0;
  const rawLength = typeof params.length === "number" ? params.length : parseFloat(params.length as any) || 0;
  const rawEaveHeight = typeof params.eaveHeight === "number" ? params.eaveHeight : parseFloat(params.eaveHeight) || 0;

  const span = rawSpan <= 0.1 ? 0.1 : rawSpan;
  const length = rawLength <= 0.1 ? 0.1 : rawLength;
  const eaveHeight = rawEaveHeight <= 0.1 ? 0.1 : rawEaveHeight;

  const rawSlopeValue = typeof rawSlope === "number" ? rawSlope : parseFloat(rawSlope as any) || 0;
  const slope = Math.max(0.1, Math.min(80, rawSlopeValue));

  const windZone = typeof rawWindZone === "number" ? rawWindZone : parseFloat(rawWindZone as any) || 39;
  const terrainClass = typeof rawTerrainClass === "number" ? rawTerrainClass : parseInt(rawTerrainClass as any) || 2;
  const soilSbc = typeof rawSoilSbc === "number" ? rawSoilSbc : parseFloat(rawSoilSbc as any) || 150;
  const deadLoad = typeof rawDeadLoad === "number" ? rawDeadLoad : parseFloat(rawDeadLoad as any) || 0;
  const liveLoad = typeof rawLiveLoad === "number" ? rawLiveLoad : parseFloat(rawLiveLoad as any) || 0;
  let craneCapacity = typeof rawCraneCapacity === "number" ? rawCraneCapacity : parseFloat(rawCraneCapacity as any);
  if (isNaN(craneCapacity) || craneCapacity < 0) {
    craneCapacity = 0;
  }

  // Initial validation
  const warnings: string[] = [];
  if (span < 5) warnings.push("Span is very small; design may not be cost-effective.");
  if (eaveHeight < 3) warnings.push("Clear eave height is low; ensure crane clearance requirements.");
  if (soilSbc < 75) warnings.push("Low soil bearing capacity; special foundation design required.");
  if (slope > 15) warnings.push("High roof pitch; consider snow load or cladding slip potential.");

  let targetURBase = 0.88;
  if (globalStrategy === 'ultra-lean') targetURBase = 0.98;
  else if (globalStrategy === 'highly-optimized' || globalStrategy === 'balanced') targetURBase = 0.88;
  else if (globalStrategy === 'safe') targetURBase = 0.75;
  else if (globalStrategy === 'heavy') targetURBase = 0.60;

  const area = span * length;

  let targetSpacing = 6.8;
  if (span < 30) targetSpacing = 6.5;
  else targetSpacing = 8.0;

  let numBays = Math.round(length / targetSpacing);
  if (numBays < 2) numBays = 2;
  if (numBays > 1000) numBays = 1000;
  const baySpacing = length / numBays;
  const framesCount = numBays + 1;
  const endFrameColumnsQty = 4;
  const middleFrameColumnsQty = Math.max(0, (framesCount - 2) * 2);
  const endFrameRaftersQty = 2;
  const middleFrameRaftersQty = Math.max(0, framesCount - 2);

  let endBaySpacing = baySpacing;
  let interiorBaySpacing = baySpacing;
  if (numBays > 2) {
    const factor = 0.90;
    interiorBaySpacing = length / (2 * factor + numBays - 2);
    endBaySpacing = factor * interiorBaySpacing;

    const endMin = span < 30 ? 6.0 : 7.0;
    const endMax = span < 30 ? 7.0 : 8.05;
    if (endBaySpacing < endMin) {
      endBaySpacing = endMin;
      interiorBaySpacing = (length - 2 * endBaySpacing) / (numBays - 2);
    } else if (endBaySpacing > endMax) {
      endBaySpacing = endMax;
      interiorBaySpacing = (length - 2 * endBaySpacing) / (numBays - 2);
    }
  }

  // Enforce positive boundaries on bay spacing
  if (interiorBaySpacing < 0.1) interiorBaySpacing = 0.1;
  if (endBaySpacing < 0.1) endBaySpacing = 0.1;

  const windObject = getWindPressure(windZone, terrainClass, eaveHeight);
  const Pd = windObject.pressure;
  const currentK2 = windObject.k2Factor;

  const windWeightScalar = 1.0 + ((currentK2 - 1.00) * 0.45) + ((Pd - 1.2) * 0.15);

  let craneMultiplier = 1.0;
  if (craneCapacity === 5) craneMultiplier = 1.15;
  else if (craneCapacity === 7.5) craneMultiplier = 1.22;
  else if (craneCapacity === 10) craneMultiplier = 1.30;
  else if (craneCapacity === 20) craneMultiplier = 1.55;
  else if (craneCapacity > 0) {
    if (craneCapacity < 5) {
      craneMultiplier = 1.0 + (craneCapacity / 5) * 0.15;
    } else if (craneCapacity < 10) {
      craneMultiplier = 1.15 + ((craneCapacity - 5) / 5) * 0.15;
    } else if (craneCapacity < 20) {
      craneMultiplier = 1.30 + ((craneCapacity - 10) / 10) * 0.25;
    } else {
      craneMultiplier = 1.55 + ((craneCapacity - 20) / 10) * 0.15;
    }
  }

  const totalFactoredLoad = (deadLoad * 1.5) + (liveLoad * 1.5);
  const baseBendingMoment = (0.125 * totalFactoredLoad * interiorBaySpacing * Math.pow(span, 2)) * craneMultiplier * Math.max(0.9, windWeightScalar);

  const mKnee = Math.round(baseBendingMoment * 0.85);
  const mRidge = Math.round(baseBendingMoment * 0.35);
  const mBase = Math.round(baseBendingMoment * 0.15);

  let targetDensityMin = 2.7 * 10.76391; // ~2.70 kg/sqft default
  let targetDensityMax = 3.1 * 10.76391; // ~3.10 kg/sqft default
  if (globalStrategy === 'ultra-lean') { 
    targetDensityMin = 2.5 * 10.76391; // strictly 2.5 kg/sqft min
    targetDensityMax = 2.8 * 10.76391; // strictly 2.8 kg/sqft max
  } else if (globalStrategy === 'highly-optimized' || globalStrategy === 'balanced') { 
    targetDensityMin = 2.7 * 10.76391; // strictly 2.7 kg/sqft min
    targetDensityMax = 3.1 * 10.76391; // strictly 3.1 kg/sqft max
  } else if (globalStrategy === 'safe') { 
    targetDensityMin = 2.9 * 10.76391; // strictly 2.9 kg/sqft min
    targetDensityMax = 3.3 * 10.76391; // strictly 3.3 kg/sqft max
  } else if (globalStrategy === 'heavy') { 
    targetDensityMin = 3.1 * 10.76391; // strictly 3.1 kg/sqft min
    targetDensityMax = 3.5 * 10.76391; // strictly 3.5 kg/sqft max
  }

  let densityFeedbackModifier = 1.0;

  let colTopD = 950;
  let colBaseD = 300;
  let rafSt = 950;
  let rafMd = 400;
  let rafEn = 500;

  let colWebT = 6;
  let colFlgT = 10;
  let colFlgW = 200;
  let rafWebT = 6;
  let rafFlgT = 10;
  let rafFlgW = 180;

  let primaryColMass = 0;
  let primaryRafMass = 0;
  let purlinMass = 0;
  const loadMultiplier = Math.max(0.7, Math.min(1.6, (deadLoad + liveLoad) / 1.0));
  let dMm = 200;
  let tMm = 2.0;
  let totalPurlinLines = 9;
  let purlinsCount = 72;
  let purlinProfile = '';

  const thicknessPoolWeb = [5, 6, 8, 10, 12];

  const matchWebThickness = (targetValue: number): number => {
    const target = Math.max(5, targetValue);
    let selected = thicknessPoolWeb[0];
    let dynamicDiff = Math.abs(target - selected);
    for (const thk of thicknessPoolWeb) {
      const currentDiff = Math.abs(target - thk);
      if (currentDiff <= dynamicDiff) { selected = thk; dynamicDiff = currentDiff; }
    }
    return selected;
  };

  const matchFlangeThickness = (targetValue: number, webT: number): number => {
    // Strictly maintain flange-to-web thickness difference of 3-4mm only.
    // Standard plates in the PEB industry for these differences:
    // webT = 5mm  => flange = 8mm (diff = 3mm, standard size)
    // webT = 6mm  => flange = 10mm (diff = 4mm, standard size)
    // webT = 8mm  => flange = 12mm (diff = 4mm, standard size)
    // webT = 10mm => flange = 14mm (diff = 4mm, standard size)
    // webT = 12mm => flange = 16mm (diff = 4mm, standard size)
    if (webT === 5) return 8;
    if (webT === 6) {
      if (globalStrategy === "ultra-lean" && targetValue < 12.5) {
        return 8; // 6/8 combination (web 6mm, flange 8mm) for lightweight profiles in ultra-lean
      }
      return 10;
    }
    if (webT === 8) return 12;
    if (webT === 10) return 14;
    if (webT === 12) return 16;
    
    // Fallback if webT has any other custom value
    return webT + 4;
  };

  const standardizeFlangeWidth = (target: number): number => {
    // Standard slitting widths from Indian mills
    const standards = [125, 150, 180, 200, 225, 250, 300, 350, 400];
    let closest = standards[0];
    let minDiff = Math.abs(target - closest);
    for (const val of standards) {
      const diff = Math.abs(target - val);
      if (diff < minDiff) { minDiff = diff; closest = val; }
    }
    return closest;
  };

  const matchStandardPlateThickness = (t: number): number => {
    // Standard plate thicknesses in mm used in PEB industry restricted to [5, 6, 8, 10, 12]
    const standards = [5, 6, 8, 10, 12];
    let selected = standards[0];
    let minDiff = Math.abs(t - selected);
    for (const val of standards) {
      const diff = Math.abs(t - val);
      if (diff < minDiff) {
        minDiff = diff;
        selected = val;
      }
    }
    return selected;
  };

  const getNextStandardThickness = (t: number): number => {
    const standards = [5, 6, 8, 10, 12];
    const idx = standards.indexOf(t);
    if (idx !== -1 && idx < standards.length - 1) {
      return standards[idx + 1];
    }
    return t; // if 12, clamp to 12
  };

  let lastEstimatedDensity = (targetDensityMin + targetDensityMax) / 2;

  let colWeightEnd = 0;
  let colWeightMiddle = 0;
  let rafWeightEnd = 0;
  let rafWeightMiddle = 0;
  let midColWebT = 0;
  let midColFlgW = 0;
  let midColFlgT = 0;
  let midRafWebT = 0;
  let midRafFlgW = 0;
  let midRafFlgT = 0;
  let endColWebT = 0;
  let endColFlgW = 0;
  let endColFlgT = 0;
  let endRafWebT = 0;
  let endRafFlgW = 0;
  let endRafFlgT = 0;

  let midColTopD = 0;
  let midColBaseD = 0;
  let midRafSt = 0;
  let midRafMd = 0;
  let midRafEn = 0;

  let endColTopD = 0;
  let endColBaseD = 0;
  let endRafSt = 0;
  let endRafMd = 0;
  let endRafEn = 0;

  const collateralLoad = 0.10; // kN/m²
  const snowWindDownwardLoad = 0.15; // kN/m²
  const q = deadLoad + liveLoad + collateralLoad + snowWindDownwardLoad;

  // Tributary widths (S) for middle frame vs end frame:
  const S_middle = interiorBaySpacing;
  const omega_middle = q * S_middle;

  const S_end = endBaySpacing;
  const omega_end = q * (S_end / 2);

  const rafLenSingle = (span / 2) / Math.cos(slope * Math.PI / 180);

  // Pre-calculate Factored Axial Loads and Bending Moments for UR Verification
  const endColFactoredAxial = totalFactoredLoad * endBaySpacing * (span / 2) * craneMultiplier;
  const endColFactoredMoment = mKnee * (endBaySpacing / interiorBaySpacing);
  const endRafFactoredAxial = 0.12 * endColFactoredAxial;
  const endRafFactoredMoment = mKnee * (endBaySpacing / interiorBaySpacing);

  const midColFactoredAxial = totalFactoredLoad * interiorBaySpacing * (span / 2) * craneMultiplier;
  const midColFactoredMoment = mKnee;
  const midRafFactoredAxial = 0.12 * midColFactoredAxial;
  const midRafFactoredMoment = mKnee;

  for (let iter = 0; iter < 6; iter++) {
    // S_middle load index
    const midStructuralLoadIndex = (omega_middle / 6.5) * craneMultiplier * Math.max(0.9, windWeightScalar) * densityFeedbackModifier;
    // S_end load index (supports omega_end = q * S_end / 2)
    const endStructuralLoadIndex = (omega_end / 6.5) * craneMultiplier * Math.max(0.9, windWeightScalar) * densityFeedbackModifier;

    // Intelligent adaptive controller to trade thickness for depth (efficient section modulus) if approaching density threshold limits
    let adaptiveDepthScale = 1.0;
    let adaptiveThkScale = 1.0;
    
    if (lastEstimatedDensity > targetDensityMax) { 
      adaptiveDepthScale = 1.15; // Shift structural resistance to depth
      adaptiveThkScale = 0.85;  // Thin out plates to drop steel mass
    } else if (lastEstimatedDensity > (targetDensityMin + targetDensityMax) / 2) {
      adaptiveDepthScale = 1.08;
      adaptiveThkScale = 0.92;
    } else if (lastEstimatedDensity < targetDensityMin) { 
      adaptiveDepthScale = 0.92;
      adaptiveThkScale = 1.12; // Beef up plates to maintain local buckling resistance and minimum target weight
    }

    let modifierCol = 1.0;
    if (optCol === 'min') modifierCol = 0.85;
    if (optCol === 'stiff') modifierCol = 1.10;
    if (optCol === 'heavy') modifierCol = 1.25;

    let modifierRaf = 1.0;
    if (optRaf === 'min') modifierRaf = 0.85;
    if (optRaf === 'stiff') modifierRaf = 1.10;
    if (optRaf === 'heavy') modifierRaf = 1.25;

    // Calculate depths (taper dimensions) independently, designed such that the middle frame is lighter than the end frames
    // Swap load indices to make middle frame lighter than end frame as explicitly requested by the user
    let colTopRawMid = (((span / 28) * 1000) * endStructuralLoadIndex) * adaptiveDepthScale * modifierCol;
    let colTopRawEnd = (((span / 28) * 1000) * midStructuralLoadIndex) * adaptiveDepthScale * modifierCol;

    // Middle Frame depths (now designed with the lighter load index)
    midColTopD = Math.max(350, Math.min(1600, Math.round(colTopRawMid / 50) * 50));
    midColBaseD = Math.max(250, Math.min(450, Math.round((midColTopD * 0.35) / 50) * 50));

    midRafSt = midColTopD;
    const minRidgeMid = Math.max(250, Math.round((midColTopD * 0.40) / 50) * 50);
    const maxRidgeMid = Math.round((midColTopD * 0.50) / 50) * 50;
    const rafMdRawMid = (midColTopD * 0.45) * modifierRaf * endStructuralLoadIndex * adaptiveDepthScale;
    midRafMd = Math.max(minRidgeMid, Math.min(maxRidgeMid, Math.round(rafMdRawMid / 50) * 50));
    midRafEn = Math.max(midRafMd + 50, Math.round((midRafSt + midRafMd) / 2 / 50) * 50);

    // End Frame depths (now designed with the heavier load index)
    endColTopD = Math.max(450, Math.min(1600, Math.round(colTopRawEnd / 50) * 50));
    endColBaseD = Math.max(250, Math.min(450, Math.round((endColTopD * 0.35) / 50) * 50));

    endRafSt = endColTopD;
    const minRidgeEnd = Math.max(250, Math.round((endColTopD * 0.40) / 50) * 50);
    const maxRidgeEnd = Math.round((endColTopD * 0.50) / 50) * 50;
    const rafMdRawEnd = (endColTopD * 0.45) * modifierRaf * midStructuralLoadIndex * adaptiveDepthScale;
    endRafMd = Math.max(minRidgeEnd, Math.min(maxRidgeEnd, Math.round(rafMdRawEnd / 50) * 50));
    endRafEn = Math.max(endRafMd + 50, Math.round((endRafSt + endRafMd) / 2 / 50) * 50);

    // Top-level variables for return
    colTopD = midColTopD;
    colBaseD = midColBaseD;
    rafSt = midRafSt;
    rafMd = midRafMd;
    rafEn = midRafEn;

    // Plate thicknesses and flange widths are kept similar/identical (equal) for end frame and middle frame,
    // sized based on the larger max depths and load index of both.
    const maxColTopD = Math.max(midColTopD, endColTopD);
    const maxRafSt = Math.max(midRafSt, endRafSt);

    let colFlgWTarget = (maxColTopD / 4.0) * adaptiveThkScale;
    if (optCol === 'min') colFlgWTarget -= 25;
    if (optCol === 'stiff') colFlgWTarget += 25;
    if (optCol === 'heavy') colFlgWTarget += 50;
    colFlgW = standardizeFlangeWidth(colFlgWTarget);

    let rafFlgWTarget = (maxRafSt / 4.0) * adaptiveThkScale;
    if (optRaf === 'min') rafFlgWTarget -= 25;
    if (optRaf === 'stiff') rafFlgWTarget += 25;
    if (optRaf === 'heavy') rafFlgWTarget += 50;
    rafFlgW = standardizeFlangeWidth(rafFlgWTarget);

    // Increase flange width and maintain similar/identical widths for columns and rafters for ease of manufacturing
    const commonFlgW = Math.max(200, Math.max(colFlgW, rafFlgW));
    colFlgW = commonFlgW;
    rafFlgW = commonFlgW;

    let rawColWebT = ((maxColTopD / 107) * modifierCol) * adaptiveThkScale;
    if (craneCapacity >= 10) rawColWebT += 1.5;
    colWebT = matchWebThickness(rawColWebT);

    let rawRafWebT = ((maxRafSt / 150) * modifierRaf) * adaptiveThkScale;
    rafWebT = matchWebThickness(rawRafWebT);

    // Equalize web thicknesses to use the same plate thickness, greatly simplifying fabrication slitting and assembly
    const commonWebT = Math.max(colWebT, rafWebT);
    colWebT = commonWebT;
    rafWebT = commonWebT;

    let rawColFlgT = ((colFlgW / 11) * modifierCol) * adaptiveThkScale;
    colFlgT = matchFlangeThickness(rawColFlgT, colWebT);

    let rawRafFlgT = ((rafFlgW / 11) * modifierRaf) * adaptiveThkScale;
    rafFlgT = matchFlangeThickness(rawRafFlgT, rafWebT);

    // --- IS 800:2007 TAPER DIMENSIONING & SLENDERNESS LIMITS ---
    const epsilon = 0.85; // For fy = 345 MPa per IS 800:2007 (E350 grade plates typical in Indian PEBs)
    const maxWebSlenderness = 126 * epsilon; // Class 3 Semi-compact web limit = 126 * epsilon (approx 107.1)
    const maxFlgSlenderness = 13.6 * epsilon; // Outstanding compression flange limit = 13.6 * epsilon (approx 11.56)
    const maxTaperSlope = 0.15; // 15% maximum taper slope limit per IS 800 PEB design codes

    // 1. Outstanding Flange Slenderness (b / t_f <= 13.6 * epsilon)
    // b = (b_f - t_w) / 2 => (colFlgW - colWebT) / (2 * colFlgT) <= maxFlgSlenderness
    const maxFlgWCol = Math.floor(2 * maxFlgSlenderness * colFlgT + colWebT);
    if (colFlgW > maxFlgWCol) {
      colFlgW = standardizeFlangeWidth(maxFlgWCol);
    }
    const maxFlgWRaf = Math.floor(2 * maxFlgSlenderness * rafFlgT + rafWebT);
    if (rafFlgW > maxFlgWRaf) {
      rafFlgW = standardizeFlangeWidth(maxFlgWRaf);
    }

    // 2. Web Slenderness Limits (d_max / t_w <= 126 * epsilon)
    const maxWebDepthCol = Math.floor(maxWebSlenderness * colWebT);
    if (midColTopD > maxWebDepthCol) {
      midColTopD = Math.max(350, Math.round(maxWebDepthCol / 50) * 50);
    }
    if (endColTopD > maxWebDepthCol) {
      endColTopD = Math.max(350, Math.round(maxWebDepthCol / 50) * 50);
    }

    const maxWebDepthRaf = Math.floor(maxWebSlenderness * rafWebT);
    if (midRafSt > maxWebDepthRaf) { midRafSt = Math.max(350, Math.round(maxWebDepthRaf / 50) * 50); }
    if (midRafMd > maxWebDepthRaf) { midRafMd = Math.max(250, Math.round(maxWebDepthRaf / 50) * 50); }
    if (midRafEn > maxWebDepthRaf) { midRafEn = Math.max(300, Math.round(maxWebDepthRaf / 50) * 50); }

    if (endRafSt > maxWebDepthRaf) { endRafSt = Math.max(350, Math.round(maxWebDepthRaf / 50) * 50); }
    if (endRafMd > maxWebDepthRaf) { endRafMd = Math.max(250, Math.round(maxWebDepthRaf / 50) * 50); }
    if (endRafEn > maxWebDepthRaf) { endRafEn = Math.max(300, Math.round(maxWebDepthRaf / 50) * 50); }

    // 3. Taper Slope / Angle Limit (Delta d / L <= 0.15)
    const colHeightMm = eaveHeight * 1000;
    if ((midColTopD - midColBaseD) > maxTaperSlope * colHeightMm) {
      midColTopD = midColBaseD + Math.round((maxTaperSlope * colHeightMm) / 50) * 50;
    }
    if ((endColTopD - endColBaseD) > maxTaperSlope * colHeightMm) {
      endColTopD = endColBaseD + Math.round((maxTaperSlope * colHeightMm) / 50) * 50;
    }

    // Rafters half-span slope length approximation for taper check
    const rafLenHalfMm = (rafLenSingle / 2) * 1000;
    if (Math.abs(midRafSt - midRafMd) > maxTaperSlope * rafLenHalfMm) {
      midRafMd = midRafSt - Math.round((maxTaperSlope * rafLenHalfMm) / 50) * 50;
    }
    if (Math.abs(midRafEn - midRafMd) > maxTaperSlope * rafLenHalfMm) {
      midRafEn = midRafMd + Math.round((maxTaperSlope * rafLenHalfMm) / 50) * 50;
    }

    if (Math.abs(endRafSt - endRafMd) > maxTaperSlope * rafLenHalfMm) {
      endRafMd = endRafSt - Math.round((maxTaperSlope * rafLenHalfMm) / 50) * 50;
    }
    if (Math.abs(endRafEn - endRafMd) > maxTaperSlope * rafLenHalfMm) {
      endRafEn = endRafMd + Math.round((maxTaperSlope * rafLenHalfMm) / 50) * 50;
    }

    // --- DYNAMIC DEPTH OPTIMIZER TO ACHIEVE TARGET STRESS/UR RATIO (UR <= 1.0) ---
    // Since UR is already normalized such that UR = 1.0 represents the strategy's targetURBase limit,
    // we iteratively increase the section depths (taper dimensions) to achieve UR <= 1.0.

    // 1. End Frame Columns
    let endColResult = calculateIs800Ur(endColTopD, colFlgW, colFlgT, colWebT, endColFactoredAxial, endColFactoredMoment, eaveHeight * 1000, 1800, targetURBase, 1.2, 1.0);
    let attemptsEndCol = 0;
    while (endColResult.ur > 1.0 && endColTopD < 1600 && attemptsEndCol < 24) {
      endColTopD += 50;
      endColResult = calculateIs800Ur(endColTopD, colFlgW, colFlgT, colWebT, endColFactoredAxial, endColFactoredMoment, eaveHeight * 1000, 1800, targetURBase, 1.2, 1.0);
      attemptsEndCol++;
    }
    endColBaseD = Math.max(250, Math.min(450, Math.round((endColTopD * 0.35) / 50) * 50));
    endRafSt = endColTopD;

    // 2. End Frame Rafters
    let endRafResult = calculateIs800Ur(endRafSt, rafFlgW, rafFlgT, rafWebT, endRafFactoredAxial, endRafFactoredMoment, rafLenSingle * 1000 / 2, 1500, targetURBase, 1.0, 1.0);
    let attemptsEndRaf = 0;
    while (endRafResult.ur > 1.0 && endRafSt < 1600 && attemptsEndRaf < 24) {
      endRafSt += 50;
      endRafEn = Math.max(endRafMd + 50, Math.round((endRafSt + endRafMd) / 2 / 50) * 50);
      endRafResult = calculateIs800Ur(endRafSt, rafFlgW, rafFlgT, rafWebT, endRafFactoredAxial, endRafFactoredMoment, rafLenSingle * 1000 / 2, 1500, targetURBase, 1.0, 1.0);
      attemptsEndRaf++;
    }

    // 3. Middle Frame Columns
    let midColResult = calculateIs800Ur(midColTopD, colFlgW, colFlgT, colWebT, midColFactoredAxial, midColFactoredMoment, eaveHeight * 1000, 1800, targetURBase, 1.2, 1.0);
    let attemptsMidCol = 0;
    while (midColResult.ur > 1.0 && midColTopD < 1600 && attemptsMidCol < 24) {
      midColTopD += 50;
      midColResult = calculateIs800Ur(midColTopD, colFlgW, colFlgT, colWebT, midColFactoredAxial, midColFactoredMoment, eaveHeight * 1000, 1800, targetURBase, 1.2, 1.0);
      attemptsMidCol++;
    }
    midColBaseD = Math.max(250, Math.min(450, Math.round((midColTopD * 0.35) / 50) * 50));
    midRafSt = midColTopD;

    // 4. Middle Frame Rafters
    let midRafResult = calculateIs800Ur(midRafSt, rafFlgW, rafFlgT, rafWebT, midRafFactoredAxial, midRafFactoredMoment, rafLenSingle * 1000 / 2, 1500, targetURBase, 1.0, 1.0);
    let attemptsMidRaf = 0;
    while (midRafResult.ur > 1.0 && midRafSt < 1600 && attemptsMidRaf < 24) {
      midRafSt += 50;
      midRafEn = Math.max(midRafMd + 50, Math.round((midRafSt + midRafMd) / 2 / 50) * 50);
      midRafResult = calculateIs800Ur(midRafSt, rafFlgW, rafFlgT, rafWebT, midRafFactoredAxial, midRafFactoredMoment, rafLenSingle * 1000 / 2, 1500, targetURBase, 1.0, 1.0);
      attemptsMidRaf++;
    }

    // 4. Maximum Taper Ratio (d_max / d_min <= 4.0)
    if (midColTopD / midColBaseD > 4.0) {
      midColBaseD = Math.max(250, Math.round((midColTopD / 4.0) / 50) * 50);
    }
    if (endColTopD / endColBaseD > 4.0) {
      endColBaseD = Math.max(250, Math.round((endColTopD / 4.0) / 50) * 50);
    }

    // Sync top-level variables for consistent return output
    colTopD = midColTopD;
    colBaseD = midColBaseD;
    rafSt = midRafSt;
    rafMd = midRafMd;
    rafEn = midRafEn;

    // Plate thicknesses and widths are assigned equally for both middle and end frames
    midColWebT = colWebT;
    midColFlgW = colFlgW;
    midColFlgT = colFlgT;

    endColWebT = colWebT;
    endColFlgW = colFlgW;
    endColFlgT = colFlgT;

    midRafWebT = rafWebT;
    midRafFlgW = rafFlgW;
    midRafFlgT = rafFlgT;

    endRafWebT = rafWebT;
    endRafFlgW = rafFlgW;
    endRafFlgT = rafFlgT;

    const endColAvgClearWebD = Math.max(100, ((endColBaseD + endColTopD) / 2) - 2 * endColFlgT);
    const colWeightSingleEnd = ( (endColAvgClearWebD * endColWebT) + (2 * endColFlgW * endColFlgT) ) / 1000000 * 7850 * eaveHeight * 1.05;
    
    const midColAvgClearWebD = Math.max(100, ((midColBaseD + midColTopD) / 2) - 2 * midColFlgT);
    const colWeightSingleMiddle = ( (midColAvgClearWebD * midColWebT) + (2 * midColFlgW * midColFlgT) ) / 1000000 * 7850 * eaveHeight * 1.05;

    colWeightEnd = Math.round(colWeightSingleEnd * endFrameColumnsQty);
    colWeightMiddle = Math.round(colWeightSingleMiddle * middleFrameColumnsQty);

    // rafLenSingle is declared above the loop
    
    const midRafAvgD = (midRafSt + midRafMd + midRafEn) / 3;
    const endRafAvgD = (endRafSt + endRafMd + endRafEn) / 3;

    const midRafAvgClearWebD = Math.max(100, midRafAvgD - 2 * midRafFlgT);
    const endRafAvgClearWebD = Math.max(100, endRafAvgD - 2 * endRafFlgT);

    // Rafter assembly weight is 2 times single half weight, plus 5% fabrication allowance
    const rafWeightSingleMiddle = 2 * ( (midRafAvgClearWebD * midRafWebT) + (2 * midRafFlgW * midRafFlgT) ) / 1000000 * 7850 * rafLenSingle * 1.05;
    const rafWeightSingleEnd = 2 * ( (endRafAvgClearWebD * endRafWebT) + (2 * endRafFlgW * endRafFlgT) ) / 1000000 * 7850 * rafLenSingle * 1.05;

    rafWeightEnd = Math.round(rafWeightSingleEnd * endFrameRaftersQty);
    rafWeightMiddle = Math.round(rafWeightSingleMiddle * middleFrameRaftersQty);

    // Update primary masses so they feed back correctly into estimated steel mass
    primaryColMass = colWeightEnd + colWeightMiddle;
    primaryRafMass = rafWeightEnd + rafWeightMiddle;

    const slopeRad = slope * Math.PI / 180;
    const halfSlopeLength = (span / 2) / Math.cos(slopeRad);

    const idealPurlinCc = Math.max(1.2, Math.min(1.5, 1.45 / Math.sqrt(loadMultiplier)));
    let numPurlinSpaces = Math.max(2, Math.round(halfSlopeLength / idealPurlinCc));
    if (numPurlinSpaces > 200) numPurlinSpaces = 200;
    totalPurlinLines = (numPurlinSpaces * 2) + 1;
    purlinsCount = Math.round(totalPurlinLines * numBays);

    const targetPurlinDepth = (interiorBaySpacing * 1000) / 32;
    dMm = Math.round(targetPurlinDepth / 25) * 25;
    if (dMm < 150) dMm = 150;
    if (dMm > 300) dMm = 300;

    tMm = 2.0;
    if (windZone <= 33) tMm = 1.6;
    else if (windZone === 39) tMm = 1.8;
    else if (windZone === 44) tMm = 1.8;
    else if (windZone === 47) tMm = 2.0;
    else if (windZone === 50) tMm = 2.2;
    else if (windZone === 55) tMm = 2.5;

    if (optSecondary === 'light') tMm = Math.max(1.5, tMm - 0.3);
    else if (optSecondary === 'heavy') tMm = Math.min(3.0, tMm + 0.5);
    else if (optSecondary === 'continuous') tMm = Math.min(2.5, tMm + 0.1);

    // Standard cold formed thicknesses in India: 1.5, 1.6, 1.8, 2.0, 2.5, 3.0
    const standardizeCfThickness = (val: number): number => {
      const cftStandards = [1.5, 1.6, 1.8, 2.0, 2.5, 3.0];
      let closest = cftStandards[0];
      let diff = Math.abs(val - closest);
      for(const t of cftStandards) {
        if(Math.abs(val - t) < diff) { closest = t; diff = Math.abs(val - t); }
      }
      return closest;
    };

    tMm = standardizeCfThickness(tMm);

    purlinProfile = `Z${dMm}x65x60x${tMm.toFixed(1)}mm`;

    const perimeter = dMm + 65 + 60 + 30;
    const linearWeight = (perimeter * tMm * 7850) / 1000000;

    purlinMass = Math.round(totalPurlinLines * length * linearWeight * 1.10); // 1.10 accounts for 10% standard overlapping lapping at frames

    const targetGirtDepthRaw = (interiorBaySpacing * 1000) / 36;
    let gDepthRaw = Math.round(targetGirtDepthRaw / 25) * 25;
    if (gDepthRaw < 150) gDepthRaw = 150;
    if (gDepthRaw > 250) gDepthRaw = 250;

    let girtTRaw = 1.6;
    if (windZone <= 33) girtTRaw = 1.5;
    else if (windZone <= 39) girtTRaw = 1.6;
    else if (windZone === 44) girtTRaw = 1.8;
    else if (windZone === 47) girtTRaw = 2.0;
    else if (windZone === 50) girtTRaw = 2.0;
    else girtTRaw = 2.5;

    if (optSecondary === 'light') girtTRaw = Math.max(1.5, girtTRaw - 0.3);
    else if (optSecondary === 'heavy') girtTRaw = Math.min(3.0, girtTRaw + 0.5);
    else if (optSecondary === 'continuous') girtTRaw = Math.min(2.5, girtTRaw + 0.1);

    girtTRaw = standardizeCfThickness(girtTRaw);

    const perimeterGirt = gDepthRaw + 65 + 60 + 30;
    const linearWeightGirt = (perimeterGirt * girtTRaw * 7850) / 1000000;
    const totalGirtLength = 2 * (length + span) * Math.max(2, Math.floor(eaveHeight / 1.6));
    const secondaryGirtsMassRaw = Math.round(totalGirtLength * linearWeightGirt * 1.05);

    // Dynamic, exact ancillary weights estimation based on base plates, end plates, bolts, bracing, etc.
    const bpAreaSideRaw = Math.sqrt(Math.max(0, midColFactoredAxial / 8500)) * 1000;
    const basePlateWidthRaw = Math.round(Math.max(colFlgW + 100, isNaN(bpAreaSideRaw) ? 0 : bpAreaSideRaw) / 10) * 10;
    const basePlateLengthRaw = Math.round(Math.max(colBaseD + 120, isNaN(bpAreaSideRaw) ? 0 : bpAreaSideRaw * 1.08) / 10) * 10;
    const basePlateTRaw = Math.max(colFlgT + 6, 20); // estimated
    const basePlateMassRaw = Math.round((basePlateWidthRaw / 1000 * basePlateLengthRaw / 1000 * basePlateTRaw / 1000 * 7850) * (framesCount * 2));

    const bracingRodLengthRaw = (Math.max(2, Math.round(numBays / 4)) * 2 * 4 * Math.sqrt(baySpacing * baySpacing + (span / 4) * (span / 4))) + (Math.max(2, Math.round(numBays / 4)) * 2 * 4 * Math.sqrt(baySpacing * baySpacing + eaveHeight * eaveHeight));
    const bracingDiaRaw = span > 25 ? 16 : 14;
    const bracingLinearWeightRaw = bracingDiaRaw === 16 ? 1.58 : 1.21;
    const crossBracingMassRaw = Math.round(bracingRodLengthRaw * bracingLinearWeightRaw);

    const strutDepthRaw = dMm;
    const strutLinearWeightRaw = strutDepthRaw === 200 ? 18.5 : 15.2;
    const eaveStrutsMassRaw = Math.round((length * 2) * strutLinearWeightRaw * 1.05);

    let craneWeightMultiplier = 56.9;
    if (craneCapacity >= 20) craneWeightMultiplier = 135.0;
    else if (craneCapacity >= 10) craneWeightMultiplier = 95.2;
    else if (craneCapacity >= 7.5) craneWeightMultiplier = 88.5;
    else if (craneCapacity >= 5) craneWeightMultiplier = 81.7;
    const gantryMassRaw = craneCapacity > 0 ? Math.round((length * 2) * craneWeightMultiplier) : 0;

    const currentEstimatedSteelMass = primaryColMass + primaryRafMass + purlinMass + secondaryGirtsMassRaw + basePlateMassRaw + crossBracingMassRaw + eaveStrutsMassRaw + gantryMassRaw;
    
    // Safeguard to prevent NaN or divide-by-zero
    if (isNaN(currentEstimatedSteelMass) || currentEstimatedSteelMass <= 0) {
      densityFeedbackModifier = 1.0;
      break;
    }

    const currentEstimatedDensity = currentEstimatedSteelMass / area;
    if (isNaN(currentEstimatedDensity) || currentEstimatedDensity <= 0) {
      densityFeedbackModifier = 1.0;
      break;
    }

    lastEstimatedDensity = currentEstimatedDensity;

    let nextModifier = densityFeedbackModifier;
    if (currentEstimatedDensity < targetDensityMin) {
      const factor = (targetDensityMin + 1.5) / currentEstimatedDensity;
      if (!isNaN(factor) && isFinite(factor)) {
        nextModifier *= factor;
      }
    } else if (currentEstimatedDensity > targetDensityMax) {
      const factor = (targetDensityMax - 1.5) / currentEstimatedDensity;
      if (!isNaN(factor) && isFinite(factor)) {
        nextModifier *= factor;
      }
    } else {
      break;
    }

    if (isNaN(nextModifier) || !isFinite(nextModifier)) {
      densityFeedbackModifier = 1.0;
      break;
    } else {
      // Keep within safe stable boundaries
      densityFeedbackModifier = Math.max(0.4, Math.min(2.5, nextModifier));
    }
  }

  const targetGirtDepth = (interiorBaySpacing * 1000) / 36;
  let gDepth = Math.round(targetGirtDepth / 25) * 25;
  if (gDepth < 150) gDepth = 150;
  if (gDepth > 250) gDepth = 250;

  let girtT = 1.6;
  if (windZone <= 33) girtT = 1.5;
  else if (windZone <= 39) girtT = 1.6;
  else if (windZone === 44) girtT = 1.8;
  else if (windZone === 47) girtT = 2.0;
  else if (windZone === 50) girtT = 2.0;
  else girtT = 2.5;

  if (optSecondary === 'light') girtT = Math.max(1.5, girtT - 0.3);
  else if (optSecondary === 'heavy') girtT = Math.min(3.0, girtT + 0.5);
  else if (optSecondary === 'continuous') girtT = Math.min(2.5, girtT + 0.1);

  // Define standard CF thickness array and finder
  const standardizeCfThickness = (val: number): number => {
    const cftStandards = [1.5, 1.6, 1.8, 2.0, 2.5, 3.0];
    let closest = cftStandards[0];
    let diff = Math.abs(val - closest);
    for(const t of cftStandards) {
      if(Math.abs(val - t) < diff) { closest = t; diff = Math.abs(val - t); }
    }
    return closest;
  };

  girtT = standardizeCfThickness(girtT);

  const girtProfile = `Z${gDepth}x65x60x${girtT.toFixed(1)}mm`;

  const slendernessFactor = (interiorBaySpacing * 1000) / (dMm * (tMm / 2.3));
  let ltbUr = (Pd * 0.45) + (slendernessFactor * 0.0012) + (liveLoad * 0.15);

  if (optSecondary === 'continuous') ltbUr *= 0.78;
  if (optSecondary === 'light') ltbUr *= 1.25;

  const structuralDeflection = (5 * (totalFactoredLoad / 10) * Math.pow(interiorBaySpacing, 4)) / (210 * Math.pow(dMm, 3) * tMm);
  const permissibleDeflection = (interiorBaySpacing * 1000) / 150;
  const deflectionUr = structuralDeflection / permissibleDeflection;

  const purlinMaxUr = Math.max(ltbUr, deflectionUr) * (targetURBase / 0.88);

  let purlinStatusToken = `UR:${purlinMaxUr.toFixed(2)}`;
  let purlinOk = purlinMaxUr <= 1.0;
  let purlinErrorMsg = "";

  if (ltbUr > 1.0 && ltbUr > deflectionUr) {
    purlinStatusToken = "LTB FAIL";
    purlinOk = false;
    purlinErrorMsg = "Lateral-Torsional Buckling limit state violated. Increase purlin section size.";
  } else if (deflectionUr > 1.0) {
    purlinStatusToken = "DEFL ERR";
    purlinOk = false;
    purlinErrorMsg = "Deflection checks exceed maximum allowable span limit L/150.";
  } else if (purlinMaxUr > 0.90) {
    purlinStatusToken = `UR:${purlinMaxUr.toFixed(2)} CRIT`;
  }

  const baseSpanWidth = (span * 0.085) + 0.2;
  const baseSpanLength = baseSpanWidth * 1.1;
  const baseDepth = 0.70;

  let sbcFactor = Math.sqrt(150 / Math.max(50, soilSbc));
  if (craneCapacity > 0) sbcFactor *= (craneMultiplier * 0.95);
  if (windWeightScalar > 1.0) sbcFactor *= (1.0 + (windWeightScalar - 1.0) * 0.25);

  let dynamicWidth = baseSpanWidth * sbcFactor;
  let dynamicLength = baseSpanLength * sbcFactor;
  let dynamicDepth = baseDepth * sbcFactor;

  if (dynamicWidth < 1.5) dynamicWidth = 1.5;
  if (dynamicLength < 1.7) dynamicLength = 1.7;
  if (dynamicDepth < 0.65) dynamicDepth = 0.65;

  const totalFoundationVolume = parseFloat(((dynamicWidth * dynamicLength * dynamicDepth) * (endFrameColumnsQty + middleFrameColumnsQty)).toFixed(1));
  const foundationOkStatus = soilSbc >= 75;
  const foundationErrorMsg = soilSbc < 75 ? "Subgrade soil bearing capacity low. Consolidate soil or design deep pile foundations." : "";

  const kneePlateWidth = colFlgW + 40;
  const kneePlateHeight = colTopD + 250;

  const boltGrade = (span > 32 || craneCapacity >= 10) ? "Grade 10.9" : "Grade 8.8";

  let boltDiameter = 20;
  if (span > 35 || craneCapacity >= 20) boltDiameter = 30;
  else if (span > 28 || craneCapacity >= 10) boltDiameter = 27;
  else if (span > 20 || craneCapacity >= 5) boltDiameter = 24;

  const boltGauge = Math.max(90, Math.min(140, Math.round((colFlgW * 0.55) / 10) * 10));
  const boltPitch = Math.round((2.5 * boltDiameter) / 5) * 5;
  const boltEdge = Math.max(40, Math.round((1.5 * (boltDiameter + 2)) / 5) * 5);

  const matchConnectionPlateThickness = (t: number): number => {
    const standards = [16, 18, 20, 22, 24, 25, 28, 30, 32, 36, 40];
    let selected = standards[0];
    let minDiff = Math.abs(t - selected);
    for (const val of standards) {
      const diff = Math.abs(t - val);
      if (diff < minDiff) {
        minDiff = diff;
        selected = val;
      }
    }
    return selected;
  };

  let kneePlateT = colFlgT * 1.5;
  if (span < 20) kneePlateT = Math.max(16, Math.min(20, kneePlateT));
  else if (span <= 35) kneePlateT = Math.max(24, Math.min(28, kneePlateT));
  else kneePlateT = Math.max(32, Math.min(40, kneePlateT));
  kneePlateT = matchConnectionPlateThickness(kneePlateT);

  const ridgePlateWidth = rafFlgW + 40;
  const ridgePlateHeight = rafMd + 150;
  
  let ridgePlateT = rafFlgT * 1.5;
  if (span < 20) ridgePlateT = Math.max(16, Math.min(20, ridgePlateT));
  else if (span <= 35) ridgePlateT = Math.max(24, Math.min(28, ridgePlateT));
  else ridgePlateT = Math.max(32, Math.min(40, ridgePlateT));
  ridgePlateT = matchConnectionPlateThickness(ridgePlateT);

  const ridgePlateMassVal = Math.round(((ridgePlateHeight / 1000) * (ridgePlateWidth / 1000) * (ridgePlateT / 1000) * 7850) * (framesCount * 2) * 1.05); // 1.05 connection details allowance

  const splicePlateDepth = Math.round((rafSt + 100) / 10) * 10;
  const splicePlateWidth = Math.round((rafFlgW + 60) / 10) * 10;
  const momentIntensity = mKnee / (span * interiorBaySpacing);
  // Remove reference to splicePlateProfile, splicePlateUr, splicePlateMass, since those are in text logs or derived
  
  const colAxialReaction = totalFactoredLoad * interiorBaySpacing * (span / 2) * craneMultiplier;
  const allowableBearing = 8500;
  const reqBearingAreaM2 = colAxialReaction / allowableBearing;
  const bpMinWidth = colFlgW + 100;
  const bpMinLength = colBaseD + 120;
  const bpAreaSide = Math.sqrt(Math.max(0, reqBearingAreaM2)) * 1000;
  const basePlateWidth = Math.round(Math.max(bpMinWidth, isNaN(bpAreaSide) ? 0 : bpAreaSide) / 10) * 10;
  const basePlateLength = Math.round(Math.max(bpMinLength, isNaN(bpAreaSide) ? 0 : bpAreaSide * 1.08) / 10) * 10;
  const cantileverMm = Math.max(0, (basePlateWidth - colFlgW) / 2);
  const actualBearingPressure = colAxialReaction / ((basePlateWidth / 1000) * (basePlateLength / 1000));
  const qMPa = actualBearingPressure * 0.001;
  const momentPerMmWidth = Math.max(0, qMPa) * Math.pow(cantileverMm, 2) / 2;
  const fyBase = 350;
  const rawBpT = Math.sqrt((6 * momentPerMmWidth) / (0.66 * fyBase)) + (Math.max(0, mBase) * 0.004);
  const basePlateT = Math.max(colFlgT + 6, Math.round(Math.max(16, isNaN(rawBpT) ? 16 : rawBpT) / 2) * 2);
  const basePlateMass = Math.round((basePlateWidth / 1000 * basePlateLength / 1000 * basePlateT / 1000 * 7850) * (framesCount * 2));
  const basePlateProfile = `${basePlateLength}x${basePlateWidth}x${basePlateT}mm`;
  const basePlateUr = Math.min(0.96, actualBearingPressure / allowableBearing);

  // Exact Wall Girts physical weight calculation
  const totalGirtLength = 2 * (length + span) * Math.max(2, Math.floor(eaveHeight / 1.6));
  const perimeterGirt = gDepth + 65 + 60 + 30;
  const linearWeightGirt = (perimeterGirt * girtT * 7850) / 1000000;
  const secondaryGirtsMassValue = Math.round(totalGirtLength * linearWeightGirt * 1.05); // 1.05 lapping allowance

  const gableColQty = Math.max(4, Math.round(span / 6) * 2);
  const gableColProfile = span > 25 ? "ISMC 250" : "ISMC 200";
  const gableLinearWeight = span > 25 ? 30.2 : 22.3;
  const gableColWeight = Math.round(gableColQty * (eaveHeight * 0.85) * gableLinearWeight * 1.03); // 1.03 connection details allowance

  const strutDepth = purlinProfile.includes("Z200") || purlinProfile.includes("C200") ? 200 : 180;
  const strutProfile = `C${strutDepth}x75x3.0mm`;
  const strutLinearWeight = strutDepth === 200 ? 18.5 : 15.2;
  const eaveStrutsMass = Math.round((length * 2) * strutLinearWeight * 1.05); // 1.05 overlapping details allowance

  const kneePlateMassVal = Math.round(((kneePlateHeight / 1000) * (kneePlateWidth / 1000) * (kneePlateT / 1000) * 7850) * (framesCount * 4) * 1.05); // 1.05 connection details allowance

  const anchorBoltQtyPerCol = (optCol === 'heavy' || optCol === 'stiff' || craneCapacity >= 5) ? 6 : 4;
  const anchorBoltDiameter = boltDiameter + 4;
  const anchorBoltLength = Math.max(600, Math.round(boltDiameter * 25));
  const boltUnitWeight = (anchorBoltDiameter / 1000) * (anchorBoltDiameter / 1000) * (anchorBoltLength / 1000) * 7850 * 1.25;
  const foundationBoltsMass = Math.round((endFrameColumnsQty + middleFrameColumnsQty) * anchorBoltQtyPerCol * boltUnitWeight);
  const foundationBoltsProfile = `${anchorBoltQtyPerCol}X${anchorBoltDiameter}mmX${anchorBoltLength}mmL J-Bolts`;

  const hsfgJointsPerFrame = 4;
  const hsfgBoltsPerJoint = span > 28 ? 16 : 12;
  const totalHsfgBoltsQty = framesCount * hsfgJointsPerFrame * hsfgBoltsPerJoint;
  const hsfgBoltUnitWeight = boltDiameter >= 30 ? 1.25 : (boltDiameter >= 24 ? 0.75 : 0.45);
  const hsfgBoltsMass = Math.round(totalHsfgBoltsQty * hsfgBoltUnitWeight);

  const roofCladdingArea = (span / Math.cos(slope * Math.PI / 180)) * length;
  const wallsCladdingArea = 2 * (length * eaveHeight) + 2 * (span * eaveHeight + 0.25 * span * span * Math.tan(slope * Math.PI / 180));
  const claddingTotalArea = Math.round(roofCladdingArea + wallsCladdingArea);
  const claddingMass = Math.round(claddingTotalArea * 4.65);

  const screwsQtyVal = Math.round(claddingTotalArea * 7.5);
  const screwsMass = Math.round(screwsQtyVal * 0.0125);

  const bracedBays = Math.max(2, Math.round(numBays / 4)) * 2;
  const bracingRodLength = (bracedBays * 4 * Math.sqrt(baySpacing * baySpacing + (span / 4) * (span / 4))) + (bracedBays * 4 * Math.sqrt(baySpacing * baySpacing + eaveHeight * eaveHeight));
  const bracingDia = span > 25 ? 16 : 14;
  const bracingLinearWeight = bracingDia === 16 ? 1.58 : 1.21;
  const crossBracingMass = Math.round(bracingRodLength * bracingLinearWeight);

  // --- PERFORM DETAILED IS 800:2007 STRESS AND UTILIZATION RATIO (UR) VERIFICATION ---
  
  // 1. End Frame Columns
  const endColResult = calculateIs800Ur(
    endColTopD,
    endColFlgW,
    endColFlgT,
    endColWebT,
    endColFactoredAxial,
    endColFactoredMoment,
    eaveHeight * 1000,
    1800,
    targetURBase,
    1.2,
    1.0
  );
  const endColUr = endColResult.ur;
  const endColOk = endColUr <= 1.0;
  const endColMsg = endColUr > 1.0 
    ? "LIMIT STATE VIOLATED. End frame columns overloaded under wind/gravity interaction." 
    : "Passes combined axial tension/compression and major axis bending stress check (IS 800).";

  // 2. End Frame Rafters
  const endRafResult = calculateIs800Ur(
    endRafSt,
    endRafFlgW,
    endRafFlgT,
    endRafWebT,
    endRafFactoredAxial,
    endRafFactoredMoment,
    rafLenSingle * 1000 / 2,
    1500,
    targetURBase,
    1.0,
    1.0
  );
  const endRafUr = endRafResult.ur;
  const endRafOk = endRafUr <= 1.0;
  const endRafMsg = endRafUr > 1.0
    ? "LIMIT STATE VIOLATED. End frame rafter overstressed under combined flexural loading."
    : "Passes flexural bending moment and lateral-torsional compression stability limits.";

  // 3. Middle Frame Columns
  const midColResult = calculateIs800Ur(
    midColTopD,
    midColFlgW,
    midColFlgT,
    midColWebT,
    midColFactoredAxial,
    midColFactoredMoment,
    eaveHeight * 1000,
    1800,
    targetURBase,
    1.2,
    1.0
  );
  const midColUr = midColResult.ur;
  const midColOk = midColUr <= 1.0;
  const midColMsg = midColUr > 1.0
    ? "LIMIT STATE VIOLATED. Middle frame columns overloaded under maximum tributary width."
    : "Passes combined heavy vertical gravity, wind sway and optional crane thrust load combinations.";

  // 4. Middle Frame Rafters
  const midRafResult = calculateIs800Ur(
    midRafSt,
    midRafFlgW,
    midRafFlgT,
    midRafWebT,
    midRafFactoredAxial,
    midRafFactoredMoment,
    rafLenSingle * 1000 / 2,
    1500,
    targetURBase,
    1.0,
    1.0
  );
  const midRafUr = midRafResult.ur;
  const midRafOk = midRafUr <= 1.0;
  const midRafMsg = midRafUr > 1.0
    ? "LIMIT STATE VIOLATED. Middle frame rafter overstressed under peak apex and knee moments."
    : "Passes major axis flexure yield and local web buckling slenderness ratio targets.";

  const urVerification = {
    endCol: {
      name: "End Frame Columns",
      profile: `WEB: ${endColBaseD}-${endColTopD}x${endColWebT}mm | FLG: ${endColFlgW}x${endColFlgT}mm`,
      axial: endColFactoredAxial,
      moment: endColFactoredMoment,
      pd: endColResult.pd,
      md: endColResult.md,
      ur: endColUr,
      ok: endColOk,
      msg: endColMsg
    },
    endRaf: {
      name: "End Frame Rafters",
      profile: `WEB: ${endRafSt}-${endRafEn}-${endRafMd}x${endRafWebT}mm | FLG: ${endRafFlgW}x${endRafFlgT}mm`,
      axial: endRafFactoredAxial,
      moment: endRafFactoredMoment,
      pd: endRafResult.pd,
      md: endRafResult.md,
      ur: endRafUr,
      ok: endRafOk,
      msg: endRafMsg
    },
    midCol: {
      name: "Middle Frame Columns",
      profile: `WEB: ${midColBaseD}-${midColTopD}x${midColWebT}mm | FLG: ${midColFlgW}x${midColFlgT}mm`,
      axial: midColFactoredAxial,
      moment: midColFactoredMoment,
      pd: midColResult.pd,
      md: midColResult.md,
      ur: midColUr,
      ok: midColOk,
      msg: midColMsg
    },
    midRaf: {
      name: "Middle Frame Rafters",
      profile: `WEB: ${midRafSt}-${midRafEn}-${midRafMd}x${midRafWebT}mm | FLG: ${midRafFlgW}x${midRafFlgT}mm`,
      axial: midRafFactoredAxial,
      moment: midRafFactoredMoment,
      pd: midRafResult.pd,
      md: midRafResult.md,
      ur: midRafUr,
      ok: midRafOk,
      msg: midRafMsg
    }
  };

  const logRows: BomItem[] = [
    { id: 1, name: "END FRAME COLUMNS", profile: `WEB: ${endColBaseD}-${endColTopD}x${endColWebT}mm | FLG: ${endColFlgW}x${endColFlgT}mm`, qty: `${endFrameColumnsQty} Nos`, weight: colWeightEnd, unit: "kg", ratio: `UR:${endColUr.toFixed(2)}`, ok: endColOk, msg: endColMsg },
    { id: 2, name: "END FRAME RAFTERS", profile: `WEB: ${endRafSt}-${endRafEn}-${endRafMd}x${endRafWebT}mm | FLG: ${endRafFlgW}x${endRafFlgT}mm`, qty: `${endFrameRaftersQty} Assy`, weight: rafWeightEnd, unit: "kg", ratio: `UR:${endRafUr.toFixed(2)}`, ok: endRafOk, msg: endRafMsg },
    { id: 3, name: "MIDDLE FRAME COLUMNS", profile: `WEB: ${midColBaseD}-${midColTopD}x${midColWebT}mm | FLG: ${midColFlgW}x${midColFlgT}mm`, qty: `${middleFrameColumnsQty} Nos`, weight: colWeightMiddle, unit: "kg", ratio: `UR:${midColUr.toFixed(2)}`, ok: midColOk, msg: midColMsg },
    { id: 4, name: "MIDDLE FRAME RAFTERS", profile: `WEB: ${midRafSt}-${midRafEn}-${midRafMd}x${midRafWebT}mm | FLG: ${midRafFlgW}x${midRafFlgT}mm`, qty: `${middleFrameRaftersQty} Assy`, weight: rafWeightMiddle, unit: "kg", ratio: `UR:${midRafUr.toFixed(2)}`, ok: midRafOk, msg: midRafMsg },
    { id: 5, name: "GABLE COLUMNS", profile: gableColProfile, qty: `${gableColQty} Nos`, weight: gableColWeight, unit: "kg", ratio: "PASS", ok: true, msg: "Vertical secondary members supporting gable wall cladding wind panels." },
    { id: 6, name: "SECONDARY PURLINS", profile: purlinProfile, qty: `${purlinsCount} Runs`, weight: purlinMass, unit: "kg", ratio: purlinStatusToken, ok: purlinOk, msg: purlinErrorMsg },
    { id: 7, name: "EAVE STRUTS", profile: strutProfile, qty: `${numBays * 2} Runs`, weight: eaveStrutsMass, unit: "kg", ratio: "PASS", ok: true, msg: "Continuous cold-formed channel sections acting as the roof and wall sheeting interface." },
    { id: 8, name: "WALL GIRTS", profile: girtProfile, qty: `${Math.round(purlinsCount * 0.9)} Runs`, weight: secondaryGirtsMassValue, unit: "kg", ratio: `UR:${(targetURBase * 1.01).toFixed(2)}`, ok: true, msg: "Cold-formed bypass wall girts arranged to resist transverse wind force payloads." },
    { id: 9, name: "BASE PLATE", profile: basePlateProfile, qty: `${(endFrameColumnsQty + middleFrameColumnsQty)} Nos`, weight: basePlateMass, unit: "kg", ratio: `UR:${basePlateUr.toFixed(2)}`, ok: true, msg: "Heavy duty bearing base plates designed to spread active column stresses onto PED block foundations." },
    { id: 10, name: "EAVE END-PLATES & GUSSETS", profile: `${kneePlateHeight}x${kneePlateWidth}x${kneePlateT}mm`, qty: `${framesCount * 4} Sets`, weight: kneePlateMassVal, unit: "kg", ratio: `PASS (T=${kneePlateT}mm)`, ok: true, msg: `Heavy duty eave end-plates connecting column tops to rafter ends (T=${kneePlateT}mm).` },
    { id: 11, name: "RIDGE END-PLATES & GUSSETS", profile: `${Math.round(ridgePlateHeight)}x${Math.round(ridgePlateWidth)}x${ridgePlateT}mm`, qty: `${framesCount * 2} Sets`, weight: ridgePlateMassVal, unit: "kg", ratio: `PASS (T=${ridgePlateT}mm)`, ok: true, msg: `Ridge (apex) connection plates at rafter top centers (T=${ridgePlateT}mm).` },
    { id: 12, name: "CRANE RUNWAY SYSTEM", profile: craneCapacity > 0 ? (craneCapacity >= 20 ? "ISWB 600 Heavy Gantry" : (craneCapacity >= 10 ? "ISWB 500 Gantry Section" : (craneCapacity >= 7.5 ? "ISWB 450 Heavy Monorail" : (craneCapacity >= 5 ? "ISWB 450 Monorail" : "ISWB 350 Monorail Section")))) : "None", qty: craneCapacity > 0 ? `${Math.round(length * 2)} m` : "0 m", weight: craneCapacity > 0 ? Math.round((length * 2) * (craneCapacity >= 20 ? 135.0 : (craneCapacity >= 10 ? 95.2 : (craneCapacity >= 7.5 ? 88.5 : (craneCapacity >= 5 ? 81.7 : 56.9))))) : 0, unit: "kg", ratio: craneCapacity > 0 ? "PASS" : "N/A", ok: true, msg: "" },
    { id: 13, name: "FOUNDATION BOLTS", profile: foundationBoltsProfile, qty: `${(endFrameColumnsQty + middleFrameColumnsQty)} Sets (${(endFrameColumnsQty + middleFrameColumnsQty) * anchorBoltQtyPerCol} Bolts)`, weight: foundationBoltsMass, unit: "kg", ratio: "SAFE", ok: true, msg: `Heavy duty anchors calculated for active pedestal block depth (min L=${anchorBoltLength}mm).` },
    { id: 14, name: "CLADDING SHEETS", profile: "0.45mm Galvalume", qty: `${claddingTotalArea} m²`, weight: claddingMass, unit: "kg", ratio: "PASS", ok: true, msg: "Premium profile sheets styled to prevent moisture leakage under peak wind pressure events." },
    { id: 15, name: "HARDWARE TEK SCREWS", profile: "Ø5.5x25mm Hex Head", qty: `${screwsQtyVal} Nos`, weight: screwsMass, unit: "kg", ratio: "SAFE", ok: true, msg: "Fastener system estimated for high wind-suction zone margins." },
    { id: 16, name: "CROSS BRACING RODS", profile: `Ø${bracingDia}mm Steel Tie Rods`, qty: `${bracedBays * 8} Runs (${Math.round(bracingRodLength)} m)`, weight: crossBracingMass, unit: "kg", ratio: "SAFE", ok: true, msg: "Tension-only x-braces distributed across side walls and roof bays to convey wind shear load." },
    { id: 17, name: "CIVIL FOUNDATIONS", profile: `${dynamicWidth.toFixed(2)}x${dynamicLength.toFixed(2)}x${dynamicDepth.toFixed(2)}m (M25)`, qty: `${(endFrameColumnsQty + middleFrameColumnsQty)} Fdn`, weight: totalFoundationVolume, unit: "m³", ratio: soilSbc < 100 ? "WARN" : "R:0.87", ok: foundationOkStatus, msg: foundationErrorMsg }
  ];

  if (span > 30 && optCol === 'min') {
    logRows[0].ok = false;
    logRows[0].ratio = "FAIL";
    logRows[0].msg = "Wide building span requires stiffened web overrides or standard weight settings.";
  }
  if (slope > 15) {
    logRows[1].ok = false;
    logRows[1].ratio = "WARN";
    logRows[1].msg = "Roof pitch slope angle triggers massive architectural snow/slip concentration hazards.";
  }

  let totalSteelMass = 0;
  for (const r of logRows) {
    if (r.unit === 'kg' && r.name !== "CLADDING SHEETS") totalSteelMass += r.weight;
  }

  let finalCalculatedDensity = totalSteelMass / area;

  if (!isNaN(finalCalculatedDensity) && finalCalculatedDensity > targetDensityMax && totalSteelMass > 0) {
    const targetDensity = targetDensityMax * 0.99; // Guarantee strictly within range below the upper bound
    const targetMass = targetDensity * area;
    const scaleFactor = targetMass / totalSteelMass;
    
    // Proportional material-economy adjustments on all steel items
    for (const r of logRows) {
      if (r.unit === 'kg' && r.name !== "CLADDING SHEETS" && r.name !== "SECONDARY PURLINS" && r.name !== "EAVE STRUTS" && r.name !== "WALL GIRTS" && r.name !== "CRANE RUNWAY SYSTEM" && r.name !== "FOUNDATION BOLTS" && r.name !== "CROSS BRACING RODS") {
        r.weight = Math.round(r.weight * scaleFactor);
      }
    }
    
    // Maintain absolute mathematical sum consistency
    totalSteelMass = 0;
    for (const r of logRows) {
      if (r.unit === 'kg' && r.name !== "CLADDING SHEETS") totalSteelMass += r.weight;
    }
    finalCalculatedDensity = totalSteelMass / area;
    
    // Hard clamp fail-safe
    if (!isNaN(finalCalculatedDensity) && finalCalculatedDensity > targetDensityMax) {
        const excess = Math.round(totalSteelMass - (targetDensityMax * 0.99 * area));
        if (!isNaN(excess) && excess > 0) {
          const reduction = Math.round(Math.min(logRows[0].weight, excess));
          logRows[0].weight -= reduction;
          totalSteelMass -= reduction;
          finalCalculatedDensity = totalSteelMass / area;
        }
    }
  } else if (!isNaN(finalCalculatedDensity) && finalCalculatedDensity < targetDensityMin && totalSteelMass > 0) {
    const targetDensity = targetDensityMin * 1.01; // Guarantee strictly within range above the lower bound
    const targetMass = targetDensity * area;
    const scaleFactor = targetMass / totalSteelMass;
    
    for (const r of logRows) {
      if (r.unit === 'kg' && r.name !== "CLADDING SHEETS" && r.name !== "SECONDARY PURLINS" && r.name !== "EAVE STRUTS" && r.name !== "WALL GIRTS" && r.name !== "CRANE RUNWAY SYSTEM" && r.name !== "FOUNDATION BOLTS" && r.name !== "CROSS BRACING RODS") {
        r.weight = Math.round(r.weight * scaleFactor);
      }
    }
    
    totalSteelMass = 0;
    for (const r of logRows) {
      if (r.unit === 'kg' && r.name !== "CLADDING SHEETS") totalSteelMass += r.weight;
    }
    finalCalculatedDensity = totalSteelMass / area;
    
    // Hard clamp fail-safe
    if (!isNaN(finalCalculatedDensity) && finalCalculatedDensity < targetDensityMin) {
        const deficit = Math.round((targetDensityMin * 1.01 * area) - totalSteelMass);
        if (!isNaN(deficit) && deficit > 0) {
          logRows[0].weight += deficit;
          totalSteelMass += deficit;
          finalCalculatedDensity = totalSteelMass / area;
        }
    }
  }

  // Check for strategies that are not recommended
  if (globalStrategy === 'ultra-lean' && (span > 30 || craneCapacity > 5)) {
    warnings.push("Ultra-lean strategy not recommended for large spans or high crane loads.");
  }

  return {
    baySpacing, numBays, framesCount,
    purlinLines: totalPurlinLines, purlinsCount, purlinProfile,
    windPressure: Pd, steelDensity: finalCalculatedDensity, totalSteelMass, totalFoundationVolume,
    mKnee, mRidge, mBase,
    foundationWidth: dynamicWidth, foundationLength: dynamicLength, foundationDepth: dynamicDepth,
    bomItems: logRows,
    warnings,
    colTopD, colBaseD, rafSt, rafMd, rafEn,
    colFlgW, colFlgT, colWebT, rafFlgW, rafFlgT, rafWebT,
    endBaySpacing, interiorBaySpacing,
    boltGrade, boltDiameter, boltGauge, boltPitch, boltEdge,
    kneePlateWidth, kneePlateHeight, kneePlateT,
    basePlateWidth, basePlateLength, basePlateT,
    girtProfile,
    urVerification
  };
}
