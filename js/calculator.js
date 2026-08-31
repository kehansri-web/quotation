/**
 * QuoteCraft Pro - Financial Calculations Engine
 */

class QuotationCalculator {
  /**
   * Calculates a single item row's metrics
   */
  static calculateItem(item) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const discountRate = parseFloat(item.discount) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;

    const baseAmount = qty * price;
    const discountAmount = (baseAmount * discountRate) / 100;
    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const taxAmount = (taxableAmount * taxRate) / 100;
    const lineTotal = taxableAmount + taxAmount;

    return {
      baseAmount,
      discountAmount,
      taxableAmount,
      taxAmount,
      lineTotal
    };
  }

  /**
   * Calculates grand summary for an entire quotation object
   */
  static calculateQuotation(quote) {
    const items = quote.items || [];
    let subtotal = 0;
    let itemDiscountsTotal = 0;
    let taxableTotal = 0;
    let taxesTotal = 0;

    const itemResults = items.map(item => {
      const result = this.calculateItem(item);
      subtotal += result.baseAmount;
      itemDiscountsTotal += result.discountAmount;
      taxableTotal += result.taxableAmount;
      taxesTotal += result.taxAmount;
      return { ...item, ...result };
    });

    // Global Discount
    let globalDiscount = 0;
    const discountVal = parseFloat(quote.globalDiscountValue) || 0;
    if (quote.globalDiscountType === "percentage") {
      globalDiscount = (taxableTotal * discountVal) / 100;
    } else {
      globalDiscount = discountVal;
    }

    const shipping = parseFloat(quote.shippingFee) || 0;
    const grandTotal = Math.max(0, taxableTotal - globalDiscount + taxesTotal + shipping);
    const totalDiscountAll = itemDiscountsTotal + globalDiscount;

    return {
      items: itemResults,
      subtotal,
      itemDiscountsTotal,
      globalDiscount,
      totalDiscountAll,
      taxableTotal,
      taxesTotal,
      shipping,
      grandTotal
    };
  }

  /**
   * Formats a numeric value with currency symbol and 2 decimal points
   */
  static formatCurrency(amount, symbol = "$", currencyCode = "USD") {
    const num = parseFloat(amount) || 0;
    let formatted = "";

    try {
      formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    } catch (e) {
      formatted = num.toFixed(2);
    }

    if (currencyCode === "INR") {
      try {
        formatted = new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num);
      } catch (e) {}
    }

    return `${symbol}${formatted}`;
  }

  /**
   * Converts a number to human readable words (English)
   */
  static numberToWords(amount, currency = "USD") {
    const num = Math.floor(Math.abs(amount));
    if (num === 0) return "Zero";

    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function inWords(n) {
      if ((n = n.toString()).length > 9) return 'overflow';
      let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n_arr) return '';
      let str = '';
      str += (n_arr[1] != 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
      str += (n_arr[2] != 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
      str += (n_arr[3] != 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
      str += (n_arr[4] != 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
      str += (n_arr[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) : '';
      return str.trim();
    }

    const words = inWords(num);
    const currName = currency === "INR" ? "Rupees" : (currency === "EUR" ? "Euros" : "Dollars");
    return `${words} ${currName} Only`;
  }
}
