
export interface ParameterMaster {
  id: string;
  name: string;
  method: string;
  unit: string;
  category: string;
}

export interface TestMaster {
  id: string;
  testCode: string;
  testName: string;
  testParameter: string;
  methodType: string;
  methodReference: string;
  sampleType: string;
  referenceNo: string;
  sopCode: string;
  warehouseItems: string;
  // Per-parameter details serialized as a JSON string. Each entry has
  // { id, name, methodReference, limitRange, limitType, method?, unit?, category? }.
  // Older records without this field fall back gracefully.
  parameterDetails?: string;
}

// A single parameter row attached to a test. Mirrors the shape used in
// SpecParameter so the dashboards stay consistent.
export type TestLimitType =
  | 'Range'
  | 'Max Only'
  | 'Min Only'
  | 'Exact Value'
  | 'Pass / Fail'
  | 'Text'
  | 'Not Detected';

export interface TestParameterRow {
  id: string;
  name: string;
  methodReference: string;
  limitRange: string;
  limitType: TestLimitType;
  // Optional metadata inherited from the library entry, if any.
  method?: string;
  unit?: string;
  mu?: string; // Measurement Uncertainty
  category?: string;
  // True if this row was created inline (not picked from the library).
  isCustom?: boolean;
}

export interface MethodTypeMaster {
  id: string;
  name: string;
  category: 'Chemical' | 'Physical' | 'Microbiology' | 'Radiological' | 'Other';
}

export interface SpecParameter {
  parameterId: string;
  name: string;
  method: string;
  unit: string;
  mu?: string; // Measurement Uncertainty
  sopCode?: string;
  tests?: string;
  referenceNo?: string;
  limitRange?: string;
  min: string | number | null;
  max: string | number | null;
  target: string | number | null;
  limitType: 'Range' | 'Max Only' | 'Min Only' | 'Exact Value' | 'Pass / Fail' | 'Text' | 'Not Detected';
  mandatory: boolean;
}

export interface Specification {
  id: string;
  code: string;
  name: string;
  category: string;
  issuanceDate: string;
  parameters: SpecParameter[];
  tests?: SpecTest[];
}

export interface SpecTest {
  testId: string;
  testCode: string;
  testName: string;
  testParameter: string;
  methodType: string;
  methodReference: string;
  sampleType: string;
  referenceNo: string;
  sopCode: string;
  unit: string;
  limitRange: string;
  min: string | number | null;
  max: string | number | null;
  target: string | number | null;
  limitType: 'Range' | 'Max Only' | 'Min Only' | 'Exact Value' | 'Pass / Fail' | 'Text' | 'Not Detected';
  mandatory: boolean;
}

export const parameterLibrary: ParameterMaster[] = [
  { id: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', category: 'Chemical' },
  { id: 'PM-002', name: 'TDS', method: 'Gravimetric', unit: 'mg/L', category: 'Physical' },
  { id: 'PM-003', name: 'Chloride', method: 'Titration', unit: 'mg/L', category: 'Chemical' },
  { id: 'PM-004', name: 'Hardness', method: 'EDTA Titration', unit: 'mg/L', category: 'Chemical' },
  { id: 'PM-005', name: 'E.coli', method: 'Membrane Filtration', unit: 'CFU/100ml', category: 'Microbiology' },
  { id: 'PM-006', name: 'Conductivity', method: 'Conductometry', unit: 'µS/cm', category: 'Physical' },
  { id: 'PM-007', name: 'Moisture', method: 'Loss on Drying', unit: '%', category: 'Physical' },
  { id: 'PM-008', name: 'Viscosity', method: 'Brookfield', unit: 'cP', category: 'Physical' },
  { id: 'PM-009', name: 'Color', method: 'Visual', unit: 'Platinum-Cobalt', category: 'Physical' },
];

export const mockSpecifications: Specification[] = [
  {
    id: 'SPEC-001',
    code: 'SPEC-DW-001',
    name: 'Drinking Water Standard',
    category: 'Water',
    issuanceDate: '2024-01-01',
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', sopCode: 'SOP-PM-001', tests: 'pH', referenceNo: 'REF-CH-PM-001', limitRange: '6.5 - 8.5', min: 6.5, max: 8.5, target: 7.5, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-003', name: 'Chloride', method: 'Titration', unit: 'mg/L', sopCode: 'SOP-PM-003', tests: 'Chloride', referenceNo: 'REF-CH-PM-003', limitRange: '0 - 250', min: null, max: 250, target: null, limitType: 'Max Only', mandatory: true },
      { parameterId: 'PM-005', name: 'E.coli', method: 'Membrane Filtration', unit: 'CFU/100ml', sopCode: 'SOP-PM-005', tests: 'E.coli', referenceNo: 'REF-MI-PM-005', limitRange: 'Absent', min: null, max: null, target: 'Absent', limitType: 'Pass / Fail', mandatory: true },
      { parameterId: 'PM-009', name: 'Color', method: 'Visual', unit: 'Platinum-Cobalt', sopCode: 'SOP-PM-009', tests: 'Color', referenceNo: 'REF-PH-PM-009', limitRange: 'Clear', min: null, max: null, target: 'Clear', limitType: 'Text', mandatory: false },
    ]
  },
  {
    id: 'SPEC-002',
    code: 'SPEC-W-002',
    name: 'Industrial Waste Water',
    category: 'Water',
    issuanceDate: '2024-05-01',
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', sopCode: 'SOP-PM-001', tests: 'pH', referenceNo: 'REF-CH-PM-001', limitRange: '5.5 - 9.5', min: 5.5, max: 9.5, target: 7.0, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-002', name: 'TDS', method: 'Gravimetric', unit: 'mg/L', sopCode: 'SOP-PM-002', tests: 'TDS', referenceNo: 'REF-PH-PM-002', limitRange: '0 - 2000', min: null, max: 2000, target: null, limitType: 'Max Only', mandatory: true },
    ]
  },
  {
    id: "SPEC-003",
    code: "SPEC-W-003",
    name: "Industrial Waste Water 2",
    category: "Water",
    issuanceDate: "2024-05-01",
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', sopCode: 'SOP-PM-001', tests: 'pH', referenceNo: 'REF-CH-PM-001', limitRange: '5.5 - 9.5', min: 5.5, max: 9.5, target: 7.0, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-002', name: 'TDS', method: 'Gravimetric', unit: 'mg/L', sopCode: 'SOP-PM-002', tests: 'TDS', referenceNo: 'REF-PH-PM-002', limitRange: '0 - 2000', min: null, max: 2000, target: null, limitType: 'Max Only', mandatory: true },
    ]
  }
];

export const testMasterData: TestMaster[] = [
  {
    id: "TM-001",
    testCode: "TC-MB-001",
    testName: "Salmonella Detection",
    testParameter: "Salmonella spp",
    methodType: "Membrane Filtration",
    methodReference: "ISO 6579-1",
    sampleType: "Raw Meat",
    referenceNo: "REF-2024-001",
    sopCode: "SOP-MB-001",
    warehouseItems: "Peptone Water, XLD Agar",
    parameterDetails: JSON.stringify([
      {
        id: "TPR-1",
        name: "Salmonella spp",
        methodReference: "ISO 6579-1",
        limitRange: "Absent",
        limitType: "Pass / Fail",
      },
    ]),
  },
  {
    id: "TM-002",
    testCode: "TC-MB-002",
    testName: "Total Coliforms",
    testParameter: "E.coli",
    methodType: "Membrane Filtration",
    methodReference: "Standard Methods 9222B",
    sampleType: "Drinking Water",
    referenceNo: "REF-2024-002",
    sopCode: "SOP-MB-002",
    warehouseItems: "m-Endo Agar",
    parameterDetails: JSON.stringify([
      {
        id: "TPR-2",
        name: "E.coli",
        methodReference: "Standard Methods 9222B",
        limitRange: "0",
        limitType: "Max Only",
      },
    ]),
  },
];

export const methodTypeLibrary: MethodTypeMaster[] = [
  { id: 'MT-001', name: 'Electrometric', category: 'Chemical' },
  { id: 'MT-002', name: 'Gravimetric', category: 'Physical' },
  { id: 'MT-003', name: 'Titration', category: 'Chemical' },
  { id: 'MT-004', name: 'EDTA Titration', category: 'Chemical' },
  { id: 'MT-005', name: 'Membrane Filtration', category: 'Microbiology' },
  { id: 'MT-006', name: 'Conductometry', category: 'Physical' },
  { id: 'MT-007', name: 'Loss on Drying', category: 'Physical' },
  { id: 'MT-008', name: 'Brookfield', category: 'Physical' },
  { id: 'MT-009', name: 'Visual', category: 'Physical' },
  { id: 'MT-010', name: 'Spectrophotometry', category: 'Chemical' },
  { id: 'MT-011', name: 'pH Meter', category: 'Chemical' },
  { id: 'MT-012', name: 'HPLC', category: 'Chemical' },
  { id: 'MT-013', name: 'GC-MS', category: 'Chemical' },
  { id: 'MT-014', name: 'PCR', category: 'Microbiology' },
  { id: 'MT-015', name: 'Plate Count', category: 'Microbiology' },
];
