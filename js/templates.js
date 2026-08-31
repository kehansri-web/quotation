/**
 * QuoteCraft Pro - Dynamic Quotation & Solar Proposal Document Templates
 */

class QuotationTemplateRenderer {
  /**
   * Main render function that delegates to Solar 10-page Proposal or General Templates
   */
  static render(quote) {
    if (quote.mode === "solar" || !quote.mode) {
      return SolarProposalRenderer.render(quote);
    }

    const calc = QuotationCalculator.calculateQuotation(quote);
    const templateId = quote.template || "template-modern";
    const palette = quote.palette || "emerald";

    let innerHtml = "";
    switch (templateId) {
      case "template-tech":
        innerHtml = this.renderTechTemplate(quote, calc);
        break;
      case "template-classic":
        innerHtml = this.renderClassicTemplate(quote, calc);
        break;
      case "template-executive":
        innerHtml = this.renderExecutiveTemplate(quote, calc);
        break;
      case "template-modern":
      default:
        innerHtml = this.renderModernTemplate(quote, calc);
        break;
    }

    return `<div class="quotation-paper ${templateId}" data-palette="${palette}">${innerHtml}</div>`;
  }

  // ==========================================
  // 1. MODERN MINIMAL TEMPLATE (GENERAL QUOTES)
  // ==========================================
  static renderModernTemplate(quote, calc) {
    const sym = quote.currencySymbol || "₹";
    const cur = quote.currency || "INR";
    const b = quote.business || {};
    const c = quote.client || {};
    const p = quote.paymentDetails || {};
    const s = quote.signatory || {};

    const itemsRows = calc.items.map((item, idx) => `
      <tr class="item-row">
        <td style="width: 5%;"><strong>${idx + 1}</strong></td>
        <td style="width: 45%;">
          <div class="item-title">${this.escapeHtml(item.name || "Item " + (idx + 1))}</div>
          ${item.description ? `<div class="item-desc">${this.escapeHtml(item.description)}</div>` : ""}
        </td>
        <td class="text-center" style="width: 12%;">${item.quantity} <span style="font-size: 10px; color: var(--doc-muted);">${this.escapeHtml(item.unit || "")}</span></td>
        <td class="text-right" style="width: 13%;">${QuotationCalculator.formatCurrency(item.unitPrice, sym, cur)}</td>
        <td class="text-center" style="width: 10%;">${item.discount > 0 ? item.discount + "%" : "-"}</td>
        <td class="text-right" style="width: 15%;"><strong>${QuotationCalculator.formatCurrency(item.lineTotal, sym, cur)}</strong></td>
      </tr>
    `).join("");

    return `
      <!-- Header -->
      <div class="doc-header">
        <div>
          ${b.logoUrl ? `<img src="${b.logoUrl}" alt="Logo" class="business-logo">` : ""}
          <div class="business-name">${this.escapeHtml(b.name || "Company Name")}</div>
          ${b.tagline ? `<div style="font-size: 11px; font-weight: 600; color: var(--primary-color); margin-bottom: 4px;">${this.escapeHtml(b.tagline)}</div>` : ""}
          <div class="business-details">
            ${b.address ? `<div>${this.escapeHtml(b.address).replace(/\n/g, "<br>")}</div>` : ""}
            ${b.email ? `<div>Email: ${this.escapeHtml(b.email)}</div>` : ""}
            ${b.phone ? `<div>Phone: ${this.escapeHtml(b.phone)}</div>` : ""}
            ${b.website ? `<div>Web: ${this.escapeHtml(b.website)}</div>` : ""}
            ${b.taxId ? `<div>Tax ID / GST: <strong>${this.escapeHtml(b.taxId)}</strong></div>` : ""}
          </div>
        </div>

        <div class="doc-meta-box">
          <div class="doc-title">QUOTATION</div>
          <div class="meta-grid">
            <span class="meta-label">Quote No:</span>
            <span class="meta-value">${this.escapeHtml(quote.quoteNumber || "QT-001")}</span>

            <span class="meta-label">Date:</span>
            <span class="meta-value">${this.escapeHtml(quote.issueDate || "")}</span>

            <span class="meta-label">Valid Until:</span>
            <span class="meta-value">${this.escapeHtml(quote.validUntil || "")}</span>

            ${quote.poReference ? `
              <span class="meta-label">PO Ref:</span>
              <span class="meta-value">${this.escapeHtml(quote.poReference)}</span>
            ` : ""}
          </div>
          <div>
            <span class="status-pill">${this.escapeHtml(quote.status || "Draft")}</span>
          </div>
        </div>
      </div>

      <!-- Client Details -->
      <div class="client-section">
        <div>
          <div class="section-heading">QUOTATION FOR / CLIENT:</div>
          <div class="client-name">${this.escapeHtml(c.name || "Valued Client")}</div>
          ${c.company ? `<div style="font-weight: 600; font-size: 12px; color: var(--doc-text); margin-bottom: 2px;">${this.escapeHtml(c.company)}</div>` : ""}
          <div class="client-details">
            ${c.billingAddress ? `<div>${this.escapeHtml(c.billingAddress).replace(/\n/g, "<br>")}</div>` : ""}
            ${c.email ? `<div>Email: ${this.escapeHtml(c.email)}</div>` : ""}
            ${c.phone ? `<div>Phone: ${this.escapeHtml(c.phone)}</div>` : ""}
            ${c.taxId ? `<div>Tax ID: ${this.escapeHtml(c.taxId)}</div>` : ""}
          </div>
        </div>

        <div>
          <div class="section-heading">TOTAL AMOUNT PAYABLE:</div>
          <div style="font-size: 24px; font-weight: 800; color: var(--primary-color); margin: 4px 0;">
            ${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}
          </div>
          <div style="font-size: 11px; color: var(--doc-muted); font-style: italic;">
            ${QuotationCalculator.numberToWords(calc.grandTotal, cur)}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item & Description</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-center">Disc.</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals & Notes Section -->
      <div class="summary-footer-grid">
        <div class="notes-column">
          ${quote.notes ? `
            <div class="info-card">
              <strong style="color: var(--primary-color); display: block; margin-bottom: 3px;">NOTES & HIGHLIGHTS:</strong>
              ${this.escapeHtml(quote.notes).replace(/\n/g, "<br>")}
            </div>
          ` : ""}

          ${quote.terms ? `
            <div class="info-card">
              <strong style="color: var(--doc-text); display: block; margin-bottom: 3px;">TERMS & CONDITIONS:</strong>
              ${this.escapeHtml(quote.terms).replace(/\n/g, "<br>")}
            </div>
          ` : ""}
        </div>

        <div>
          <table class="totals-table">
            <tr>
              <td class="label">Subtotal:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.subtotal, sym, cur)}</td>
            </tr>
            ${calc.totalDiscountAll > 0 ? `
              <tr>
                <td class="label">Total Discount:</td>
                <td class="amount" style="color: #059669;">-${QuotationCalculator.formatCurrency(calc.totalDiscountAll, sym, cur)}</td>
              </tr>
            ` : ""}
            ${calc.taxesTotal > 0 ? `
              <tr>
                <td class="label">Estimated Tax:</td>
                <td class="amount">+${QuotationCalculator.formatCurrency(calc.taxesTotal, sym, cur)}</td>
              </tr>
            ` : ""}
            <tr class="grand-total-row">
              <td class="label" style="font-weight: 800; color: var(--primary-dark);">GRAND TOTAL:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Bank & Signature Section -->
      <div class="bottom-section">
        <div class="bank-details-box">
          <div class="bank-title">PAYMENT / BANK DETAILS</div>
          ${p.bankName ? `<div>Bank: <strong>${this.escapeHtml(p.bankName)}</strong></div>` : ""}
          ${p.accountNumber ? `<div>Account No: <strong>${this.escapeHtml(p.accountNumber)}</strong></div>` : ""}
          ${p.routingOrIfsc ? `<div>IFSC / Routing: <strong>${this.escapeHtml(p.routingOrIfsc)}</strong></div>` : ""}
          ${p.upiId ? `<div>UPI: <strong>${this.escapeHtml(p.upiId)}</strong></div>` : ""}
          ${!p.bankName && !p.accountNumber && !p.routingOrIfsc && !p.upiId ? `<div style="font-style: italic; font-size: 11px;">Bank details available on request</div>` : ""}
        </div>

        <div class="signature-box">
          ${s.signatureUrl ? `<img src="${s.signatureUrl}" alt="Signature" class="signature-img">` : `<div style="height: 36px;"></div>`}
          <div class="signature-line">
            <div>${this.escapeHtml(s.name || "Authorized Signatory")}</div>
            ${s.title || b.name ? `<div style="font-size: 10px; font-weight: 500; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(s.title || b.name)}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 2. TECH NEO-GRADIENT TEMPLATE
  // ==========================================
  static renderTechTemplate(quote, calc) {
    const sym = quote.currencySymbol || "₹";
    const cur = quote.currency || "INR";
    const b = quote.business || {};
    const c = quote.client || {};
    const p = quote.paymentDetails || {};
    const s = quote.signatory || {};

    const itemsRows = calc.items.map((item, idx) => `
      <tr>
        <td style="width: 5%;"><strong>${idx + 1}</strong></td>
        <td style="width: 45%;">
          <div style="font-weight: 700; color: var(--doc-text);">${this.escapeHtml(item.name || "Item " + (idx + 1))}</div>
          ${item.description ? `<div style="font-size: 11px; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(item.description)}</div>` : ""}
        </td>
        <td style="text-align: center; width: 12%;">${item.quantity} <span style="font-size: 10px; color: var(--doc-muted);">${this.escapeHtml(item.unit || "")}</span></td>
        <td style="text-align: right; width: 13%;">${QuotationCalculator.formatCurrency(item.unitPrice, sym, cur)}</td>
        <td style="text-align: center; width: 10%;">${item.discount > 0 ? item.discount + "%" : "-"}</td>
        <td style="text-align: right; width: 15%; font-weight: 700;">${QuotationCalculator.formatCurrency(item.lineTotal, sym, cur)}</td>
      </tr>
    `).join("");

    return `
      <!-- Tech Banner Header -->
      <div class="tech-banner">
        <div>
          ${b.logoUrl ? `<img src="${b.logoUrl}" alt="Logo" style="max-height: 48px; margin-bottom: 8px; filter: brightness(0) invert(1);">` : ""}
          <div class="business-name">${this.escapeHtml(b.name || "Company Name")}</div>
          <div class="business-details">
            ${b.address ? `<div>${this.escapeHtml(b.address).replace(/\n/g, ", ")}</div>` : ""}
            ${b.email ? `<span>Email: ${this.escapeHtml(b.email)}</span>` : ""}
            ${b.phone ? ` &bull; <span>Tel: ${this.escapeHtml(b.phone)}</span>` : ""}
          </div>
        </div>

        <div class="doc-title-box">
          <div class="doc-title">QUOTATION</div>
          <div class="quote-num-badge">${this.escapeHtml(quote.quoteNumber || "QT-001")}</div>
        </div>
      </div>

      <!-- Meta Cards Row -->
      <div class="meta-cards-row">
        <div class="meta-card">
          <div class="meta-card-label">PREPARED FOR</div>
          <div class="meta-card-value">${this.escapeHtml(c.name || "Valued Client")}</div>
          ${c.company ? `<div style="font-size: 11px; color: var(--doc-muted);">${this.escapeHtml(c.company)}</div>` : ""}
          ${c.phone ? `<div style="font-size: 11px; color: var(--doc-muted);">${this.escapeHtml(c.phone)}</div>` : ""}
        </div>

        <div class="meta-card">
          <div class="meta-card-label">ISSUE DATE</div>
          <div class="meta-card-value">${this.escapeHtml(quote.issueDate || "")}</div>
          <div class="meta-card-label" style="margin-top: 8px;">VALID UNTIL</div>
          <div class="meta-card-value">${this.escapeHtml(quote.validUntil || "")}</div>
        </div>

        <div class="meta-card" style="background: var(--primary-light); border-color: var(--primary-color);">
          <div class="meta-card-label">TOTAL AMOUNT</div>
          <div style="font-size: 20px; font-weight: 900; color: var(--primary-dark);">
            ${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}
          </div>
          <div style="font-size: 10px; color: var(--doc-muted); margin-top: 2px;">
            ${QuotationCalculator.numberToWords(calc.grandTotal, cur)}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item & Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: center;">Disc.</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Summary & Notes -->
      <div class="summary-footer-grid">
        <div class="notes-column">
          ${quote.notes ? `
            <div class="info-card">
              <strong style="color: var(--primary-color); display: block; margin-bottom: 3px;">NOTES:</strong>
              ${this.escapeHtml(quote.notes).replace(/\n/g, "<br>")}
            </div>
          ` : ""}
          ${quote.terms ? `
            <div class="info-card">
              <strong style="color: var(--doc-text); display: block; margin-bottom: 3px;">TERMS:</strong>
              ${this.escapeHtml(quote.terms).replace(/\n/g, "<br>")}
            </div>
          ` : ""}
        </div>

        <div>
          <table class="totals-table">
            <tr>
              <td class="label">Subtotal:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.subtotal, sym, cur)}</td>
            </tr>
            ${calc.totalDiscountAll > 0 ? `
              <tr>
                <td class="label">Total Discount:</td>
                <td class="amount" style="color: #059669;">-${QuotationCalculator.formatCurrency(calc.totalDiscountAll, sym, cur)}</td>
              </tr>
            ` : ""}
            ${calc.taxesTotal > 0 ? `
              <tr>
                <td class="label">Tax:</td>
                <td class="amount">+${QuotationCalculator.formatCurrency(calc.taxesTotal, sym, cur)}</td>
              </tr>
            ` : ""}
            <tr class="grand-total-row">
              <td class="label" style="font-weight: 800; color: var(--primary-dark);">GRAND TOTAL:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Bottom Signature & Bank Box -->
      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--doc-border); display: flex; justify-content: space-between; align-items: flex-end;">
        <div class="bank-details-box">
          <div class="bank-title">PAYMENT / BANK DETAILS</div>
          ${p.bankName ? `<div>Bank: <strong>${this.escapeHtml(p.bankName)}</strong></div>` : ""}
          ${p.accountNumber ? `<div>A/C No: <strong>${this.escapeHtml(p.accountNumber)}</strong></div>` : ""}
          ${p.routingOrIfsc ? `<div>IFSC: <strong>${this.escapeHtml(p.routingOrIfsc)}</strong></div>` : ""}
        </div>

        <div class="signature-box" style="text-align: center; min-width: 180px;">
          ${s.signatureUrl ? `<img src="${s.signatureUrl}" alt="Signature" style="max-height: 44px; margin-bottom: 4px;">` : `<div style="height: 35px;"></div>`}
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 11px; font-weight: 700; color: var(--doc-text);">
            <div>${this.escapeHtml(s.name || "Authorized Signatory")}</div>
            ${s.title || b.name ? `<div style="font-size: 10px; font-weight: 500; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(s.title || b.name)}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 3. CLASSIC CORPORATE TEMPLATE
  // ==========================================
  static renderClassicTemplate(quote, calc) {
    const sym = quote.currencySymbol || "₹";
    const cur = quote.currency || "INR";
    const b = quote.business || {};
    const c = quote.client || {};
    const p = quote.paymentDetails || {};
    const s = quote.signatory || {};

    const itemsRows = calc.items.map((item, idx) => `
      <tr>
        <td style="text-align: center; width: 5%;"><strong>${idx + 1}</strong></td>
        <td style="width: 45%;">
          <div style="font-weight: 700;">${this.escapeHtml(item.name || "Item " + (idx + 1))}</div>
          ${item.description ? `<div style="font-size: 11px; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(item.description)}</div>` : ""}
        </td>
        <td style="text-align: center; width: 12%;">${item.quantity} ${this.escapeHtml(item.unit || "")}</td>
        <td style="text-align: right; width: 13%;">${QuotationCalculator.formatCurrency(item.unitPrice, sym, cur)}</td>
        <td style="text-align: center; width: 10%;">${item.discount > 0 ? item.discount + "%" : "-"}</td>
        <td style="text-align: right; width: 15%; font-weight: 700;">${QuotationCalculator.formatCurrency(item.lineTotal, sym, cur)}</td>
      </tr>
    `).join("");

    return `
      <!-- Classic Header -->
      <div class="classic-header">
        <div>
          ${b.logoUrl ? `<img src="${b.logoUrl}" alt="Logo" class="business-logo" style="max-height: 50px; margin-bottom: 6px;">` : ""}
          <div style="font-size: 20px; font-weight: 800; color: var(--primary-dark);">${this.escapeHtml(b.name || "Company Name")}</div>
          <div style="font-size: 11.5px; color: var(--doc-muted); line-height: 1.4; margin-top: 4px;">
            ${b.address ? `<div>${this.escapeHtml(b.address).replace(/\n/g, "<br>")}</div>` : ""}
            ${b.email ? `<div>Email: ${this.escapeHtml(b.email)} | Phone: ${this.escapeHtml(b.phone || "")}</div>` : ""}
            ${b.taxId ? `<div>GST/Tax ID: <strong>${this.escapeHtml(b.taxId)}</strong></div>` : ""}
          </div>
        </div>

        <div style="text-align: right;">
          <div class="classic-title">QUOTATION</div>
          <div style="font-size: 12px; margin-top: 6px; line-height: 1.5;">
            <div>Quote No: <strong>${this.escapeHtml(quote.quoteNumber || "QT-001")}</strong></div>
            <div>Date: ${this.escapeHtml(quote.issueDate || "")}</div>
            <div>Valid Till: ${this.escapeHtml(quote.validUntil || "")}</div>
          </div>
        </div>
      </div>

      <!-- Classic 2 Column Grid -->
      <div class="classic-grid-2">
        <div class="box-border">
          <div class="box-title">CUSTOMER / CLIENT DETAILS</div>
          <div style="font-weight: 700; font-size: 13px; color: var(--doc-text);">${this.escapeHtml(c.name || "Valued Client")}</div>
          ${c.company ? `<div style="font-weight: 600; color: var(--doc-muted);">${this.escapeHtml(c.company)}</div>` : ""}
          <div style="font-size: 11.5px; color: var(--doc-muted); margin-top: 4px; line-height: 1.4;">
            ${c.billingAddress ? `<div>${this.escapeHtml(c.billingAddress).replace(/\n/g, "<br>")}</div>` : ""}
            ${c.email ? `<div>Email: ${this.escapeHtml(c.email)}</div>` : ""}
            ${c.phone ? `<div>Phone: ${this.escapeHtml(c.phone)}</div>` : ""}
          </div>
        </div>

        <div class="box-border">
          <div class="box-title">PAYMENT & BANK DETAILS</div>
          <div style="font-size: 11.5px; color: var(--doc-text); line-height: 1.5;">
            ${p.bankName ? `<div>Bank Name: <strong>${this.escapeHtml(p.bankName)}</strong></div>` : ""}
            ${p.accountNumber ? `<div>Account Number: <strong>${this.escapeHtml(p.accountNumber)}</strong></div>` : ""}
            ${p.routingOrIfsc ? `<div>IFSC / NEFT: <strong>${this.escapeHtml(p.routingOrIfsc)}</strong></div>` : ""}
            ${p.upiId ? `<div>UPI ID: <strong>${this.escapeHtml(p.upiId)}</strong></div>` : ""}
            ${!p.bankName && !p.accountNumber ? `<div style="font-style: italic; color: var(--doc-muted);">Details provided upon order confirmation.</div>` : ""}
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align: center;">#</th>
            <th>Item & Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: center;">Discount</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <!-- Totals & Notes -->
      <div class="summary-footer-grid">
        <div class="notes-column">
          ${quote.notes ? `
            <div class="info-card">
              <strong style="color: var(--doc-text); display: block; margin-bottom: 3px;">NOTES:</strong>
              ${this.escapeHtml(quote.notes).replace(/\n/g, "<br>")}
            </div>
          ` : ""}
          ${quote.terms ? `
            <div class="info-card">
              <strong style="color: var(--doc-text); display: block; margin-bottom: 3px;">TERMS & CONDITIONS:</strong>
              ${this.escapeHtml(quote.terms).replace(/\n/g, "<br>")}
            </div>
          ` : ""}
        </div>

        <div>
          <table class="totals-table">
            <tr>
              <td class="label">Subtotal:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.subtotal, sym, cur)}</td>
            </tr>
            ${calc.totalDiscountAll > 0 ? `
              <tr>
                <td class="label">Total Discount:</td>
                <td class="amount" style="color: #059669;">-${QuotationCalculator.formatCurrency(calc.totalDiscountAll, sym, cur)}</td>
              </tr>
            ` : ""}
            ${calc.taxesTotal > 0 ? `
              <tr>
                <td class="label">Taxes:</td>
                <td class="amount">+${QuotationCalculator.formatCurrency(calc.taxesTotal, sym, cur)}</td>
              </tr>
            ` : ""}
            <tr class="grand-total-row">
              <td class="label" style="font-weight: 800; color: var(--primary-dark);">TOTAL AMOUNT:</td>
              <td class="amount">${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Signature Section -->
      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--doc-border); display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="font-size: 11px; color: var(--doc-muted); font-style: italic;">
          Amount in words: <strong>${QuotationCalculator.numberToWords(calc.grandTotal, cur)}</strong>
        </div>

        <div style="text-align: center; min-width: 180px;">
          ${s.signatureUrl ? `<img src="${s.signatureUrl}" alt="Signature" style="max-height: 45px; margin-bottom: 4px;">` : `<div style="height: 35px;"></div>`}
          <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 11.5px; font-weight: 700; color: var(--doc-text);">
            <div>${this.escapeHtml(s.name || "Authorized Signatory")}</div>
            ${s.title || b.name ? `<div style="font-size: 10px; font-weight: 500; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(s.title || b.name)}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // 4. EXECUTIVE SLATE TEMPLATE
  // ==========================================
  static renderExecutiveTemplate(quote, calc) {
    const sym = quote.currencySymbol || "₹";
    const cur = quote.currency || "INR";
    const b = quote.business || {};
    const c = quote.client || {};
    const p = quote.paymentDetails || {};
    const s = quote.signatory || {};

    const itemsRows = calc.items.map((item, idx) => `
      <tr>
        <td style="width: 5%; font-weight: 700;">${idx + 1}</td>
        <td style="width: 45%;">
          <div style="font-weight: 700; color: var(--doc-text);">${this.escapeHtml(item.name || "Item " + (idx + 1))}</div>
          ${item.description ? `<div style="font-size: 11px; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(item.description)}</div>` : ""}
        </td>
        <td style="text-align: center; width: 12%;">${item.quantity} ${this.escapeHtml(item.unit || "")}</td>
        <td style="text-align: right; width: 13%;">${QuotationCalculator.formatCurrency(item.unitPrice, sym, cur)}</td>
        <td style="text-align: center; width: 10%;">${item.discount > 0 ? item.discount + "%" : "-"}</td>
        <td style="text-align: right; width: 15%; font-weight: 700;">${QuotationCalculator.formatCurrency(item.lineTotal, sym, cur)}</td>
      </tr>
    `).join("");

    return `
      <!-- Sidebar -->
      <div class="exec-sidebar">
        <div>
          ${b.logoUrl ? `<img src="${b.logoUrl}" alt="Logo" style="max-height: 50px; margin-bottom: 10px;">` : ""}
          <div class="business-name">${this.escapeHtml(b.name || "Company Name")}</div>
          ${b.tagline ? `<div style="font-size: 11px; color: var(--primary-color); font-weight: 600; margin-top: 2px;">${this.escapeHtml(b.tagline)}</div>` : ""}
        </div>

        <div>
          <div class="sidebar-heading">CONTACT INFO</div>
          <div class="sidebar-text">
            ${b.address ? `<div>${this.escapeHtml(b.address).replace(/\n/g, "<br>")}</div>` : ""}
            ${b.email ? `<div>Email: ${this.escapeHtml(b.email)}</div>` : ""}
            ${b.phone ? `<div>Phone: ${this.escapeHtml(b.phone)}</div>` : ""}
            ${b.website ? `<div>Web: ${this.escapeHtml(b.website)}</div>` : ""}
            ${b.taxId ? `<div>GST/Tax: ${this.escapeHtml(b.taxId)}</div>` : ""}
          </div>
        </div>

        <div>
          <div class="sidebar-heading">QUOTATION TO</div>
          <div class="sidebar-text">
            <div style="font-weight: 700; color: var(--primary-dark);">${this.escapeHtml(c.name || "Valued Client")}</div>
            ${c.company ? `<div>${this.escapeHtml(c.company)}</div>` : ""}
            ${c.billingAddress ? `<div>${this.escapeHtml(c.billingAddress).replace(/\n/g, "<br>")}</div>` : ""}
            ${c.email ? `<div>${this.escapeHtml(c.email)}</div>` : ""}
            ${c.phone ? `<div>${this.escapeHtml(c.phone)}</div>` : ""}
          </div>
        </div>

        ${p.bankName ? `
          <div>
            <div class="sidebar-heading">BANK DETAILS</div>
            <div class="sidebar-text">
              <div>Bank: <strong>${this.escapeHtml(p.bankName)}</strong></div>
              <div>A/C: ${this.escapeHtml(p.accountNumber || "")}</div>
              <div>IFSC: ${this.escapeHtml(p.routingOrIfsc || "")}</div>
            </div>
          </div>
        ` : ""}
      </div>

      <!-- Main Content Area -->
      <div class="exec-main">
        <div>
          <div class="exec-header">
            <div>
              <div class="exec-title">QUOTATION</div>
              <div style="font-size: 12px; color: var(--doc-muted); margin-top: 2px;">
                Reference: <strong>${this.escapeHtml(quote.quoteNumber || "QT-001")}</strong>
              </div>
            </div>

            <div style="text-align: right; font-size: 12px;">
              <div>Date: <strong>${this.escapeHtml(quote.issueDate || "")}</strong></div>
              <div>Valid Until: <strong>${this.escapeHtml(quote.validUntil || "")}</strong></div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item & Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Disc.</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <div>
          <!-- Summary & Totals -->
          <div class="summary-footer-grid">
            <div class="notes-column">
              ${quote.notes ? `
                <div class="info-card">
                  <strong style="color: var(--primary-color); display: block; margin-bottom: 3px;">NOTES:</strong>
                  ${this.escapeHtml(quote.notes).replace(/\n/g, "<br>")}
                </div>
              ` : ""}
              ${quote.terms ? `
                <div class="info-card">
                  <strong style="color: var(--doc-text); display: block; margin-bottom: 3px;">TERMS:</strong>
                  ${this.escapeHtml(quote.terms).replace(/\n/g, "<br>")}
                </div>
              ` : ""}
            </div>

            <div>
              <table class="totals-table">
                <tr>
                  <td class="label">Subtotal:</td>
                  <td class="amount">${QuotationCalculator.formatCurrency(calc.subtotal, sym, cur)}</td>
                </tr>
                ${calc.totalDiscountAll > 0 ? `
                  <tr>
                    <td class="label">Discount:</td>
                    <td class="amount" style="color: #059669;">-${QuotationCalculator.formatCurrency(calc.totalDiscountAll, sym, cur)}</td>
                  </tr>
                ` : ""}
                ${calc.taxesTotal > 0 ? `
                  <tr>
                    <td class="label">Tax:</td>
                    <td class="amount">+${QuotationCalculator.formatCurrency(calc.taxesTotal, sym, cur)}</td>
                  </tr>
                ` : ""}
                <tr class="grand-total-row">
                  <td class="label" style="font-weight: 800; color: var(--primary-dark);">GRAND TOTAL:</td>
                  <td class="amount">${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Bottom Signature -->
          <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--doc-border); display: flex; justify-content: space-between; align-items: flex-end;">
            <div style="font-size: 11px; color: var(--doc-muted); font-style: italic;">
              ${QuotationCalculator.numberToWords(calc.grandTotal, cur)}
            </div>

            <div style="text-align: center; min-width: 180px;">
              ${s.signatureUrl ? `<img src="${s.signatureUrl}" alt="Signature" style="max-height: 45px; margin-bottom: 4px;">` : `<div style="height: 35px;"></div>`}
              <div style="border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 11.5px; font-weight: 700; color: var(--doc-text);">
                <div>${this.escapeHtml(s.name || "Authorized Signatory")}</div>
                ${s.title || b.name ? `<div style="font-size: 10px; font-weight: 500; color: var(--doc-muted); margin-top: 2px;">${this.escapeHtml(s.title || b.name)}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static escapeHtml(str) {
    return SolarProposalRenderer.escape(str);
  }
}
