
export interface ParameterMaster {
  id: string;
  name: string;
  method: string;
  unit: string;
  category: string;
}

export interface TestMaster {
  id: string;
  specification: string;
  testName: string;
  sopCode: string;
  tests: string;
  unit: string;
  mu: string;
  limit: string;
  methodReference: string;
  sampleType: string;
  referenceNo: string;
  incubationTemp: string;
  incubationPeriod: string;
  warehouseItems: string;
}

export interface SpecParameter {
  parameterId: string;
  name: string;
  method: string;
  unit: string;
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
  productName: string;
  category: string;
  department: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Active';
  effectiveDate: string;
  reviewDate: string;
  parameters: SpecParameter[];
  version: string;
  createdBy: string;
  createdAt: string;
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
    productName: 'Drinking Water',
    category: 'Water',
    department: 'Environmental',
    status: 'Active',
    effectiveDate: '2024-01-01',
    reviewDate: '2025-01-01',
    version: '1.0',
    createdBy: 'John Doe',
    createdAt: '2023-12-15',
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', min: 6.5, max: 8.5, target: 7.5, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-003', name: 'Chloride', method: 'Titration', unit: 'mg/L', min: null, max: 250, target: null, limitType: 'Max Only', mandatory: true },
      { parameterId: 'PM-005', name: 'E.coli', method: 'Membrane Filtration', unit: 'CFU/100ml', min: null, max: null, target: 'Absent', limitType: 'Pass / Fail', mandatory: true },
      { parameterId: 'PM-009', name: 'Color', method: 'Visual', unit: 'Platinum-Cobalt', min: null, max: null, target: 'Clear', limitType: 'Text', mandatory: false },
    ]
  },
  {
    id: 'SPEC-002',
    code: 'SPEC-W-002',
    name: 'Industrial Waste Water',
    productName: 'Waste Water',
    category: 'Water',
    department: 'Environmental',
    status: 'Pending',
    effectiveDate: '2024-05-01',
    reviewDate: '2026-05-01',
    version: '1.1',
    createdBy: 'Jane Smith',
    createdAt: '2024-04-10',
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', min: 5.5, max: 9.5, target: 7.0, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-002', name: 'TDS', method: 'Gravimetric', unit: 'mg/L', min: null, max: 2000, target: null, limitType: 'Max Only', mandatory: true },
    ]
  },
  {
    id: "SPEC-003",
    code: "SPEC-W-003",
    name: "Industrial Waste Water 2",
    productName: "Waste Water",
    category: "Water",
    department: "Environmental",
    status: "Pending",
    effectiveDate: "2024-05-01",
    reviewDate: "2026-05-01",
    version: "1.1",
    createdBy: "Jane Smith",
    createdAt: "2024-04-10",
    parameters: [
      { parameterId: 'PM-001', name: 'pH', method: 'Electrometric', unit: 'pH', min: 5.5, max: 9.5, target: 7.0, limitType: 'Range', mandatory: true },
      { parameterId: 'PM-002', name: 'TDS', method: 'Gravimetric', unit: 'mg/L', min: null, max: 2000, target: null, limitType: 'Max Only', mandatory: true },
    ]
  }
];

export const testMasterData: TestMaster[] = [
  {
    id: "TM-001",
    specification: "Food Safety",
    testName: "Salmonella Detection",
    sopCode: "SOP-MB-001",
    tests: "Salmonella spp",
    unit: "P/A",
    mu: "N/A",
    limit: "Absent/25g",
    methodReference: "ISO 6579-1",
    sampleType: "Raw Meat",
    referenceNo: "REF-2024-001",
    incubationTemp: "37°C",
    incubationPeriod: "24-48h",
    warehouseItems: "Peptone Water, XLD Agar"
  },
  {
    id: "TM-002",
    specification: "Water Quality",
    testName: "Total Coliforms",
    sopCode: "SOP-MB-002",
    tests: "Total Coliforms",
    unit: "CFU/100ml",
    mu: "0.12",
    limit: "<1",
    methodReference: "Standard Methods 9222B",
    sampleType: "Drinking Water",
    referenceNo: "REF-2024-002",
    incubationTemp: "35°C",
    incubationPeriod: "24h",
    warehouseItems: "m-Endo Agar"
  }
];
