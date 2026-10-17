/**
 * QuoteCraft Pro - Reactive Application State & Persistence
 */

class AppStateManager {
  constructor() {
    this.subscribers = [];
    try {
      this.currentQuote = this.loadDraft() || JSON.parse(JSON.stringify(SAMPLE_QUOTATION));
    } catch (e) {
      this.currentQuote = JSON.parse(JSON.stringify(SAMPLE_QUOTATION));
    }

    // Ensure all required top-level and nested structures exist
    if (!this.currentQuote || typeof this.currentQuote !== "object") {
      this.currentQuote = JSON.parse(JSON.stringify(SAMPLE_QUOTATION));
    }
    if (!this.currentQuote.solar || typeof this.currentQuote.solar !== "object") {
      this.currentQuote.solar = JSON.parse(JSON.stringify(SAMPLE_QUOTATION.solar));
    }
    if (!this.currentQuote.business || typeof this.currentQuote.business !== "object") {
      this.currentQuote.business = JSON.parse(JSON.stringify(SAMPLE_QUOTATION.business));
    }
    if (!this.currentQuote.client || typeof this.currentQuote.client !== "object") {
      this.currentQuote.client = JSON.parse(JSON.stringify(SAMPLE_QUOTATION.client));
    }
    if (!Array.isArray(this.currentQuote.items)) {
      this.currentQuote.items = JSON.parse(JSON.stringify(SAMPLE_QUOTATION.items || []));
    }
    if (!this.currentQuote.mode) {
      this.currentQuote.mode = "solar";
    }
    if (!this.currentQuote.activePagePreview) {
      this.currentQuote.activePagePreview = "all";
    }

    if (this.currentQuote.solar.inverterRatingKw === undefined) {
      this.currentQuote.solar.inverterRatingKw = "5 kW";
    }
    if (!this.currentQuote.solar.inverterQuantity) {
      this.currentQuote.solar.inverterQuantity = "1 No(s)";
    }
    if (this.currentQuote.solar.inverterSpecification === undefined) {
      this.currentQuote.solar.inverterSpecification = "5 kW Single Phase";
    }
    if (!this.currentQuote.solar.installerBrand) {
      this.currentQuote.solar.installerBrand = "kehansri";
    }
    if (!this.currentQuote.business.brandPreset) {
      this.currentQuote.business.brandPreset = "kehansri";
    }
    if (!this.currentQuote.business.name) {
      this.currentQuote.business.name = "KehanSri Solar";
    }
    if (!this.currentQuote.business.logoUrl) {
      this.currentQuote.business.logoUrl = "assets/kehansri-solar-logo.png";
    }
    if (!this.currentQuote.business.email) {
      this.currentQuote.business.email = "sales@kehansrisolar.com";
    }
    if (!this.currentQuote.business.phone) {
      this.currentQuote.business.phone = "+91 9493858086";
    }
    if (!this.currentQuote.business.website) {
      this.currentQuote.business.website = "www.kehansrisolar.com";
    }
    if (!this.currentQuote.business.address) {
      this.currentQuote.business.address = "Street- 19, Sri Shyam Nagar, Telecom Nagar, Gachibowli, Hyderabad, Telangana: 500081";
    }
    if (!this.currentQuote.solar.customerType) {
      this.currentQuote.solar.customerType = "residential";
    }
    if (!this.currentQuote.solar.systemType) {
      this.currentQuote.solar.systemType = "on-grid";
    }
    if (this.currentQuote.solar.cniMonthlyUnits === undefined) {
      this.currentQuote.solar.cniMonthlyUnits = 0;
    }
    if (this.currentQuote.solar.cniTaxRate === undefined) {
      this.currentQuote.solar.cniTaxRate = 25;
    }
    if (this.currentQuote.solar.claimGstItc === undefined) {
      this.currentQuote.solar.claimGstItc = true;
    }
    if (!this.currentQuote.solar.moduleType) {
      this.currentQuote.solar.moduleType = "TOPCON";
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.saveDraft();
    this.subscribers.forEach(cb => {
      try {
        cb(this.currentQuote);
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    });
  }

  getQuote() {
    return this.currentQuote;
  }

  updateQuote(partial) {
    this.currentQuote = {
      ...this.currentQuote,
      ...partial
    };
    this.notify();
  }

  updateSolar(partial) {
    this.currentQuote.solar = {
      ...this.currentQuote.solar,
      ...partial
    };
    this.notify();
  }

  updateBusiness(partial) {
    this.currentQuote.business = {
      ...this.currentQuote.business,
      ...partial
    };
    this.notify();
  }

  updateClient(partial) {
    this.currentQuote.client = {
      ...this.currentQuote.client,
      ...partial
    };
    this.notify();
  }

  updatePayment(partial) {
    this.currentQuote.paymentDetails = {
      ...this.currentQuote.paymentDetails,
      ...partial
    };
    this.notify();
  }

  updateSignatory(partial) {
    this.currentQuote.signatory = {
      ...this.currentQuote.signatory,
      ...partial
    };
    this.notify();
  }

  addItem(item = null) {
    const newItem = item || {
      id: "item-" + Date.now(),
      name: "Solar Service / Equipment",
      description: "Description of deliverable, specifications, or milestone.",
      quantity: 1,
      unit: "unit",
      unitPrice: 50000.00,
      discount: 0,
      taxRate: 8.9
    };
    this.currentQuote.items.push(newItem);
    this.notify();
  }

  updateItem(index, partial) {
    if (this.currentQuote.items[index]) {
      this.currentQuote.items[index] = {
        ...this.currentQuote.items[index],
        ...partial
      };
      this.notify();
    }
  }

  removeItem(index) {
    this.currentQuote.items.splice(index, 1);
    this.notify();
  }

  duplicateItem(index) {
    if (this.currentQuote.items[index]) {
      const cloned = JSON.parse(JSON.stringify(this.currentQuote.items[index]));
      cloned.id = "item-" + Date.now();
      cloned.name += " (Copy)";
      this.currentQuote.items.splice(index + 1, 0, cloned);
      this.notify();
    }
  }

  // LocalStorage Persistence (User-Scoped Isolation)
  getStorageKey() {
    const user = (window.adminAuth?.username || sessionStorage.getItem("quotecraft_auth_user") || "default").toLowerCase();
    return `quotecraft_history_${user}`;
  }

  getDraftStorageKey() {
    const user = (window.adminAuth?.username || sessionStorage.getItem("quotecraft_auth_user") || "default").toLowerCase();
    return `quotecraft_current_draft_${user}`;
  }

  saveDraft() {
    try {
      localStorage.setItem(this.getDraftStorageKey(), JSON.stringify(this.currentQuote));
    } catch (e) {
      console.warn("Failed to save draft to localStorage", e);
    }
  }

  loadDraft() {
    try {
      const saved = localStorage.getItem(this.getDraftStorageKey());
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && window.adminAuth && window.adminAuth.companyConfig) {
        const cfg = window.adminAuth.companyConfig;
        if (!parsed.paymentDetails) parsed.paymentDetails = {};
        const isB2 = parsed.paymentDetails.selectedBank === "bank2";
        const b1 = {
          label: cfg.bank_label || cfg.bankLabel || "KehanSri Solar (Primary)",
          bankName: cfg.bank_name || cfg.bankName || "ICICI BANK",
          accountName: cfg.account_name || cfg.accountName || "KehanSri Solar",
          accountNumber: cfg.account_number || cfg.accountNumber || "38205006367",
          routingOrIfsc: cfg.ifsc_code || cfg.routingOrIfsc || "ICIC0000382",
          notes: cfg.branch_address || cfg.notes || cfg.branchAddress || "Banjara Hills, Road No 12, Hyderabad: 500034"
        };
        const b2 = {
          label: cfg.bank2_label || cfg.bank2Label || "Kehansri Energy (2nd Company)",
          bankName: cfg.bank2_name || cfg.bank2Name || "ICICI BANK LIMITED",
          accountName: cfg.bank2_account_name || cfg.bank2AccountName || "Kehansri  Energy (OPC) Solutions",
          accountNumber: cfg.bank2_account_number || cfg.bank2AccountNumber || "038205006367",
          routingOrIfsc: cfg.bank2_ifsc_code || cfg.bank2RoutingOrIfsc || "ICIC0000382",
          notes: cfg.bank2_branch_address || cfg.bank2BranchAddress || "BANJARA  HILLS"
        };
        parsed.paymentDetails.bank1 = b1;
        parsed.paymentDetails.bank2 = b2;
        const active = isB2 ? b2 : b1;
        parsed.paymentDetails.bankName = active.bankName;
        parsed.paymentDetails.accountName = active.accountName;
        parsed.paymentDetails.accountNumber = active.accountNumber;
        parsed.paymentDetails.routingOrIfsc = active.routingOrIfsc;
        parsed.paymentDetails.notes = active.notes;

        if (cfg.company_address || cfg.companyAddress) {
          if (!parsed.business) parsed.business = {};
          parsed.business.address = cfg.company_address || cfg.companyAddress;
        }
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  // History Management (Strict User Data Isolation)
  saveToHistory() {
    const history = this.getHistory();
    const existingIndex = history.findIndex(q => q.id === this.currentQuote.id);
    const quoteToSave = JSON.parse(JSON.stringify(this.currentQuote));
    quoteToSave.savedAt = new Date().toISOString();

    if (existingIndex >= 0) {
      history[existingIndex] = quoteToSave;
    } else {
      history.unshift(quoteToSave);
    }

    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(history));
    } catch (e) {}
    this._isSaved = true;
    return quoteToSave;
  }

  isSaved() {
    return this._isSaved === true;
  }

  markSaved() {
    this._isSaved = true;
  }

  markUnsaved() {
    this._isSaved = false;
  }

  getHistory() {
    try {
      const hist = localStorage.getItem(this.getStorageKey());
      return hist ? JSON.parse(hist) : [];
    } catch (e) {
      return [];
    }
  }

  loadFromHistory(id) {
    const history = this.getHistory();
    const quote = history.find(q => q.id === id);
    if (quote) {
      this.currentQuote = JSON.parse(JSON.stringify(quote));
      this.notify();
      return true;
    }
    return false;
  }

  deleteFromHistory(id) {
    let history = this.getHistory();
    history = history.filter(q => q.id !== id);
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(history));
    } catch (e) {}
  }

  resetToSample() {
    this.currentQuote = JSON.parse(JSON.stringify(SAMPLE_QUOTATION));
    this.currentQuote.id = "QT-" + Math.floor(100000 + Math.random() * 900000);
    this.currentQuote.createdAt = new Date().toISOString();
    this.notify();
  }

  resetToNew() {
    const newQuote = JSON.parse(JSON.stringify(SAMPLE_QUOTATION));
    newQuote.id = "QT-" + Math.floor(100000 + Math.random() * 900000);
    newQuote.quoteNumber = "QT-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    newQuote.issueDate = new Date().toISOString().split("T")[0];
    newQuote.validUntil = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    newQuote.createdAt = new Date().toISOString();
    newQuote.client = {
      name: "",
      company: "",
      email: "",
      phone: "",
      taxId: "",
      billingAddress: "",
      shippingAddress: ""
    };
    this.currentQuote = newQuote;
    if (window.adminAuth && window.adminAuth.companyConfig) {
      window.adminAuth.applyConfigToState(window.adminAuth.companyConfig);
    }
    this.notify();
  }
}

const state = new AppStateManager();
