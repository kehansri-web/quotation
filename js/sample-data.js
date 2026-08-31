/**
 * QuoteCraft Pro - Sample Demo Data & Solar Presets
 */

const SAMPLE_QUOTATION = {
  id: "QT-2026-0842",
  quoteNumber: "QT-2026-0842",
  issueDate: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  poReference: "PO-REQ-9831",
  status: "Draft",
  
  mode: "solar", // "solar" (10-page solar proposal) or "general" (standard 1-page quotation)
  activePagePreview: "all", // "all", "1", "2", ... "10"

  template: "template-modern",
  palette: "emerald",
  currency: "INR",
  currencySymbol: "₹",

  // Solar Specific Technical Configuration
  solar: {
    customerType: "residential", // "residential" or "commercial" (C&I)
    systemType: "on-grid", // "on-grid", "off-grid", or "hybrid"
    cniMonthlyUnits: 0, // Monthly consumption units for C&I
    cniTaxRate: 25, // Corporate tax bracket (%) for C&I
    claimGstItc: true, // Claim 100% GST ITC for C&I
    installerBrand: "kehansri", // "kehansri" (KehanSri Solar), "kenergy" (K Energy Solutions), or "custom"
    kwCapacity: 5, // 1 to 500 KW
    partnerBrand: "adani", // "adani", "waaree", "tata", or "custom"
    customPartnerLogo: null, // Data URL or URL for custom uploaded partner logo
    customPartnerName: "", // Custom partner OEM name e.g. "Goldi Solar"
    customPartnerSupplier: "", // Custom partner supplier line in BOQ
    gridTariff: 7.50, // ₹ per unit
    costPerKw: 55096.42,
    gstRate: 8.9,
    moduleWattage: 620, // 550W, 580W, 620W TOPCON
    moduleType: "TOPCON", // "TOPCON", "Mono Perc", "Bifacial TOPCON", "DCR TOPCON"
    structureType: "Elevated", // "Elevated", "Standard Galvanized", "Super Structure"
    inverterRatingKw: "5 kW",
    inverterQuantity: "1 No(s)",
    inverterSpecification: "5 kW Single Phase",
    validityDays: "4 Days",
    customSystemCost: 275482.09,
    customSubsidy: 78000,
    googleMapsUrl: "https://www.google.com/maps/@17.4399,78.3801,17z",
    mapZoom: 17
  },

  // Business Details (Prepared By / Installer Company)
  business: {
    brandPreset: "kehansri", // "kehansri" | "kenergy" | "custom"
    name: "KehanSri Solar",
    tagline: "Empowering Sustainable Clean Energy & Rooftop Solar",
    preparedByName: "",
    email: "sales@kehansrisolar.com",
    phone: "+91 9493858086",
    website: "www.kehansrisolar.com",
    taxId: "",
    address: "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081",
    logoUrl: "assets/kehansri-solar-logo.png"
  },

  // Client Details (Prepared For)
  client: {
    name: "Mr. Sathish",
    company: "Residential Solar Project",
    email: "sathish@gmail.com",
    phone: "+91 9493858086",
    taxId: "",
    billingAddress: "Tarnaka, Hyderabad, Telangana",
    shippingAddress: ""
  },

  // Line Items
  items: [
    {
      id: "item-1",
      name: "5 KW On-Grid Rooftop Solar PV System",
      description: "Supply of TOPCON Solar Modules (Adani / Waaree), On-Grid String Inverter, and Standard Mounting Structure.",
      quantity: 1,
      unit: "set",
      unitPrice: 275482.09,
      discount: 0,
      taxRate: 8.9
    }
  ],

  globalDiscountType: "percentage",
  globalDiscountValue: 0,
  shippingFee: 0,
  taxMode: "inclusive",

  // Payment Details & Bank Information
  paymentDetails: {
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingOrIfsc: "",
    upiId: "",
    notes: ""
  },

  notes: "Subsidy amount will be processed after successful commissioning through direct DBT transfer.",
  terms: "1. 20% advance with PO.\n2. 65% upon feasibility or delivery of material at site.\n3. 15% on first day of site installation.",

  signatory: {
    name: "Authorized Signatory",
    title: "K Energy Solutions",
    signatureUrl: ""
  }
};

const CATALOG_PRESETS = [
  {
    name: "3 KW Rooftop Solar Power Plant (Adani / Waaree)",
    description: "TOPCON 620W Modules (5 Nos), 3kW Single Phase Inverter, Elevated GI Structure, ACDB/DCDB, Earthing.",
    unit: "set",
    unitPrice: 175000.00,
    taxRate: 8.9
  },
  {
    name: "5 KW Rooftop Solar Power Plant (Adani / Waaree)",
    description: "TOPCON 620W Modules (8 Nos), 5kW Single Phase Inverter, Elevated GI Structure, Net Metering Kit.",
    unit: "set",
    unitPrice: 275482.09,
    taxRate: 8.9
  },
  {
    name: "10 KW On-Grid Commercial / Residential Plant",
    description: "TOPCON 620W Modules (16 Nos), 10kW Three Phase Inverter, Super Elevated Structure, Lightning Arrestor.",
    unit: "set",
    unitPrice: 520000.00,
    taxRate: 8.9
  },
  {
    name: "15 KW Industrial Solar Power System",
    description: "High-Efficiency Bi-facial Modules (24 Nos), 15kW 3-Phase Inverter, Industrial Walkway, Zero Export Device.",
    unit: "set",
    unitPrice: 750000.00,
    taxRate: 8.9
  }
];

const TERMS_PRESETS = {
  solarStandard: "1. 20% advance with Formal PO.\n2. 65% upon feasibility approval or material delivery at site.\n3. 15% on installation day.\n4. Central subsidy credited via DBT to customer account directly.",
  net30: "1. Payment is due within 30 days of invoice date.\n2. Late payments are subject to a 1.5% monthly finance charge.",
  advance50: "1. 50% advance deposit required to commence project work.\n2. Remaining 50% due upon milestone completion and final acceptance."
};

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$", name: "US Dollar ($)" },
  { code: "EUR", symbol: "€", name: "Euro (€)" },
  { code: "AED", symbol: "AED ", name: "UAE Dirham (AED)" }
];
