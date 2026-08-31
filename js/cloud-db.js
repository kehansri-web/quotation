/**
 * QuoteCraft Pro - Universal Cloud Database Engine (GitHub Pages & Serverless Ready)
 * 
 * Enables GitHub Pages (and standalone web hosts) to read and write quotations
 * to a central cloud database in real-time across all sales reps and admin.
 * 
 * Supports:
 * 1. Supabase (Free PostgreSQL Cloud REST API - Recommended for GitHub Pages)
 * 2. Custom Python Backend (http://localhost:8899)
 * 3. LocalStorage & Offline Fallback
 */

class CloudDatabaseEngine {
  constructor() {
    this.defaultCloudUrl = "https://bvxyzsmveauqcpbnfgdt.supabase.co";
    this.defaultCloudKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2eHl6c212ZWF1cWNwYm5mZ2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODgyOTcsImV4cCI6MjEwMzc2NDI5N30.QuKpVpUgMSghV9ZWuB2b6006MV16-G2EHk0-Th3LDjI";

    let storedUrl = localStorage.getItem("quotecraft_cloud_url");
    let storedKey = localStorage.getItem("quotecraft_cloud_key");

    if (!storedUrl || storedUrl.includes("hqxmbjcdiexydqnxpcyp")) {
      storedUrl = this.defaultCloudUrl;
      localStorage.setItem("quotecraft_cloud_url", this.defaultCloudUrl);
    }
    if (!storedKey || storedKey.includes("hqxmbjcdiexydqnxpcyp")) {
      storedKey = this.defaultCloudKey;
      localStorage.setItem("quotecraft_cloud_key", this.defaultCloudKey);
    }

    this.cloudUrl = storedUrl;
    this.cloudKey = storedKey;
    this.provider = this.cloudUrl ? "supabase" : "local";
  }

  getApiBase() {
    if (window.location.protocol === "file:" || !window.location.host) {
      return "http://localhost:8899";
    }
    return "";
  }

  normalizeSupabaseUrl(rawUrl) {
    if (!rawUrl) return "";
    let url = String(rawUrl).trim();

    // If user copied dashboard URL: https://supabase.com/dashboard/project/abcdefghijklmnopq
    const dashMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
    if (dashMatch && dashMatch[1]) {
      return `https://${dashMatch[1]}.supabase.co`;
    }

    // If user just typed the project ref ID e.g. "qzwrtxvbnmkj"
    if (/^[a-z0-9]{15,25}$/i.test(url)) {
      return `https://${url}.supabase.co`;
    }

    // Ensure http(s) protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Strip trailing paths like /rest/v1, /rest/v1/, etc.
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`;
    } catch (e) {
      return url.replace(/\/+(rest(\/v\d+)?)?\/?$/, "").replace(/\/+$/, "");
    }
  }

  isCloudConfigured() {
    return !!(this.cloudUrl && this.cloudKey);
  }

  setCloudCredentials(url, key) {
    this.cloudUrl = this.normalizeSupabaseUrl(url);
    this.cloudKey = (key || "").trim();
    if (this.cloudUrl && this.cloudKey) {
      localStorage.setItem("quotecraft_cloud_url", this.cloudUrl);
      localStorage.setItem("quotecraft_cloud_key", this.cloudKey);
      this.provider = "supabase";
    } else {
      localStorage.removeItem("quotecraft_cloud_url");
      localStorage.removeItem("quotecraft_cloud_key");
      this.provider = "local";
    }
  }

  getSupabaseHeaders() {
    return {
      "Content-Type": "application/json",
      "apikey": this.cloudKey,
      "Authorization": `Bearer ${this.cloudKey}`,
      "Prefer": "return=representation,resolution=merge-duplicates"
    };
  }

  /**
   * Tests connection to the cloud database
   */
  async testConnection() {
    if (!this.isCloudConfigured()) return { success: false, message: "Cloud credentials not configured" };

    try {
      // 1. Test company_config endpoint
      let resp = await fetch(`${this.cloudUrl}/rest/v1/company_config?select=*&limit=1`, {
        headers: this.getSupabaseHeaders()
      });
      if (resp.ok) {
        return { success: true, message: "Cloud Database Connected Successfully" };
      }

      // 2. Test quotes endpoint
      resp = await fetch(`${this.cloudUrl}/rest/v1/quotes?select=*&limit=1`, {
        headers: this.getSupabaseHeaders()
      });
      if (resp.ok) {
        return { success: true, message: "Cloud Database Connected Successfully" };
      }

      // 3. Test root OpenAPI endpoint
      resp = await fetch(`${this.cloudUrl}/rest/v1/`, {
        headers: this.getSupabaseHeaders()
      });
      if (resp.ok) {
        return { 
          success: false, 
          message: "Connected to Supabase project, but tables are missing. Please run the SQL Setup Script in Supabase SQL Editor." 
        };
      }

      if (resp.status === 404) {
        return { 
          success: false, 
          message: `HTTP 404: Supabase Project endpoint not found. Verify your Project URL (should look like https://yourproject.supabase.co)` 
        };
      }
      if (resp.status === 401 || resp.status === 403) {
        return { 
          success: false, 
          message: `HTTP ${resp.status}: Invalid Anon API Key. Please copy the anon public key from Project Settings > API.` 
        };
      }

      return { success: false, message: `Connection returned HTTP ${resp.status}` };
    } catch (e) {
      return { success: false, message: e.message || "Network error connecting to cloud database" };
    }
  }

  /**
   * Fetches official locked company & bank details
   */
  async fetchCompanyConfig() {
    // 1. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        const resp = await fetch(`${this.cloudUrl}/rest/v1/company_config?id=eq.1&select=*`, {
          headers: this.getSupabaseHeaders()
        });
        if (resp.ok) {
          const rows = await resp.json();
          if (Array.isArray(rows) && rows.length > 0) {
            return { success: true, config: rows[0] };
          }
        }
      } catch (e) {
        console.warn("Cloud DB fetch error, falling back...");
      }
    }

    // 2. Try Python Backend Server if available
    try {
      const resp = await fetch(this.getApiBase() + "/api/config");
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.config) {
          return { success: true, config: data.config };
        }
      }
    } catch (e) {}

    // 3. Local Storage / Default Constants Fallback
    const local = localStorage.getItem("quotecraft_master_config");
    if (local) {
      try {
        return { success: true, config: JSON.parse(local) };
      } catch (e) {}
    }

    return {
      success: true,
      config: {
        bank_label: "KehanSri Solar (Primary)",
        bank_name: "ICICI BANK",
        account_name: "KehanSri Solar",
        account_number: "38205006367",
        ifsc_code: "ICIC0000382",
        branch_address: "Banjara Hills, Road No 12, Hyderabad: 500034",

        bank2_label: "K Energy Solutions (2nd Company)",
        bank2_name: "HDFC BANK LTD",
        bank2_account_name: "K Energy Solutions",
        bank2_account_number: "50200088991122",
        bank2_ifsc_code: "HDFC0000456",
        bank2_branch_address: "Gachibowli Main Branch, Hyderabad: 500032",

        company_name: "KehanSri Solar",
        company_email: "sales@kehansrisolar.com",
        company_phone: "+91 9493858086",
        company_address: "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081"
      }
    };
  }

  /**
   * Saves master company & bank details (Admin Only)
   */
  async saveCompanyConfig(configData, token = null) {
    // Save to local storage cache immediately
    localStorage.setItem("quotecraft_master_config", JSON.stringify(configData));

    // 1. Try Supabase Cloud Database
    if (this.isCloudConfigured()) {
      try {
        const payload = {
          id: 1,
          bank_label: configData.bankLabel || configData.bank_label,
          bank_name: configData.bankName || configData.bank_name,
          account_name: configData.accountName || configData.account_name,
          account_number: configData.accountNumber || configData.account_number,
          ifsc_code: configData.routingOrIfsc || configData.ifsc_code,
          branch_address: configData.branchAddress || configData.branch_address,

          bank2_label: configData.bank2Label || configData.bank2_label,
          bank2_name: configData.bank2Name || configData.bank2_name,
          bank2_account_name: configData.bank2AccountName || configData.bank2_account_name,
          bank2_account_number: configData.bank2AccountNumber || configData.bank2_account_number,
          bank2_ifsc_code: configData.bank2RoutingOrIfsc || configData.bank2_ifsc_code,
          bank2_branch_address: configData.bank2BranchAddress || configData.bank2_branch_address,

          company_name: configData.companyName || configData.company_name,
          company_email: configData.companyEmail || configData.company_email,
          company_phone: configData.companyPhone || configData.company_phone,
          company_address: configData.companyAddress || configData.company_address,
          updated_at: new Date().toISOString()
        };

        const resp = await fetch(`${this.cloudUrl}/rest/v1/company_config?id=eq.1`, {
          method: "PATCH",
          headers: {
            ...this.getSupabaseHeaders(),
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          return { success: true, message: "Saved to Cloud Database & Local Storage", config: payload };
        }
      } catch (e) {
        console.warn("Cloud DB save error:", e);
      }
    }

    // 2. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(configData)
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {}

    return { success: true, message: "Saved locally (Offline Mode)", config: configData };
  }

  /**
   * Saves / Syncs a quotation generated by a salesperson
   */
  async saveQuote(quote) {
    const qid = String(quote.id || ("QT-" + Math.floor(100000 + Math.random() * 900000)));
    const qnum = String(quote.quoteNumber || qid);
    const c = quote.client || {};
    const s = quote.solar || {};
    const b = quote.business || {};

    const client_name = c.name || "Unnamed Client";
    const client_phone = c.phone || "";
    const client_email = c.email || "";
    const client_addr = c.billingAddress || "";
    const kw = parseFloat(s.kwCapacity || 5);
    const brand = String(s.partnerBrand || "adani");
    const structure = String(s.structureType || "Elevated");
    const cost = parseFloat(s.customSystemCost || (kw * parseFloat(s.costPerKw || 55000)));
    const subsidy = (s.customSubsidy !== null && s.customSubsidy !== undefined && String(s.customSubsidy).trim() !== "") ? (parseFloat(s.customSubsidy) || 0) : 0;
    const net_cost = Math.max(cost - subsidy, 0);
    const sales_rep = b.preparedByName || b.name || "Sales Rep";
    const sales_username = b.salesUsername || window.adminAuth?.username || sessionStorage.getItem("quotecraft_auth_user") || "SALES";
    const installer_brand = b.brandPreset || s.installerBrand || "kehansri";
    const customer_type = s.customerType || "residential";
    const system_type = s.systemType || "on-grid";

    const record = {
      id: qid,
      quote_number: qnum,
      client_name,
      client_phone,
      client_email,
      client_address: client_addr,
      kw_capacity: kw,
      partner_brand: brand,
      structure_type: structure,
      total_cost: cost,
      subsidy,
      net_cost,
      sales_rep,
      sales_username,
      installer_brand,
      customer_type,
      system_type,
      status: "Generated",
      quote_json: JSON.stringify(quote),
      created_at: new Date().toISOString()
    };

    // Save locally (User-Scoped Cache)
    const localQuotes = this.getLocalQuotes();
    const existingIdx = localQuotes.findIndex(q => q.id === qid);
    if (existingIdx >= 0) {
      localQuotes[existingIdx] = record;
    } else {
      localQuotes.unshift(record);
    }
    try {
      localStorage.setItem(this.getLocalQuotesCacheKey(), JSON.stringify(localQuotes));
    } catch (e) {}

    // 1. Try Supabase Cloud Database
    if (this.isCloudConfigured()) {
      try {
        const resp = await fetch(`${this.cloudUrl}/rest/v1/quotes`, {
          method: "POST",
          headers: {
            ...this.getSupabaseHeaders(),
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(record)
        });
        if (resp.ok) {
          return { success: true, id: qid, syncedTo: "cloud" };
        }
      } catch (e) {
        console.warn("Cloud DB sync failed, cached locally.");
      }
    }

    // 2. Try Python Backend Server
    try {
      const headers = { "Content-Type": "application/json" };
      const authToken = (window.adminAuth && window.adminAuth.token) ? window.adminAuth.token : token;
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const resp = await fetch(this.getApiBase() + "/api/quotes", {
        method: "POST",
        headers,
        body: JSON.stringify({ quote })
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      console.warn("Server DB sync error:", e);
    }

    return { success: true, id: qid, syncedTo: "local" };
  }

  /**
   * Fetches quotations for the current user (user-isolated on backend)
   */
  async fetchUserQuotes(token = null) {
    const authToken = token || window.adminAuth?.token;
    return await this.fetchAllQuotes("", authToken);
  }

  /**
   * Fetches single quotation by ID with strict ownership validation
   */
  async fetchQuoteById(id, token = null) {
    const authToken = token || window.adminAuth?.token;
    try {
      const resp = await fetch(`${this.getApiBase()}/api/quotes/${encodeURIComponent(id)}`, {
        headers: { "Authorization": authToken ? `Bearer ${authToken}` : "" }
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        return { success: true, quote: data.quote, record: data.record };
      } else {
        return { success: false, error: data.error || "Failed to load quotation", status: resp.status };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Fetches all quotations for the Admin Portal (Alias for fetchAllQuotes)
   */
  async fetchQuotes(filterOptions = "", token = null) {
    const authToken = token || window.adminAuth?.token;
    return await this.fetchAllQuotes(filterOptions, authToken);
  }

  /**
   * Fetches all quotations (User-isolated for sales users, all for admin)
   */
  async fetchAllQuotes(filterOptions = "", token = null) {
    const authToken = token || window.adminAuth?.token;
    let search = "";
    let startDate = "";
    let endDate = "";
    let salesRep = "";

    if (typeof filterOptions === "string") {
      search = filterOptions.trim();
    } else if (filterOptions && typeof filterOptions === "object") {
      search = (filterOptions.search || "").trim();
      startDate = (filterOptions.startDate || filterOptions.start_date || "").trim();
      endDate = (filterOptions.endDate || filterOptions.end_date || "").trim();
      salesRep = (filterOptions.salesRep || filterOptions.sales_rep || "").trim();
    }

    const queryParams = new URLSearchParams();
    if (search) queryParams.set("search", search);
    if (startDate) queryParams.set("start_date", startDate);
    if (endDate) queryParams.set("end_date", endDate);
    if (salesRep && salesRep.toLowerCase() !== "all") queryParams.set("sales_rep", salesRep);

    const queryString = queryParams.toString();

    // 1. Try Python Backend Server
    try {
      const url = `${this.getApiBase()}/api/quotes${queryString ? '?' + queryString : ''}`;
      const resp = await fetch(url, {
        headers: { "Authorization": authToken ? `Bearer ${authToken}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.quotes) {
          try {
            localStorage.setItem(this.getLocalQuotesCacheKey(), JSON.stringify(data.quotes));
          } catch (e) {}
          return { success: true, quotes: data.quotes, count: data.count || data.quotes.length, source: "server" };
        }
      }
    } catch (e) {}

    // 2. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        let url = `${this.cloudUrl}/rest/v1/quotes?select=*&order=created_at.desc&limit=500`;
        if (search) {
          url += `&or=(client_name.ilike.*${encodeURIComponent(search)}*,quote_number.ilike.*${encodeURIComponent(search)}*,client_phone.ilike.*${encodeURIComponent(search)}*)`;
        }
        if (startDate) {
          url += `&created_at=gte.${startDate}T00:00:00`;
        }
        if (endDate) {
          url += `&created_at=lte.${endDate}T23:59:59`;
        }
        if (salesRep && salesRep.toLowerCase() !== "all") {
          url += `&sales_rep=eq.${encodeURIComponent(salesRep)}`;
        }
        const resp = await fetch(url, {
          headers: this.getSupabaseHeaders()
        });
        if (resp.ok) {
          const quotes = await resp.json();
          localStorage.setItem("quotecraft_cloud_quotes_cache", JSON.stringify(quotes));
          return { success: true, quotes, count: quotes.length, source: "cloud" };
        }
      } catch (e) {
        console.warn("Failed fetching from cloud database:", e);
      }
    }

    // 3. Fallback to Local Storage Quotes
    let localQuotes = this.getLocalQuotes();
    if (search) {
      const q = search.toLowerCase();
      localQuotes = localQuotes.filter(item => 
        (item.client_name && item.client_name.toLowerCase().includes(q)) ||
        (item.quote_number && item.quote_number.toLowerCase().includes(q)) ||
        (item.client_phone && item.client_phone.toLowerCase().includes(q)) ||
        (item.sales_rep && item.sales_rep.toLowerCase().includes(q))
      );
    }
    if (salesRep && salesRep.toLowerCase() !== "all") {
      const repLower = salesRep.toLowerCase();
      localQuotes = localQuotes.filter(item => item.sales_rep && item.sales_rep.toLowerCase() === repLower);
    }
    if (startDate) {
      localQuotes = localQuotes.filter(item => {
        const rawDate = item.created_at || item.createdAt || "";
        const d = rawDate ? rawDate.split("T")[0].split(" ")[0] : "";
        return d ? d >= startDate : true;
      });
    }
    if (endDate) {
      localQuotes = localQuotes.filter(item => {
        const rawDate = item.created_at || item.createdAt || "";
        const d = rawDate ? rawDate.split("T")[0].split(" ")[0] : "";
        return d ? d <= endDate : true;
      });
    }

    return { success: true, quotes: localQuotes, count: localQuotes.length, source: "local" };
  }

  /**
   * Fetches pipeline analytics and statistics
   */
  async fetchStats(token = null) {
    // 1. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/stats", {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.stats) {
          return { success: true, stats: data.stats };
        }
      }
    } catch (e) {}

    // 2. Fallback to Local Quotes calculation
    const localQuotes = this.getLocalQuotes();
    const totalCost = localQuotes.reduce((acc, q) => acc + (q.total_cost || 0), 0);
    const totalNet = localQuotes.reduce((acc, q) => acc + (q.net_cost || 0), 0);
    const totalKw = localQuotes.reduce((acc, q) => acc + (q.kw_capacity || 0), 0);

    const repsMap = {};
    localQuotes.forEach(q => {
      const r = q.sales_rep || "Direct";
      if (!repsMap[r]) repsMap[r] = { sales_rep: r, quote_count: 0, total_kw: 0 };
      repsMap[r].quote_count += 1;
      repsMap[r].total_kw += (q.kw_capacity || 0);
    });

    return {
      success: true,
      stats: {
        totalQuotes: localQuotes.length,
        totalKw: Math.round(totalKw * 10) / 10,
        totalRevenue: totalCost,
        totalNetRevenue: totalNet,
        salesReps: Object.values(repsMap)
      }
    };
  }

  /**
   * Deletes a quotation (Admin Only)
   */
  async deleteQuote(id, token = null) {
    if (!token && window.adminAuth?.token) {
      token = window.adminAuth.token;
    }

    // 1. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + `/api/admin/quotes/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      const data = await resp.json();
      if (!resp.ok && !data.success) {
        return { success: false, error: data.error || "Permission denied" };
      }
    } catch (e) {
      console.warn("Backend quote delete error:", e);
    }

    // Remove locally
    let localQuotes = this.getLocalQuotes().filter(q => q.id !== id);
    localStorage.setItem("quotecraft_cloud_quotes_cache", JSON.stringify(localQuotes));
    if (typeof state !== "undefined") {
      state.deleteFromHistory(id);
    }

    // 2. Try Supabase Cloud Database
    if (this.isCloudConfigured()) {
      try {
        await fetch(`${this.cloudUrl}/rest/v1/quotes?id=eq.${id}`, {
          method: "DELETE",
          headers: this.getSupabaseHeaders()
        });
      } catch (e) {}
    }

    return { success: true };
  }

  // =========================================================================
  // USER MANAGEMENT METHODS (Admin Only)
  // =========================================================================

  /**
   * Fetches all sales staff and admin users
   */
  async fetchUsers(token = null) {
    // 1. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/users", {
        headers: { "Authorization": token ? `Bearer ${token}` : "" }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.users) {
          localStorage.setItem("quotecraft_users_cache", JSON.stringify(data.users));
          return { success: true, users: data.users, count: data.users.length, source: "server" };
        }
      }
    } catch (e) {}

    // 2. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        const resp = await fetch(`${this.cloudUrl}/rest/v1/users?select=id,username,display_name,role,phone,email,is_active,created_at&order=created_at.asc`, {
          headers: this.getSupabaseHeaders()
        });
        if (resp.ok) {
          const users = await resp.json();
          localStorage.setItem("quotecraft_users_cache", JSON.stringify(users));
          return { success: true, users, count: users.length, source: "cloud" };
        }
      } catch (e) {}
    }

    // 3. Fallback to Local Storage Users
    const localUsers = this.getLocalUsers();
    return { success: true, users: localUsers, count: localUsers.length, source: "local" };
  }

  /**
   * Computes SHA-256 hex string for a given text
   */
  async hashPassword(password) {
    if (!password) return "";
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {}
    return password;
  }

  /**
   * Authenticates a user against Supabase Cloud DB or local cache on GitHub Pages
   */
  async authenticateUser(username, password) {
    const rawUser = (username || "").trim();
    const rawPass = (password || "").trim();
    if (!rawUser || !rawPass) {
      return { success: false, message: "Username and password are required." };
    }

    const hashedInput = await this.hashPassword(rawPass);

    // 1. Check Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        const resp = await fetch(`${this.cloudUrl}/rest/v1/users?username=ilike.${encodeURIComponent(rawUser)}&select=*`, {
          headers: this.getSupabaseHeaders()
        });
        if (resp.ok) {
          const rows = await resp.json();
          if (rows && rows.length > 0) {
            const user = rows[0];
            if (user.is_active === 0) {
              return { success: false, message: "This user account has been deactivated. Please contact administrator." };
            }

            const storedHash = user.password_hash || "";
            // Match against plain text, SHA-256 hash, or lowercase comparison
            const match = (
              storedHash === rawPass ||
              storedHash === hashedInput ||
              storedHash.toLowerCase() === hashedInput.toLowerCase() ||
              (rawUser.toUpperCase() === "ADMIN" && rawPass === "kehansri888") ||
              (rawUser.toUpperCase() === "SALES" && rawPass === "sales888")
            );

            if (match) {
              return {
                success: true,
                role: user.role || "sales",
                username: user.username,
                displayName: user.display_name || user.username,
                token: "cloud_session_" + btoa(user.id + "_" + Date.now()),
                message: `Welcome, ${user.display_name || user.username}!`
              };
            }
          }
        }
      } catch (e) {
        console.warn("Cloud authenticate error:", e);
      }
    }

    // 2. Check Local Users Cache
    const localUsers = this.getLocalUsers();
    const found = localUsers.find(u => (u.username || "").toLowerCase() === rawUser.toLowerCase());
    if (found) {
      if (found.is_active === 0) {
        return { success: false, message: "This user account has been deactivated." };
      }
      const stored = found.password_hash || found.password || "";
      if (
        stored === rawPass ||
        stored === hashedInput ||
        stored.toLowerCase() === hashedInput.toLowerCase() ||
        (rawUser.toUpperCase() === "ADMIN" && rawPass === "kehansri888") ||
        (rawUser.toUpperCase() === "SALES" && rawPass === "sales888")
      ) {
        return {
          success: true,
          role: found.role || "sales",
          username: found.username,
          displayName: found.display_name || found.username,
          token: "local_session_" + btoa((found.id || "usr") + "_" + Date.now()),
          message: `Welcome, ${found.display_name || found.username}!`
        };
      }
    }

    // 3. Built-in Master Fallbacks (Always available)
    if (rawUser.toUpperCase() === "ADMIN" && rawPass === "kehansri888") {
      return {
        success: true,
        role: "admin",
        username: "ADMIN",
        displayName: "Administrator",
        token: "master_admin_session_" + Date.now(),
        message: "Admin Portal Unlocked!"
      };
    }

    if (rawUser.toUpperCase() === "SALES" && rawPass === "sales888") {
      return {
        success: true,
        role: "sales",
        username: "SALES",
        displayName: "Sales Executive",
        token: "master_sales_session_" + Date.now(),
        message: "Welcome to Sales Portal!"
      };
    }

    return { success: false, message: "Invalid Username or Password. Please check and try again." };
  }

  /**
   * Creates a new sales staff user account
   */
  async createUser(userData, token = null) {
    const rawPass = userData.password || "sales888";
    const hashedPass = await this.hashPassword(rawPass);

    const newUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 11),
      username: (userData.username || "").trim(),
      display_name: userData.displayName || userData.name || userData.username,
      password_hash: hashedPass,
      role: userData.role || "sales",
      phone: userData.phone || "",
      email: userData.email || "",
      is_active: 1,
      created_at: new Date().toISOString()
    };

    // 1. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        const resp = await fetch(`${this.cloudUrl}/rest/v1/users`, {
          method: "POST",
          headers: {
            ...this.getSupabaseHeaders(),
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(newUser)
        });
        if (resp.ok) {
          const localUsers = this.getLocalUsers();
          localUsers.push(newUser);
          localStorage.setItem("quotecraft_users_cache", JSON.stringify(localUsers));
          return { success: true, user: newUser, message: `Sales account for '${newUser.display_name}' created on Cloud Database!` };
        }
      } catch (e) {
        console.warn("Cloud DB create user error:", e);
      }
    }

    // 2. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ ...userData, password_hash: hashedPass })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          return data;
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        return { success: false, error: errData.error || "Failed to create user on server" };
      }
    } catch (e) {}

    // 3. Local Fallback
    const localUsers = this.getLocalUsers();
    const existing = localUsers.find(u => (u.username || "").toLowerCase() === (userData.username || "").toLowerCase());
    if (existing) {
      return { success: false, error: `Username '${userData.username}' already exists.` };
    }

    localUsers.push(newUser);
    localStorage.setItem("quotecraft_users_cache", JSON.stringify(localUsers));
    return { success: true, user: newUser, message: `Sales account for '${newUser.display_name}' created locally.` };
  }

  /**
   * Updates an existing user account (Username, Display Name, Password, Role, Phone, Email)
   */
  async updateUser(userData, token = null) {
    if (!token && window.adminAuth?.token) {
      token = window.adminAuth.token;
    }

    let hashedPass = null;
    if (userData.password) {
      hashedPass = await this.hashPassword(userData.password);
    }

    // 1. Try Supabase Cloud Database if configured (PRIORITY for GitHub Pages & Cloud)
    if (this.isCloudConfigured()) {
      try {
        const patchData = {
          username: userData.username,
          display_name: userData.displayName || userData.name,
          phone: userData.phone || "",
          email: userData.email || "",
          role: userData.role || "sales"
        };
        if (hashedPass) {
          patchData.password_hash = hashedPass;
        }
        await fetch(`${this.cloudUrl}/rest/v1/users?id=eq.${userData.id}`, {
          method: "PATCH",
          headers: {
            ...this.getSupabaseHeaders(),
            "Prefer": "return=representation"
          },
          body: JSON.stringify(patchData)
        });
      } catch (e) {
        console.warn("Cloud DB updateUser error:", e);
      }
    }

    // 2. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/users/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ ...userData, password_hash: hashedPass })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        return data;
      }
    } catch (e) {
      // Backend unavailable on GitHub Pages
    }

    // 3. Local Fallback
    const localUsers = this.getLocalUsers();
    const idx = localUsers.findIndex(u => u.id === userData.id || (u.username && u.username.toLowerCase() === (userData.username || "").toLowerCase()));
    if (idx !== -1) {
      localUsers[idx].username = userData.username || localUsers[idx].username;
      localUsers[idx].display_name = userData.displayName || localUsers[idx].display_name;
      localUsers[idx].phone = userData.phone !== undefined ? userData.phone : localUsers[idx].phone;
      localUsers[idx].email = userData.email !== undefined ? userData.email : localUsers[idx].email;
      localUsers[idx].role = userData.role || localUsers[idx].role;
      if (hashedPass) {
        localUsers[idx].password_hash = hashedPass;
        localUsers[idx].password = userData.password;
      }
      localStorage.setItem("quotecraft_users_cache", JSON.stringify(localUsers));
    }

    return { success: true, message: `Account '${userData.username}' updated successfully!` };
  }

  /**
   * Deletes a sales staff user account
   */
  async deleteUser(userId, token = null) {
    // 1. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        await fetch(`${this.cloudUrl}/rest/v1/users?id=eq.${userId}`, {
          method: "DELETE",
          headers: this.getSupabaseHeaders()
        });
      } catch (e) {}
    }

    // 2. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ id: userId })
      });
      if (resp.ok) {
        const data = await resp.json();
        return data;
      }
    } catch (e) {}

    // 3. Local Fallback
    let localUsers = this.getLocalUsers();
    localUsers = localUsers.filter(u => u.id !== userId && u.username !== "ADMIN");
    localStorage.setItem("quotecraft_users_cache", JSON.stringify(localUsers));
    return { success: true, message: "Sales account deleted successfully." };
  }

  /**
   * Resets password for a user
   */
  async resetUserPassword(userId, newPassword, token = null) {
    const hashedPass = await this.hashPassword(newPassword);

    // 1. Try Supabase Cloud Database if configured
    if (this.isCloudConfigured()) {
      try {
        await fetch(`${this.cloudUrl}/rest/v1/users?id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            ...this.getSupabaseHeaders(),
            "Prefer": "return=representation"
          },
          body: JSON.stringify({ password_hash: hashedPass })
        });
      } catch (e) {}
    }

    // 2. Try Python Backend Server
    try {
      const resp = await fetch(this.getApiBase() + "/api/admin/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ id: userId, newPassword })
      });
      if (resp.ok) {
        const data = await resp.json();
        return data;
      }
    } catch (e) {}

    // 3. Local Fallback
    let localUsers = this.getLocalUsers();
    const user = localUsers.find(u => u.id === userId);
    if (user) {
      user.password_hash = hashedPass;
      user.password = newPassword;
      localStorage.setItem("quotecraft_users_cache", JSON.stringify(localUsers));
      return { success: true, message: "Password updated successfully!" };
    }
    return { success: false, error: "User not found" };
  }

  getLocalUsers() {
    try {
      const saved = localStorage.getItem("quotecraft_users_cache");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default seeded users
    return [
      { id: "usr_admin_master", username: "ADMIN", display_name: "Administrator", role: "admin", created_at: new Date().toISOString() },
      { id: "usr_sales_default", username: "SALES", display_name: "Sales Executive", role: "sales", phone: "+91 9493858086", created_at: new Date().toISOString() }
    ];
  }

  getLocalQuotesCacheKey() {
    const user = (window.adminAuth?.username || sessionStorage.getItem("quotecraft_auth_user") || "default").toLowerCase();
    return `quotecraft_cloud_quotes_cache_${user}`;
  }

  getLocalQuotes() {
    try {
      const saved = localStorage.getItem(this.getLocalQuotesCacheKey()) || localStorage.getItem("quotecraft_cloud_quotes_cache");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
}

// Global Cloud Database Engine Instance
window.cloudDb = new CloudDatabaseEngine();
