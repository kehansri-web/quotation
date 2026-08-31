/**
 * QuoteCraft Pro - Pixel-Perfect Solar Proposal HTML Renderer
 * Supporting dynamic Installer Companies, Partner Brands (Adani / Waaree / Tata),
 * System Types (On-Grid / Off-Grid / Hybrid), Dual Customer Modes (Residential vs C&I),
 * Dedicated C&I Tax Benefits & Accelerated Depreciation Analysis Page,
 * Pure SVG Charts, Dynamic Google Maps query parser, and Background Graphics on ALL Pages.
 */

class SolarProposalRenderer {
  static render(quote) {
    const calc = SolarCalculator.calculate(quote.solar || {});
    const brand = quote.solar?.partnerBrand || "adani"; // "adani", "waaree", "tata", or "custom"
    let partnerLogo = "assets/adani-logo.svg";
    let partnerName = "ADANI SOLAR PANELS";
    let defaultSupplier = "As supplied by ADANI Power Solar (Polycab).";

    if (brand === "waaree") {
      partnerLogo = "assets/waaree-logo.svg";
      partnerName = "WAAREE SOLAR PANELS";
      defaultSupplier = "As supplied by WAAREE Solar.";
    } else if (brand === "tata") {
      partnerLogo = "assets/tata-solar-logo.png";
      partnerName = "TATA POWER SOLAR PANELS";
      defaultSupplier = "As supplied by TATA Power Solar (Polycab/Havells).";
    } else if (brand === "custom") {
      partnerLogo = quote.solar?.customPartnerLogo || "assets/adani-logo.svg";
      const cName = quote.solar?.customPartnerName?.trim() || "PREMIUM";
      partnerName = `${cName.toUpperCase()} SOLAR PANELS`;
      defaultSupplier = quote.solar?.customPartnerSupplier || `As supplied by ${cName} OEM.`;
    }

    // Direct custom uploaded partner logo override if provided
    if (quote.solar?.customPartnerLogo && (quote.solar.customPartnerLogo.startsWith("data:") || quote.solar.customPartnerLogo.includes("http") || brand === "custom")) {
      partnerLogo = quote.solar.customPartnerLogo;
      if (quote.solar?.customPartnerName?.trim()) {
        partnerName = `${quote.solar.customPartnerName.trim().toUpperCase()} SOLAR PANELS`;
      }
    }

    const inverterSupplier = quote.solar?.inverterManufacturer || defaultSupplier;

    // Installer Company Branding (KehanSri Solar vs K Energy vs Custom)
    const installerBrand = quote.solar?.installerBrand || quote.business?.brandPreset || "kehansri";
    let installerLogo = "assets/kehansri-solar-logo.png";
    let companyName = "KEHANSRI SOLAR";
    let legalEntityName = "KehanSri Solar (KehanSri Technologies and Services Private Limited)";

    if (installerBrand === "kehansri") {
      installerLogo = "assets/kehansri-solar-logo.png";
      companyName = quote.business?.name || "KEHANSRI SOLAR";
      legalEntityName = "KehanSri Solar (KehanSri Technologies and Services Private Limited)";
    } else if (installerBrand === "kenergy") {
      installerLogo = "assets/k-energy-solutions.png";
      companyName = quote.business?.name || "K ENERGY SOLUTIONS";
      legalEntityName = "K Energy Solutions";
    } else if (installerBrand === "custom") {
      installerLogo = quote.business?.logoUrl || "assets/kehansri-solar-logo.png";
      companyName = quote.business?.name || "CUSTOM SOLAR INSTALLER";
      legalEntityName = quote.business?.name || "Solar EPC Installer";
    }

    // Direct custom uploaded logo override
    if (quote.business?.logoUrl && (quote.business.logoUrl.startsWith("data:") || quote.business.logoUrl.includes("http") || installerBrand === "custom")) {
      installerLogo = quote.business.logoUrl;
    }

    if (quote.business?.name) {
      companyName = quote.business.name;
    }

    const isCni = calc.customerType === "commercial";
    const totalPages = isCni ? 11 : 10;
    const activePage = quote.activePagePreview || "all";

    // Build pages array dynamically based on Customer Type (Residential: 10 pages, C&I: 11 pages)
    const pages = [];
    
    // Page 1: Cover Page
    pages.push(this.renderPage1(quote, calc, partnerLogo, installerLogo, companyName, legalEntityName, 1, totalPages));
    
    // Page 2: Working Principle
    pages.push(this.renderPage2(quote, calc, installerLogo, companyName, 2, totalPages));
    
    // Page 3: Technical Specs & Location Map
    pages.push(this.renderPage3(quote, calc, installerLogo, companyName, 3, totalPages));
    
    // Page 4: Assumptions & Exclusions
    pages.push(this.renderPage4(quote, calc, installerLogo, companyName, 4, totalPages));
    
    // Page 5: Graphical Representations (Monthly & 25-Yr SVG Charts)
    pages.push(this.renderPage5(quote, calc, installerLogo, companyName, 5, totalPages));
    
    // Page 6: Safety Standards & Inverter Protections
    pages.push(this.renderPage6(quote, calc, installerLogo, companyName, 6, totalPages));
    
    // Page 7: Commercial Offer & Savings
    pages.push(this.renderPage7(quote, calc, installerLogo, companyName, 7, totalPages));
    
    // Page 8 (C&I ONLY): Dedicated Tax Benefits & Financial Analysis Page
    if (isCni) {
      pages.push(this.renderPageCniTaxAnalysis(quote, calc, installerLogo, companyName, 8, totalPages));
    }
    
    // Page 8 (Residential) / Page 9 (C&I): Technical BOQ
    const boqPageNum = isCni ? 9 : 8;
    pages.push(this.renderPage8(quote, calc, installerLogo, partnerName, inverterSupplier, companyName, boqPageNum, totalPages));
    
    // Page 9 (Residential) / Page 10 (C&I): 10-Year Savings Table & Scope of Work
    const savingsPageNum = isCni ? 10 : 9;
    pages.push(this.renderPage9(quote, calc, installerLogo, companyName, savingsPageNum, totalPages));
    
    // Page 10 (Residential) / Page 11 (C&I): Payment Details & Acceptance
    const paymentPageNum = isCni ? 11 : 10;
    pages.push(this.renderPage10(quote, calc, installerLogo, companyName, legalEntityName, paymentPageNum, totalPages));

    const selectedPageIndex = parseInt(activePage);
    if (activePage !== "all" && !isNaN(selectedPageIndex) && selectedPageIndex >= 1 && selectedPageIndex <= pages.length) {
      return `<div class="solar-proposal-container">${pages[selectedPageIndex - 1]}</div>`;
    }

    return `<div class="solar-proposal-container">${pages.join("")}</div>`;
  }

  static getWatermarkSvg() {
    return ``;
  }

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  static renderPage1(quote, calc, partnerLogo, installerLogo, companyName, legalEntityName, pageNum = 1, totalPages = 10) {
    const c = quote.client || {};
    const b = quote.business || {};
    const kw = calc.kwCapacity;
    const isCni = calc.customerType === "commercial";
    const systemType = calc.systemType || "on-grid";

    let systemTypeLabel = "On-Grid";
    if (systemType === "off-grid") systemTypeLabel = "Off-Grid";
    else if (systemType === "hybrid") systemTypeLabel = "Hybrid";

    let proposalCategoryTitle = isCni 
      ? `${kw} KW Detailed Technical C&I ${systemTypeLabel} Solar Proposal`
      : `${kw} KW Detailed Technical ${systemTypeLabel} Solar Proposal`;

    let displayDate = "";
    if (window.adminAuth && (quote.createdAt || quote.created_at || quote.quoteDate)) {
      displayDate = window.adminAuth.formatDateDisplay(quote.createdAt || quote.created_at || quote.quoteDate);
    } else if (quote.quoteDate) {
      displayDate = String(quote.quoteDate);
    } else {
      displayDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    return `
      <div class="proposal-page cover-page" id="proposal-page-1">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-red-circle"></div>
        <div class="pdf-bg-orange-swoosh"></div>
        <div class="pdf-bg-orange-stripe-circle"></div>
        <div class="pdf-bg-solar-circle"></div>

        <!-- Top Header Logos -->
        <div class="page-top-header">
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
          <img src="${partnerLogo}" alt="Partner Brand" class="partner-brand-logo">
        </div>

        <!-- Hero Section -->
        <div class="cover-hero-section">
          <div class="cover-titles-left">
            <div class="red-dot-accent"></div>
            <div class="cover-kw-title">
              ${kw} KW Solar
              <span class="proposal-word">Proposal</span>
            </div>
            <div class="cover-kw-subtitle">${proposalCategoryTitle}</div>
            ${isCni ? `<div style="display:inline-block; margin-top: 6px; padding: 3px 8px; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(2, 132, 199, 0.35); border-radius: 4px; font-size: 10.5px; font-weight: 700; color: #0284c7;">🏭 Commercial &amp; Industrial (C&amp;I) Project</div>` : ''}
          </div>

          <div class="cover-graphic-right">
            <img src="assets/solar-hero-circle.png" alt="Solar Array">
          </div>
        </div>

        <!-- Prepared For & Prepared By Meta Grid -->
        <div class="cover-meta-grid">
          <div>
            <div class="meta-col-title">PREPARED FOR</div>
            <div class="meta-field-row">
              <span class="meta-field-label">Name:</span>
              <span class="meta-field-val">${this.escape(c.name || "Mr. Sathish")}</span>
            </div>
            ${c.company ? `
            <div class="meta-field-row">
              <span class="meta-field-label">Establishment:</span>
              <span class="meta-field-val">${this.escape(c.company)}</span>
            </div>` : ''}
            <div class="meta-field-row">
              <span class="meta-field-label">Address:</span>
              <span class="meta-field-val">${this.escape(c.billingAddress || "Hyderabad, Telangana")}</span>
            </div>
            <div class="meta-field-row" style="margin-top: 8px;">
              <span class="meta-field-label">Email:</span>
              <span class="meta-field-val">${this.escape(c.email || "-")}</span>
            </div>
            <div class="meta-field-row">
              <span class="meta-field-label">Phone No:</span>
              <span class="meta-field-val">${this.escape(c.phone || "+91 9493858086")}</span>
            </div>
          </div>

          <div>
            <div class="meta-col-title">PREPARED BY</div>
            <div class="meta-field-row">
              <span class="meta-field-label">Name:</span>
              <span class="meta-field-val">${this.escape(b.preparedByName || "Sales Team")}</span>
            </div>
            <div class="meta-field-row">
              <span class="meta-field-label">Address:</span>
              <span class="meta-field-val">${this.escape(b.address || "Plot No 2-55, Sri Shyam Nagar, Telecom Nagar, Gachibowli, Hyderabad, District-Ranga Reddy, PIN: 500032").replace(/\n/g, "<br>")}</span>
            </div>
            <div class="meta-field-row" style="margin-top: 8px;">
              <span class="meta-field-label">Email:</span>
              <span class="meta-field-val">${this.escape(b.email || "Solar_Sales_team@kehansri.com")}</span>
            </div>
            <div class="meta-field-row">
              <span class="meta-field-label">Phone No:</span>
              <span class="meta-field-val">${this.escape(b.phone || "+91 8328551689")}</span>
            </div>
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Quote Ref: ${this.escape(quote.quoteNumber || "QT-2026-0842")} &bull; Date: ${this.escape(displayDate)}</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 2: WORKING PRINCIPLE
  // =========================================================================
  static renderPage2(quote, calc, installerLogo, companyName, pageNum = 2, totalPages = 10) {
    const moduleType = quote.solar?.moduleType !== undefined && quote.solar?.moduleType !== null && quote.solar?.moduleType !== "" ? quote.solar.moduleType : (calc.moduleType || "TOPCON");
    const systemType = calc.systemType || "on-grid";
    
    let workingPrincipleHeading = "Working Principle of Grid Connected Solar Project";
    if (systemType === "off-grid") {
      workingPrincipleHeading = "Working Principle of Off-Grid Standalone Solar Power System";
    } else if (systemType === "hybrid") {
      workingPrincipleHeading = "Working Principle of Hybrid Solar PV System with Battery Storage & Net Metering";
    }

    return `
      <div class="proposal-page" id="proposal-page-2">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-corner-og"></div>
        <div class="pdf-bg-green-swoosh"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">${workingPrincipleHeading}</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <!-- Net Metering / Working Principle Visual Diagram -->
          <div class="net-metering-diagram-box">
            <img src="assets/net-metering-official.png" alt="How Solar Works - Photovoltaic Solar Example">
          </div>

          <p style="font-size: 11px; color: #334155; line-height: 1.38; margin-bottom: 6px;">
            Scope of work covers EPC of solar ${systemType === 'off-grid' ? 'off-grid' : (systemType === 'hybrid' ? 'hybrid' : 'rooftop')} system as per terms &amp; conditions mentioned here with. The Scope of work includes Design, Engineering, Supply, Installation, Testing and Commissioning of system. The scope includes all civil works related to installation of the plant like Structure installation, Cable laying etc.
          </p>

          <div class="scope-section-heading">Our Scope for Supply under EPC:</div>
          <ul class="scope-list">
            <li>1) Solar PV Modules - ${this.escape(moduleType)}.</li>
            <li>2) Module Mounting Structures suitable for rooftop.</li>
            <li>3) ${systemType === 'hybrid' ? 'Hybrid Solar Inverter (BESS Ready)' : (systemType === 'off-grid' ? 'Off-Grid Inverter with MPPT' : 'String Inverter')}.</li>
            <li>4) DCDB with Fuse and MCB.</li>
            <li>5) DC cables.</li>
            <li>6) MC4 -Connectors.</li>
            <li>7) ACDB with MCB and SPD.</li>
            <li>8) AC Cable.</li>
            <li>9) Cable conduit.</li>
            <li>10) Earthing Cable.</li>
            <li>11) Earthing System as per design and requirement.</li>
          </ul>

          <div class="scope-section-heading" style="margin-top: 5px;">Client Scope:</div>
          <ul class="scope-list">
            <li>1) Power Supply shall be provided.</li>
            <li>2) For Wi-Fi connectivity (Inverter base) Router &amp; Internet connectivity shall be provided by client</li>
          </ul>
        </div>

        <div class="page-footer-tag">
          <span>Solar Proposal</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 3: TECHNICAL SPECS & GOOGLE MAPS LOCATION
  // =========================================================================
  static renderPage3(quote, calc, installerLogo, companyName, pageNum = 3, totalPages = 10) {
    const kw = calc.kwCapacity;
    const structure = calc.structureType;
    const systemType = calc.systemType || "on-grid";
    const mapInput = (quote.solar?.googleMapsUrl || "").trim();
    const customMapImg = quote.solar?.customMapImage || "";
    const dynamicMapImg = quote.solar?.dynamicMapImage || "";
    const clientAddr = (quote.client?.billingAddress || "").trim();

    let locationQuery = quote.solar?.mapLocationTitle || clientAddr || "Project Site Location";
    if (!quote.solar?.mapLocationTitle && mapInput) {
      if (mapInput.includes("maps.google.com") || mapInput.includes("google.com/maps") || mapInput.includes("goo.gl")) {
        try {
          if (mapInput.includes("q=")) {
            const urlObj = new URL(mapInput);
            locationQuery = urlObj.searchParams.get("q") || locationQuery;
          } else if (mapInput.includes("/place/")) {
            const match = mapInput.match(/\/place\/([^\/@]+)/);
            if (match && match[1]) {
              locationQuery = decodeURIComponent(match[1].replace(/\+/g, " "));
            }
          }
        } catch (e) {
          locationQuery = mapInput;
        }
      } else {
        locationQuery = mapInput;
      }
    }

    const coordsDisplay = quote.solar?.mapCoordinates || "";
    const mapImgSrc = customMapImg || dynamicMapImg || "assets/satellite-map-default.png";

    let inverterTypeDisplay = "String Inverter (Grid-Tied)";
    if (systemType === "off-grid") inverterTypeDisplay = "Off-Grid Inverter + Battery";
    else if (systemType === "hybrid") inverterTypeDisplay = "Hybrid Inverter (Grid + BESS)";

    return `
      <div class="proposal-page" id="proposal-page-3">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Technical Specifications</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area" style="display: flex; flex-direction: column; justify-content: space-between; padding-top: 5px; height: 100%;">
          <!-- Top Grid: Specs on Left, Project Location Map on Right -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: 5px;">
            
            <!-- Left Side Specs -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 18px; padding-top: 4px;">
              <!-- 1. Plant Capacity -->
              <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="1.8">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                  <rect x="5" y="7" width="14" height="10" rx="1" stroke="#1e293b" stroke-width="1.5" fill="#f8fafc"/>
                  <path d="M5 12h14M12 7v10M9 7l-2 10M15 7l2 10" stroke="#1e293b" stroke-width="1.2"/>
                </svg>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #334155;">Plant Capacity</div>
                  <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">${kw} KW</div>
                </div>
              </div>

              <!-- 2. Inverter Details -->
              <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="1.8">
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke="#1e293b" stroke-width="1.5" fill="#f8fafc"/>
                  <rect x="7" y="6" width="10" height="6" rx="1" stroke="#1e293b" stroke-width="1.2"/>
                  <circle cx="9" cy="16" r="1.2" fill="#1e293b"/>
                  <circle cx="15" cy="16" r="1.2" fill="#1e293b"/>
                </svg>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #334155;">Inverter Type</div>
                  <div style="font-size: 15px; font-weight: 800; color: #15803d; margin-top: 2px;">${inverterTypeDisplay}</div>
                </div>
              </div>

              <!-- 3. Structure Type -->
              <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="1.8">
                  <polygon points="3 14 12 5 21 14" stroke="#1e293b" stroke-width="1.5" fill="#f8fafc"/>
                  <line x1="12" y1="5" x2="12" y2="19" stroke="#1e293b" stroke-width="1.5"/>
                  <line x1="5" y1="14" x2="5" y2="19" stroke="#1e293b" stroke-width="1.5"/>
                  <line x1="19" y1="14" x2="19" y2="19" stroke="#1e293b" stroke-width="1.5"/>
                </svg>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #334155;">Structure Type</div>
                  <div style="font-size: 16px; font-weight: 800; color: #15803d; margin-top: 2px;">${this.escape(structure)}</div>
                </div>
              </div>
            </div>

            <!-- Right Side Project Location Map -->
            <div style="flex: 1.15; display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <div style="font-size: 13.5px; font-weight: 800; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px;">
                  Project Site: <span style="font-weight: 600; color: #15803d; font-size: 12px;">${this.escape(locationQuery)}</span>
                </div>
              </div>
              <div style="width: 100%; height: 215px; border-radius: 8px; overflow: hidden; border: 1.5px solid #cbd5e1; box-shadow: 0 4px 10px rgba(0,0,0,0.06); background: #0f172a; position: relative;">
                <img src="${mapImgSrc}" alt="Project Location Satellite Map" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
                ${customMapImg ? `
                  <div style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.85); color: #38bdf8; font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                    📸 Site Survey Photo
                  </div>
                ` : `
                  <div style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.85); color: #10b981; font-size: 9.5px; font-weight: 700; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                    🛰️ Satellite View (HD)
                  </div>
                `}
                ${coordsDisplay && !customMapImg ? `
                  <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15, 23, 42, 0.88); color: #f8fafc; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.15); font-family: monospace;">
                    📍 ${this.escape(coordsDisplay)}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Bottom 3D Design Unavailable Box -->
          <div style="margin-top: 20px; margin-bottom: 10px;">
            <div style="font-size: 17px; font-weight: 800; color: #15803d; margin-bottom: 8px;">Interactive 3D Design</div>
            <div style="border: 2px dashed #38bdf8; border-radius: 12px; padding: 48px 25px; text-align: center; background: #ffffff;">
              <div style="width: 52px; height: 52px; border-radius: 50%; background: #e0f2fe; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #0284c7; margin-bottom: 6px;">Design Preview Unavailable</div>
              <p style="font-size: 12px; color: #64748b; margin: 0 auto; max-width: 80%;">
                Your design hasn't been saved yet. Please save your progress to preview it here.
              </p>
            </div>
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Technical Specifications</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 4: ASSUMPTIONS, EXCLUSIONS & SAFETY
  // =========================================================================
  static renderPage4(quote, calc, installerLogo, companyName, pageNum = 4, totalPages = 10) {
    const kw = calc.kwCapacity;

    return `
      <div class="proposal-page" id="proposal-page-4">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Assumptions</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <ol class="numbered-assumptions-list">
            <li>1) We have considered minimum Capacity required to be installed is <strong>${kw} KW</strong> . The Capacity is however, subject to change in Detailed Engineering Stage. Any change in site /change in number of sites/ changes in capacity beyond 5% shall lead to a revision in Project Cost.</li>
            <li>2) List of makes of equipment shall be as per our makes list attached.</li>
            <li>3) The system capacity is based on the assumption that customer would provide us clear shadow free SPV plant installation. If the trees or any shadow causing object is present in the vicinity, customer will make arrangement of removal of the trees / shadow causing objects.</li>
            <li>4) Customer shall neither cause nor permit any interference with the Solar Energy Facility's optimal performance as a result of any activity on the Property or otherwise in Buyer's control. Examples of such interference include, but are not limited to, reduction of solar insolation and access to sunlight, release of effluents on to the Solar Energy Facility, or excessive heating at the Site to the extent such conditions were not already present.</li>
            <li>5) Switchgear/Breaker (MCCB/SFU) of appropriate rating and the Spare feeder/Panel/Box for housing the Switchgear for evacuating of SPV power plant, has been considered in Client's scope.</li>
            <li>6) Post bid, if there is any change in specifications and project configuration due to client recommendations at post bid stage or after site visit, any additional commercial implications due to same shall be borne by the Customer.</li>
            <li>7) We have considered evacuation of site at local LT Panel of each building. AC Cable lengths considered upto ACDB. Cabling from ACDB to LT Panel (in excess of assumed lengths) to be charged on Pro-rata basis.</li>
            <li>8) The owner shall ensure to maintain proper approach to site for smooth movement of men and material at the roof/area of installation. Site Access in form of Road, Ladder, stairs etc. shall be arranged by client.</li>
            <li>9) The Project is on Turnkey Design and Build Model. Any surplus material shall be returned to us after Project commissioning.</li>
          </ol>

          <div class="page-main-heading" style="margin-top: 6px; margin-bottom: 2px;">Exclusions:</div>
          <p style="font-size: 11px; color: #475569; margin-bottom: 3px;">Please note the following exclusions in our proposal:</p>
          <ul class="exclusions-list">
            <li>1) Permanent Rooftop access (Lift/Ladder/Staircase/Scaffolding) during Project Execution.</li>
            <li>2) Operation &amp; Maintenance. A separate order may be placed for O&amp;M</li>
            <li>3) Computer, internet connectivity and related hardware</li>
            <li>4) Free Power and Water for construction.</li>
            <li>5) Water at a pressure of 6-8 bar on the roof level for each of the roofs along with Water cleaning arrangement.</li>
            <li>6) Spare Feeder Panel / Enclosure at LT panel for Evacuation of Power.</li>
            <li>7) Customer to ensure roof load bearing capacity of 60-65 kg/sq mtr.</li>
          </ul>

          <div class="page-main-heading" style="margin-top: 5px; margin-bottom: 3px;">Safety</div>
          <div class="safety-card">
            Safety is a core value in ${this.escape(companyName)}. We adhere to the highest standards of safety and work in a way that takes into account, methods to mitigate and eliminate the risks and hazards that arise during the course of Solar Rooftop Installations at your facility.
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Assumptions &amp; Exclusions</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 5: GRAPHICAL REPRESENTATIONS (EXACT VECTOR SVG CHARTS)
  // =========================================================================
  static renderPage5(quote, calc, installerLogo, companyName, pageNum = 5, totalPages = 10) {
    // -----------------------------------------------------------------------
    // Chart 1: Monthly Solar Savings
    // -----------------------------------------------------------------------
    const maxMonthlyVal = Math.max(...calc.monthlyData.map(m => m.savings), 7000);
    const maxY1 = Math.ceil(maxMonthlyVal / 1000) * 1000;
    const yTicks1 = [];
    const step1 = maxY1 / 7;
    for (let i = 7; i >= 0; i--) {
      yTicks1.push(Math.round(i * step1));
    }

    const svgW1 = 670;
    const svgH1 = 240;
    const chartL1 = 80;
    const chartR1 = 640;
    const chartW1 = chartR1 - chartL1;
    const chartT1 = 20;
    const chartB1 = 175;
    const plotH1 = chartB1 - chartT1;

    // Y Grid Lines & Tick Labels
    const gridAndTicks1 = yTicks1.map(t => {
      const y = chartB1 - (t / maxY1) * plotH1;
      return `
        <line x1="${chartL1 - 5}" y1="${y}" x2="${chartR1}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${chartL1 - 10}" y="${y + 3.5}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9.5" font-weight="500" fill="#475569" text-anchor="end">${t}</text>
      `;
    }).join("");

    // 12 Monthly Bars
    const barW1 = 30;
    const colGap1 = (chartW1 - (12 * barW1)) / 13;
    const barsSvg1 = calc.monthlyData.map((m, i) => {
      const x = chartL1 + colGap1 + i * (barW1 + colGap1);
      const bHeight = Math.max(2, (m.savings / maxY1) * plotH1);
      const y = chartB1 - bHeight;
      const textCenterX = x + barW1 / 2;
      const textY = chartB1 + 10;
      return `
        <rect x="${x}" y="${y}" width="${barW1}" height="${bHeight}" fill="#1b6d2a" rx="1.5" />
        <text x="${textCenterX}" y="${textY}" transform="rotate(-30, ${textCenterX}, ${textY})" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="500" fill="#475569" text-anchor="end">${m.month}</text>
      `;
    }).join("");

    // -----------------------------------------------------------------------
    // Chart 2: 25-Year Electricity Bill Comparison (Dual Y-Axis)
    // -----------------------------------------------------------------------
    const maxBill2 = Math.max(calc.twentyFiveYears[24].billBefore, 29000);
    const maxY2 = Math.ceil(maxBill2 / 1000) * 1000;
    const yTicks2 = [29000, 25000, 20000, 15000, 10000, 5000, 0].map(v => Math.round((v / 29000) * maxY2));

    const svgW2 = 670;
    const svgH2 = 250;
    const chartL2 = 80;
    const chartR2 = 590;
    const chartW2 = chartR2 - chartL2;
    const chartT2 = 20;
    const chartB2 = 190;
    const plotH2 = chartB2 - chartT2;

    const gridAndTicks2 = yTicks2.map(t => {
      const y = chartB2 - (t / maxY2) * plotH2;
      return `
        <line x1="${chartL2 - 5}" y1="${y}" x2="${chartR2 + 5}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${chartL2 - 10}" y="${y + 3.5}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="500" fill="#475569" text-anchor="end">${t}</text>
        <text x="${chartR2 + 10}" y="${y + 3.5}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="500" fill="#475569" text-anchor="start">${t}</text>
      `;
    }).join("");

    // 25 Paired Bars (Green for before, Orange for after)
    const slotW2 = chartW2 / 25;
    const singleBarW2 = 5.5;
    const barsSvg2 = calc.twentyFiveYears.map((y, i) => {
      const slotCenterX = chartL2 + (i + 0.5) * slotW2;
      const x1 = slotCenterX - singleBarW2 - 0.5;
      const x2 = slotCenterX + 0.5;
      const h1 = Math.max(2, (y.billBefore / maxY2) * plotH2);
      const h2 = Math.max(2, (y.billAfter / maxY2) * plotH2);
      const yPos1 = chartB2 - h1;
      const yPos2 = chartB2 - h2;

      return `
        <rect x="${x1}" y="${yPos1}" width="${singleBarW2}" height="${h1}" fill="#1b6d2a" rx="1" />
        <rect x="${x2}" y="${yPos2}" width="${singleBarW2}" height="${h2}" fill="#ea580c" rx="1" />
        <text x="${slotCenterX}" y="${chartB2 + 12}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="8" font-weight="600" fill="#475569" text-anchor="middle">${y.year}</text>
      `;
    }).join("");

    return `
      <div class="proposal-page" id="proposal-page-5">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Graphical Representation</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area" style="display: flex; flex-direction: column; justify-content: space-around; padding-top: 5px;">
          <!-- Chart 1: Monthly Solar Savings -->
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 2px;">
              <span style="display: inline-block; width: 28px; height: 10px; background: #1b6d2a; border-radius: 1px;"></span>
              <span>Monthly Savings</span>
            </div>

            <svg viewBox="0 0 ${svgW1} ${svgH1}" width="100%" height="auto" style="max-height: 220px; overflow: visible;">
              <!-- Left Y-Axis Rotated Title -->
              <text x="-${chartT1 + plotH1 / 2}" y="20" transform="rotate(-90)" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="10" font-weight="700" fill="#334155" text-anchor="middle">Amount (in Rupees)</text>
              
              <!-- Grid Lines & Ticks -->
              ${gridAndTicks1}
              
              <!-- Baseline -->
              <line x1="${chartL1 - 5}" y1="${chartB1}" x2="${chartR1}" y2="${chartB1}" stroke="#94a3b8" stroke-width="1.2" />

              <!-- Monthly Bars & Labels -->
              ${barsSvg1}

              <!-- Bottom X-Axis Label -->
              <text x="${chartL1 + chartW1 / 2}" y="${chartB1 + 45}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e293b" text-anchor="middle">Months</text>
            </svg>
          </div>

          <!-- Chart 2: 25-Year Bill Comparison -->
          <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: 10px;">
            <div style="display: flex; align-items: center; gap: 20px; font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 2px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 28px; height: 10px; background: #1b6d2a; border-radius: 1px;"></span>
                <span>Electricity Bill before solar</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="display: inline-block; width: 28px; height: 10px; background: #ea580c; border-radius: 1px;"></span>
                <span>Electricity Bill after solar</span>
              </div>
            </div>

            <svg viewBox="0 0 ${svgW2} ${svgH2}" width="100%" height="auto" style="max-height: 230px; overflow: visible;">
              <!-- Left Y-Axis Rotated Title -->
              <text x="-${chartT2 + plotH2 / 2}" y="18" transform="rotate(-90)" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="700" fill="#334155" text-anchor="middle">Electricity Bill before solar (in Rupees)</text>

              <!-- Right Y-Axis Rotated Title -->
              <text x="${chartT2 + plotH2 / 2}" y="-654" transform="rotate(90)" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="9" font-weight="700" fill="#334155" text-anchor="middle">Electricity Bill after solar (in Rupees)</text>

              <!-- Grid Lines & Ticks -->
              ${gridAndTicks2}

              <!-- Baseline -->
              <line x1="${chartL2 - 5}" y1="${chartB2}" x2="${chartR2 + 5}" y2="${chartB2}" stroke="#94a3b8" stroke-width="1.2" />

              <!-- 25 Years Paired Bars & Labels -->
              ${barsSvg2}

              <!-- Bottom X-Axis Label -->
              <text x="${chartL2 + chartW2 / 2}" y="${chartB2 + 28}" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-size="11" font-weight="700" fill="#1e293b" text-anchor="middle">Years</text>
            </svg>
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Graphical Projections</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 6: SAFETY STANDARDS & PROTECTIONS
  // =========================================================================
  static renderPage6(quote, calc, installerLogo, companyName, pageNum = 6, totalPages = 10) {
    return `
      <div class="proposal-page" id="proposal-page-6">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">1) Inverters complying with the latest safety standards in the Industry</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <table class="standards-table">
            <tr><td>Anti-Islanding Protection / Grid Regulation</td><td>VDE-AR-N 4105; VDE 0126-1-1</td></tr>
            <tr><td>EMC</td><td>EN 61000-6-2; EN 61000-6-4</td></tr>
            <tr><td>Safety</td><td>IEC 62109-1/-2</td></tr>
            <tr><td>Efficiency</td><td>IEC 61683: 1999</td></tr>
            <tr><td>Environmental Testing</td><td>IEC 60068-2-1; IEC 60068-2-2; IEC 60068-2-14; IEC 60068-2-30; IEC 60068-2-6; IEC 60068-2-21; IEC 60068-2-78 (As Per MNRE/SECI Requirement)</td></tr>
            <tr><td>Ingress Protection</td><td>IEC 60529</td></tr>
          </table>

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin: 8px 0 3px;">2) Other In-built Protections in Inverters</div>
          <table class="standards-table">
            <tr><td>AC/DC Disconnection Switch</td><td>Yes</td></tr>
            <tr><td>Ground Fault Monitoring / Grid Monitoring</td><td>Yes</td></tr>
            <tr><td>DC Reverse Polarity Protection</td><td>Yes</td></tr>
            <tr><td>DC and AC Over Voltage / Current Limitation Protection</td><td>Yes</td></tr>
            <tr><td>DC and AC Short Circuit Protection</td><td>Yes</td></tr>
            <tr><td>DC String Fuse (Positive &amp; Negative)</td><td>Yes, PV Fuse – 1000V, 15A</td></tr>
            <tr><td>Surge Protection – Inbuilt</td><td>Yes, Type 2 DC–(One for each MPPT) &amp; AC input</td></tr>
          </table>

          <div style="font-size: 11.5px; font-weight: 700; color: #008852; margin: 6px 0 2px;">
            3) Breakers are used at Grid Interface Panel (GIP) and Inverter Interface Panel (IIP) levels in the required number to provide optimum protection to the electrical system.
          </div>

          <div style="font-size: 11.5px; font-weight: 700; color: #008852; margin: 3px 0 6px;">
            4) AI Cables complying with ISO 9001-2008 and OHSAS 18001-2007 standards are used, in compliance with standard industry safety requirement.
          </div>

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin: 6px 0 3px;">5) DC Cable Safety Standards</div>
          <table class="standards-table">
            <tr><td>Low Smoke emission</td><td>As per IEC 61034 / EN50268-2</td></tr>
            <tr><td>Flame Retardant</td><td>AS per IEC 60332-1 /UL 1581 1061 / VW1</td></tr>
            <tr><td>Fire load</td><td>As per DIN 51900</td></tr>
            <tr><td>No Hazardous and toxic substance</td><td>As per EU-Directive 2002/95/EG (ROHS) / PAK</td></tr>
            <tr><td>Weight</td><td>60 Kg ± 10%</td></tr>
            <tr><td>Estimated Life</td><td>25 Years</td></tr>
          </table>
        </div>

        <div class="page-footer-tag">
          <span>Safety Standards</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 7: COMMERCIAL OFFER & SOLAR SAVINGS
  // =========================================================================
  static renderPage7(quote, calc, installerLogo, companyName, pageNum = 7, totalPages = 10) {
    const kw = calc.kwCapacity;
    const isCni = calc.customerType === "commercial";

    return `
      <div class="proposal-page" id="proposal-page-7">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Solar Savings</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <div class="savings-highlights-grid">
            <div>
              <div class="highlight-stat-item">
                <div class="highlight-stat-icon">🔄</div>
                <div>
                  <div class="highlight-stat-title">Payback Period</div>
                  <div class="highlight-stat-val">${calc.paybackYears} Years</div>
                </div>
              </div>

              <div class="highlight-stat-item">
                <div class="highlight-stat-icon">☀️</div>
                <div>
                  <div class="highlight-stat-title">Average Yearly Generation</div>
                  <div class="highlight-stat-val">${calc.annualGeneration.toLocaleString("en-IN")} Units</div>
                </div>
              </div>

              <div class="highlight-stat-item">
                <div class="highlight-stat-icon">💰</div>
                <div>
                  <div class="highlight-stat-title">Average Annual Savings</div>
                  <div class="highlight-stat-val">${SolarCalculator.formatINR(calc.annualSavings)}</div>
                </div>
              </div>
            </div>

            <div>
              <div class="highlight-stat-item">
                <div class="highlight-stat-icon">🌳</div>
                <div>
                  <div class="highlight-stat-title">Trees Saved</div>
                  <div class="highlight-stat-val">${calc.treesSaved}</div>
                </div>
              </div>

              <div class="highlight-stat-item">
                <div class="highlight-stat-icon">🌍</div>
                <div>
                  <div class="highlight-stat-title">Co2 Reduction</div>
                  <div class="highlight-stat-val">${calc.co2ReductionTonnes} Tonnes</div>
                </div>
              </div>
            </div>
          </div>

          <div class="page-main-heading" style="margin-top: 6px; margin-bottom: 3px;">Commercial Offer</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 5px;">${kw} KW Solar PV Plant System Cost:</div>

          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 8px;">
            <table class="commercial-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount (in Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>System Cost</td>
                  <td>${SolarCalculator.formatINR(calc.systemCost).replace("₹ ", "")}</td>
                </tr>
                <tr>
                  <td>GST (${calc.gstRate} %)</td>
                  <td>${SolarCalculator.formatINR(calc.gstAmount).replace("₹ ", "")}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Project Cost</td>
                  <td>${SolarCalculator.formatINR(calc.totalProjectCost).replace("₹ ", "")}</td>
                </tr>
              </tbody>
            </table>

            ${!isCni ? `
              <!-- Residential Subsidy Highlight Box -->
              <div class="subsidy-highlight-card" style="flex: 1;">
                <div class="subsidy-card-title">MNRE Subsidy:</div>
                <div class="subsidy-card-amount">Rs. ${calc.mnreSubsidy.toLocaleString("en-IN")} /-</div>
              </div>
            ` : `
              <!-- C&I Commercial Highlight Box (No MNRE Subsidy Text as instructed) -->
              <div style="flex: 1; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">Commercial Proposal</div>
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">Direct Commercial CAPEX</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 3px; line-height: 1.3;">40% Accelerated Depreciation &amp; GST ITC detailed on next page</div>
              </div>
            `}
          </div>

          ${!isCni ? `
            <!-- Residential Subsidy Net Cost & DBT Note -->
            <div style="font-size: 13px; font-weight: 800; color: #008852; margin: 5px 0;">
              Effective cost will be Rs. ${calc.effectiveNetCost.toLocaleString("en-IN")} after subsidy.
            </div>
            <div style="font-size: 11px; color: #475569; font-style: italic; margin-bottom: 6px;">
              Subsidy will be credited directly to the beneficiary's account through Direct Benefit Transfer (DBT).
            </div>
          ` : `
            <!-- C&I Direct Commercial Investment Note (No subsidy text) -->
            <div style="font-size: 13px; font-weight: 800; color: #008852; margin: 5px 0;">
              Total Commercial Project Investment: Rs. ${calc.totalProjectCost.toLocaleString("en-IN")} /- (Inclusive of GST)
            </div>
            <div style="font-size: 11px; color: #475569; font-style: italic; margin-bottom: 6px;">
              *Government direct capital subsidies do not apply to C&amp;I establishments. Full 40% Accelerated Depreciation &amp; GST Input Tax Credit analysis detailed on next page.
            </div>
          `}

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin-bottom: 2px;">Notes:</div>
          <ol style="padding-left: 18px; font-size: 10.5px; color: #334155; line-height: 1.35;">
            <li>1) Above mentioned offer is valid if full capacity is awarded to ${this.escape(companyName)}.</li>
            <li>2) Standard Structure is considered. If Super/Elevated structure is required, then cost will be extra if not mentioned above.</li>
            <li>3) DG sync system cost to be additional if required and price according to the actuals.</li>
            <li>4) In case of increase of Contracted load, client is liable to pay the Govt deposits and charges.</li>
            <li>5) Connectivity will be at LT side 11 KV.</li>
            <li>6) Connectivity will be provided at energy meter level of individual house / commercial facility.</li>
            <li>7) Transformer is not considered If transformer required then cost will be extra</li>
          </ol>

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin-top: 5px;">Offer Validity:</div>
          <div style="font-size: 11.5px; color: #0f172a; font-weight: 700; margin-top: 2px;">
            ${this.escape(quote.solar?.validityDays || "4 Days")} from the date of offer.
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Commercial Offer</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 8 (C&I ONLY): DEDICATED C&I TAX BENEFITS & FINANCIAL ANALYSIS PAGE
  // =========================================================================
  static renderPageCniTaxAnalysis(quote, calc, installerLogo, companyName, pageNum = 8, totalPages = 11) {
    const kw = calc.kwCapacity;
    const taxRate = calc.corporateTaxRate;
    const adBase = calc.year1AdBase;
    const taxShield = calc.year1TaxShield;
    const gstItc = calc.gstItcAmount;
    const netInv = calc.cniNetInvestment;
    const totalCost = calc.totalProjectCost;
    const annualSav = calc.annualSavings;
    const payback = calc.paybackYears;

    // SVG Waterfall Chart dimensions
    const svgW = 670;
    const svgH = 175;
    const maxBarVal = Math.max(totalCost * 1.05, 100000);
    
    // Bar heights & offsets
    const calcBarHeight = (val) => Math.max(4, Math.round((val / maxBarVal) * 115));
    const hTotal = calcBarHeight(totalCost);
    const hTax = calcBarHeight(taxShield);
    const hGst = calcBarHeight(gstItc);
    const hSav = calcBarHeight(annualSav);
    const hNet = calcBarHeight(netInv);

    // Depreciation Schedule Rows
    const schedRowsHtml = (calc.cniDepreciationSchedule || []).map(r => `
      <tr>
        <td style="font-weight: 700; text-align: center;">Year ${r.year}</td>
        <td>${SolarCalculator.formatINR(r.openingWdv).replace("₹ ", "")}</td>
        <td>${SolarCalculator.formatINR(r.depreciation).replace("₹ ", "")}</td>
        <td style="color: #0284c7; font-weight: 700;">${SolarCalculator.formatINR(r.taxSaved).replace("₹ ", "")}</td>
        <td style="color: #15803d; font-weight: 700;">${SolarCalculator.formatINR(r.energySavings).replace("₹ ", "")}</td>
        <td>${r.itcClaim > 0 ? SolarCalculator.formatINR(r.itcClaim).replace("₹ ", "") : '-'}</td>
        <td style="font-weight: 800; color: #008852;">${SolarCalculator.formatINR(r.totalBenefit).replace("₹ ", "")}</td>
        <td style="font-weight: 800; color: #0f172a; background: rgba(16, 185, 129, 0.05);">${SolarCalculator.formatINR(r.cumulativeBenefit).replace("₹ ", "")}</td>
      </tr>
    `).join("");

    return `
      <div class="proposal-page" id="proposal-page-cni-tax">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">C&amp;I Financial &amp; Tax Analysis</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area" style="padding-top: 4px;">
          <!-- Top Subtitle -->
          <div style="font-size: 11.5px; color: #334155; margin-bottom: 8px;">
            Comprehensive commercial return model for <strong>${kw} KW C&amp;I Solar Plant</strong> leveraging Section 32 Accelerated Depreciation &amp; GST Input Tax Credit (ITC).
          </div>

          <!-- 4 Key Stat Cards -->
          <div class="cni-tax-grid">
            <div class="cni-tax-card">
              <div class="cni-tax-card-title">40% Depreciation Base</div>
              <div class="cni-tax-card-val">${SolarCalculator.formatINR(adBase)}</div>
              <div class="cni-tax-card-sub">Sec 32 IT Act on Year 1 System Cost</div>
            </div>

            <div class="cni-tax-card highlight-card">
              <div class="cni-tax-card-title" style="color: #0284c7;">Corporate Tax Shield</div>
              <div class="cni-tax-card-val green-text">${SolarCalculator.formatINR(taxShield)}</div>
              <div class="cni-tax-card-sub">Direct Tax Savings (@ ${taxRate}% Tax Bracket)</div>
            </div>

            <div class="cni-tax-card">
              <div class="cni-tax-card-title">GST Input Tax Credit</div>
              <div class="cni-tax-card-val" style="color: #0284c7;">${SolarCalculator.formatINR(gstItc)}</div>
              <div class="cni-tax-card-sub">100% Tax Set-off on Plant GST</div>
            </div>

            <div class="cni-tax-card highlight-card">
              <div class="cni-tax-card-title" style="color: #059669;">Net Capital Outlay</div>
              <div class="cni-tax-card-val" style="color: #008852;">${SolarCalculator.formatINR(netInv)}</div>
              <div class="cni-tax-card-sub">Effective Investment after Tax Benefits</div>
            </div>
          </div>

          <!-- Visual Waterfall / Capital Recovery Graphic -->
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Year 1 Capital Recovery &amp; Tax Cashflow Waterfall</div>
              <div style="font-size: 10px; font-weight: 700; color: #15803d;">Project Payback: ~${payback} Years</div>
            </div>

            <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="auto" style="max-height: 155px; overflow: visible;">
              <!-- Baseline -->
              <line x1="30" y1="135" x2="640" y2="135" stroke="#cbd5e1" stroke-width="1.2" />

              <!-- Bar 1: Total Gross Project Cost -->
              <g transform="translate(45, 0)">
                <rect x="0" y="${135 - hTotal}" width="80" height="${hTotal}" fill="#334155" rx="3" />
                <text x="40" y="${130 - hTotal}" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#1e293b" text-anchor="middle">${SolarCalculator.formatINR(totalCost)}</text>
                <text x="40" y="148" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#475569" text-anchor="middle">Gross CAPEX</text>
              </g>

              <!-- Minus Symbol 1 -->
              <text x="145" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#64748b" text-anchor="middle">−</text>

              <!-- Bar 2: Tax Shield (40% AD) -->
              <g transform="translate(165, 0)">
                <rect x="0" y="${135 - hTax}" width="80" height="${hTax}" fill="#0284c7" rx="3" />
                <text x="40" y="${130 - hTax}" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#0284c7" text-anchor="middle">${SolarCalculator.formatINR(taxShield)}</text>
                <text x="40" y="148" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#0284c7" text-anchor="middle">Tax Shield (40%)</text>
              </g>

              <!-- Minus Symbol 2 -->
              <text x="265" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#64748b" text-anchor="middle">−</text>

              <!-- Bar 3: GST ITC Set-off -->
              <g transform="translate(285, 0)">
                <rect x="0" y="${135 - hGst}" width="80" height="${hGst}" fill="#0d9488" rx="3" />
                <text x="40" y="${130 - hGst}" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#0d9488" text-anchor="middle">${SolarCalculator.formatINR(gstItc)}</text>
                <text x="40" y="148" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#0d9488" text-anchor="middle">GST ITC</text>
              </g>

              <!-- Minus Symbol 3 -->
              <text x="385" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#64748b" text-anchor="middle">−</text>

              <!-- Bar 4: Year 1 Electricity Bill Savings -->
              <g transform="translate(405, 0)">
                <rect x="0" y="${135 - hSav}" width="80" height="${hSav}" fill="#16a34a" rx="3" />
                <text x="40" y="${130 - hSav}" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#16a34a" text-anchor="middle">${SolarCalculator.formatINR(annualSav)}</text>
                <text x="40" y="148" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="#16a34a" text-anchor="middle">Yr 1 Power Sav</text>
              </g>

              <!-- Equals Symbol -->
              <text x="505" y="90" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="800" fill="#64748b" text-anchor="middle">=</text>

              <!-- Bar 5: Net Effective Capital at Risk (End of Yr 1) -->
              <g transform="translate(525, 0)">
                <rect x="0" y="${135 - Math.max(4, hNet - hSav)}" width="85" height="${Math.max(4, hNet - hSav)}" fill="#008852" rx="3" />
                <text x="42" y="${130 - Math.max(4, hNet - hSav)}" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="800" fill="#008852" text-anchor="middle">${SolarCalculator.formatINR(Math.max(0, netInv - annualSav))}</text>
                <text x="42" y="148" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#008852" text-anchor="middle">End Yr 1 Capital</text>
              </g>
            </svg>
          </div>

          <!-- 5-Year Depreciation & Return Schedule Table -->
          <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
            5-Year Accelerated Depreciation Schedule &amp; Cashflow Returns (WDV @ 40%):
          </div>
          <table class="cni-depreciation-table">
            <thead>
              <tr>
                <th style="text-align: center;">Year</th>
                <th>Opening WDV (₹)</th>
                <th>40% AD Base (₹)</th>
                <th>Tax Saved (₹)</th>
                <th>Power Savings (₹)</th>
                <th>GST ITC (₹)</th>
                <th>Annual Inflow (₹)</th>
                <th>Cumulative (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${schedRowsHtml}
            </tbody>
          </table>

          <!-- Statutory Compliance Notes Box -->
          <div class="cni-compliance-box">
            <strong>Statutory &amp; Financial Compliance Summary:</strong><br>
            • <strong>Income Tax Act, 1961 (Section 32):</strong> Solar Photovoltaic Systems are classified under renewable energy assets eligible for 40% Accelerated Depreciation on Written Down Value (WDV).<br>
            • <strong>GST Input Tax Credit (ITC):</strong> Registered C&amp;I businesses can claim 100% of GST paid against output tax liability.<br>
            • <strong>Commercial Grid Tariff:</strong> Evaluated at ₹ ${calc.gridTariff.toFixed(2)}/kWh with average 3.5% annual grid escalation, resulting in full capital recovery in approx. <strong>${payback} Years</strong>.
          </div>
        </div>

        <div class="page-footer-tag">
          <span>C&amp;I Tax Benefits &amp; Financial Analysis</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 8 / 9: TECHNICAL DETAILS & BOQ
  // =========================================================================
  static renderPage8(quote, calc, installerLogo, partnerName, inverterSupplier, companyName, pageNum = 8, totalPages = 10) {
    const kw = calc.kwCapacity;
    const moduleWattage = calc.moduleWattage;
    const numModules = calc.numberOfModules;
    const moduleType = quote.solar?.moduleType !== undefined && quote.solar?.moduleType !== null && quote.solar?.moduleType !== "" ? quote.solar.moduleType : (calc.moduleType || "TOPCON");
    const inverterPhase = calc.inverterPhase;
    const inverterWarranty = calc.inverterWarranty;
    const inverterRatingKw = quote.solar?.inverterRatingKw !== undefined && quote.solar?.inverterRatingKw !== null && quote.solar?.inverterRatingKw !== "" ? quote.solar.inverterRatingKw : (kw <= 10 ? `${kw} kW` : `${kw} kW`);
    const inverterQuantity = quote.solar?.inverterQuantity || "1 No(s)";
    const inverterSpecification = quote.solar?.inverterSpecification !== undefined && quote.solar?.inverterSpecification !== null && quote.solar?.inverterSpecification !== "" ? quote.solar.inverterSpecification : `${inverterRatingKw} ${inverterPhase}`;
    const structureType = calc.structureType;

    return `
      <div class="proposal-page" id="proposal-page-8">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-peach-wave"></div>
        <div class="pdf-bg-green-swoosh"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Technical Details</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <div class="boq-section-title">SOLAR PV MODULE DETAILS</div>
          <table class="boq-table">
            <tr><td>Manufacturer</td><td><strong>${partnerName}</strong></td></tr>
            <tr><td>No. of modules</td><td>${numModules} No(s)</td></tr>
            <tr><td>Type</td><td>${this.escape(moduleType)}</td></tr>
            <tr><td>Wattage of each module*</td><td>${moduleWattage} Wp</td></tr>
            <tr><td>Warranty</td><td>10 year workmanship warranty and 30 year performance warranty (90% up to year 10, 80% up to year 25)</td></tr>
          </table>
          <div style="font-size: 9.5px; color: #64748b; text-align: right; margin-bottom: 5px;">
            *Wattage and number of modules is subject to change, total system size remains unchanged
          </div>

          <div class="boq-section-title">INVERTER DETAILS</div>
          <table class="boq-table">
            <tr><td>Manufacturer</td><td>${inverterSupplier}</td></tr>
            <tr><td>Rating kW per inverter</td><td>${this.escape(inverterRatingKw)}</td></tr>
            <tr><td>Quantity</td><td>${this.escape(inverterQuantity)}</td></tr>
            <tr><td>Inverter Specification</td><td>${this.escape(inverterSpecification)}</td></tr>
            <tr><td>No. of phases</td><td>${inverterPhase}</td></tr>
            <tr><td>Warranty</td><td>${this.escape(inverterWarranty)}</td></tr>
          </table>

          <div class="boq-section-title">MOUNTING STRUCTURE DETAILS</div>
          <table class="boq-table">
            <tr><td>Type</td><td>${this.escape(structureType)}</td></tr>
            <tr><td>Warranty</td><td>10 Years</td></tr>
          </table>

          <div class="boq-section-title">BALANCE OF SYSTEM</div>
          <table class="boq-table">
            <tr><td>AC Cables</td><td>MNRE Approved</td></tr>
            <tr><td>Warranty</td><td>CE UL Certified</td></tr>
            <tr><td>DC Cables</td><td>MNRE Approved</td></tr>
          </table>

          <div style="font-size: 11.5px; font-weight: 700; color: #0f172a; margin-top: 6px;">
            Note: 1. Above BOQ is indicative. It can be changed during design.
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Technical BOQ</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 9 / 10: 10-YEAR SAVINGS TABLE & SCOPE MATRIX
  // =========================================================================
  static renderPage9(quote, calc, installerLogo, companyName, pageNum = 9, totalPages = 10) {
    const tableRowsHtml = calc.yearlyTenYears.map(r => `
      <tr>
        <td><strong>${r.year}</strong></td>
        <td>${r.gridTariff}</td>
        <td>${r.consumption}</td>
        <td>${r.billBefore}</td>
        <td>${r.generation}</td>
        <td style="font-weight: 700; color: #008852;">${r.savings}</td>
        <td style="color: #0284c7; font-weight: 700;">${r.billAfter}</td>
      </tr>
    `).join("");

    return `
      <div class="proposal-page" id="proposal-page-9">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Yearly Solar Savings</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <table class="ten-year-table">
            <thead>
              <tr>
                <th>Years</th>
                <th>Grid Tariff (₹)</th>
                <th>Consumption (Unit)</th>
                <th>Bill Before Solar (₹)</th>
                <th>Solar Generation</th>
                <th>Solar Savings</th>
                <th>Bill After Solar</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="page-main-heading" style="margin-top: 8px; margin-bottom: 3px;">Scope of Work</div>

          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">Customer Scope</div>
          <ol style="padding-left: 18px; font-size: 11px; color: #334155; line-height: 1.35; margin-bottom: 6px;">
            <li>1. Providing safe storage place for material during installation period.</li>
            <li>2. Provide space for to evacuate the solar power</li>
            <li>3. Design/ Drawing approval within 7 days.</li>
          </ol>

          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">Our Scope</div>
          <ol style="padding-left: 18px; font-size: 11px; color: #334155; line-height: 1.35;">
            <li>1. Preparation of Engineering Drawing, Design for solar structure and solar power plant as per relevant IS standard</li>
            <li>2. Supply of Solar Modules, Inverters, Structures, Cables, and Balance of Plant</li>
            <li>3. Installation of structure, solar modules, inverter, AC-DC cable, LT panel etc for solar power plant</li>
            <li>4. Installation of monitoring and controlling system for solar power plant</li>
            <li>5. Commissioning of Solar Power Plant and supply of power to LT panel of SGD</li>
          </ol>
        </div>

        <div class="page-footer-tag">
          <span>Yearly Solar Savings</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // PAGE 10 / 11: PAYMENT DETAILS & ACCEPTANCE
  // =========================================================================
  static renderPage10(quote, calc, installerLogo, companyName, legalEntityName, pageNum = 10, totalPages = 10) {
    const c = quote.client || {};
    const p = quote.paymentDetails || {};
    const s = quote.signatory || {};

    return `
      <div class="proposal-page" id="proposal-page-10">
        <div class="page-top-strip"></div>
        <div class="pdf-bg-green-stripes"></div>
        ${this.getWatermarkSvg()}

        <div class="page-top-header">
          <div class="page-main-heading">Payment Details</div>
          <img src="${installerLogo}" alt="${this.escape(companyName)}" class="k-energy-brand-logo">
        </div>

        <div class="page-content-area">
          <table class="payment-table">
            <tr>
              <td>Payment Terms:</td>
              <td>
                <ol style="padding-left: 16px; margin: 0; line-height: 1.3;">
                  <li>1. 20% of the amount payable as advance along with Formal PO.</li>
                  <li>2. 65% of the amount payable upon feasibility approval or on delivery of material at site whichever is earlier.</li>
                  <li>3. Balance 15% amount payable on the first day of the Site installation.</li>
                  <li>4. Subsidiary amount will be processed after successful commissioning of project and subjected to in-principal approval received from government.</li>
                  <li>5. For Loan customer is required to pay 20% as down payment and rest will be processed by CreditFair (Tata Authorized Financial Service).</li>
                </ol>
              </td>
            </tr>
            <tr>
              <td>Bank Details:</td>
              <td>
                <div>Bank: <strong>${this.escape(p.bankName || "ICICI BANK")}</strong></div>
                <div>A/C <strong>${this.escape(p.accountNumber || "38205006367")}</strong></div>
                <div>IFSC Code: <strong>${this.escape(p.routingOrIfsc || "ICIC0000382")}</strong></div>
                <div>Bank Address: ${this.escape(p.notes || "Banjara Hills, Road No 12, Hyderabad: 500034")}</div>
              </td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin: 6px 0 2px;">Completion Period:</div>
          <p style="font-size: 11px; color: #334155; line-height: 1.3; margin-bottom: 6px;">
            ${this.escape(legalEntityName)} shall complete the Design, Supply, Installation, Testing and Commissioning for this Solar PV Power Plant Project within 3 months from the date of Contract Signing and subject to issuance of Advance Payment and Government Approval.
          </p>

          <div style="font-size: 12px; font-weight: 800; color: #008852; margin: 5px 0 2px;">Force Majeure Conditions:</div>
          <p style="font-size: 9.5px; color: #475569; line-height: 1.3; margin-bottom: 6px;">
            Force majeure shall mean any cause, existing or future, which is beyond the reasonable control of ${this.escape(legalEntityName)} including, but not limited to, acts of God, storm, fire, floods, explosion, epidemics, quarantine, earthquake, strike, riot, lock out, embargo, interference by civil or military authorities, acts, regulations or orders of any governmental authority in their sovereign capacity, acts of war (declared or undeclared) including any acts of terrorism, and all other such acts of similar or analogous nature (where all such acts to be collectively referred to as "Force Majeure"). ${this.escape(legalEntityName)} shall not be liable for the failure to perform any obligation in terms of this Proposal if and to such extent such failure is caused by a Force Majeure, provided that none of such acts of Force Majeure will relieve the Customer from meeting its payment obligations.
          </p>

          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 8px; margin-bottom: 12px;">Signature of Acceptance:</div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${this.escape(c.name || "Mr.Sathish")}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 600;">(Client's Signature and Seal)</div>
            </div>

            <div class="signature-line-block">
              ${s.signatureUrl ? `<img src="${s.signatureUrl}" alt="Signature" class="sign-img">` : `<div style="height: 35px;"></div>`}
              <div class="sign-title">
                <div>${this.escape(s.name || "Authorized Signatory")}</div>
                <div style="font-size: 10px; font-weight: 500; color: #64748b;">${this.escape(s.title || legalEntityName)}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="page-footer-tag">
          <span>Payment Details &amp; Terms</span>
          <span>Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    `;
  }

  static escape(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
