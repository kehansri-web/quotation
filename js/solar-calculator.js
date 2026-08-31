/**
 * QuoteCraft Solar Pro - Solar Engineering & Financial Calculation Engine
 * Dynamic calculations for generation, savings, subsidies, 25-yr projections, and equipment counts.
 */

class SolarCalculator {
  // Monthly solar irradiance factors (Jan to Dec) for Indian subcontinent
  static MONTHLY_FACTORS = [
    { month: "January", factor: 0.075 },
    { month: "February", factor: 0.082 },
    { month: "March", factor: 0.095 },
    { month: "April", factor: 0.098 },
    { month: "May", factor: 0.096 },
    { month: "June", factor: 0.078 },
    { month: "July", factor: 0.070 },
    { month: "August", factor: 0.072 },
    { month: "September", factor: 0.081 },
    { month: "October", factor: 0.088 },
    { month: "November", factor: 0.084 },
    { month: "December", factor: 0.081 }
  ];

  /**
   * Main calculation function
   * @param {Object} params Solar configuration parameters
   * @returns {Object} Full solar metrics, projections, equipment calculations, and C&I tax analysis
   */
  static calculate(params = {}) {
    const customerType = (params.customerType === "commercial" || params.customerType === "cni") ? "commercial" : "residential";
    const systemType = params.systemType || "on-grid"; // "on-grid", "off-grid", "hybrid"
    const kw = Math.max(0.5, parseFloat(params.kwCapacity) || (customerType === "commercial" ? 25 : 5));
    const gridTariff = Math.max(1, parseFloat(params.gridTariff) || (customerType === "commercial" ? 9.50 : 7.50));
    const baseCostPerKw = parseFloat(params.costPerKw) || 55096.42;
    const gstRate = parseFloat(params.gstRate) !== undefined ? parseFloat(params.gstRate) : 8.9;
    const moduleWattage = parseInt(params.moduleWattage) || 620;

    // 1. Generation Metrics (~1,600 units per KW per year)
    const annualGeneration = Math.round(kw * 1600);
    const dailyAverageGeneration = Math.round((annualGeneration / 365) * 10) / 10;
    const annualSavings = Math.round(annualGeneration * gridTariff);

    // 2. Equipment BOQ & Phase
    const autoModules = Math.ceil((kw * 1000) / moduleWattage);
    const numberOfModules = params.customModuleCount ? parseInt(params.customModuleCount) : autoModules;
    const moduleType = (params.moduleType !== undefined && params.moduleType !== null && params.moduleType !== "") ? params.moduleType : "TOPCON";
    const inverterPhase = params.inverterPhase || (kw <= 5 ? "Single Phase" : "Three Phase");
    const inverterWarranty = params.inverterWarranty || "08 Years";
    const inverterRatingKw = params.inverterRatingKw !== undefined && params.inverterRatingKw !== null && params.inverterRatingKw !== "" ? params.inverterRatingKw : (kw <= 10 ? `${kw} kW` : `${kw} kW`);
    const inverterQuantity = params.inverterQuantity ? params.inverterQuantity : "1 No(s)";
    
    // Inverter specification tailored to system type
    let defaultInverterSpec = `${inverterRatingKw} ${inverterPhase}`;
    if (systemType === "hybrid") {
      defaultInverterSpec = `${inverterRatingKw} ${inverterPhase} Hybrid Inverter with Battery Port`;
    } else if (systemType === "off-grid") {
      defaultInverterSpec = `${inverterRatingKw} ${inverterPhase} Off-Grid Inverter with MPPT Charge Controller`;
    }
    const inverterSpecification = params.inverterSpecification !== undefined && params.inverterSpecification !== null && params.inverterSpecification !== "" ? params.inverterSpecification : defaultInverterSpec;
    const structureType = params.structureType || "Standard Galvanized structure(hot dip)";

    // 3. Commercials
    const systemCost = params.customSystemCost ? parseFloat(params.customSystemCost) : Math.round(kw * baseCostPerKw);
    const gstAmount = Math.round((systemCost * gstRate) / 100);
    const totalProjectCost = systemCost + gstAmount;

    // 4. Subsidies (Residential only - PM Surya Ghar: Muft Bijli Yojana)
    let mnreSubsidy = 0;
    if (customerType === "residential") {
      if (params.customSubsidy !== null && params.customSubsidy !== undefined && params.customSubsidy !== "") {
        mnreSubsidy = parseFloat(params.customSubsidy) || 0;
      } else {
        // Standard PM Surya Ghar DBT Subsidy formula
        if (kw <= 1.2) {
          mnreSubsidy = 30000;
        } else if (kw <= 2.2) {
          mnreSubsidy = 60000;
        } else {
          mnreSubsidy = 78000;
        }
      }
    } else {
      // C&I Customers: Zero Government Subsidy as per MNRE regulations
      mnreSubsidy = 0;
    }

    const effectiveNetCost = Math.max(0, totalProjectCost - mnreSubsidy);
    let paybackYears = annualSavings > 0 ? Math.round((effectiveNetCost / annualSavings) * 10) / 10 : 3.7;

    // 5. C&I Specific Tax Benefits & Financial Metrics (Section 32 Income Tax Act & GST ITC)
    const corporateTaxRate = parseFloat(params.cniTaxRate) || 25; // 22%, 25%, 30%
    const claimGstItc = params.claimGstItc !== false; // Default true for businesses
    const adRatePercent = 40; // 40% Accelerated Depreciation

    const year1AdBase = Math.round(systemCost * (adRatePercent / 100));
    const year1TaxShield = Math.round(year1AdBase * (corporateTaxRate / 100));
    const gstItcAmount = claimGstItc ? gstAmount : 0;
    const cniNetInvestment = Math.max(0, totalProjectCost - year1TaxShield - gstItcAmount);
    
    // C&I Payback factoring Year 1 Tax Shield and GST ITC
    const cniFirstYearCashInflow = annualSavings + year1TaxShield + gstItcAmount;
    let cniPaybackYears = 3.0;
    if (annualSavings > 0) {
      if (cniFirstYearCashInflow >= totalProjectCost) {
        cniPaybackYears = Math.round((totalProjectCost / cniFirstYearCashInflow) * 10) / 10;
      } else {
        const remainingCapital = totalProjectCost - cniFirstYearCashInflow;
        cniPaybackYears = Math.round((1 + (remainingCapital / annualSavings)) * 10) / 10;
      }
    }

    if (customerType === "commercial") {
      paybackYears = cniPaybackYears;
    }

    // 5-Year Depreciation & Cashflow Schedule for C&I (WDV Method)
    const cniDepreciationSchedule = [];
    let openingWdv = systemCost;
    let cumulativeTaxSavings = 0;
    let cumulativeTotalBenefit = 0;

    for (let yr = 1; yr <= 5; yr++) {
      const depAmount = Math.round(openingWdv * 0.40);
      const taxSaved = Math.round(depAmount * (corporateTaxRate / 100));
      const yearDeg = Math.max(0.8, 1 - ((yr - 1) * 0.007));
      const energySaved = Math.round(annualSavings * yearDeg);
      const itcClaim = yr === 1 ? gstItcAmount : 0;
      const totalYearBenefit = taxSaved + energySaved + itcClaim;
      cumulativeTaxSavings += taxSaved;
      cumulativeTotalBenefit += totalYearBenefit;
      const closingWdv = openingWdv - depAmount;

      cniDepreciationSchedule.push({
        year: yr,
        openingWdv: openingWdv,
        depreciation: depAmount,
        taxSaved: taxSaved,
        energySavings: energySaved,
        itcClaim: itcClaim,
        totalBenefit: totalYearBenefit,
        cumulativeBenefit: cumulativeTotalBenefit,
        closingWdv: closingWdv
      });

      openingWdv = closingWdv;
    }

    // Monthly Units & Sizing Metrics (If user provided monthly units in C&I)
    const monthlyUnitsInput = parseFloat(params.cniMonthlyUnits) || 0;
    const annualConsumptionUnits = monthlyUnitsInput > 0 ? Math.round(monthlyUnitsInput * 12) : Math.round(annualGeneration * 1.1);
    const recommendedSizingKw = monthlyUnitsInput > 0 ? Math.round((monthlyUnitsInput / 130) * 10) / 10 : kw;
    const solarOffsetPercentage = annualConsumptionUnits > 0 ? Math.min(100, Math.round((annualGeneration / annualConsumptionUnits) * 100)) : 90;
    const monthlyBillBeforeSolar = Math.round((annualConsumptionUnits / 12) * gridTariff);
    const monthlyBillAfterSolar = Math.max(0, Math.round(monthlyBillBeforeSolar - (annualSavings / 12)));

    // 6. Environmental Metrics
    const co2ReductionTonnes = Math.round(kw * 1.6);
    const treesSaved = Math.round(kw * 33.2);

    // 7. Monthly Savings Curve (Jan - Dec)
    const monthlyData = this.MONTHLY_FACTORS.map(m => {
      const units = Math.round(annualGeneration * m.factor);
      const savings = Math.round(units * gridTariff);
      return {
        month: m.month,
        units,
        savings
      };
    });

    // 8. 10-Year Projections Table (Grid inflation ~3% vs PV degradation ~0.7%)
    const yearlyTenYears = [];
    let currentTariff = gridTariff;
    const baseMonthlyBillUnits = Math.round(annualConsumptionUnits / 12);

    for (let yr = 1; yr <= 10; yr++) {
      const degFactor = Math.max(0.8, 1 - ((yr - 1) * 0.007));
      const yearGen = Math.round(annualGeneration * degFactor);
      const yearSavings = Math.round(yearGen * currentTariff);
      const yearConsumption = baseMonthlyBillUnits * 12;
      const billBefore = Math.round(yearConsumption * currentTariff);
      const billAfter = Math.max(0, billBefore - yearSavings);

      yearlyTenYears.push({
        year: yr,
        gridTariff: currentTariff.toFixed(2),
        consumption: yearConsumption.toLocaleString("en-IN"),
        billBefore: billBefore.toLocaleString("en-IN"),
        generation: yearGen.toLocaleString("en-IN"),
        savings: yearSavings.toLocaleString("en-IN"),
        billAfter: billAfter.toLocaleString("en-IN")
      });

      currentTariff = currentTariff * 1.035; // 3.5% annual grid tariff escalation
    }

    // 9. 25-Year Projection Chart (Before vs After)
    const twentyFiveYears = [];
    let t25 = gridTariff;
    for (let y = 1; y <= 25; y++) {
      const deg = Math.max(0.8, 1 - ((y - 1) * 0.0075));
      const g = Math.round(annualGeneration * deg);
      const sav = Math.round(g * t25);
      const billBef = Math.round(baseMonthlyBillUnits * 12 * t25);
      const billAft = Math.max(Math.round(billBef * 0.10), billBef - sav);

      twentyFiveYears.push({
        year: y,
        billBefore: billBef,
        billAfter: billAft,
        savings: sav
      });
      t25 = t25 * 1.03;
    }

    return {
      customerType,
      systemType,
      kwCapacity: kw,
      gridTariff,
      baseCostPerKw,
      gstRate,
      moduleWattage,
      moduleType,
      numberOfModules,
      inverterPhase,
      inverterWarranty,
      inverterRatingKw,
      inverterQuantity,
      inverterSpecification,
      structureType,
      annualGeneration,
      dailyAverageGeneration,
      annualSavings,
      systemCost,
      gstAmount,
      totalProjectCost,
      mnreSubsidy,
      effectiveNetCost,
      paybackYears,
      // C&I Tax & Financial Analysis Data
      corporateTaxRate,
      claimGstItc,
      adRatePercent,
      year1AdBase,
      year1TaxShield,
      gstItcAmount,
      cniNetInvestment,
      cniPaybackYears,
      cniDepreciationSchedule,
      monthlyUnitsInput,
      annualConsumptionUnits,
      recommendedSizingKw,
      solarOffsetPercentage,
      monthlyBillBeforeSolar,
      monthlyBillAfterSolar,
      // Environmental & Graphs
      co2ReductionTonnes,
      treesSaved,
      monthlyData,
      yearlyTenYears,
      twentyFiveYears,
      googleMapsUrl: params.googleMapsUrl || ""
    };
  }

  static formatINR(val) {
    if (val === undefined || val === null || isNaN(val)) return "₹ 0";
    return "₹ " + Math.round(val).toLocaleString("en-IN");
  }
}

