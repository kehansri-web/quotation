/**
 * QuoteCraft Pro - Main Application Controller for Solar Proposals & Quotations
 */

window.selectSystemType = function(type) {
  if (window.quotationApp) {
    window.quotationApp.switchSystemType(type);
  }
};

window.selectCustomerType = function(type) {
  if (window.quotationApp) {
    window.quotationApp.switchCustomerType(type);
  }
};

window.selectPartnerBrand = function(brand) {
  if (window.quotationApp) {
    window.quotationApp.switchPartnerBrand(brand);
  }
};

class QuotationApp {
  constructor() {
    window.quotationApp = this;
    this.previewContainer = document.getElementById("quotation-preview-render");
    this.zoomWrapper = document.getElementById("doc-zoom-wrapper");
    this.currentZoom = 0.85;
    this.currentLogoHeight = 85; // Default logo height in px
    this.signaturePad = null;
    this.isUpdatingForm = false;

    this.init();
  }

  // =========================================================================
  // Public System Type & Customer Category Switchers
  // =========================================================================
  switchSystemType(type) {
    if (!type) return;
    state.updateSolar({ systemType: type });
    this.renderFormFromState();
    const typeNames = {
      "on-grid": "On-Grid (Net Metered)",
      "off-grid": "Off-Grid (Battery Standalone)",
      "hybrid": "Hybrid (Grid + Battery Storage)"
    };
    this.showToast(`⚡ Switched to ${typeNames[type] || type.toUpperCase()} System`, "info");
  }

  switchCustomerType(type) {
    if (!type) return;
    const currentQuote = state.getQuote();
    const isNowCni = (type === "commercial");
    const updates = { customerType: type };

    if (isNowCni) {
      if (currentQuote.solar?.gridTariff === 7.5 || !currentQuote.solar?.gridTariff) {
        updates.gridTariff = 9.50;
      }
      if (currentQuote.solar?.kwCapacity <= 5) {
        updates.kwCapacity = 25;
      }
      updates.customSubsidy = 0;
    } else {
      if (currentQuote.solar?.gridTariff === 9.5) {
        updates.gridTariff = 7.50;
      }
      if (currentQuote.solar?.kwCapacity > 25) {
        updates.kwCapacity = 5;
      }
      updates.customSubsidy = 78000;
    }

    state.updateSolar(updates);
    this.renderFormFromState();
    this.showToast(isNowCni ? "🏭 Switched to Commercial & Industrial (C&I) Mode (11 Pages)" : "🏡 Switched to Residential Mode (10 Pages)", "success");
  }

  switchPartnerBrand(brand) {
    if (!brand) return;
    state.updateSolar({ partnerBrand: brand });
    this.renderFormFromState();
    const brandNames = {
      "adani": "ADANI Power Solar",
      "waaree": "WAAREE Solar",
      "tata": "TATA Power Solar",
      "custom": "Custom Partner Brand"
    };
    this.showToast(`Switched Partner to ${brandNames[brand] || brand.toUpperCase()}`, "info");
  }

  init() {
    this.initTheme();
    this.initSignaturePad();
    this.bindFormInputs();
    this.bindActionButtons();
    this.bindLogoEnhancer();
    this.bindModals();
    this.bindCatalog();
    this.renderFormFromState();
    this.renderItemsTable();
    this.renderLivePreview();

    // Subscribe to state changes
    state.subscribe(() => {
      this.renderLivePreview();
      this.updateSummaryCard();
    });

    this.adjustInitialZoom();
    window.addEventListener("resize", () => this.adjustInitialZoom());

    // Initialize satellite map for project location
    const initialQuote = state.getQuote();
    if (!initialQuote.solar?.dynamicMapImage && !initialQuote.solar?.customMapImage) {
      const initialLoc = initialQuote.solar?.googleMapsUrl || initialQuote.client?.billingAddress || "Hyderabad, India";
      const initialZoom = initialQuote.solar?.mapZoom || 17;
      this.triggerMapGeneration(initialLoc, initialZoom, false);
    }
  }

  // =========================================================================
  // Theme & Layout Zoom Controls
  // =========================================================================
  initTheme() {
    const savedTheme = localStorage.getItem("quotecraft_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeBtn = document.getElementById("btn-toggle-theme");
    if (themeBtn) {
      themeBtn.innerHTML = savedTheme === "dark" 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("quotecraft_theme", next);
    this.initTheme();
    this.showToast(`Switched to ${next} mode`, "info");
  }

  adjustInitialZoom() {
    if (window.innerWidth < 768) {
      this.setZoom(0.45);
    } else if (window.innerWidth < 1200) {
      this.setZoom(0.65);
    } else if (window.innerWidth < 1500) {
      this.setZoom(0.80);
    } else {
      this.setZoom(0.90);
    }
  }

  setZoom(val) {
    this.currentZoom = Math.min(Math.max(val, 0.30), 1.4);
    if (this.zoomWrapper) {
      this.zoomWrapper.style.transform = `scale(${this.currentZoom})`;
    }
    const zoomValEl = document.getElementById("zoom-level-val");
    if (zoomValEl) {
      zoomValEl.textContent = `${Math.round(this.currentZoom * 100)}%`;
    }
  }

  // =========================================================================
  // Logo Size Enhancer (+ / - / Slider)
  // =========================================================================
  bindLogoEnhancer() {
    const applyLogoHeight = (height) => {
      this.currentLogoHeight = Math.min(Math.max(height, 45), 140);
      document.documentElement.style.setProperty("--brand-logo-height", `${this.currentLogoHeight}px`);
      document.documentElement.style.setProperty("--partner-logo-height", `${Math.round(this.currentLogoHeight * 0.9)}px`);
      
      const valDisplay = document.getElementById("logo-size-val");
      if (valDisplay) valDisplay.textContent = `${this.currentLogoHeight}px`;

      const slider = document.getElementById("range-logo-size");
      if (slider && parseInt(slider.value) !== this.currentLogoHeight) {
        slider.value = this.currentLogoHeight;
      }
    };

    const btnLogoInc = document.getElementById("btn-logo-increase");
    if (btnLogoInc) {
      btnLogoInc.addEventListener("click", () => {
        applyLogoHeight(this.currentLogoHeight + 5);
        this.showToast(`Logo size: ${this.currentLogoHeight}px`, "info");
      });
    }

    const btnLogoDec = document.getElementById("btn-logo-decrease");
    if (btnLogoDec) {
      btnLogoDec.addEventListener("click", () => {
        applyLogoHeight(this.currentLogoHeight - 5);
        this.showToast(`Logo size: ${this.currentLogoHeight}px`, "info");
      });
    }

    const btnLogoReset = document.getElementById("btn-logo-reset");
    if (btnLogoReset) {
      btnLogoReset.addEventListener("click", () => {
        applyLogoHeight(85);
        this.showToast(`Logo size reset to 85px`, "info");
      });
    }

    const rangeLogo = document.getElementById("range-logo-size");
    if (rangeLogo) {
      rangeLogo.addEventListener("input", (e) => {
        applyLogoHeight(parseInt(e.target.value) || 85);
      });
    }

    // Initial setup
    applyLogoHeight(this.currentLogoHeight);
  }

  // =========================================================================
  // Two-way Form & State Synchronization
  // =========================================================================
  renderFormFromState() {
    const q = state.getQuote();
    const s = q.solar || {};
    this.isUpdatingForm = true;

    // 1. System Type (On-Grid / Off-Grid / Hybrid)
    const systemType = s.systemType || "on-grid";
    document.querySelectorAll(".btn-system-type, .type-btn").forEach(btn => {
      const bType = btn.dataset.systemType || btn.getAttribute("data-system-type");
      btn.classList.toggle("active", bType === systemType);
    });

    const sysBadge = document.getElementById("badge-system-type-status");
    if (sysBadge) {
      if (systemType === "off-grid") {
        sysBadge.textContent = "🔋 Off-Grid Battery Storage";
        sysBadge.style.color = "#f59e0b";
      } else if (systemType === "hybrid") {
        sysBadge.textContent = "🔄 Hybrid Grid + Battery";
        sysBadge.style.color = "#38bdf8";
      } else {
        sysBadge.textContent = "⚡ On-Grid Net Metered";
        sysBadge.style.color = "#10b981";
      }
    }

    // 2. Customer Type (Residential vs C&I)
    const customerType = s.customerType || "residential";
    const isCni = (customerType === "commercial");
    document.querySelectorAll(".btn-customer-type, .cust-type-card").forEach(btn => {
      const cType = btn.dataset.customerType || btn.getAttribute("data-customer-type");
      btn.classList.toggle("active", cType === customerType);
    });

    const custStatusBadge = document.getElementById("badge-cust-type-status");
    if (custStatusBadge) {
      custStatusBadge.textContent = isCni ? "🏭 C&I (11 Pages)" : "🏡 Residential (Govt Subsidy • 10 Pages)";
      custStatusBadge.style.color = isCni ? "#38bdf8" : "#10b981";
    }

    const cniPanel = document.getElementById("cni-specific-panel");
    if (cniPanel) cniPanel.style.display = isCni ? "block" : "none";

    const subsidyGroup = document.getElementById("group-solar-subsidy");
    const subsidyBadge = document.getElementById("lbl-subsidy-badge");
    const subsidyInp = document.getElementById("inp-solar-subsidy");
    if (subsidyGroup && subsidyBadge && subsidyInp) {
      if (isCni) {
        subsidyBadge.textContent = "Not Applicable (C&I)";
        subsidyBadge.style.color = "#f59e0b";
        subsidyInp.value = "0";
        subsidyInp.disabled = true;
        subsidyInp.style.opacity = "0.6";
        subsidyInp.title = "Direct Govt Capital Subsidies do not apply to C&I Projects (40% Tax Shield shown on Page 8)";
      } else {
        subsidyBadge.textContent = "PM Surya Ghar";
        subsidyBadge.style.color = "#10b981";
        subsidyInp.disabled = false;
        subsidyInp.style.opacity = "1";
        subsidyInp.title = "";
      }
    }

    this.setVal("inp-cni-monthly-units", s.cniMonthlyUnits > 0 ? s.cniMonthlyUnits : "");
    this.setVal("inp-cni-tax-bracket", s.cniTaxRate || 25);
    this.updateCniConsumptionFeedback(s);
    this.updateQuickPresetsUI(customerType);
    this.updatePagePreviewDropdown(isCni, q.activePagePreview);
    this.updatePdfButtonText(isCni);

    // Partner Brand Toggle Active State & Custom Upload Panel
    const brand = s.partnerBrand || "adani";
    document.querySelectorAll(".brand-btn").forEach(btn => {
      const bBrand = btn.dataset.brand || btn.getAttribute("data-brand");
      btn.classList.toggle("active", bBrand === brand);
    });

    const partnerStatusBadge = document.getElementById("badge-partner-brand-status");
    if (partnerStatusBadge) {
      if (brand === "waaree") {
        partnerStatusBadge.textContent = "🌱 WAAREE Solar";
        partnerStatusBadge.style.color = "#10b981";
      } else if (brand === "tata") {
        partnerStatusBadge.textContent = "🔷 TATA Power Solar";
        partnerStatusBadge.style.color = "#38bdf8";
      } else if (brand === "custom") {
        partnerStatusBadge.textContent = s.customPartnerName ? `✏️ ${s.customPartnerName}` : "✏️ Custom Partner Logo";
        partnerStatusBadge.style.color = "#f59e0b";
      } else {
        partnerStatusBadge.textContent = "⚡ ADANI Power";
        partnerStatusBadge.style.color = "#10b981";
      }
    }

    const customPartnerFields = document.getElementById("custom-partner-fields");
    if (customPartnerFields) {
      customPartnerFields.style.display = (brand === "custom" || !!s.customPartnerLogo) ? "block" : "none";
    }

    this.setVal("inp-custom-partner-name", s.customPartnerName || "");
    this.updateCustomPartnerLogoThumbnail(s.customPartnerLogo);

    // Solar Parameters
    this.setVal("inp-solar-kw", s.kwCapacity || (isCni ? 25 : 5));
    this.setVal("inp-solar-tariff", s.gridTariff || (isCni ? 9.50 : 7.50));
    this.setVal("inp-solar-cost-kw", s.costPerKw || 55096.42);
    this.setVal("inp-solar-gst", s.gstRate || 8.9);
    this.setVal("inp-solar-type", s.moduleType || "TOPCON");
    this.setVal("inp-solar-wattage", s.moduleWattage || 620);
    this.setVal("inp-module-count", s.customModuleCount || "");
    this.setVal("inp-solar-structure", s.structureType || "Elevated");
    this.setVal("inp-inverter-phase", s.inverterPhase || (s.kwCapacity <= 5 ? "Single Phase" : "Three Phase"));
    this.setVal("inp-inverter-warranty", s.inverterWarranty || "08 Years");
    this.setVal("inp-inverter-rating", s.inverterRatingKw !== undefined && s.inverterRatingKw !== null && s.inverterRatingKw !== "" ? s.inverterRatingKw : "5 kW");
    this.setVal("inp-inverter-qty", s.inverterQuantity || "1 No(s)");
    this.setVal("inp-inverter-spec", s.inverterSpecification !== undefined && s.inverterSpecification !== null && s.inverterSpecification !== "" ? s.inverterSpecification : "5 kW Single Phase");
    this.setVal("inp-inverter-manufacturer", s.inverterManufacturer || "As supplied by ADANI Power Solar (Polycab).");
    if (!isCni) {
      this.setVal("inp-solar-subsidy", s.customSubsidy !== null && s.customSubsidy !== undefined ? s.customSubsidy : "");
    }
    this.setVal("inp-google-maps-url", s.googleMapsUrl || "");
    const zoomVal = s.mapZoom || 17;
    this.setVal("inp-map-zoom", zoomVal);
    const zoomTxt = document.getElementById("txt-map-zoom");
    if (zoomTxt) zoomTxt.textContent = `${zoomVal}x`;

    this.updateMapPreviewUI(q);

    // Meta
    this.setVal("inp-quote-number", q.quoteNumber);
    this.setVal("inp-issue-date", q.issueDate);
    this.setVal("inp-valid-until", q.validUntil);
    this.setVal("inp-status", q.status);

    // Installer Brand Switching UI State
    const brandPreset = q.solar?.installerBrand || q.business?.brandPreset || "kehansri";
    document.querySelectorAll(".btn-installer-brand").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.installerBrand === brandPreset);
    });

    const activeLogoImg = document.getElementById("img-active-installer-logo");
    const activeNameLbl = document.getElementById("lbl-active-installer-name");
    const activeSubLbl = document.getElementById("lbl-active-installer-sub");
    const activeBadge = document.getElementById("badge-active-brand-type");
    const customFieldsBox = document.getElementById("custom-installer-fields");
    const resetLogoBtn = document.getElementById("btn-remove-custom-logo");

    let displayLogo = "assets/kehansri-solar-logo.png";
    let displayName = "KehanSri Solar";

    if (brandPreset === "kehansri") {
      displayLogo = "assets/kehansri-solar-logo.png";
      displayName = q.business?.name || "KehanSri Solar";
      if (activeBadge) { activeBadge.textContent = "DEFAULT"; activeBadge.style.color = "#10b981"; activeBadge.style.background = "rgba(16, 185, 129, 0.15)"; }
      if (activeSubLbl) activeSubLbl.textContent = `Official Installer • All ${isCni ? 11 : 10} Pages Updated`;
      if (customFieldsBox) customFieldsBox.style.display = "none";
      if (resetLogoBtn) resetLogoBtn.style.display = "none";
    } else if (brandPreset === "kenergy") {
      displayLogo = "assets/k-energy-solutions.png";
      displayName = q.business?.name || "K Energy Solutions";
      if (activeBadge) { activeBadge.textContent = "PRESET"; activeBadge.style.color = "#38bdf8"; activeBadge.style.background = "rgba(56, 189, 248, 0.15)"; }
      if (activeSubLbl) activeSubLbl.textContent = `K Energy Solutions • All ${isCni ? 11 : 10} Pages Updated`;
      if (customFieldsBox) customFieldsBox.style.display = "none";
      if (resetLogoBtn) resetLogoBtn.style.display = "none";
    } else {
      displayLogo = q.business?.logoUrl || "assets/kehansri-solar-logo.png";
      displayName = q.business?.name || "Custom Solar Installer";
      if (activeBadge) { activeBadge.textContent = "CUSTOM"; activeBadge.style.color = "#f59e0b"; activeBadge.style.background = "rgba(245, 158, 11, 0.15)"; }
      if (activeSubLbl) activeSubLbl.textContent = `Custom EPC Branding • All ${isCni ? 11 : 10} Pages Updated`;
      if (customFieldsBox) customFieldsBox.style.display = "block";
      if (resetLogoBtn) resetLogoBtn.style.display = "inline-flex";
    }

    if (activeLogoImg) activeLogoImg.src = displayLogo;
    if (activeNameLbl) activeNameLbl.textContent = displayName;

    // Business Fields
    this.setVal("inp-custom-company-name", q.business.name);
    this.setVal("inp-biz-name", q.business.name);

    // Account-linked Prepared By Name & Username
    const currentRepName = q.business.preparedByName || (window.adminAuth?.displayName || "Sales Executive");
    const currentRepUsername = q.business.salesUsername || q.sales_username || (window.adminAuth?.username || "SALES");
    this.setVal("inp-biz-rep", currentRepName);
    const activeUsernameLabel = document.getElementById("lbl-active-sales-username");
    if (activeUsernameLabel) activeUsernameLabel.textContent = currentRepUsername;

    const adminAssignSelect = document.getElementById("sel-admin-assigned-rep");
    if (adminAssignSelect && currentRepUsername) {
      adminAssignSelect.value = currentRepUsername;
    }

    this.setVal("inp-biz-email", q.business.email);
    this.setVal("inp-biz-phone", q.business.phone);
    this.setVal("inp-biz-website", q.business.website);
    this.setVal("inp-biz-tax", q.business.taxId);
    this.setVal("inp-biz-address", q.business.address);

    // Client
    this.setVal("inp-client-name", q.client.name);
    this.setVal("inp-client-company", q.client.company);
    this.setVal("inp-client-email", q.client.email);
    this.setVal("inp-client-phone", q.client.phone);
    this.setVal("inp-client-address", q.client.billingAddress);

    // Payment
    this.setVal("inp-bank-name", q.paymentDetails.bankName);
    this.setVal("inp-acc-name", q.paymentDetails.accountName);
    this.setVal("inp-acc-number", q.paymentDetails.accountNumber);
    this.setVal("inp-bank-ifsc", q.paymentDetails.routingOrIfsc);
    this.setVal("inp-payment-notes", q.paymentDetails.notes);

    // Update Bank Selection Radio & Cards
    const selectedBank = q.paymentDetails?.selectedBank || "bank1";
    const rad1 = document.getElementById("rad-bank-choice-1");
    const rad2 = document.getElementById("rad-bank-choice-2");
    const card1 = document.getElementById("card-choice-bank1");
    const card2 = document.getElementById("card-choice-bank2");

    if (rad1 && rad2) {
      if (selectedBank === "bank2") {
        rad2.checked = true;
        if (card1 && card2) {
          card2.style.borderColor = "#38bdf8";
          card2.style.background = "rgba(56, 189, 248, 0.12)";
          card1.style.borderColor = "var(--border-subtle)";
          card1.style.background = "var(--bg-tertiary)";
        }
      } else {
        rad1.checked = true;
        if (card1 && card2) {
          card1.style.borderColor = "#10b981";
          card1.style.background = "rgba(16, 185, 129, 0.08)";
          card2.style.borderColor = "var(--border-subtle)";
          card2.style.background = "var(--bg-tertiary)";
        }
      }
    }

    if (window.adminAuth && q.paymentDetails?.bank1 && q.paymentDetails?.bank2) {
      window.adminAuth.updateBankChoiceLabels(q.paymentDetails.bank1, q.paymentDetails.bank2);
    }

    // Signatory
    this.setVal("inp-sign-name", q.signatory.name);
    this.setVal("inp-sign-title", q.signatory.title);

    // Logos & Signature previews
    this.updateSignatureThumbnail(q.signatory.signatureUrl);
    this.updateCustomLogoThumbnail(q.business.logoUrl);

    this.isUpdatingForm = false;
  }

  setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : "";
  }

  bindFormInputs() {
    const listen = (id, handler) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", (e) => {
          if (!this.isUpdatingForm) handler(e.target.value);
        });
        el.addEventListener("change", (e) => {
          if (!this.isUpdatingForm) handler(e.target.value);
        });
      }
    };

    // Installer Brand Switcher Buttons (KehanSri Solar / K Energy / Custom)
    document.querySelectorAll(".btn-installer-brand").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const brand = btn.dataset.installerBrand;
        if (brand === "kehansri") {
          state.updateSolar({ installerBrand: "kehansri" });
          state.updateBusiness({
            brandPreset: "kehansri",
            name: "KehanSri Solar",
            logoUrl: "assets/kehansri-solar-logo.png",
            email: "sales@kehansrisolar.com",
            website: "www.kehansrisolar.com",
            address: "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081"
          });
          this.showToast("☀️ Switched to KehanSri Solar branding!", "success");
        } else if (brand === "kenergy") {
          state.updateSolar({ installerBrand: "kenergy" });
          state.updateBusiness({
            brandPreset: "kenergy",
            name: "K Energy Solutions",
            logoUrl: "assets/k-energy-solutions.png",
            email: "sales@kenergysolutions.com",
            website: "www.kenergysolutions.com",
            address: "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081"
          });
          this.showToast("⚡ Switched to K Energy Solutions branding!", "success");
        } else if (brand === "custom") {
          state.updateSolar({ installerBrand: "custom" });
          state.updateBusiness({
            brandPreset: "custom"
          });
          this.showToast("✏️ Custom Installer Mode enabled. You can enter company name and upload your logo.", "info");
        }
        this.renderFormFromState();
      });
    });

    // Custom Installer Name & Logo Upload
    listen("inp-custom-company-name", val => {
      state.updateBusiness({ name: val });
      this.setVal("inp-biz-name", val);
      const nameLbl = document.getElementById("lbl-active-installer-name");
      if (nameLbl) nameLbl.textContent = val || "Custom Solar Installer";
    });

    const customLogoInput = document.getElementById("file-custom-installer-logo");
    if (customLogoInput) {
      customLogoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            const dataUrl = re.target.result;
            state.updateSolar({ installerBrand: "custom" });
            state.updateBusiness({
              brandPreset: "custom",
              logoUrl: dataUrl
            });
            this.updateCustomLogoThumbnail(dataUrl);
            this.renderFormFromState();
            this.showToast("🖼️ Custom Logo uploaded & applied to all 10 pages!", "success");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const removeCustomLogoBtn = document.getElementById("btn-remove-custom-logo");
    if (removeCustomLogoBtn) {
      removeCustomLogoBtn.addEventListener("click", () => {
        state.updateSolar({ installerBrand: "kehansri" });
        state.updateBusiness({
          brandPreset: "kehansri",
          name: "KehanSri Solar",
          logoUrl: "assets/kehansri-solar-logo.png",
          email: "sales@kehansrisolar.com",
          website: "www.kehansrisolar.com"
        });
        this.updateCustomLogoThumbnail("");
        this.renderFormFromState();
        this.showToast("Reset to KehanSri Solar logo", "info");
      });
    }

    // Solar Parameters Listeners
    listen("inp-solar-kw", val => {
      const kw = parseFloat(val) || 1;
      state.updateSolar({ kwCapacity: kw, customSystemCost: null });
      this.showToast(`Updated to ${kw} KW System`, "info");
    });

    listen("inp-solar-tariff", val => state.updateSolar({ gridTariff: parseFloat(val) || 7.5 }));
    listen("inp-solar-cost-kw", val => state.updateSolar({ costPerKw: parseFloat(val) || 55000, customSystemCost: null }));
    listen("inp-solar-gst", val => state.updateSolar({ gstRate: parseFloat(val) || 8.9 }));
    listen("inp-solar-type", val => state.updateSolar({ moduleType: val }));
    listen("inp-solar-wattage", val => state.updateSolar({ moduleWattage: parseInt(val) || 620 }));
    listen("inp-module-count", val => state.updateSolar({ customModuleCount: val ? parseInt(val) : null }));
    listen("inp-solar-structure", val => state.updateSolar({ structureType: val }));
    listen("inp-inverter-phase", val => state.updateSolar({ inverterPhase: val }));
    listen("inp-inverter-warranty", val => state.updateSolar({ inverterWarranty: val }));
    listen("inp-inverter-rating", val => state.updateSolar({ inverterRatingKw: val }));
    listen("inp-inverter-qty", val => state.updateSolar({ inverterQuantity: val }));
    listen("inp-inverter-spec", val => state.updateSolar({ inverterSpecification: val }));
    listen("inp-inverter-manufacturer", val => state.updateSolar({ inverterManufacturer: val }));
    listen("inp-solar-subsidy", val => state.updateSolar({ customSubsidy: val !== "" ? parseFloat(val) : null }));
    
    // Google Maps URL / Location & Dynamic Satellite Map
    let mapDebounce = null;
    const gmapsInput = document.getElementById("inp-google-maps-url");
    if (gmapsInput) {
      const handleMapChange = (val, immediate = false) => {
        state.updateSolar({ googleMapsUrl: val });
        clearTimeout(mapDebounce);
        if (immediate) {
          const zoom = parseInt(document.getElementById("inp-map-zoom")?.value || 17);
          this.triggerMapGeneration(val, zoom, true);
        } else {
          mapDebounce = setTimeout(() => {
            const zoom = parseInt(document.getElementById("inp-map-zoom")?.value || 17);
            this.triggerMapGeneration(val, zoom, false);
          }, 450);
        }
      };

      gmapsInput.addEventListener("input", (e) => handleMapChange(e.target.value, false));
      gmapsInput.addEventListener("paste", () => {
        setTimeout(() => handleMapChange(gmapsInput.value, true), 50);
      });
      gmapsInput.addEventListener("change", (e) => handleMapChange(e.target.value, true));
    }

    // Zoom Range Control
    const zoomSlider = document.getElementById("inp-map-zoom");
    const zoomTxt = document.getElementById("txt-map-zoom");
    if (zoomSlider) {
      zoomSlider.addEventListener("input", (e) => {
        const zoom = parseInt(e.target.value);
        if (zoomTxt) zoomTxt.textContent = `${zoom}x`;
        clearTimeout(mapDebounce);
        mapDebounce = setTimeout(() => {
          const url = document.getElementById("inp-google-maps-url")?.value || "";
          this.triggerMapGeneration(url, zoom, false);
        }, 300);
      });
    }

    // Detect from Billing Address Button
    const btnDetectMap = document.getElementById("btn-detect-map-location");
    if (btnDetectMap) {
      btnDetectMap.addEventListener("click", () => {
        const q = state.getQuote();
        const addr = q.client?.billingAddress || "";
        if (!addr) {
          this.showToast("Please enter a Client / Site Address first", "info");
          return;
        }
        this.setVal("inp-google-maps-url", addr);
        const zoom = parseInt(document.getElementById("inp-map-zoom")?.value || 17);
        this.triggerMapGeneration(addr, zoom, true);
      });
    }

    // Billing Address Auto-Sync when map input is empty
    const clientAddrInput = document.getElementById("inp-client-address");
    if (clientAddrInput) {
      clientAddrInput.addEventListener("blur", () => {
        const currentMapUrl = (document.getElementById("inp-google-maps-url")?.value || "").trim();
        if (!currentMapUrl && clientAddrInput.value.trim()) {
          const zoom = parseInt(document.getElementById("inp-map-zoom")?.value || 17);
          this.triggerMapGeneration(clientAddrInput.value.trim(), zoom, false);
        }
      });
    }

    // Custom Map Photo Upload & Reset
    const customMapInput = document.getElementById("inp-custom-map-image");
    const btnResetMap = document.getElementById("btn-reset-map-image");
    if (customMapInput) {
      customMapInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            state.updateSolar({ customMapImage: re.target.result });
            this.updateMapPreviewUI();
            this.showToast("Custom Site / Map Photo Applied!", "success");
          };
          reader.readAsDataURL(file);
        }
      });
    }
    if (btnResetMap) {
      btnResetMap.addEventListener("click", () => {
        state.updateSolar({ customMapImage: null });
        if (customMapInput) customMapInput.value = "";
        this.updateMapPreviewUI();
        this.showToast("Reset to Satellite View", "info");
      });
    }

    // System Type Buttons & Container Delegation
    const sysContainer = document.getElementById("system-type-buttons");
    if (sysContainer) {
      sysContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-system-type, .type-btn");
        if (btn) {
          const type = btn.dataset.systemType || btn.getAttribute("data-system-type");
          if (type) this.switchSystemType(type);
        }
      });
    }

    // Customer Type Buttons & Container Delegation
    const custContainer = document.getElementById("customer-type-buttons");
    if (custContainer) {
      custContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-customer-type, .cust-type-card");
        if (btn) {
          const type = btn.dataset.customerType || btn.getAttribute("data-customer-type");
          if (type) this.switchCustomerType(type);
        }
      });
    }

    // C&I Specific Listeners (Monthly Units & Corporate Tax Bracket)
    listen("inp-cni-monthly-units", val => {
      const units = parseFloat(val) || 0;
      const updates = { cniMonthlyUnits: units };
      if (units > 0) {
        const currentQuote = state.getQuote();
        if (currentQuote.solar?.kwCapacity <= 5) {
          const autoKw = Math.max(5, Math.round(units / 130));
          updates.kwCapacity = autoKw;
          this.setVal("inp-solar-kw", autoKw);
        }
      }
      state.updateSolar(updates);
      this.updateCniConsumptionFeedback(state.getQuote().solar);
    });

    listen("inp-cni-tax-bracket", val => {
      state.updateSolar({ cniTaxRate: parseFloat(val) || 25 });
    });

    // KW Quick Preset Buttons
    document.querySelectorAll(".kw-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const kw = parseFloat(btn.dataset.kw);
        this.setVal("inp-solar-kw", kw);
        state.updateSolar({ kwCapacity: kw, customSystemCost: null });
        this.showToast(`Selected ${kw} KW Solar System`, "success");
      });
    });

    // Partner Brand Buttons & Container Delegation
    const partnerContainer = document.getElementById("partner-brand-buttons");
    if (partnerContainer) {
      partnerContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".brand-btn");
        if (btn) {
          const brand = btn.dataset.brand || btn.getAttribute("data-brand");
          if (brand) this.switchPartnerBrand(brand);
        }
      });
    }

    // Custom Partner Brand Name Listener
    listen("inp-custom-partner-name", val => {
      state.updateSolar({ customPartnerName: val });
      const badge = document.getElementById("badge-partner-brand-status");
      if (badge && state.getQuote().solar?.partnerBrand === "custom") {
        badge.textContent = val ? `✏️ ${val}` : "✏️ Custom Partner Logo";
      }
    });

    // Custom Partner Brand Logo File Upload
    const partnerLogoInput = document.getElementById("file-custom-partner-logo");
    if (partnerLogoInput) {
      partnerLogoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            const dataUrl = re.target.result;
            state.updateSolar({
              partnerBrand: "custom",
              customPartnerLogo: dataUrl
            });
            this.updateCustomPartnerLogoThumbnail(dataUrl);
            this.renderFormFromState();
            this.showToast("🖼️ Custom Partner Logo uploaded & applied to Proposal!", "success");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const removePartnerLogoBtn = document.getElementById("btn-remove-partner-logo");
    if (removePartnerLogoBtn) {
      removePartnerLogoBtn.addEventListener("click", () => {
        state.updateSolar({
          partnerBrand: "adani",
          customPartnerLogo: null,
          customPartnerName: ""
        });
        if (partnerLogoInput) partnerLogoInput.value = "";
        this.updateCustomPartnerLogoThumbnail(null);
        this.renderFormFromState();
        this.showToast("Reset to ADANI Power Solar default logo", "info");
      });
    }

    // Page Preview Filter Selector
    listen("sel-page-preview", val => {
      state.updateQuote({ activePagePreview: val });
    });

    // Meta Listeners
    listen("inp-quote-number", val => state.updateQuote({ quoteNumber: val }));
    listen("inp-issue-date", val => state.updateQuote({ issueDate: val }));
    listen("inp-valid-until", val => state.updateQuote({ validUntil: val }));
    listen("inp-status", val => state.updateQuote({ status: val }));

    // Business Listeners
    listen("inp-biz-name", val => {
      state.updateBusiness({ name: val });
      this.setVal("inp-custom-company-name", val);
    });
    listen("inp-biz-rep", val => state.updateBusiness({ preparedByName: val }));
    listen("inp-biz-email", val => state.updateBusiness({ email: val }));
    listen("inp-biz-phone", val => state.updateBusiness({ phone: val }));
    listen("inp-biz-website", val => state.updateBusiness({ website: val }));
    listen("inp-biz-tax", val => state.updateBusiness({ taxId: val }));
    listen("inp-biz-address", val => state.updateBusiness({ address: val }));

    // Client Listeners
    listen("inp-client-name", val => state.updateClient({ name: val }));
    listen("inp-client-company", val => state.updateClient({ company: val }));
    listen("inp-client-email", val => state.updateClient({ email: val }));
    listen("inp-client-phone", val => state.updateClient({ phone: val }));
    listen("inp-client-address", val => state.updateClient({ billingAddress: val }));

    // Payment Listeners
    listen("inp-bank-name", val => state.updatePayment({ bankName: val }));
    listen("inp-acc-name", val => state.updatePayment({ accountName: val }));
    listen("inp-acc-number", val => state.updatePayment({ accountNumber: val }));
    listen("inp-bank-ifsc", val => state.updatePayment({ routingOrIfsc: val }));
    listen("inp-payment-notes", val => state.updatePayment({ notes: val }));

    // Bank 1 vs Bank 2 Selection Listeners
    const radBank1 = document.getElementById("rad-bank-choice-1");
    const radBank2 = document.getElementById("rad-bank-choice-2");
    const cardBank1 = document.getElementById("card-choice-bank1");
    const cardBank2 = document.getElementById("card-choice-bank2");

    const switchBank = (choice) => {
      const q = state.getQuote();
      const p = q.paymentDetails || {};
      let bankData = null;

      if (choice === "bank2") {
        bankData = p.bank2 || (window.adminAuth?.companyConfig ? {
          bankName: window.adminAuth.companyConfig.bank2_name || window.adminAuth.companyConfig.bank2Name || "HDFC BANK LTD",
          accountName: window.adminAuth.companyConfig.bank2_account_name || window.adminAuth.companyConfig.bank2AccountName || "K Energy Solutions",
          accountNumber: window.adminAuth.companyConfig.bank2_account_number || window.adminAuth.companyConfig.bank2AccountNumber || "50200088991122",
          routingOrIfsc: window.adminAuth.companyConfig.bank2_ifsc_code || window.adminAuth.companyConfig.bank2RoutingOrIfsc || "HDFC0000456",
          notes: window.adminAuth.companyConfig.bank2_branch_address || window.adminAuth.companyConfig.bank2Notes || "Gachibowli Main Branch, Hyderabad: 500032"
        } : null);
      } else {
        bankData = p.bank1 || (window.adminAuth?.companyConfig ? {
          bankName: window.adminAuth.companyConfig.bank_name || window.adminAuth.companyConfig.bankName || "ICICI BANK",
          accountName: window.adminAuth.companyConfig.account_name || window.adminAuth.companyConfig.accountName || "KehanSri Solar",
          accountNumber: window.adminAuth.companyConfig.account_number || window.adminAuth.companyConfig.accountNumber || "38205006367",
          routingOrIfsc: window.adminAuth.companyConfig.ifsc_code || window.adminAuth.companyConfig.routingOrIfsc || "ICIC0000382",
          notes: window.adminAuth.companyConfig.branch_address || window.adminAuth.companyConfig.notes || "Banjara Hills, Road No 12, Hyderabad: 500034"
        } : null);
      }

      if (bankData) {
        state.updatePayment({
          selectedBank: choice,
          bankName: bankData.bankName,
          accountName: bankData.accountName,
          accountNumber: bankData.accountNumber,
          routingOrIfsc: bankData.routingOrIfsc,
          notes: bankData.notes
        });
      } else {
        state.updatePayment({ selectedBank: choice });
      }

      if (cardBank1 && cardBank2) {
        if (choice === "bank2") {
          cardBank2.style.borderColor = "#38bdf8";
          cardBank2.style.background = "rgba(56, 189, 248, 0.12)";
          cardBank1.style.borderColor = "var(--border-subtle)";
          cardBank1.style.background = "var(--bg-tertiary)";
        } else {
          cardBank1.style.borderColor = "#10b981";
          cardBank1.style.background = "rgba(16, 185, 129, 0.08)";
          cardBank2.style.borderColor = "var(--border-subtle)";
          cardBank2.style.background = "var(--bg-tertiary)";
        }
      }

      this.renderFormFromState();
      this.renderPreview();
      this.showToast(`Switched to ${choice === "bank2" ? "Bank 2 (2nd Company)" : "Bank 1 (Primary)"}`, "info");
    };

    if (radBank1) radBank1.addEventListener("change", () => switchBank("bank1"));
    if (radBank2) radBank2.addEventListener("change", () => switchBank("bank2"));

    // Signatory
    listen("inp-sign-name", val => state.updateSignatory({ name: val }));
    listen("inp-sign-title", val => state.updateSignatory({ title: val }));

    // Signature Upload
    const signImgInput = document.getElementById("file-sign-img");
    if (signImgInput) {
      signImgInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            state.updateSignatory({ signatureUrl: re.target.result });
            this.updateSignatureThumbnail(re.target.result);
            this.showToast("Signature uploaded!", "success");
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const removeSignBtn = document.getElementById("btn-remove-sign");
    if (removeSignBtn) {
      removeSignBtn.addEventListener("click", () => {
        state.updateSignatory({ signatureUrl: "" });
        this.updateSignatureThumbnail("");
      });
    }

    // Collapsible Card Headers
    document.querySelectorAll(".card-header").forEach(hdr => {
      hdr.addEventListener("click", (e) => {
        if (e.target.closest(".btn")) return;
        const card = hdr.closest(".card-section");
        if (card) card.classList.toggle("collapsed");
      });
    });
  }

  updateCustomLogoThumbnail(url) {
    const wrapper = document.getElementById("custom-logo-preview-wrapper");
    const img = document.getElementById("custom-logo-preview-img");
    if (url && url.startsWith("data:")) {
      if (img) img.src = url;
      if (wrapper) wrapper.style.display = "inline-flex";
    } else {
      if (wrapper) wrapper.style.display = "none";
    }
  }

  updateCustomPartnerLogoThumbnail(url) {
    const wrapper = document.getElementById("custom-partner-logo-preview-wrapper");
    const img = document.getElementById("custom-partner-logo-preview-img");
    const removeBtn = document.getElementById("btn-remove-partner-logo");
    if (url && (url.startsWith("data:") || url.includes("http") || url.startsWith("assets/"))) {
      if (img) img.src = url;
      if (wrapper) wrapper.style.display = "flex";
      if (removeBtn) removeBtn.style.display = "inline-flex";
    } else {
      if (wrapper) wrapper.style.display = "none";
      if (removeBtn) removeBtn.style.display = "none";
    }
  }

  updateSignatureThumbnail(url) {
    const wrapper = document.getElementById("sign-preview-wrapper");
    const placeholder = document.getElementById("sign-placeholder-box");
    const img = document.getElementById("sign-preview-img");
    if (url) {
      if (img) img.src = url;
      if (wrapper) wrapper.style.display = "inline-flex";
      if (placeholder) placeholder.style.display = "none";
    } else {
      if (wrapper) wrapper.style.display = "none";
      if (placeholder) placeholder.style.display = "block";
    }
  }

  // =========================================================================
  // Line Items & Summary
  // =========================================================================
  renderItemsTable() {
    this.updateSummaryCard();
  }

  updateSummaryCard() {
    const q = state.getQuote();
    const calc = SolarCalculator.calculate(q.solar || {});
    const isCni = calc.customerType === "commercial";

    const kwEl = document.getElementById("sum-solar-kw");
    const genEl = document.getElementById("sum-solar-gen");
    const savEl = document.getElementById("sum-solar-sav");
    const costEl = document.getElementById("sum-solar-cost");
    const subEl = document.getElementById("sum-solar-sub");
    const netEl = document.getElementById("sum-solar-net");
    const payEl = document.getElementById("sum-solar-payback");

    const rowSubsidy = document.getElementById("row-sum-subsidy");
    const rowCniTax = document.getElementById("row-sum-cni-tax");
    const rowCniItc = document.getElementById("row-sum-cni-itc");
    const sumCniTax = document.getElementById("sum-cni-tax-shield");
    const sumCniItc = document.getElementById("sum-cni-itc");
    const lblGrandTotal = document.getElementById("lbl-grand-total-name");

    if (kwEl) kwEl.textContent = `${calc.kwCapacity} KW`;
    if (genEl) genEl.textContent = `${calc.annualGeneration.toLocaleString("en-IN")} Units/yr`;
    if (savEl) savEl.textContent = `${SolarCalculator.formatINR(calc.annualSavings)}/yr`;
    if (costEl) costEl.textContent = SolarCalculator.formatINR(calc.totalProjectCost);

    if (isCni) {
      if (rowSubsidy) rowSubsidy.style.display = "none";
      if (rowCniTax) rowCniTax.style.display = "flex";
      if (rowCniItc) rowCniItc.style.display = "flex";
      if (sumCniTax) sumCniTax.textContent = `-${SolarCalculator.formatINR(calc.year1TaxShield)}`;
      if (sumCniItc) sumCniItc.textContent = `-${SolarCalculator.formatINR(calc.gstItcAmount)}`;
      if (lblGrandTotal) lblGrandTotal.textContent = "Net Capital Outlay (Yr 1):";
      if (netEl) netEl.textContent = SolarCalculator.formatINR(calc.cniNetInvestment);
    } else {
      if (rowSubsidy) rowSubsidy.style.display = "flex";
      if (rowCniTax) rowCniTax.style.display = "none";
      if (rowCniItc) rowCniItc.style.display = "none";
      if (subEl) subEl.textContent = `-${SolarCalculator.formatINR(calc.mnreSubsidy)}`;
      if (lblGrandTotal) lblGrandTotal.textContent = "Effective Net Cost:";
      if (netEl) netEl.textContent = SolarCalculator.formatINR(calc.effectiveNetCost);
    }

    if (payEl) payEl.textContent = `${calc.paybackYears} Yrs`;
  }

  updateQuickPresetsUI(customerType) {
    const container = document.getElementById("kw-presets-container");
    if (!container) return;

    const isCni = customerType === "commercial";
    const presets = isCni ? [10, 25, 50, 100, 250, 500] : [3, 5, 8, 10, 15, 25];

    container.innerHTML = presets.map(kw => `
      <button type="button" class="kw-preset-btn" data-kw="${kw}">${kw} KW</button>
    `).join("");

    container.querySelectorAll(".kw-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const kw = parseFloat(btn.dataset.kw);
        this.setVal("inp-solar-kw", kw);
        state.updateSolar({ kwCapacity: kw, customSystemCost: null });
        this.showToast(`Selected ${kw} KW Solar System`, "success");
      });
    });
  }

  updatePagePreviewDropdown(isCni, activePage = "all") {
    const pageSelect = document.getElementById("sel-page-preview");
    if (!pageSelect) return;

    const currentVal = activePage || pageSelect.value || "all";

    if (isCni) {
      pageSelect.innerHTML = `
        <option value="all">📑 All 11 Pages</option>
        <option value="1">Page 1: Cover Page</option>
        <option value="2">Page 2: Working Principle</option>
        <option value="3">Page 3: Tech Specs & Satellite Location</option>
        <option value="4">Page 4: Assumptions & Exclusions</option>
        <option value="5">Page 5: Graphical Projections & SVG Charts</option>
        <option value="6">Page 6: Safety Standards & Protections</option>
        <option value="7">Page 7: Commercial Offer</option>
        <option value="8">Page 8: C&I Tax Benefits & Financial Analysis ⭐</option>
        <option value="9">Page 9: Technical Details & BOQ</option>
        <option value="10">Page 10: 10-Year Savings Table</option>
        <option value="11">Page 11: Payment Terms & Acceptance</option>
      `;
    } else {
      pageSelect.innerHTML = `
        <option value="all">📑 All 10 Pages</option>
        <option value="1">Page 1: Cover Page</option>
        <option value="2">Page 2: Working Principle & Net Metering</option>
        <option value="3">Page 3: Tech Specs & Satellite Location</option>
        <option value="4">Page 4: Assumptions & Exclusions</option>
        <option value="5">Page 5: Graphical Projections & SVG Charts</option>
        <option value="6">Page 6: Safety Standards & Protections</option>
        <option value="7">Page 7: Commercial Offer & Subsidy</option>
        <option value="8">Page 8: Technical Details & BOQ</option>
        <option value="9">Page 9: 10-Year Savings Table</option>
        <option value="10">Page 10: Payment Terms & Acceptance</option>
      `;
    }

    if (currentVal && pageSelect.querySelector(`option[value="${currentVal}"]`)) {
      pageSelect.value = currentVal;
    } else {
      pageSelect.value = "all";
    }
  }

  updatePdfButtonText(isCni) {
    const btnDownloadPdf = document.getElementById("btn-download-pdf");
    if (btnDownloadPdf) {
      btnDownloadPdf.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download ${isCni ? "11" : "10"}-Page PDF
      `;
    }
  }

  updateCniConsumptionFeedback(solarState) {
    const s = solarState || {};
    const units = s.cniMonthlyUnits || 0;
    const feedbackBox = document.getElementById("cni-consumption-live-feedback");
    if (!feedbackBox) return;

    if (units > 0) {
      const annualUnits = units * 12;
      const recommendedKw = Math.max(1, Math.round(units / 130));
      const currentKw = s.kwCapacity || 25;
      const annualGen = currentKw * 1600;
      const offset = Math.min(100, Math.round((annualGen / annualUnits) * 100));

      const annLbl = document.getElementById("lbl-cni-ann-units");
      const recLbl = document.getElementById("lbl-cni-rec-kw");
      const offLbl = document.getElementById("lbl-cni-offset");

      if (annLbl) annLbl.textContent = `${annualUnits.toLocaleString("en-IN")} Units/yr`;
      if (recLbl) recLbl.textContent = `${recommendedKw} KW (at ~130 U/kW/mo)`;
      if (offLbl) offLbl.textContent = `${offset}% of usage`;

      feedbackBox.style.display = "block";
    } else {
      feedbackBox.style.display = "none";
    }
  }

  renderLivePreview() {
    if (!this.previewContainer) {
      this.previewContainer = document.getElementById("quotation-preview-render");
    }
    if (!this.previewContainer) return;
    try {
      const q = state.getQuote();
      this.previewContainer.innerHTML = QuotationTemplateRenderer.render(q);
    } catch (err) {
      console.error("renderLivePreview render error:", err);
      try {
        this.previewContainer.innerHTML = QuotationTemplateRenderer.render(SAMPLE_QUOTATION);
      } catch (e) {
        console.error("Fallback render error:", e);
      }
    }
  }

  // =========================================================================
  // Digital Signature Canvas
  // =========================================================================
  initSignaturePad() {
    const canvas = document.getElementById("signature-draw-canvas");
    if (canvas) {
      this.signaturePad = new SignaturePad(canvas);

      const clearBtn = document.getElementById("btn-clear-sig-canvas");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.signaturePad.clear();
        });
      }

      const saveBtn = document.getElementById("btn-save-sig-canvas");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          if (this.signaturePad.isEmpty()) {
            this.showToast("Please draw a signature first", "error");
            return;
          }
          const dataUrl = this.signaturePad.toDataURL();
          state.updateSignatory({ signatureUrl: dataUrl });
          this.updateSignatureThumbnail(dataUrl);
          this.closeModal("modal-signature");
          this.showToast("Digital signature applied to proposal!", "success");
        });
      }
    }
  }

  // =========================================================================
  // Actions & Buttons Wiring
  // =========================================================================
  bindActionButtons() {
    // Load Sample Data
    const sampleBtn = document.getElementById("btn-load-sample");
    if (sampleBtn) {
      sampleBtn.addEventListener("click", () => {
        state.resetToSample();
        this.renderFormFromState();
        this.renderItemsTable();
        this.showToast("Sample 5 KW Solar proposal loaded!", "success");
      });
    }

    // New Clean Quote
    const newQuoteBtn = document.getElementById("btn-new-quote");
    if (newQuoteBtn) {
      newQuoteBtn.addEventListener("click", () => {
        if (confirm("Start a new Solar Proposal? Unsaved changes will be cleared.")) {
          state.resetToNew();
          this.renderFormFromState();
          this.renderItemsTable();
          this.showToast("New blank Solar Proposal created", "info");
        }
      });
    }

    // Save Quote to History & Database
    const handleSaveQuote = async (triggerBtn, silentToast = false) => {
      const origText = triggerBtn ? triggerBtn.innerHTML : "";
      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = `<span>⏳ Saving...</span>`;
      }

      try {
        const saved = state.saveToHistory();
        
        // 1. Sync to CloudDB / SQLite backend
        if (window.cloudDb) {
          await window.cloudDb.saveQuote(saved);
        }

        // 2. Direct Sync via AdminAuth if present
        if (window.adminAuth && typeof window.adminAuth.syncQuoteToBackend === "function") {
          await window.adminAuth.syncQuoteToBackend(saved);
        }

        // 3. Mark state as saved
        if (typeof state.markSaved === "function") {
          state.markSaved();
        }

        if (!silentToast) {
          this.showToast(`💾 Proposal ${saved.quoteNumber} successfully saved to Database & History!`, "success");
        }
        return saved;
      } catch (err) {
        console.error("Save quote error:", err);
        if (!silentToast) {
          this.showToast("Proposal saved locally to history.", "info");
        }
        return state.getQuote();
      } finally {
        if (triggerBtn) {
          setTimeout(() => {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = origText;
          }, 400);
        }
      }
    };

    document.querySelectorAll(".btn-save-quote-action, #btn-save-quote, #btn-header-save, #btn-bottom-save-quote").forEach(btn => {
      btn.addEventListener("click", (e) => handleSaveQuote(e.currentTarget));
    });

    // Download PDF Action (Mandatory Auto-Save First)
    const downloadPdfBtn = document.getElementById("btn-download-pdf");
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener("click", async () => {
        const paperEl = this.previewContainer.querySelector(".solar-proposal-container");
        if (!paperEl) return;

        const origHtml = downloadPdfBtn.innerHTML;
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.innerHTML = `<span style="display:inline-block; animation: spin 1s infinite linear;">💾</span> Saving & Generating PDF...`;

        try {
          // Mandatory Step 1: Save Quotation to DB & History First!
          this.showToast("💾 Step 1/2: Saving Proposal to Database & History...", "info");
          const savedQuote = await handleSaveQuote(null, true);

          // Mandatory Step 2: Generate & Download PDF
          this.showToast("📄 Step 2/2: Generating High-Resolution 10-Page PDF...", "info");
          const kw = savedQuote.solar?.kwCapacity || 5;
          const brand = savedQuote.solar?.partnerBrand === "waaree" ? "Waaree" : (savedQuote.solar?.partnerBrand === "tata" ? "Tata" : "Adani");
          const filename = `${kw}KW_Solar_Proposal_${brand}_${savedQuote.client?.name || "Client"}`;
          await PdfExportManager.downloadPdf(paperEl, filename);
          this.showToast(`✅ Proposal ${savedQuote.quoteNumber} Saved & PDF Downloaded!`, "success");
        } catch (err) {
          console.error("PDF generation error:", err);
          this.showToast("PDF generation encountered an error. Opening print preview...", "error");
          window.print();
        } finally {
          downloadPdfBtn.disabled = false;
          downloadPdfBtn.innerHTML = origHtml;
        }
      });
    }

    // Print Button (Mandatory Auto-Save First)
    const printBtn = document.getElementById("btn-print-quote");
    if (printBtn) {
      printBtn.addEventListener("click", async () => {
        const origHtml = printBtn.innerHTML;
        printBtn.disabled = true;
        printBtn.innerHTML = `<span style="display:inline-block; animation: spin 1s infinite linear;">💾</span> Saving...`;

        try {
          // Mandatory Step 1: Save to Database & History First
          this.showToast("💾 Saving Proposal to Database before Printing...", "info");
          const savedQuote = await handleSaveQuote(null, true);
          this.showToast(`✅ Saved Proposal ${savedQuote.quoteNumber}. Opening Print Preview...`, "success");

          // Mandatory Step 2: Trigger Print Document
          setTimeout(() => {
            PdfExportManager.printDocument();
          }, 300);
        } catch (err) {
          console.error("Print error:", err);
          PdfExportManager.printDocument();
        } finally {
          setTimeout(() => {
            printBtn.disabled = false;
            printBtn.innerHTML = origHtml;
          }, 600);
        }
      });
    }

    // WhatsApp Share Button (Mandatory Auto-Save First)
    const waBtn = document.getElementById("btn-open-whatsapp-modal");
    if (waBtn) {
      waBtn.addEventListener("click", async () => {
        try {
          this.showToast("💾 Saving proposal before sharing on WhatsApp...", "info");
          await handleSaveQuote(null, true);
        } catch (e) {}
        this.openWhatsAppModal();
      });
    }

    // Quotation History Modal Button
    const histBtn = document.getElementById("btn-open-history");
    if (histBtn) {
      histBtn.addEventListener("click", () => {
        this.openHistoryModal();
      });
    }

    // Zoom Buttons
    const zoomInBtn = document.getElementById("btn-zoom-in");
    const zoomOutBtn = document.getElementById("btn-zoom-out");
    const zoomResetBtn = document.getElementById("btn-zoom-reset");
    if (zoomInBtn) zoomInBtn.addEventListener("click", () => this.setZoom(this.currentZoom + 0.1));
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => this.setZoom(this.currentZoom - 0.1));
    if (zoomResetBtn) zoomResetBtn.addEventListener("click", () => this.adjustInitialZoom());

    // Theme Toggle
    const themeBtn = document.getElementById("btn-toggle-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => this.toggleTheme());
    }

    // Draw Signature Trigger
    const openDrawSigBtn = document.getElementById("btn-open-draw-sig");
    if (openDrawSigBtn) {
      openDrawSigBtn.addEventListener("click", () => {
        this.openModal("modal-signature");
        if (this.signaturePad) {
          setTimeout(() => this.signaturePad.resizeCanvas(), 100);
        }
      });
    }

    // Mobile View Tab Switchers
    const tabEdit = document.getElementById("tab-btn-edit");
    const tabPreview = document.getElementById("tab-btn-preview");
    const editorPane = document.querySelector(".editor-pane");
    const previewPane = document.querySelector(".preview-pane");

    if (tabEdit && tabPreview) {
      tabEdit.addEventListener("click", () => {
        tabEdit.classList.add("active");
        tabPreview.classList.remove("active");
        if (editorPane) editorPane.classList.remove("hidden-tab");
        if (previewPane) previewPane.classList.add("hidden-tab");
      });

      tabPreview.addEventListener("click", () => {
        tabPreview.classList.add("active");
        tabEdit.classList.remove("active");
        if (editorPane) editorPane.classList.add("hidden-tab");
        if (previewPane) previewPane.classList.remove("hidden-tab");
        this.adjustInitialZoom();
      });
    }

    // Export / Import JSON
    const exportJsonBtn = document.getElementById("btn-export-json");
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener("click", () => {
        const q = state.getQuote();
        const blob = new Blob([JSON.stringify(q, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${q.quoteNumber || "solar_proposal"}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast("Proposal JSON exported!", "success");
      });
    }

    const importJsonInput = document.getElementById("file-import-json");
    if (importJsonInput) {
      importJsonInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            try {
              const data = JSON.parse(re.target.result);
              state.currentQuote = data;
              state.notify();
              this.renderFormFromState();
              this.renderItemsTable();
              this.showToast("Solar Proposal imported successfully!", "success");
            } catch (err) {
              this.showToast("Invalid JSON file", "error");
            }
          };
          reader.readAsText(file);
        }
      });
    }
  }

  // =========================================================================
  // WhatsApp Share Modal
  // =========================================================================
  openWhatsAppModal() {
    const q = state.getQuote();
    const phoneInput = document.getElementById("modal-wa-phone");
    const previewBox = document.getElementById("modal-wa-preview-text");

    if (phoneInput) {
      phoneInput.value = q.client.phone || "";
    }

    const updatePreview = () => {
      const msg = WhatsAppSender.generateMessage(q);
      if (previewBox) {
        previewBox.textContent = msg;
      }
    };

    updatePreview();
    this.openModal("modal-whatsapp");

    if (phoneInput) {
      phoneInput.oninput = (e) => {
        state.updateClient({ phone: e.target.value });
        this.setVal("inp-client-phone", e.target.value);
        updatePreview();
      };
    }

    const sendBtn = document.getElementById("btn-wa-send-now");
    if (sendBtn) {
      sendBtn.onclick = () => {
        const phone = (phoneInput ? phoneInput.value : "") || q.client.phone;
        const msg = WhatsAppSender.generateMessage(q);
        WhatsAppSender.sendWhatsApp(phone, msg);
        this.showToast("Opening WhatsApp...", "success");
      };
    }

    const copyBtn = document.getElementById("btn-wa-copy-text");
    if (copyBtn) {
      copyBtn.onclick = () => {
        const msg = WhatsAppSender.generateMessage(q);
        navigator.clipboard.writeText(msg).then(() => {
          this.showToast("WhatsApp message copied to clipboard!", "success");
        });
      };
    }

    const shareBtn = document.getElementById("btn-wa-share-native");
    if (shareBtn) {
      if (navigator.share) {
        shareBtn.style.display = "inline-flex";
        shareBtn.onclick = async () => {
          const paperEl = this.previewContainer.querySelector(".solar-proposal-container");
          this.showToast("Preparing PDF for direct share...", "info");
          const blob = await PdfExportManager.generatePdfBlob(paperEl);
          const res = await WhatsAppSender.shareViaWebShare(q, blob);
          if (res.success) {
            this.showToast("Shared successfully!", "success");
          }
        };
      } else {
        shareBtn.style.display = "none";
      }
    }
  }

  // =========================================================================
  // Quotation History Modal
  // =========================================================================
  async openHistoryModal() {
    const container = document.getElementById("history-list-container");
    if (!container) return;

    this.openModal("modal-history");
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 1.8rem; margin-bottom: 0.5rem; animation: spin 1s infinite linear;">⌛</div>
        <p>Fetching your saved proposals...</p>
      </div>
    `;

    let history = [];
    const authUser = window.adminAuth?.username || "SALES";
    const isAdmin = window.adminAuth && window.adminAuth.isAdmin;

    // 1. Fetch user-isolated quotations from Backend API
    if (window.cloudDb) {
      try {
        const res = await window.cloudDb.fetchUserQuotes(window.adminAuth?.token);
        if (res && res.success && Array.isArray(res.quotes)) {
          history = res.quotes.map(q => {
            try {
              const parsed = JSON.parse(q.quote_json);
              return {
                ...parsed,
                id: q.id,
                quoteNumber: q.quote_number,
                createdAt: q.created_at,
                created_at: q.created_at,
                savedAt: q.created_at,
                sales_rep: q.sales_rep,
                sales_username: q.sales_username,
                client: parsed.client || { name: q.client_name, phone: q.client_phone, email: q.client_email, billingAddress: q.client_address },
                solar: parsed.solar || { kwCapacity: q.kw_capacity, partnerBrand: q.partner_brand, structureType: q.structure_type, customSystemCost: q.total_cost, customSubsidy: q.subsidy }
              };
            } catch (e) {
              return {
                id: q.id,
                quoteNumber: q.quote_number,
                createdAt: q.created_at,
                created_at: q.created_at,
                savedAt: q.created_at,
                sales_rep: q.sales_rep,
                sales_username: q.sales_username,
                client: { name: q.client_name, phone: q.client_phone, email: q.client_email, billingAddress: q.client_address },
                solar: { kwCapacity: q.kw_capacity, partnerBrand: q.partner_brand, structureType: q.structure_type, customSystemCost: q.total_cost, customSubsidy: q.subsidy }
              };
            }
          });
        }
      } catch (e) {
        console.warn("Error fetching remote history:", e);
      }
    }

    // 2. Fallback to user-isolated localStorage state history
    if (history.length === 0) {
      history = state.getHistory();
    }

    if (history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📂</div>
          <p>No saved solar proposals found for <strong>${this.escape(authUser)}</strong>.</p>
          <p style="font-size: 0.78rem;">Click "Save Proposal" on any proposal to store it in your account.</p>
        </div>
      `;
      return;
    }

    const headerBanner = `
      <div style="margin-bottom: 0.85rem; padding: 0.5rem 0.85rem; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-sm); font-size: 0.78rem; display: flex; align-items: center; justify-content: space-between;">
        <span>🔒 Showing Quotations for: <strong style="color: #38bdf8;">${isAdmin ? "All Staff (Admin View)" : authUser}</strong></span>
        <span class="badge-pro" style="font-size: 0.68rem;">${history.length} Saved Quote(s)</span>
      </div>
    `;

    container.innerHTML = headerBanner + history.map(item => {
      const calc = SolarCalculator.calculate(item.solar || {});
      let dateStr = "—";
      if (window.adminAuth && (item.createdAt || item.created_at || item.savedAt)) {
        dateStr = window.adminAuth.formatDateDisplay(item.createdAt || item.created_at || item.savedAt);
        const timeStr = window.adminAuth.formatTimeDisplay(item.createdAt || item.created_at || item.savedAt);
        if (timeStr) dateStr += ` ${timeStr}`;
      } else if (item.savedAt) {
        dateStr = new Date(item.savedAt).toLocaleDateString("en-IN");
      } else {
        dateStr = item.quoteDate || item.issueDate || "—";
      }
      const brand = item.solar?.partnerBrand === "tata" ? "TATA Power" : (item.solar?.partnerBrand === "waaree" ? "Waaree" : "Adani");
      const creatorBadge = (isAdmin && (item.sales_username || item.sales_rep)) ? `<span style="font-size: 0.7rem; color: #f59e0b; margin-left: 6px;">👤 ${this.escape(item.sales_username || item.sales_rep)}</span>` : "";

      return `
        <div class="history-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.65rem;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">
              ${item.solar?.kwCapacity || 5} KW Solar Proposal (${brand})
              <span class="badge-pro" style="font-size: 0.65rem; margin-left: 6px;">${item.quoteNumber || item.id}</span>
              ${creatorBadge}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
              Client: <strong>${this.escape(item.client?.name || "Client")}</strong> (${this.escape(item.client?.billingAddress || "Hyderabad")})
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              📅 Date &amp; Time: <strong style="color: #38bdf8;">${dateStr}</strong> • Generation: ${calc.annualGeneration.toLocaleString("en-IN")} units/yr
            </div>
          </div>

          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem;">
            <div style="font-size: 1.1rem; font-weight: 800; color: #008852;">
              ${SolarCalculator.formatINR(calc.effectiveNetCost)}
            </div>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-sm btn-primary btn-load-hist" data-id="${item.id}">📂 Load</button>
              ${isAdmin ? `<button class="btn btn-sm btn-danger btn-del-hist" data-id="${item.id}" title="Admin Only: Delete permanently">🗑️ Delete</button>` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".btn-load-hist").forEach(btn => {
      btn.addEventListener("click", async () => {
        const qid = btn.dataset.id;
        const matched = history.find(q => q.id === qid);
        if (matched) {
          state.currentQuote = JSON.parse(JSON.stringify(matched));
          state.notify();
          this.renderFormFromState();
          this.renderItemsTable();
          this.closeModal("modal-history");
          this.showToast(`Solar Proposal ${matched.quoteNumber || qid} loaded!`, "success");
        } else {
          // Try fetching by ID from server
          if (window.cloudDb) {
            const singleRes = await window.cloudDb.fetchQuoteById(qid);
            if (singleRes.success && singleRes.quote) {
              state.currentQuote = singleRes.quote;
              state.notify();
              this.renderFormFromState();
              this.renderItemsTable();
              this.closeModal("modal-history");
              this.showToast(`Solar Proposal loaded!`, "success");
              return;
            } else if (singleRes.error) {
              this.showToast(singleRes.error, "error");
              return;
            }
          }
          this.showToast("Unable to load quotation", "error");
        }
      });
    });

    container.querySelectorAll(".btn-del-hist").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!window.adminAuth?.isAdmin) {
          this.showToast("⛔ Only Administrators have permission to delete quotations.", "error");
          return;
        }
        if (confirm("⚠️ Are you sure you want to permanently delete this proposal?")) {
          if (window.cloudDb) {
            await window.cloudDb.deleteQuote(btn.dataset.id);
          } else {
            state.deleteFromHistory(btn.dataset.id);
          }
          await this.openHistoryModal();
          this.showToast("Proposal deleted from database & history", "info");
        }
      });
    });
  }

  // =========================================================================
  // Product Catalog Modal
  // =========================================================================
  bindCatalog() {
    const catalogContainer = document.getElementById("catalog-items-list");
    if (catalogContainer) {
      catalogContainer.innerHTML = CATALOG_PRESETS.map((item, idx) => `
        <div class="catalog-card" style="background: var(--bg-tertiary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem; cursor: pointer;">
          <div>
            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${this.escape(item.name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">${this.escape(item.description)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-weight: 700; color: #008852; font-size: 0.95rem;">
              ₹${item.unitPrice.toLocaleString("en-IN")}
            </div>
            <button class="btn btn-sm btn-secondary btn-insert-catalog" data-idx="${idx}">+ Select</button>
          </div>
        </div>
      `).join("");

      catalogContainer.querySelectorAll(".btn-insert-catalog").forEach(btn => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.idx);
          if (idx === 0) state.updateSolar({ kwCapacity: 3 });
          else if (idx === 1) state.updateSolar({ kwCapacity: 5 });
          else if (idx === 2) state.updateSolar({ kwCapacity: 10 });
          else if (idx === 3) state.updateSolar({ kwCapacity: 15 });
          this.renderFormFromState();
          this.closeModal("modal-catalog");
          this.showToast(`Selected "${CATALOG_PRESETS[idx].name}"!`, "success");
        });
      });
    }
  }

  // =========================================================================
  // Modal Management
  // =========================================================================
  bindModals() {
    document.querySelectorAll(".modal-close-btn, .btn-modal-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-backdrop");
        if (modal) modal.classList.remove("active");
      });
    });

    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove("active");
        }
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }

  // =========================================================================
  // Toast Notifications
  // =========================================================================
  showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "☀️";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${this.escape(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "toastOut 0.3s forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // =========================================================================
  // Dynamic Map Location & Satellite Preview Helper
  // =========================================================================
  updateMapPreviewUI(q = state.getQuote()) {
    const s = q.solar || {};
    const mapThumb = document.getElementById("map-preview-thumb");
    const mapThumbTitle = document.getElementById("map-preview-title");
    const mapThumbCoords = document.getElementById("map-preview-coords");
    const mapStatus = document.getElementById("map-status-pill");
    const btnResetMap = document.getElementById("btn-reset-map-image");

    if (s.customMapImage) {
      if (mapThumb) mapThumb.src = s.customMapImage;
      if (mapThumbTitle) mapThumbTitle.textContent = "Custom Site Photo";
      if (mapThumbCoords) mapThumbCoords.textContent = "Uploaded Photo Active";
      if (mapStatus) {
        mapStatus.innerHTML = `<span>📸 Custom Site Photo Active (Page 3)</span>`;
        mapStatus.style.background = "rgba(56, 189, 248, 0.12)";
        mapStatus.style.color = "#38bdf8";
        mapStatus.style.borderColor = "rgba(56, 189, 248, 0.3)";
      }
      if (btnResetMap) btnResetMap.style.display = "inline-block";
    } else {
      if (btnResetMap) btnResetMap.style.display = "none";
      if (s.dynamicMapImage) {
        if (mapThumb) mapThumb.src = s.dynamicMapImage;
        if (mapThumbTitle) mapThumbTitle.textContent = s.mapLocationTitle || "Project Site";
        if (mapThumbCoords) mapThumbCoords.textContent = s.mapCoordinates || `${s.mapZoom || 17}x Satellite`;
        if (mapStatus) {
          mapStatus.innerHTML = `<span>🛰️ Satellite Map Active: ${s.mapCoordinates || 'HD View'}</span>`;
          mapStatus.style.background = "rgba(16, 185, 129, 0.1)";
          mapStatus.style.color = "#10b981";
          mapStatus.style.borderColor = "rgba(16, 185, 129, 0.25)";
        }
      } else {
        if (mapThumb) mapThumb.src = "assets/satellite-map-default.png";
        if (mapThumbTitle) mapThumbTitle.textContent = q.client?.billingAddress || "Hyderabad, India";
        if (mapThumbCoords) mapThumbCoords.textContent = "Satellite View (HD)";
      }
    }
  }

  async triggerMapGeneration(inputUrl, zoomLevel = 17, showToastFeedback = false) {
    const q = state.getQuote();
    const billingAddr = q.client?.billingAddress || "Hyderabad, India";
    const statusPill = document.getElementById("map-status-pill");

    if (statusPill) {
      statusPill.innerHTML = `<span>🛰️ Generating High-Res Satellite Map...</span>`;
      statusPill.style.background = "rgba(245, 158, 11, 0.15)";
      statusPill.style.color = "#f59e0b";
      statusPill.style.borderColor = "rgba(245, 158, 11, 0.3)";
    }

    try {
      if (typeof MapEngine !== "undefined") {
        const res = await MapEngine.resolveAndGenerateMap(inputUrl, billingAddr, zoomLevel);
        if (res && res.dataUrl) {
          state.updateSolar({
            dynamicMapImage: res.dataUrl,
            mapLocationTitle: res.title,
            mapCoordinates: res.coordinatesText,
            mapZoom: zoomLevel,
            googleMapsUrl: inputUrl
          });

          this.updateMapPreviewUI();

          if (showToastFeedback) {
            this.showToast(`Satellite Map Generated for ${res.title}!`, "success");
          }
        }
      }
    } catch (err) {
      console.warn("Satellite map generation failed:", err);
      if (statusPill) {
        statusPill.innerHTML = `<span>⚠️ Satellite map fallback active</span>`;
      }
    }
  }

  escape(str) {
    return SolarProposalRenderer.escape(str);
  }
}

// Global App Instance
document.addEventListener("DOMContentLoaded", () => {
  window.quoteApp = new QuotationApp();
});

