export interface PebParams {
  projectName: string;
  span: number | ""; // in meters
  length: number | ""; // in meters
  eaveHeight: number | ""; // in meters
  slope: number | ""; // in degrees
  windZone: number | ""; // in m/s
  terrainClass: number | ""; // 1, 2, or 3
  soilSbc: number | ""; // in kN/m2
  deadLoad: number | ""; // in kN/m2
  liveLoad: number | ""; // in kN/m2
  craneCapacity: number | ""; // in Tons (0, 5, 10, 20)
  steelGrade: string; // "E250", "E350"
  globalStrategy: string; // "ultra-lean" | "highly-optimized" | "balanced" | "safe" | "heavy"
  optCol: string; // "min" | "opt" | "stiff" | "heavy"
  optRaf: string; // "min" | "opt" | "stiff" | "heavy"
  optSecondary: string; // "light" | "continuous" | "heavy"
}

export interface BomItem {
  id: number;
  name: string;
  profile: string;
  qty: string;
  weight: number;
  unit: string; // "kg" or "m³"
  ratio: string;
  ok: boolean;
  msg: string;
}

export interface UrVerificationItem {
  name: string;
  profile: string;
  axial: number;
  moment: number;
  pd: number;
  md: number;
  ur: number;
  ok: boolean;
  msg: string;
}

export interface PebOutputs {
  baySpacing: number;
  numBays: number;
  framesCount: number;
  purlinLines: number;
  purlinsCount: number;
  purlinProfile: string;
  windPressure: number;
  steelDensity: number;
  totalSteelMass: number;
  totalFoundationVolume: number;
  mKnee: number;
  mRidge: number;
  mBase: number;
  foundationWidth: number;
  foundationLength: number;
  foundationDepth: number;
  bomItems: BomItem[];
  warnings: string[]; // Added warnings
  colTopD: number;
  colBaseD: number;
  rafSt: number;
  rafMd: number;
  rafEn: number;
  colFlgW: number;
  colFlgT: number;
  colWebT: number;
  rafFlgW: number;
  rafFlgT: number;
  rafWebT: number;
  endBaySpacing: number;
  interiorBaySpacing: number;
  boltGrade: string;
  boltDiameter: number;
  boltGauge: number;
  boltPitch: number;
  boltEdge: number;
  kneePlateWidth: number;
  kneePlateHeight: number;
  kneePlateT: number;
  basePlateWidth: number;
  basePlateLength: number;
  basePlateT: number;
  girtProfile: string;
  urVerification?: {
    endCol: UrVerificationItem;
    endRaf: UrVerificationItem;
    midCol: UrVerificationItem;
    midRaf: UrVerificationItem;
  };
}
