/**
 * QuoteCraft Pro - WhatsApp Sharing & Messaging Engine for Solar Proposals
 */

class WhatsAppSender {
  /**
   * Generates a beautifully structured WhatsApp message text with emojis and formatting
   */
  static generateMessage(quote) {
    const isSolar = quote.mode === "solar";

    if (isSolar) {
      const calc = SolarCalculator.calculate(quote.solar || {});
      const b = quote.business || {};
      const c = quote.client || {};
      let brandName = "ADANI Power Solar";
      if (quote.solar?.partnerBrand === "waaree") brandName = "WAAREE Solar";
      else if (quote.solar?.partnerBrand === "tata") brandName = "TATA Power Solar";

      const clientName = c.name || "Sir / Madam";
      const kw = calc.kwCapacity;

      let msg = `☀️ *${kw} KW SOLAR ON-GRID PROPOSAL*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `*${b.name || "KehanSri Solar"}*\n\n`;
      msg += `Dear *${clientName}*,\n\n`;
      msg += `Thank you for choosing us for your solar transition. Here is your customized *${kw} KW On-Grid Solar System* summary:\n\n`;
      
      msg += `📋 *Quotation Ref:* \`${quote.quoteNumber || "QT-2026-0842"}\`\n`;
      msg += `⚡ *Plant Capacity:* *${kw} KW*\n`;
      msg += `🏭 *Solar Modules:* *${brandName}* (${calc.numberOfModules} Nos × ${calc.moduleWattage}W TOPCON)\n`;
      msg += `🔌 *Inverter:* *${calc.inverterRating} ${calc.inverterPhase}*\n`;
      msg += `⏳ *Payback Period:* *~${calc.paybackYears} Years*\n\n`;

      msg += `📊 *GENERATION & SAVINGS:*\n`;
      msg += `• Average Yearly Generation: *${calc.annualGeneration.toLocaleString("en-IN")} Units*\n`;
      msg += `• Average Annual Savings: *${SolarCalculator.formatINR(calc.annualSavings)}*\n`;
      msg += `• Monthly Estimated Savings: *${SolarCalculator.formatINR(calc.monthlyAverageSavings)}*\n`;
      msg += `• 25-Year Life Estimated ROI\n\n`;

      msg += `💰 *COMMERCIAL BREAKDOWN:*\n`;
      msg += `• Total Project Cost: *${SolarCalculator.formatINR(calc.totalProjectCost)}*\n`;
      msg += `• MNRE / PM Surya Ghar Subsidy: *${SolarCalculator.formatINR(calc.mnreSubsidy)}* (Direct DBT)\n`;
      msg += `• *EFFECTIVE NET COST:* *${SolarCalculator.formatINR(calc.effectiveNetCost)}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (quote.paymentDetails?.bankName) {
        msg += `💳 *Bank Payment Details:*\n`;
        msg += `• Bank: ${quote.paymentDetails.bankName}\n`;
        msg += `• A/C No: ${quote.paymentDetails.accountNumber}\n`;
        msg += `• IFSC: ${quote.paymentDetails.routingOrIfsc}\n\n`;
      }

      msg += `📄 *Detailed 10-Page Proposal PDF:* Attached with technical specifications, BOQ, safety standards & 25-year charts.\n\n`;
      msg += `Please let us know if you have any questions or to proceed with site survey.\n\n`;
      msg += `Best regards,\n`;
      msg += `*${b.name || "K Energy Solutions"}*\n`;
      if (b.phone) msg += `📞 ${b.phone}\n`;
      if (b.email) msg += `✉️ ${b.email}\n`;
      if (b.website) msg += `🌐 ${b.website}\n`;

      return msg;
    }

    // Fallback for general quotation
    const calc = QuotationCalculator.calculateQuotation(quote);
    const sym = quote.currencySymbol || "$";
    const cur = quote.currency || "USD";
    const b = quote.business || {};
    const c = quote.client || {};

    let msg = `*QUOTATION FROM ${b.name?.toUpperCase() || "TEAM"}*\n\n`;
    msg += `Hello *${c.name || "Valued Client"}*,\n`;
    msg += `Ref: ${quote.quoteNumber}\n`;
    msg += `Total: *${QuotationCalculator.formatCurrency(calc.grandTotal, sym, cur)}*\n\n`;
    return msg;
  }

  static cleanPhoneNumber(phone) {
    if (!phone) return "";
    let clean = phone.replace(/[^0-9+]/g, "");
    if (clean.startsWith("+")) {
      clean = clean.substring(1);
    }
    return clean;
  }

  static getWhatsAppUrl(phone, message) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const encoded = encodeURIComponent(message);
    
    if (cleanPhone) {
      return `https://wa.me/${cleanPhone}?text=${encoded}`;
    }
    return `https://api.whatsapp.com/send?text=${encoded}`;
  }

  static sendWhatsApp(phone, message) {
    const url = this.getWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  static async shareViaWebShare(quote, pdfBlob = null) {
    const message = this.generateMessage(quote);
    const quoteNum = quote.quoteNumber || "Solar_Proposal";

    if (navigator.share) {
      try {
        const shareData = {
          title: `Solar Proposal ${quoteNum}`,
          text: message
        };

        if (pdfBlob && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], `${quoteNum}.pdf`, { type: 'application/pdf' })] })) {
          const file = new File([pdfBlob], `${quoteNum}.pdf`, { type: 'application/pdf' });
          shareData.files = [file];
        }

        await navigator.share(shareData);
        return { success: true };
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Web Share failed:", err);
        }
        return { success: false, error: err };
      }
    } else {
      return { success: false, error: "Web Share API not supported in this browser." };
    }
  }
}
