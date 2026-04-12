export const mockSamples = [
  { 
    id: "SAM-2024-001", 
    clientId: "C001", 
    clientName: "Al-Marai Company", 
    sampleType: "Food", 
    description: "Full Cream Milk Batch #FM-2024-089", 
    status: "Approved", 
    assignedAnalyst: "Shahjahan", 
    receivedDate: "2024-01-15", 
    completedDate: "2024-01-18", 
    priority: "Normal",
    tests: [
      {
        id: "T-001",
        name: "Chemical Analysis",
        category: "Chemical",
        method: "AOAC 989.05",
        assignedTo: "Shahjahan",
        status: "Completed",
        parameters: [
          { id: "P-01", name: "pH", value: "6.7", unit: "", min: 6.5, max: 6.8, status: "Pass" },
          { id: "P-02", name: "Fat Content", value: "3.2", unit: "%", min: 3.0, max: 3.5, status: "Pass" },
          { id: "P-03", name: "Solid Non-Fat", value: "8.6", unit: "%", min: 8.5, max: 9.0, status: "Pass" }
        ]
      },
      {
        id: "T-002",
        name: "Microbial Screening",
        category: "Microbiology",
        method: "ISO 4833-1",
        assignedTo: "Tariq masum",
        status: "Completed",
        parameters: [
          { id: "P-04", name: "Total Plate Count", value: "500", unit: "CFU/ml", min: null, max: 10000, status: "Pass" },
          { id: "P-05", name: "Coliforms", value: "Negative", unit: "", min: null, max: null, status: "Pass" }
        ]
      }
    ]
  },
  { 
    id: "SAM-2024-002", 
    clientId: "C007", 
    clientName: "SWCC - Saline Water", 
    sampleType: "Water", 
    description: "Desalinated Water Sample - Plant #3", 
    status: "Testing", 
    assignedAnalyst: "Tariq masum", 
    receivedDate: "2024-01-16", 
    completedDate: null, 
    priority: "High",
    tests: [
      {
        id: "T-003",
        name: "Physico-Chemical Water Test",
        category: "Chemical",
        method: "APHA 2320 B",
        assignedTo: "Tariq masum",
        status: "In Progress",
        parameters: [
          { id: "P-06", name: "Turbidity", value: "0.2", unit: "NTU", min: 0, max: 1.0, status: "Pass" },
          { id: "P-07", name: "TDS", value: "120", unit: "mg/L", min: 0, max: 500, status: "Pass" },
          { id: "P-08", name: "Chloride", value: "", unit: "mg/L", min: 0, max: 250, status: "Pending" }
        ]
      }
    ]
  },
  { 
    id: "SAM-2024-003", 
    clientId: "C003", 
    clientName: "Ajmal Perfumes", 
    sampleType: "Perfume/Oud", 
    description: "Oud Al-Layl Fragrance Batch #OL-089", 
    status: "Review", 
    assignedAnalyst: "Khaled", 
    receivedDate: "2024-01-16", 
    completedDate: null, 
    priority: "Normal",
    tests: [
      {
        id: "T-004",
        name: "Purity & Composition",
        category: "Instrumentation",
        method: "GC-MS Internal",
        assignedTo: "Khaled",
        status: "Completed",
        parameters: [
          { id: "P-09", name: "Ethanol %", value: "85", unit: "%", min: 80, max: 90, status: "Pass" },
          { id: "P-10", name: "Water Content", value: "2.5", unit: "%", min: 0, max: 5.0, status: "Pass" }
        ]
      }
    ]
  },
  { 
    id: "SAM-2024-004", 
    clientId: "C005", 
    clientName: "Tabuk Pharmaceuticals", 
    sampleType: "Pharmaceutical", 
    description: "Amoxicillin 500mg Capsules", 
    status: "Received", 
    assignedAnalyst: null, 
    receivedDate: "2024-01-17", 
    completedDate: null, 
    priority: "Urgent",
    tests: [
      {
        id: "T-005",
        name: "Assay of Amoxicillin",
        category: "Pharmaceutical",
        method: "USP 42",
        assignedTo: null,
        status: "Pending",
        parameters: [
          { id: "P-11", name: "Active Ingredient", value: "", unit: "mg", min: 475, max: 525, status: "Pending" }
        ]
      }
    ]
  },
  { 
    id: "SAM-2024-005", 
    clientId: "C002", 
    clientName: "Saudi Aramco", 
    sampleType: "Water", 
    description: "Process Water - Ras Tanura Refinery", 
    status: "Approved", 
    assignedAnalyst: "Nazmul Alam", 
    receivedDate: "2024-01-14", 
    completedDate: "2024-01-17", 
    priority: "High",
    tests: [
      {
        id: "T-006",
        name: "Chemical Oxygen Demand",
        category: "Chemical",
        method: "EPA 410.4",
        assignedTo: "Nazmul Alam",
        status: "Completed",
        parameters: [
          { id: "P-12", name: "COD", value: "45", unit: "mg/L", min: 0, max: 50, status: "Pass" }
        ]
      }
    ]
  }
];
