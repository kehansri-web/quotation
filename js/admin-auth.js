/**
 * QuoteCraft Pro - Authentication & Backend Portal Manager
 * 
 * Features:
 * - Full-Screen Auth Gate: First screen seen on visit / logged out state
 * - Salesperson Authentication: Username: SALES | Password: sales888
 * - Admin Authentication: Username: ADMIN | Password: kehansri888
 * - Role-Based Security: Bank details strictly locked for salespersons, editable for Admin
 * - Dual-Mode Support: Python Backend / SQLite DB + Standalone browser / GitHub Pages + Supabase
 * - Sales Workspace & Quotes Sync
 * - Admin Master Configuration & Analytics Hub
 * - Date Range & Salesperson Quotation Filtering
 * - Day-Wise Quotation Reporting & Printable Summaries
 * - Excel (.xlsx / .csv) Data Export Engine
 */

class AdminAuthManager {
  constructor() {
    this.token = sessionStorage.getItem("quotecraft_auth_token") || 
                 localStorage.getItem("quotecraft_auth_token") || 
                 sessionStorage.getItem("quotecraft_admin_token") || null;
    this.role = sessionStorage.getItem("quotecraft_auth_role") || 
                localStorage.getItem("quotecraft_auth_role") || null;
    this.username = sessionStorage.getItem("quotecraft_auth_user") || 
                    localStorage.getItem("quotecraft_auth_user") || null;
    this.displayName = sessionStorage.getItem("quotecraft_auth_display") || 
                       localStorage.getItem("quotecraft_auth_display") || null;

    this.companyConfig = null;
    this.quoteFilters = {
      preset: "all",
      startDate: "",
      endDate: "",
      salesRep: "all",
      search: ""
    };
    this.cachedQuotesList = [];
    this.masterSalesRepsList = new Set(["ADMIN", "SALES"]);
    this._searchDebounce = null;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  get isAdmin() {
    return this.role === "admin";
  }

  get isSales() {
    return this.role === "sales" || this.role === "admin";
  }

  get isAuthenticated() {
    return !!this.role;
  }

  getApiBase() {
    if (window.location.protocol === "file:" || !window.location.host) {
      return "http://localhost:8899";
    }
    return "";
  }

  async init() {
    await this.fetchCompanyConfig();
    if (this.token) {
      await this.verifySession();
    }
    this.applyLockStateToUI();
    this.bindEvents();
  }

  /**
   * Fetches official company & bank details from cloud DB, backend, or local cache
   */
  async fetchCompanyConfig() {
    if (window.cloudDb) {
      const res = await window.cloudDb.fetchCompanyConfig();
      if (res && res.success && res.config) {
        this.companyConfig = res.config;
        this.applyConfigToState(res.config);
        return res.config;
      }
    }

    try {
      const resp = await fetch(this.getApiBase() + "/api/config");
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.config) {
          this.companyConfig = data.config;
          this.applyConfigToState(data.config);
          return data.config;
        }
      }
    } catch (e) {}

    // Default Master Config
    const fallbackConfig = {
      bank_name: "ICICI BANK",
      account_name: "KehanSri Solar",
      account_number: "38205006367",
      ifsc_code: "ICIC0000382",
      branch_address: "Banjara Hills, Road No 12, Hyderabad: 500034",
      company_name: "KehanSri Solar",
      company_email: "sales@kehansrisolar.com",
      company_phone: "+91 9493858086",
      company_address: "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081",
      sales_username: "SALES"
    };
    this.applyConfigToState(fallbackConfig);
    return fallbackConfig;
  }

  /**
   * Applies official bank details into current quote state and locks fields
   */
  applyConfigToState(cfg) {
    if (!cfg) return;
    this.companyConfig = cfg;

    const bank1 = {
      label: cfg.bank_label || cfg.bankLabel || "KehanSri Solar (Primary)",
      bankName: cfg.bank_name || cfg.bankName || "ICICI BANK",
      accountName: cfg.account_name || cfg.accountName || "KehanSri Solar",
      accountNumber: cfg.account_number || cfg.accountNumber || "38205006367",
      routingOrIfsc: cfg.ifsc_code || cfg.routingOrIfsc || "ICIC0000382",
      notes: cfg.branch_address || cfg.notes || cfg.branchAddress || "Banjara Hills, Road No 12, Hyderabad: 500034"
    };

    const bank2 = {
      label: cfg.bank2_label || cfg.bank2Label || "K Energy Solutions (2nd Company)",
      bankName: cfg.bank2_name || cfg.bank2Name || "HDFC BANK LTD",
      accountName: cfg.bank2_account_name || cfg.bank2AccountName || "K Energy Solutions",
      accountNumber: cfg.bank2_account_number || cfg.bank2AccountNumber || "50200088991122",
      routingOrIfsc: cfg.bank2_ifsc_code || cfg.bank2RoutingOrIfsc || cfg.bank2Ifsc || "HDFC0000456",
      notes: cfg.bank2_branch_address || cfg.bank2BranchAddress || cfg.bank2Notes || "Gachibowli Main Branch, Hyderabad: 500032"
    };

    if (typeof state !== "undefined") {
      const curPayment = state.getQuote().paymentDetails || {};
      const selectedBankChoice = curPayment.selectedBank === "bank2" ? "bank2" : "bank1";
      const activeBank = selectedBankChoice === "bank2" ? bank2 : bank1;

      state.updatePayment({
        selectedBank: selectedBankChoice,
        bankName: activeBank.bankName,
        accountName: activeBank.accountName,
        accountNumber: activeBank.accountNumber,
        routingOrIfsc: activeBank.routingOrIfsc,
        notes: activeBank.notes,
        bank1,
        bank2
      });

      if (cfg.company_name && !state.getQuote().business?.name) {
        state.updateBusiness({
          name: cfg.company_name,
          email: cfg.company_email || "sales@kehansrisolar.com",
          phone: cfg.company_phone || "+91 9493858086",
          address: cfg.company_address || "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081"
        });
      }
    }

    this.updateBankChoiceLabels(bank1, bank2);
  }

  updateBankChoiceLabels(bank1, bank2) {
    const l1Title = document.getElementById("lbl-bank1-title");
    const l1Sub = document.getElementById("lbl-bank1-subtitle");
    const l2Title = document.getElementById("lbl-bank2-title");
    const l2Sub = document.getElementById("lbl-bank2-subtitle");

    if (l1Title && bank1) l1Title.textContent = bank1.label || `Bank 1: ${bank1.accountName}`;
    if (l1Sub && bank1) l1Sub.textContent = `${bank1.bankName} • ${bank1.accountNumber}`;
    if (l2Title && bank2) l2Title.textContent = bank2.label || `Bank 2: ${bank2.accountName}`;
    if (l2Sub && bank2) l2Sub.textContent = `${bank2.bankName} • ${bank2.accountNumber}`;
  }

  /**
   * Verifies if stored token is an active session (Admin or Sales)
   */
  async verifySession() {
    if (!this.token) {
      this.role = null;
      this.username = null;
      this.displayName = null;
      this.applyLockStateToUI();
      return false;
    }

    if (this.token.startsWith("local_admin_session")) {
      this.role = "admin";
      this.username = "ADMIN";
      this.displayName = "Administrator";
      this.applyLockStateToUI();
      return true;
    }

    if (this.token.startsWith("local_sales_session")) {
      this.role = "sales";
      this.username = "SALES";
      this.displayName = "Sales Executive";
      this.applyLockStateToUI();
      return true;
    }

    try {
      const resp = await fetch(this.getApiBase() + "/api/auth/check", {
        headers: { "Authorization": `Bearer ${this.token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.authenticated) {
          this.role = data.role;
          this.username = data.username;
          this.displayName = data.displayName || data.username;
          this.applyLockStateToUI();
          return true;
        }
      }
    } catch (e) {}

    // Invalid session
    this.logout(false);
    return false;
  }

  /**
   * Logs in a user (Admin or Salesperson)
   */
  async login(username, password) {
    const rawUser = (username || "").trim();
    const rawPass = (password || "").trim();

    if (!rawUser || !rawPass) {
      return { success: false, message: "Please enter both username and password." };
    }

    // 1. Try Python Backend Server (if running on localhost)
    try {
      const resp = await fetch(this.getApiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: rawUser, password: rawPass })
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        this.token = data.token;
        this.role = data.role;
        this.username = data.username;
        this.displayName = data.displayName || data.username;

        sessionStorage.setItem("quotecraft_auth_token", this.token);
        sessionStorage.setItem("quotecraft_auth_role", this.role);
        sessionStorage.setItem("quotecraft_auth_user", this.username);
        sessionStorage.setItem("quotecraft_auth_display", this.displayName);

        localStorage.setItem("quotecraft_auth_token", this.token);
        localStorage.setItem("quotecraft_auth_role", this.role);
        localStorage.setItem("quotecraft_auth_user", this.username);
        localStorage.setItem("quotecraft_auth_display", this.displayName);

        // Load the draft for this specific user or start fresh
        if (typeof state !== "undefined") {
          const draft = state.loadDraft();
          if (draft) {
            state.currentQuote = draft;
          } else {
            state.resetToNew();
          }
          state.updateBusiness({
            preparedByName: this.displayName || this.username,
            salesUsername: this.username
          });
          state.updateQuote({ sales_username: this.username });
          state.notify();
          if (window.quoteApp) {
            window.quoteApp.renderFormFromState();
            window.quoteApp.renderItemsTable();
          }
        }

        this.applyLockStateToUI();
        this.hideAuthGate();
        return { success: true, role: this.role, message: data.message || `Welcome, ${this.displayName}!` };
      }
    } catch (e) {
      // Backend not accessible (e.g. running statically on GitHub Pages)
    }

    // 2. Authenticate via Cloud Database (Supabase) / Local Storage (For GitHub Pages)
    if (window.cloudDb) {
      const cloudAuth = await window.cloudDb.authenticateUser(rawUser, rawPass);
      if (cloudAuth.success) {
        this.token = cloudAuth.token;
        this.role = cloudAuth.role;
        this.username = cloudAuth.username;
        this.displayName = cloudAuth.displayName || cloudAuth.username;

        sessionStorage.setItem("quotecraft_auth_token", this.token);
        sessionStorage.setItem("quotecraft_auth_role", this.role);
        sessionStorage.setItem("quotecraft_auth_user", this.username);
        sessionStorage.setItem("quotecraft_auth_display", this.displayName);

        localStorage.setItem("quotecraft_auth_token", this.token);
        localStorage.setItem("quotecraft_auth_role", this.role);
        localStorage.setItem("quotecraft_auth_user", this.username);
        localStorage.setItem("quotecraft_auth_display", this.displayName);

        if (typeof state !== "undefined") {
          const draft = state.loadDraft();
          if (draft) {
            state.currentQuote = draft;
          } else {
            state.resetToNew();
          }
          state.updateBusiness({
            preparedByName: this.displayName || this.username,
            salesUsername: this.username
          });
          state.updateQuote({ sales_username: this.username });
          state.notify();
          if (window.quoteApp) {
            window.quoteApp.renderFormFromState();
            window.quoteApp.renderItemsTable();
          }
        }

        this.applyLockStateToUI();
        this.hideAuthGate();
        return cloudAuth;
      } else if (cloudAuth.message && cloudAuth.message.includes("deactivated")) {
        return cloudAuth;
      }
    }

    // 3. Fallback Built-in Defaults (Always Available)
    if (rawUser.toUpperCase() === "ADMIN" && rawPass === "kehansri888") {
      this.token = "local_admin_session_" + Date.now();
      this.role = "admin";
      this.username = "ADMIN";
      this.displayName = "Administrator";

      sessionStorage.setItem("quotecraft_auth_token", this.token);
      sessionStorage.setItem("quotecraft_auth_role", "admin");
      sessionStorage.setItem("quotecraft_auth_user", "ADMIN");
      sessionStorage.setItem("quotecraft_auth_display", "Administrator");

      localStorage.setItem("quotecraft_auth_token", this.token);
      localStorage.setItem("quotecraft_auth_role", "admin");
      localStorage.setItem("quotecraft_auth_user", "ADMIN");
      localStorage.setItem("quotecraft_auth_display", "Administrator");

      if (typeof state !== "undefined") {
        state.resetToNew();
      }

      this.applyLockStateToUI();
      this.hideAuthGate();
      return { success: true, role: "admin", message: "Admin Portal Unlocked!" };
    }

    if (rawUser.toUpperCase() === "SALES" && rawPass === "sales888") {
      this.token = "local_sales_session_" + Date.now();
      this.role = "sales";
      this.username = "SALES";
      this.displayName = "Sales Executive";

      sessionStorage.setItem("quotecraft_auth_token", this.token);
      sessionStorage.setItem("quotecraft_auth_role", "sales");
      sessionStorage.setItem("quotecraft_auth_user", "SALES");
      sessionStorage.setItem("quotecraft_auth_display", "Sales Executive");

      localStorage.setItem("quotecraft_auth_token", this.token);
      localStorage.setItem("quotecraft_auth_role", "sales");
      localStorage.setItem("quotecraft_auth_user", "SALES");
      localStorage.setItem("quotecraft_auth_display", "Sales Executive");

      if (typeof state !== "undefined") {
        state.resetToNew();
      }

      this.applyLockStateToUI();
      this.hideAuthGate();
      return { success: true, role: "sales", message: "Welcome to Sales Portal!" };
    }

    return { success: false, message: "Invalid Username or Password. Please check and try again." };
  }

  logout(showToastMsg = true) {
    this.token = null;
    this.role = null;
    this.username = null;
    this.displayName = null;

    sessionStorage.removeItem("quotecraft_auth_token");
    sessionStorage.removeItem("quotecraft_auth_role");
    sessionStorage.removeItem("quotecraft_auth_user");
    sessionStorage.removeItem("quotecraft_auth_display");

    localStorage.removeItem("quotecraft_auth_token");
    localStorage.removeItem("quotecraft_auth_role");
    localStorage.removeItem("quotecraft_auth_user");
    localStorage.removeItem("quotecraft_auth_display");

    if (typeof state !== "undefined") {
      state.resetToNew();
      if (window.quoteApp) {
        window.quoteApp.renderFormFromState();
        window.quoteApp.renderItemsTable();
      }
    }

    this.applyLockStateToUI();
    this.showAuthGate();

    if (showToastMsg && window.quoteApp) {
      window.quoteApp.showToast("Signed out successfully. Session locked.", "info");
    }
  }

  showAuthGate() {
    const gate = document.getElementById("auth-login-gate") || document.getElementById("auth-gate-screen");
    const workspace = document.getElementById("app-main-workspace");
    if (gate) {
      gate.style.display = "flex";
      gate.classList.remove("gate-hidden");
    }
    if (workspace) workspace.style.display = "none";
  }

  hideAuthGate() {
    const gate = document.getElementById("auth-login-gate") || document.getElementById("auth-gate-screen");
    const workspace = document.getElementById("app-main-workspace");
    if (gate) {
      gate.style.display = "none";
      gate.classList.add("gate-hidden");
    }
    if (workspace) workspace.style.display = "block";
  }

  applyLockStateToUI() {
    const bankFields = [
      "inp-bank-name",
      "inp-acc-name",
      "inp-acc-number",
      "inp-bank-ifsc",
      "inp-payment-notes"
    ];

    const isLockedForCurrent = !this.isAdmin;

    bankFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = isLockedForCurrent;
        if (isLockedForCurrent) {
          el.classList.add("field-locked-readonly");
        } else {
          el.classList.remove("field-locked-readonly");
        }
      }
    });

    const badge = document.getElementById("bank-lock-badge");
    if (badge) {
      if (this.isAdmin) {
        badge.innerHTML = `<span style="color: #10b981;">🔓 Admin Mode (Editable)</span>`;
        badge.classList.remove("locked");
        badge.classList.add("unlocked");
      } else {
        badge.innerHTML = `<span style="color: #f87171;">🔒 Official Bank Details (Locked)</span>`;
        badge.classList.remove("unlocked");
        badge.classList.add("locked");
      }
    }

    const headerAdminBtn = document.getElementById("btn-header-admin") || document.getElementById("btn-open-admin");
    if (headerAdminBtn) {
      if (this.isAdmin) {
        headerAdminBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>🛡️ Admin Portal</span>
        `;
        headerAdminBtn.classList.add("admin-active");
      } else {
        headerAdminBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Admin Login</span>
        `;
        headerAdminBtn.classList.remove("admin-active");
      }
    }

    const headerUserStatus = document.getElementById("header-user-status");
    if (headerUserStatus) {
      if (this.isAuthenticated) {
        headerUserStatus.style.display = "inline-flex";
        headerUserStatus.innerHTML = `
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${this.isAdmin ? '#10b981' : '#38bdf8'};"></span>
          <span style="font-weight:700;">${this.escape(this.displayName || this.username || "User")}</span>
        `;
      } else {
        headerUserStatus.style.display = "none";
      }
    }

    // Salesperson Account Binding & Admin Assign Selector
    const adminAssignWrapper = document.getElementById("admin-sales-assign-wrapper");
    const prepByInput = document.getElementById("inp-biz-rep");
    const activeUsernameLabel = document.getElementById("lbl-active-sales-username");
    const badgeAccountLink = document.getElementById("badge-sales-account-link");

    if (this.isAuthenticated) {
      if (this.isAdmin) {
        // Admin Mode: Can assign quotation to any registered salesperson
        if (adminAssignWrapper) adminAssignWrapper.style.display = "block";
        if (prepByInput) {
          prepByInput.readOnly = true;
          prepByInput.style.background = "rgba(56, 189, 248, 0.08)";
          prepByInput.style.cursor = "default";
        }
        if (badgeAccountLink) {
          badgeAccountLink.textContent = "👑 Admin Assignable";
          badgeAccountLink.style.color = "#38bdf8";
        }
        this.populateAdminSalesAssignDropdown();
      } else {
        // Sales Rep Mode: Strictly locked to authenticated user account
        if (adminAssignWrapper) adminAssignWrapper.style.display = "none";
        const currentDisplayName = this.displayName || this.username || "Sales Executive";
        const currentUsername = this.username || "SALES";
        if (prepByInput) {
          prepByInput.value = currentDisplayName;
          prepByInput.readOnly = true;
          prepByInput.style.background = "rgba(255, 255, 255, 0.04)";
          prepByInput.style.cursor = "not-allowed";
        }
        if (activeUsernameLabel) {
          activeUsernameLabel.textContent = currentUsername;
        }
        if (badgeAccountLink) {
          badgeAccountLink.textContent = `🔗 Locked to @${currentUsername}`;
          badgeAccountLink.style.color = "#10b981";
        }
        if (typeof state !== "undefined") {
          state.updateBusiness({
            preparedByName: currentDisplayName,
            salesUsername: currentUsername
          });
          state.updateQuote({ sales_username: currentUsername });
        }
      }
    }

    if (this.isAuthenticated) {
      this.hideAuthGate();
    } else {
      this.showAuthGate();
    }
  }

  async populateAdminSalesAssignDropdown() {
    const select = document.getElementById("sel-admin-assigned-rep");
    if (!select) return;

    let users = [];
    try {
      const resp = await fetch(this.getApiBase() + "/api/users/salespersons", {
        headers: this.token ? { "Authorization": `Bearer ${this.token}` } : {}
      });
      if (resp.ok) {
        const data = await resp.json();
        users = data.salespersons || [];
      }
    } catch (e) {}

    const currentQuote = (typeof state !== "undefined") ? state.getQuote() : null;
    const currentSalesUsername = currentQuote?.business?.salesUsername || currentQuote?.sales_username || this.username || "ADMIN";

    let html = `<option value="ADMIN" ${currentSalesUsername === "ADMIN" ? "selected" : ""}>👑 Administrator (Self / ADMIN)</option>`;
    
    users.forEach(u => {
      if (u.username.toUpperCase() !== "ADMIN") {
        const isSel = (currentSalesUsername.toLowerCase() === u.username.toLowerCase()) ? "selected" : "";
        const roleLabel = u.role ? `[${u.role.toUpperCase()}]` : "";
        html += `<option value="${this.escape(u.username)}" ${isSel}>👤 ${this.escape(u.display_name)} (@${this.escape(u.username)}) ${roleLabel}</option>`;
      }
    });

    select.innerHTML = html;

    select.onchange = (e) => {
      const chosenUsername = e.target.value;
      const targetUser = users.find(u => u.username.toLowerCase() === chosenUsername.toLowerCase());
      
      let assignedDisplayName = "Administrator";
      if (chosenUsername === "ADMIN") {
        assignedDisplayName = this.displayName || "Administrator";
      } else if (targetUser) {
        assignedDisplayName = targetUser.display_name || targetUser.username;
      } else {
        assignedDisplayName = chosenUsername;
      }

      if (typeof state !== "undefined") {
        state.updateBusiness({
          preparedByName: assignedDisplayName,
          salesUsername: chosenUsername
        });
        state.updateQuote({ sales_username: chosenUsername });
      }

      const prepInput = document.getElementById("inp-biz-rep");
      if (prepInput) prepInput.value = assignedDisplayName;

      const activeLbl = document.getElementById("lbl-active-sales-username");
      if (activeLbl) activeLbl.textContent = chosenUsername;

      if (window.quoteApp) {
        window.quoteApp.showToast(`👤 Proposal assigned to: ${assignedDisplayName} (@${chosenUsername})`, "info");
      }
    };
  }

  bindEvents() {
    // 1. Full-Screen Auth Gate Form
    const gateForm = document.getElementById("form-gate-login") || document.getElementById("form-gate-auth");
    if (gateForm) {
      gateForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = document.getElementById("inp-gate-user")?.value;
        const pass = document.getElementById("inp-gate-pass")?.value;
        const btn = document.getElementById("btn-submit-gate-login") || document.getElementById("btn-gate-submit");
        const errMsg = document.getElementById("gate-login-error") || document.getElementById("gate-auth-error");

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span>⌛ Authenticating...</span>`;
        }
        if (errMsg) errMsg.style.display = "none";

        const res = await this.login(user, pass);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>🚀 Sign In & Open Quotation Workspace</span>`;
        }

        if (res.success) {
          if (window.quoteApp) {
            window.quoteApp.showToast(res.message || `Welcome, ${this.displayName}!`, "success");
          }
          if (this.isAdmin) {
            this.openAdminDashboard();
          }
        } else {
          if (errMsg) {
            errMsg.textContent = res.message || "Invalid credentials. Please try again.";
            errMsg.style.display = "block";
          }
        }
      });
    }

    // Password visibility toggle on Auth Gate
    const btnToggleGatePass = document.getElementById("btn-toggle-gate-pass");
    if (btnToggleGatePass) {
      btnToggleGatePass.addEventListener("click", () => {
        const inp = document.getElementById("inp-gate-pass");
        if (inp) {
          inp.type = (inp.type === "password") ? "text" : "password";
        }
      });
    }

    // Role switcher pills on Auth Gate
    const tabSales = document.getElementById("gate-tab-sales");
    const tabAdmin = document.getElementById("gate-tab-admin");
    if (tabSales) tabSales.addEventListener("click", () => this.setGateRoleTab("sales"));
    if (tabAdmin) tabAdmin.addEventListener("click", () => this.setGateRoleTab("admin"));

    // Header Admin/User Button
    const headerAdminBtn = document.getElementById("btn-header-admin") || document.getElementById("btn-open-admin");
    if (headerAdminBtn) {
      headerAdminBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (this.isAdmin) {
          this.openAdminDashboard();
        } else {
          this.openLoginModal("admin");
        }
      });
    }

    // Header Logout Button
    const headerLogoutBtn = document.getElementById("btn-header-logout");
    if (headerLogoutBtn) {
      headerLogoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Modal Admin Login Form
    const formAdminLogin = document.getElementById("form-admin-login");
    if (formAdminLogin) {
      formAdminLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = document.getElementById("inp-admin-user")?.value;
        const pass = document.getElementById("inp-admin-pass")?.value;
        const btn = document.getElementById("btn-submit-admin-login");
        const errMsg = document.getElementById("admin-login-error");

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = `<span>⌛ Verifying...</span>`;
        }
        if (errMsg) errMsg.style.display = "none";

        const res = await this.login(user, pass);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>🔓 Sign In</span>`;
        }

        if (res.success) {
          this.closeLoginModal();
          if (window.quoteApp) {
            window.quoteApp.showToast(res.message || "Login Successful!", "success");
          }
          if (this.isAdmin) {
            this.openAdminDashboard();
          }
        } else {
          if (errMsg) {
            errMsg.textContent = res.message || "Invalid credentials. Please try again.";
            errMsg.style.display = "block";
          }
        }
      });
    }

    // Password visibility toggle in Modal Login
    const btnToggleModalPass = document.getElementById("btn-toggle-admin-pass-vis");
    if (btnToggleModalPass) {
      btnToggleModalPass.addEventListener("click", () => {
        const inp = document.getElementById("inp-admin-pass");
        if (inp) {
          inp.type = (inp.type === "password") ? "text" : "password";
        }
      });
    }

    // Modal Role Tabs
    const modalTabSales = document.getElementById("tab-auth-sales");
    const modalTabAdmin = document.getElementById("tab-auth-admin");
    if (modalTabSales) modalTabSales.addEventListener("click", () => this.setModalRoleTab("sales"));
    if (modalTabAdmin) modalTabAdmin.addEventListener("click", () => this.setModalRoleTab("admin"));

    // Modal Close Buttons
    document.querySelectorAll(".modal-close-btn, .btn-modal-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        this.closeLoginModal();
        this.closeAdminDashboard();
      });
    });

    // Admin Dashboard Tabs
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".admin-tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add("active");

        if (btn.dataset.target === "admin-tab-quotes") {
          this.loadAdminQuotesTable();
        } else if (btn.dataset.target === "admin-tab-users") {
          this.loadUsersTable();
        } else if (btn.dataset.target === "admin-tab-stats") {
          this.loadAdminStats();
        } else if (btn.dataset.target === "admin-tab-cloud") {
          this.populateCloudConfigForm();
        }
      });
    });

    // Admin Master Config Save
    const formMasterConfig = document.getElementById("form-master-config");
    if (formMasterConfig) {
      formMasterConfig.addEventListener("submit", async (e) => {
        e.preventDefault();
        await this.saveMasterConfigFromForm();
      });
    }

    // Cloud DB Config Form
    const formCloudDb = document.getElementById("form-cloud-db-config");
    if (formCloudDb) {
      formCloudDb.addEventListener("submit", (e) => {
        e.preventDefault();
        const url = document.getElementById("inp-cloud-url")?.value;
        const key = document.getElementById("inp-cloud-key")?.value;
        if (window.cloudDb) {
          window.cloudDb.setCloudCredentials(url, key);
          this.updateCloudStatusBadge();
          if (window.quoteApp) {
            window.quoteApp.showToast(url ? "Cloud Database credentials saved!" : "Switched to Local Storage mode", "success");
          }
        }
      });
    }

    // Cloud DB Test Connection Button
    const btnTestCloud = document.getElementById("btn-test-cloud-db");
    if (btnTestCloud) {
      btnTestCloud.addEventListener("click", async () => {
        const urlInp = document.getElementById("inp-cloud-url");
        const keyInp = document.getElementById("inp-cloud-key");
        const rawUrl = urlInp?.value;
        const key = keyInp?.value;
        if (window.cloudDb) {
          window.cloudDb.setCloudCredentials(rawUrl, key);
          if (urlInp && window.cloudDb.cloudUrl) {
            urlInp.value = window.cloudDb.cloudUrl;
          }
          btnTestCloud.textContent = "⌛ Testing...";
          const res = await window.cloudDb.testConnection();
          btnTestCloud.textContent = "🔄 Test Connection";
          if (window.quoteApp) {
            window.quoteApp.showToast(res.message, res.success ? "success" : "error");
          }
          this.updateCloudStatusBadge();
        }
      });
    }

    // Copy Supabase SQL Button
    const btnCopySql = document.getElementById("btn-copy-supabase-sql");
    if (btnCopySql) {
      btnCopySql.addEventListener("click", () => {
        const sqlText = `-- Run this in Supabase SQL Editor:
create table if not exists quotes (
  id text primary key,
  quote_number text not null,
  client_name text not null,
  client_phone text,
  client_email text,
  client_address text,
  kw_capacity numeric not null,
  partner_brand text not null,
  structure_type text,
  total_cost numeric not null,
  subsidy numeric not null,
  net_cost numeric not null,
  sales_rep text,
  sales_username text default 'SALES',
  installer_brand text default 'kehansri',
  status text default 'Generated',
  quote_json jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table quotes add column if not exists sales_username text default 'SALES';
alter table quotes add column if not exists installer_brand text default 'kehansri';

create table if not exists company_config (
  id integer primary key default 1,
  bank_label text default 'KehanSri Solar (Primary)',
  bank_name text not null default 'ICICI BANK',
  account_name text not null default 'KehanSri Solar',
  account_number text not null default '38205006367',
  ifsc_code text not null default 'ICIC0000382',
  branch_address text not null default 'Banjara Hills, Road No 12, Hyderabad: 500034',

  bank2_label text default 'K Energy Solutions (2nd Company)',
  bank2_name text default 'HDFC BANK LTD',
  bank2_account_name text default 'K Energy Solutions',
  bank2_account_number text default '50200088991122',
  bank2_ifsc_code text default 'HDFC0000456',
  bank2_branch_address text default 'Gachibowli Main Branch, Hyderabad: 500032',

  company_name text not null default 'KehanSri Solar',
  company_email text default 'sales@kehansrisolar.com',
  company_phone text default '+91 9493858086',
  company_address text default 'Plot 42, Silicon Valley, Hyderabad, Telangana: 500081',
  sales_username text default 'SALES',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table company_config add column if not exists bank_label text default 'KehanSri Solar (Primary)';
alter table company_config add column if not exists bank2_label text default 'K Energy Solutions (2nd Company)';
alter table company_config add column if not exists bank2_name text default 'HDFC BANK LTD';
alter table company_config add column if not exists bank2_account_name text default 'K Energy Solutions';
alter table company_config add column if not exists bank2_account_number text default '50200088991122';
alter table company_config add column if not exists bank2_ifsc_code text default 'HDFC0000456';
alter table company_config add column if not exists bank2_branch_address text default 'Gachibowli Main Branch, Hyderabad: 500032';

create table if not exists users (
  id text primary key,
  username text unique not null,
  display_name text not null,
  password_hash text not null,
  role text default 'sales',
  phone text,
  email text,
  is_active integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table quotes enable row level security;
alter table company_config enable row level security;
alter table users enable row level security;

create policy "Allow all access to quotes" on quotes for all using (true) with check (true);
create policy "Allow all access to config" on company_config for all using (true) with check (true);
create policy "Allow all access to users" on users for all using (true) with check (true);`;
        navigator.clipboard.writeText(sqlText);
        btnCopySql.textContent = "✅ Copied!";
        setTimeout(() => { btnCopySql.textContent = "Copy SQL"; }, 2500);
      });
    }

    // Admin Logout Button in Admin Portal
    const btnLogout = document.getElementById("btn-admin-logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        this.closeAdminDashboard();
        this.logout();
      });
    }

    // Create User Form in Admin Portal
    const formCreateUser = document.getElementById("form-create-user");
    if (formCreateUser) {
      formCreateUser.addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleCreateUserForm(formCreateUser);
      });
    }
  }

  setGateRoleTab(role) {
    const tabSales = document.getElementById("gate-tab-sales");
    const tabAdmin = document.getElementById("gate-tab-admin");
    const hintBox = document.getElementById("gate-hint-box");
    const userInp = document.getElementById("inp-gate-user");

    if (role === "sales") {
      if (tabSales) tabSales.classList.add("active");
      if (tabAdmin) tabAdmin.classList.remove("active");
      if (hintBox) {
        hintBox.innerHTML = `
          <div><strong>Sales Representative Sign In:</strong></div>
          <div style="margin-top: 2px;">Enter sales username &amp; password (Default: <code>SALES</code> / <code>sales888</code>).</div>
        `;
      }
    } else {
      if (tabAdmin) tabAdmin.classList.add("active");
      if (tabSales) tabSales.classList.remove("active");
      if (hintBox) {
        hintBox.innerHTML = `
          <div><strong>Administrator Sign In:</strong></div>
          <div style="margin-top: 2px;">Enter administrator credentials (Default: <code>ADMIN</code> / <code>kehansri888</code>).</div>
        `;
      }
    }
    if (userInp) userInp.focus();
  }

  setModalRoleTab(role) {
    const tabSales = document.getElementById("tab-auth-sales");
    const tabAdmin = document.getElementById("tab-auth-admin");
    const hintBox = document.getElementById("auth-hint-box");
    const submitBtn = document.getElementById("btn-submit-admin-login");
    const userInp = document.getElementById("inp-admin-user");

    if (role === "sales") {
      if (tabSales) {
        tabSales.style.background = "#10b981";
        tabSales.style.color = "white";
      }
      if (tabAdmin) {
        tabAdmin.style.background = "transparent";
        tabAdmin.style.color = "var(--text-secondary)";
      }
      if (hintBox) {
        hintBox.innerHTML = `
          <div><strong>Sales Representative Sign In:</strong></div>
          <div style="margin-top: 2px;">Please enter your authorized sales username and password.</div>
        `;
      }
      if (submitBtn) submitBtn.innerHTML = `<span>🔓 Sign In</span>`;
    } else {
      if (tabAdmin) {
        tabAdmin.style.background = "#10b981";
        tabAdmin.style.color = "white";
      }
      if (tabSales) {
        tabSales.style.background = "transparent";
        tabSales.style.color = "var(--text-secondary)";
      }
      if (hintBox) {
        hintBox.innerHTML = `
          <div><strong>Administrator Sign In:</strong></div>
          <div style="margin-top: 2px;">Please enter administrator credentials to unlock master settings.</div>
        `;
      }
      if (submitBtn) submitBtn.innerHTML = `<span>🛡️ Unlock Admin Portal</span>`;
    }
    if (userInp) userInp.focus();
  }

  openLoginModal(defaultRole = "admin") {
    const modal = document.getElementById("modal-admin-login");
    if (modal) {
      modal.classList.add("active");
      const errMsg = document.getElementById("admin-login-error");
      if (errMsg) errMsg.style.display = "none";

      this.setModalRoleTab(defaultRole);
      const userInp = document.getElementById("inp-admin-user");
      const passInp = document.getElementById("inp-admin-pass");
      if (userInp) {
        userInp.value = "";
        userInp.focus();
      }
      if (passInp) {
        passInp.value = "";
      }
    }
  }

  closeLoginModal() {
    const modal = document.getElementById("modal-admin-login");
    if (modal) modal.classList.remove("active");
  }

  async openAdminDashboard() {
    const modal = document.getElementById("modal-admin-dashboard");
    if (!modal) return;
    modal.classList.add("active");

    try {
      this.populateMasterConfigForm();
      this.populateCloudConfigForm();
      this.updateCloudStatusBadge();
    } catch (e) {
      console.warn("Config form populate error:", e);
    }

    try {
      await this.fetchMasterSalesReps();
    } catch (e) {
      console.warn("fetchMasterSalesReps error:", e);
    }

    try {
      await this.loadAdminQuotesTable();
    } catch (e) {
      console.warn("loadAdminQuotesTable error:", e);
    }

    try {
      await this.loadUsersTable();
    } catch (e) {
      console.warn("loadUsersTable error:", e);
    }

    try {
      await this.loadAdminStats();
    } catch (e) {
      console.warn("loadAdminStats error:", e);
    }
  }

  closeAdminDashboard() {
    const modal = document.getElementById("modal-admin-dashboard");
    if (modal) modal.classList.remove("active");
  }

  populateMasterConfigForm() {
    const cfg = this.companyConfig || {};
    const q = state.getQuote();
    const p = q.paymentDetails || {};
    const b = q.business || {};

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    // Bank 1
    set("adm-bank-label", cfg.bank_label || cfg.bankLabel || p.bank1?.label || "KehanSri Solar (Primary)");
    set("adm-bank-name", cfg.bank_name || cfg.bankName || p.bank1?.bankName || p.bankName || "ICICI BANK");
    set("adm-acc-name", cfg.account_name || cfg.accountName || p.bank1?.accountName || p.accountName || "KehanSri Solar");
    set("adm-acc-number", cfg.account_number || cfg.accountNumber || p.bank1?.accountNumber || p.accountNumber || "38205006367");
    set("adm-ifsc", cfg.ifsc_code || cfg.routingOrIfsc || p.bank1?.routingOrIfsc || p.routingOrIfsc || "ICIC0000382");
    set("adm-branch-addr", cfg.branch_address || cfg.notes || p.bank1?.notes || p.notes || "Banjara Hills, Road No 12, Hyderabad: 500034");

    // Bank 2
    set("adm-bank2-label", cfg.bank2_label || cfg.bank2Label || p.bank2?.label || "K Energy Solutions (2nd Company)");
    set("adm-bank2-name", cfg.bank2_name || cfg.bank2Name || p.bank2?.bankName || "HDFC BANK LTD");
    set("adm-bank2-acc-name", cfg.bank2_account_name || cfg.bank2AccountName || p.bank2?.accountName || "K Energy Solutions");
    set("adm-bank2-acc-number", cfg.bank2_account_number || cfg.bank2AccountNumber || p.bank2?.accountNumber || "50200088991122");
    set("adm-bank2-ifsc", cfg.bank2_ifsc_code || cfg.bank2RoutingOrIfsc || p.bank2?.routingOrIfsc || "HDFC0000456");
    set("adm-bank2-branch-addr", cfg.bank2_branch_address || cfg.bank2Notes || p.bank2?.notes || "Gachibowli Main Branch, Hyderabad: 500032");

    // Company Legal Details
    set("adm-company-name", cfg.company_name || cfg.companyName || b.name || "KehanSri Solar");
    set("adm-company-email", cfg.company_email || cfg.companyEmail || b.email || "sales@kehansrisolar.com");
    set("adm-company-phone", cfg.company_phone || cfg.companyPhone || b.phone || "+91 9493858086");
    set("adm-company-addr", cfg.company_address || cfg.companyAddress || b.address || "Plot 42, Silicon Valley, Hyderabad, Telangana: 500081");
  }

  populateCloudConfigForm() {
    if (window.cloudDb) {
      const urlInp = document.getElementById("inp-cloud-url");
      const keyInp = document.getElementById("inp-cloud-key");
      if (urlInp) urlInp.value = window.cloudDb.cloudUrl || "";
      if (keyInp) keyInp.value = window.cloudDb.cloudKey || "";
    }
  }

  updateCloudStatusBadge() {
    const badge = document.getElementById("cloud-db-status-badge");
    if (!badge) return;
    if (window.cloudDb && window.cloudDb.isCloudConfigured()) {
      badge.textContent = "🟢 Supabase Cloud Active";
      badge.style.background = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "#10b981";
    } else {
      badge.textContent = "💾 Local & Hybrid Active";
      badge.style.background = "rgba(56, 189, 248, 0.15)";
      badge.style.color = "#38bdf8";
    }
  }

  async saveMasterConfigFromForm() {
    const get = (id) => (document.getElementById(id)?.value || "").trim();
    const payload = {
      bankLabel: get("adm-bank-label"),
      bankName: get("adm-bank-name"),
      accountName: get("adm-acc-name"),
      accountNumber: get("adm-acc-number"),
      routingOrIfsc: get("adm-ifsc"),
      branchAddress: get("adm-branch-addr"),

      bank2Label: get("adm-bank2-label"),
      bank2Name: get("adm-bank2-name"),
      bank2AccountName: get("adm-bank2-acc-name"),
      bank2AccountNumber: get("adm-bank2-acc-number"),
      bank2RoutingOrIfsc: get("adm-bank2-ifsc"),
      bank2BranchAddress: get("adm-bank2-branch-addr"),

      companyName: get("adm-company-name"),
      companyEmail: get("adm-company-email"),
      companyPhone: get("adm-company-phone"),
      companyAddress: get("adm-company-addr")
    };

    const newAdminPass = get("adm-new-pass");
    const newSalesPass = get("adm-new-sales-pass");
    if (newAdminPass) payload.newAdminPassword = newAdminPass;
    if (newSalesPass) payload.newSalesPassword = newSalesPass;

    const btn = document.getElementById("btn-save-master-config");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Saving Configuration...</span>`;
    }

    try {
      if (window.cloudDb) {
        const res = await window.cloudDb.saveCompanyConfig(payload, this.token);
        this.companyConfig = res.config || payload;
        this.applyConfigToState(this.companyConfig);
        if (window.quoteApp) {
          window.quoteApp.renderFormFromState();
          window.quoteApp.showToast("Master Bank 1 & Bank 2 Configuration Saved!", "success");
        }
      }
    } catch (e) {
      console.error(e);
      if (window.quoteApp) window.quoteApp.showToast("Error saving bank configuration", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>💾 Save Master Bank (1 &amp; 2) &amp; Company Configuration</span>`;
      }
    }
  }

  // =========================================================================
  // MASTER SALES REPS TRACKING & DROPDOWN MANAGEMENT (ACCOUNT-BASED)
  // =========================================================================

  async fetchMasterSalesReps() {
    this.registeredUsersList = [];
    try {
      const resp = await fetch(this.getApiBase() + "/api/users/salespersons", {
        headers: this.token ? { "Authorization": `Bearer ${this.token}` } : {}
      });
      if (resp.ok) {
        const data = await resp.json();
        this.registeredUsersList = data.salespersons || [];
      }
    } catch (e) {
      console.warn("fetchMasterSalesReps error:", e);
    }
    this.renderSalesRepDropdown();
  }

  renderSalesRepDropdown() {
    const select = document.getElementById("sel-filter-sales-rep");
    if (!select) return;

    const currentSelected = (this.quoteFilters.salesRep || "all").toLowerCase();
    const users = this.registeredUsersList || [];

    let html = `<option value="all" ${currentSelected === "all" ? "selected" : ""}>👥 All Sales Accounts (${users.length})</option>`;
    
    users.forEach(u => {
      const username = u.username || "";
      const displayName = u.display_name || username;
      const isSel = (currentSelected === username.toLowerCase() || currentSelected === displayName.toLowerCase()) ? "selected" : "";
      html += `<option value="${this.escape(username)}" ${isSel}>👤 ${this.escape(displayName)} (@${this.escape(username)})</option>`;
    });

    select.innerHTML = html;
  }

  // =========================================================================
  // DATE FILTERING & PRESETS
  // =========================================================================

  setDatePreset(preset) {
    this.quoteFilters.preset = preset;

    // Update preset buttons visual active state
    document.querySelectorAll("#admin-date-preset-buttons .btn-preset").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === preset);
    });

    const now = new Date();
    const toYmd = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const fromInput = document.getElementById("inp-filter-date-from");
    const toInput = document.getElementById("inp-filter-date-to");

    if (preset === "all") {
      this.quoteFilters.startDate = "";
      this.quoteFilters.endDate = "";
      if (fromInput) fromInput.value = "";
      if (toInput) toInput.value = "";
    } else if (preset === "today") {
      const todayStr = toYmd(now);
      this.quoteFilters.startDate = todayStr;
      this.quoteFilters.endDate = todayStr;
      if (fromInput) fromInput.value = todayStr;
      if (toInput) toInput.value = todayStr;
    } else if (preset === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYmd(yest);
      this.quoteFilters.startDate = yestStr;
      this.quoteFilters.endDate = yestStr;
      if (fromInput) fromInput.value = yestStr;
      if (toInput) toInput.value = yestStr;
    } else if (preset === "last7") {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      this.quoteFilters.startDate = toYmd(past7);
      this.quoteFilters.endDate = toYmd(now);
      if (fromInput) fromInput.value = this.quoteFilters.startDate;
      if (toInput) toInput.value = this.quoteFilters.endDate;
    } else if (preset === "thisMonth") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      this.quoteFilters.startDate = toYmd(firstOfMonth);
      this.quoteFilters.endDate = toYmd(now);
      if (fromInput) fromInput.value = this.quoteFilters.startDate;
      if (toInput) toInput.value = this.quoteFilters.endDate;
    } else if (preset === "custom") {
      if (fromInput) this.quoteFilters.startDate = fromInput.value || "";
      if (toInput) this.quoteFilters.endDate = toInput.value || "";
    }

    this.loadAdminQuotesTable();
  }

  handleCustomDateChange() {
    const fromInput = document.getElementById("inp-filter-date-from");
    const toInput = document.getElementById("inp-filter-date-to");

    this.quoteFilters.startDate = fromInput ? fromInput.value : "";
    this.quoteFilters.endDate = toInput ? toInput.value : "";
    this.quoteFilters.preset = "custom";

    document.querySelectorAll("#admin-date-preset-buttons .btn-preset").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === "custom");
    });

    this.loadAdminQuotesTable();
  }

  handleSalesRepChange(val) {
    this.quoteFilters.salesRep = val || "all";
    this.loadAdminQuotesTable();
  }

  handleSearchInput(val) {
    this.quoteFilters.search = val || "";
    if (this._searchDebounce) clearTimeout(this._searchDebounce);
    this._searchDebounce = setTimeout(() => {
      this.loadAdminQuotesTable();
    }, 200);
  }

  resetFilters() {
    this.quoteFilters = {
      preset: "all",
      startDate: "",
      endDate: "",
      salesRep: "all",
      search: ""
    };

    const fromInput = document.getElementById("inp-filter-date-from");
    const toInput = document.getElementById("inp-filter-date-to");
    const searchInput = document.getElementById("inp-search-admin-quotes");
    const repSelect = document.getElementById("sel-filter-sales-rep");

    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";
    if (searchInput) searchInput.value = "";
    if (repSelect) repSelect.value = "all";

    document.querySelectorAll("#admin-date-preset-buttons .btn-preset").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.preset === "all");
    });

    this.loadAdminQuotesTable();
  }

  parseDateTime(dateStr) {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (!str || str === "undefined" || str === "null") return null;

    // 1. Direct YYYY-MM-DD HH:MM:SS format
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const min = match[5] ? parseInt(match[5], 10) : 0;
      const sec = match[6] ? parseInt(match[6], 10) : 0;
      return new Date(year, month, day, hour, min, sec);
    }

    // 2. ISO or standard Date fallback
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  formatDateDisplay(dateStr) {
    const d = this.parseDateTime(dateStr);
    if (!d) return String(dateStr || "—").split("T")[0].split(" ")[0] || "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  formatTimeDisplay(dateStr) {
    const d = this.parseDateTime(dateStr);
    if (!d) return "";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  formatDateKey(dateStr) {
    const d = this.parseDateTime(dateStr);
    if (!d) {
      const raw = String(dateStr || "").split("T")[0].split(" ")[0];
      return raw || "Undated";
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // =========================================================================
  // LOAD & RENDER QUOTATIONS TABLE WITH DAY-WISE GROUPING
  // =========================================================================

  async loadAdminQuotesTable() {
    const tableBody = document.getElementById("admin-quotes-table-body");
    const countBadge = document.getElementById("admin-quotes-count");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 25px; color: var(--text-muted);">⌛ Loading quotations...</td></tr>`;

    let quotes = [];
    try {
      if (window.cloudDb) {
        const res = await window.cloudDb.fetchQuotes(this.quoteFilters, this.token);
        if (res && res.success && res.quotes) {
          quotes = res.quotes;
        } else if (res && Array.isArray(res)) {
          quotes = res;
        }
      }
    } catch (e) {
      console.warn("Failed fetching from server/cloud, using local cache:", e);
    }

    if (!quotes || quotes.length === 0) {
      if (window.cloudDb) {
        quotes = window.cloudDb.getLocalQuotes();
        // Client-side fallback filtering
        if (this.quoteFilters.search) {
          const q = this.quoteFilters.search.toLowerCase();
          quotes = quotes.filter(item =>
            (item.client_name && item.client_name.toLowerCase().includes(q)) ||
            (item.quote_number && item.quote_number.toLowerCase().includes(q)) ||
            (item.client_phone && item.client_phone.toLowerCase().includes(q)) ||
            (item.sales_rep && item.sales_rep.toLowerCase().includes(q))
          );
        }
        if (this.quoteFilters.salesRep && this.quoteFilters.salesRep !== "all") {
          const repLower = this.quoteFilters.salesRep.toLowerCase();
          quotes = quotes.filter(item => item.sales_rep && item.sales_rep.toLowerCase() === repLower);
        }
        if (this.quoteFilters.startDate) {
          quotes = quotes.filter(item => {
            const raw = item.created_at || item.createdAt || "";
            const d = raw ? raw.split("T")[0].split(" ")[0] : "";
            return d ? d >= this.quoteFilters.startDate : true;
          });
        }
        if (this.quoteFilters.endDate) {
          quotes = quotes.filter(item => {
            const raw = item.created_at || item.createdAt || "";
            const d = raw ? raw.split("T")[0].split(" ")[0] : "";
            return d ? d <= this.quoteFilters.endDate : true;
          });
        }
      }
    }

    this.cachedQuotesList = quotes || [];

    // Register any new sales reps found in quotes
    this.cachedQuotesList.forEach(q => {
      if (q.sales_rep && q.sales_rep.trim()) {
        this.masterSalesRepsList.add(q.sales_rep.trim());
      }
    });
    this.renderSalesRepDropdown();

    // Group by Day and calculate metrics
    let totalKw = 0;
    let totalRevenue = 0;
    const dayGroups = {};

    this.cachedQuotesList.forEach(q => {
      const isJson = typeof q.quote_json === "string";
      let parsed = null;
      try { parsed = isJson ? JSON.parse(q.quote_json) : q.quote_json; } catch(e) {}

      const kw = Number(q.kw_capacity || parsed?.solar?.kwCapacity || 0);
      const cost = Number(q.total_cost || parsed?.solar?.customSystemCost || 0);

      totalKw += kw;
      totalRevenue += cost;

      const rawDate = q.created_at || q.createdAt || parsed?.createdAt || "";
      const dateKey = this.formatDateKey(rawDate);

      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = {
          dateKey,
          displayDate: this.formatDateDisplay(dateKey),
          count: 0,
          totalKw: 0,
          totalCost: 0,
          items: []
        };
      }
      dayGroups[dateKey].count += 1;
      dayGroups[dateKey].totalKw += kw;
      dayGroups[dateKey].totalCost += cost;
      dayGroups[dateKey].items.push(q);
    });

    // Update Summary Header & Metric Cards
    if (countBadge) {
      countBadge.textContent = `${this.cachedQuotesList.length} Quotes`;
    }
    const statQuotesEl = document.getElementById("admin-stat-filtered-quotes");
    if (statQuotesEl) statQuotesEl.textContent = this.cachedQuotesList.length;

    const statKwEl = document.getElementById("admin-stat-filtered-kw");
    if (statKwEl) statKwEl.textContent = `${Math.round(totalKw * 10) / 10} kW`;

    const statRevEl = document.getElementById("admin-stat-filtered-revenue");
    if (statRevEl) statRevEl.textContent = `₹${Math.round(totalRevenue).toLocaleString("en-IN")}`;

    // Render Day-Wise Breakdown Chips
    const chipsContainer = document.getElementById("admin-daywise-chips");
    if (chipsContainer) {
      const sortedDays = Object.values(dayGroups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      if (sortedDays.length > 0 && sortedDays[0].dateKey !== "Undated") {
        chipsContainer.innerHTML = `
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-secondary); align-self: center;">Day-Wise Saved:</span>
          ${sortedDays.map(d => `
            <span class="daywise-chip" title="${d.count} quotations saved on ${d.displayDate}">
              📅 ${d.displayDate}: <strong>${d.count}</strong> quotes (${Math.round(d.totalKw * 10) / 10} kW)
            </span>
          `).join("")}
        `;
      } else {
        chipsContainer.innerHTML = "";
      }
    }

    if (!this.cachedQuotesList || this.cachedQuotesList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--text-muted);">No quotations found matching the selected date range and filters.</td></tr>`;
      return;
    }

    // Sort days descending
    const sortedDayKeys = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));
    let rowsHtml = "";

    sortedDayKeys.forEach(dayKey => {
      const group = dayGroups[dayKey];
      // Day Section Divider Header
      rowsHtml += `
        <tr class="table-day-group-header">
          <td colspan="8">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>📅 ${group.displayDate} &mdash; <strong>${group.count} Quotation(s)</strong></span>
              <span style="font-size: 0.75rem; color: #10b981; font-weight: 700;">
                Subtotal: ${Math.round(group.totalKw * 10) / 10} kW &bull; ₹${Math.round(group.totalCost).toLocaleString("en-IN")}
              </span>
            </div>
          </td>
        </tr>
      `;

      group.items.forEach(q => {
        const isJson = typeof q.quote_json === "string";
        let parsed = null;
        try { parsed = isJson ? JSON.parse(q.quote_json) : q.quote_json; } catch(e) {}

        const clientName = q.client_name || parsed?.client?.name || "Customer";
        const quoteNum = q.quote_number || q.id;
        const kw = q.kw_capacity || parsed?.solar?.kwCapacity || 0;
        const brand = q.partner_brand || parsed?.solar?.partnerBrand || "Adani";
        const totalCost = q.total_cost || parsed?.solar?.customSystemCost || 0;
        const salesRep = q.sales_rep || parsed?.business?.preparedByName || "Sales";

        const rawTimestamp = q.created_at || q.createdAt || parsed?.createdAt || "";
        const dateFormatted = this.formatDateDisplay(rawTimestamp);
        const timeFormatted = this.formatTimeDisplay(rawTimestamp);

        rowsHtml += `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.78rem;">${this.escape(dateFormatted)}</div>
              ${timeFormatted ? `<div style="font-size: 0.7rem; color: #38bdf8; font-weight: 600;">⏰ ${this.escape(timeFormatted)}</div>` : ""}
            </td>
            <td><strong style="font-family: monospace; color: #10b981;">${this.escape(quoteNum)}</strong></td>
            <td>
              <div style="font-weight: 600; color: var(--text-main);">${this.escape(clientName)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${this.escape(q.client_phone || "")}</div>
            </td>
            <td><strong>${kw} kW</strong></td>
            <td><span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.75rem; text-transform: capitalize;">${this.escape(brand)}</span></td>
            <td><strong>₹${Number(totalCost).toLocaleString("en-IN")}</strong></td>
            <td><span style="font-size: 0.78rem; color: var(--text-secondary);">👤 ${this.escape(salesRep)}</span></td>
            <td style="text-align: right;">
              <div style="display:flex; gap:6px; justify-content: flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px;" onclick="window.adminAuth.loadQuoteIntoWorkspace('${q.id}')">
                  📂 Open
                </button>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" onclick="window.adminAuth.deleteQuote('${q.id}')">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    });

    tableBody.innerHTML = rowsHtml;
  }

  // =========================================================================
  // EXCEL / CSV DATA EXPORT ENGINE
  // =========================================================================

  async exportQuotesToExcel() {
    let quotes = this.cachedQuotesList;
    if (!quotes || quotes.length === 0) {
      if (window.cloudDb) {
        const res = await window.cloudDb.fetchQuotes(this.quoteFilters, this.token);
        quotes = (res && res.quotes) ? res.quotes : window.cloudDb.getLocalQuotes();
      }
    }

    if (!quotes || quotes.length === 0) {
      if (window.quoteApp) window.quoteApp.showToast("No quotations to export for current filter!", "warning");
      else alert("No quotations found to export.");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Quote Number",
      "Customer Name",
      "Customer Phone",
      "Customer Email",
      "Customer Address",
      "Installer Brand",
      "Solar Capacity (kW)",
      "Panel Brand",
      "Structure Type",
      "Salesperson Name",
      "Total Project Cost (INR)",
      "Subsidy Amount (INR)",
      "Net Payable Cost (INR)",
      "Status"
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const csvRows = [];
    csvRows.push(headers.join(","));

    quotes.forEach(q => {
      const isJson = typeof q.quote_json === "string";
      let parsed = null;
      try { parsed = isJson ? JSON.parse(q.quote_json) : q.quote_json; } catch(e) {}

      const rawTimestamp = q.created_at || q.createdAt || parsed?.createdAt || "";
      const dateVal = this.formatDateDisplay(rawTimestamp);
      const timeVal = this.formatTimeDisplay(rawTimestamp);

      const quoteNum = q.quote_number || q.id || "";
      const clientName = q.client_name || parsed?.client?.name || "";
      const clientPhone = q.client_phone || parsed?.client?.phone || "";
      const clientEmail = q.client_email || parsed?.client?.email || "";
      const clientAddress = q.client_address || parsed?.client?.billingAddress || "";

      // Resolve Installer Brand Name
      let installerBrand = "KehanSri Solar";
      const rawInst = q.installer_brand || parsed?.solar?.installerBrand || parsed?.business?.brandPreset || "";
      if (rawInst === "kehansri") {
        installerBrand = "KehanSri Solar";
      } else if (rawInst === "kenergy") {
        installerBrand = "K Energy Solutions";
      } else if (rawInst === "custom") {
        installerBrand = parsed?.business?.name || "Custom Installer";
      } else if (parsed?.business?.name) {
        installerBrand = parsed.business.name;
      }

      const kw = q.kw_capacity || parsed?.solar?.kwCapacity || 0;

      // Resolve Partner Brand Name
      let brand = q.partner_brand || parsed?.solar?.partnerBrand || "Adani";
      if (brand.toLowerCase() === "tata") brand = "TATA Power Solar";
      else if (brand.toLowerCase() === "waaree") brand = "Waaree Solar";
      else if (brand.toLowerCase() === "adani") brand = "Adani Solar";

      const structure = q.structure_type || parsed?.solar?.structureType || "Elevated";
      const salesRep = q.sales_rep || parsed?.business?.preparedByName || "Sales";

      const totalCost = Number(q.total_cost || parsed?.solar?.customSystemCost || 0);
      const rawSub = (q.subsidy !== null && q.subsidy !== undefined && String(q.subsidy) !== "") ? q.subsidy : parsed?.solar?.customSubsidy;
      const subsidy = (rawSub !== null && rawSub !== undefined && String(rawSub).trim() !== "") ? Number(rawSub) : 0;
      const netCost = (q.net_cost !== null && q.net_cost !== undefined) ? Number(q.net_cost) : Math.max(0, totalCost - subsidy);
      const status = q.status || "Saved";

      const row = [
        escapeCsv(dateVal),
        escapeCsv(timeVal),
        escapeCsv(quoteNum),
        escapeCsv(clientName),
        escapeCsv(clientPhone),
        escapeCsv(clientEmail),
        escapeCsv(clientAddress),
        escapeCsv(installerBrand),
        escapeCsv(kw),
        escapeCsv(brand),
        escapeCsv(structure),
        escapeCsv(salesRep),
        escapeCsv(totalCost),
        escapeCsv(subsidy),
        escapeCsv(netCost),
        escapeCsv(status)
      ];

      csvRows.push(row.join(","));
    });

    // Add UTF-8 BOM (\uFEFF)
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const fromDate = this.quoteFilters.startDate || "All";
    const toDate = this.quoteFilters.endDate || "All";
    const filename = `Quotations_Report_${fromDate}_to_${toDate}.csv`;

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.setAttribute("download", filename);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    if (window.quoteApp) {
      window.quoteApp.showToast(`✅ Exported ${quotes.length} quotations to Excel successfully!`, "success");
    }
  }

  // =========================================================================
  // DAY-WISE PRINTABLE REPORT
  // =========================================================================

  printDayWiseReport() {
    const quotes = this.cachedQuotesList || [];
    if (quotes.length === 0) {
      if (window.quoteApp) window.quoteApp.showToast("No quotations to print for current filter!", "warning");
      else alert("No quotations found to print.");
      return;
    }

    const companyName = this.companyConfig?.company_name || "KehanSri Solar";
    const companyPhone = this.companyConfig?.company_phone || "+91 9493858086";
    const companyEmail = this.companyConfig?.company_email || "sales@kehansrisolar.com";

    const filterRangeText = (this.quoteFilters.startDate || this.quoteFilters.endDate)
      ? `${this.quoteFilters.startDate || 'Start'} to ${this.quoteFilters.endDate || 'Today'}`
      : "All Time";

    const dayGroups = {};
    let grandKw = 0;
    let grandTotal = 0;
    let grandNet = 0;

    quotes.forEach(q => {
      const isJson = typeof q.quote_json === "string";
      let parsed = null;
      try { parsed = isJson ? JSON.parse(q.quote_json) : q.quote_json; } catch(e) {}

      const kw = Number(q.kw_capacity || parsed?.solar?.kwCapacity || 0);
      const cost = Number(q.total_cost || parsed?.solar?.customSystemCost || 0);
      const sub = Number(q.subsidy || parsed?.solar?.customSubsidy || 0);
      const net = Number(q.net_cost || (cost - sub) || 0);

      grandKw += kw;
      grandTotal += cost;
      grandNet += net;

      const rawDate = q.created_at || q.createdAt || parsed?.createdAt || "";
      const dateKey = this.formatDateKey(rawDate);

      if (!dayGroups[dateKey]) {
        dayGroups[dateKey] = {
          dateKey,
          displayDate: this.formatDateDisplay(dateKey),
          count: 0,
          totalKw: 0,
          totalCost: 0,
          totalNet: 0,
          items: []
        };
      }
      dayGroups[dateKey].count += 1;
      dayGroups[dateKey].totalKw += kw;
      dayGroups[dateKey].totalCost += cost;
      dayGroups[dateKey].totalNet += net;
      dayGroups[dateKey].items.push({
        quoteNum: q.quote_number || q.id,
        clientName: q.client_name || parsed?.client?.name || "Customer",
        clientPhone: q.client_phone || parsed?.client?.phone || "",
        kw,
        brand: q.partner_brand || parsed?.solar?.partnerBrand || "Adani",
        salesRep: q.sales_rep || parsed?.business?.preparedByName || "Sales",
        cost,
        net,
        time: this.formatTimeDisplay(rawDate)
      });
    });

    const sortedDayKeys = Object.keys(dayGroups).sort((a, b) => b.localeCompare(a));

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Day-Wise Quotation Report - ${this.escape(companyName)}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
          }
          .header-box {
            border-bottom: 2px solid #10b981;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .comp-title {
            font-size: 20px;
            font-weight: 800;
            color: #008852;
          }
          .report-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
          }
          .summary-cards {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
          }
          .summary-card {
            flex: 1;
          }
          .card-lbl {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .card-val {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 2px;
          }
          .day-group {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .day-header {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 8px 12px;
            font-weight: 800;
            font-size: 13px;
            color: #065f46;
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          th {
            background: #f1f5f9;
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            text-align: left;
            font-weight: 700;
            color: #334155;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .print-footer {
            margin-top: 30px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #e0f2fe; padding: 10px 16px; border-radius: 6px;">
          <span><strong>🖨️ Ready to Print / Save PDF:</strong> Click Print button below or press Ctrl+P / Cmd+P</span>
          <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; font-weight: bold; cursor: pointer;">
            Print Report
          </button>
        </div>

        <div class="header-box">
          <div>
            <div class="comp-title">${this.escape(companyName)}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
              Phone: ${this.escape(companyPhone)} | Email: ${this.escape(companyEmail)}
            </div>
            <div class="report-title">Day-Wise Quotation Summary Report</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569;">
            <div>Filter Range: <strong>${this.escape(filterRangeText)}</strong></div>
            <div>Generated On: <strong>${new Date().toLocaleString("en-IN")}</strong></div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-lbl">Total Quotations</div>
            <div class="card-val">${quotes.length} Quotes</div>
          </div>
          <div class="summary-card">
            <div class="card-lbl">Total Solar Capacity</div>
            <div class="card-val" style="color: #0284c7;">${Math.round(grandKw * 10) / 10} kW</div>
          </div>
          <div class="summary-card">
            <div class="card-lbl">Total Project Value</div>
            <div class="card-val" style="color: #008852;">₹${Math.round(grandTotal).toLocaleString("en-IN")}</div>
          </div>
          <div class="summary-card">
            <div class="card-lbl">Total Net Revenue</div>
            <div class="card-val" style="color: #059669;">₹${Math.round(grandNet).toLocaleString("en-IN")}</div>
          </div>
        </div>

        ${sortedDayKeys.map(dayKey => {
          const group = dayGroups[dayKey];
          return `
            <div class="day-group">
              <div class="day-header">
                <span>📅 ${group.displayDate} &mdash; ${group.count} Quotation(s)</span>
                <span>Day Subtotal: ${Math.round(group.totalKw * 10) / 10} kW | ₹${Math.round(group.totalCost).toLocaleString("en-IN")}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 12%;">Time</th>
                    <th style="width: 16%;">Quote #</th>
                    <th style="width: 24%;">Customer</th>
                    <th style="width: 10%;" class="text-center">Capacity</th>
                    <th style="width: 10%;" class="text-center">Brand</th>
                    <th style="width: 14%;">Salesperson</th>
                    <th style="width: 14%;" class="text-right">Project Value</th>
                  </tr>
                </thead>
                <tbody>
                  ${group.items.map(item => `
                    <tr>
                      <td>${this.escape(item.time || "—")}</td>
                      <td><strong>${this.escape(item.quoteNum)}</strong></td>
                      <td>
                        <strong>${this.escape(item.clientName)}</strong>
                        ${item.clientPhone ? `<br><span style="color: #64748b; font-size: 10px;">${this.escape(item.clientPhone)}</span>` : ""}
                      </td>
                      <td class="text-center"><strong>${item.kw} kW</strong></td>
                      <td class="text-center">${this.escape(item.brand)}</td>
                      <td>${this.escape(item.salesRep)}</td>
                      <td class="text-right"><strong>₹${Math.round(item.cost).toLocaleString("en-IN")}</strong></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `;
        }).join("")}

        <div class="print-footer">
          <span>QuoteCraft Pro &copy; ${new Date().getFullYear()} ${this.escape(companyName)}</span>
          <span>Confidential & Internal Business Report</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    } else {
      window.print();
    }
  }

  // =========================================================================
  // SALES USER MANAGEMENT (Admin Dashboard)
  // =========================================================================

  async loadUsersTable() {
    const tableBody = document.getElementById("admin-users-table-body");
    const countBadge = document.getElementById("admin-users-count");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">⌛ Loading accounts...</td></tr>`;

    let users = [];
    if (window.cloudDb) {
      const res = await window.cloudDb.fetchUsers(this.token);
      if (res && res.success && res.users) {
        users = res.users;
      }
    }

    this.cachedUsersList = users;

    if (countBadge) {
      const salesCount = users.filter(u => (u.role || "").toLowerCase() === "sales").length;
      countBadge.textContent = `${users.length} Account(s) (${salesCount} Sales Staff)`;
    }

    if (users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 25px; color: var(--text-muted);">No user accounts found. Create your first sales staff member above!</td></tr>`;
      return;
    }

    tableBody.innerHTML = users.map(u => {
      const isMasterAdmin = (u.username && u.username.toUpperCase() === "ADMIN") || u.role === "admin";
      const roleBadge = isMasterAdmin
        ? `<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight:700;">🛡️ Administrator</span>`
        : `<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight:700;">👤 Sales Staff</span>`;
      
      const createdStr = u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Active";
      const phoneDisplay = u.phone || "—";
      const emailDisplay = u.email || "—";

      const actionsHtml = isMasterAdmin
        ? `
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding: 4px 10px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" onclick="window.adminAuth.openEditUserModal('${u.id}')">
              ✏️ Edit Admin
            </button>
          </div>
        `
        : `
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding: 4px 10px; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" onclick="window.adminAuth.openEditUserModal('${u.id}')">
              ✏️ Edit
            </button>
            <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding: 4px 10px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" onclick="window.adminAuth.handleDeleteUser('${u.id}', '${this.escape(u.username)}')">
              🗑️ Delete
            </button>
          </div>
        `;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-family: monospace; font-size: 0.85rem;">${this.escape(u.username)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${this.escape(emailDisplay)}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${this.escape(u.display_name || u.username)}</div>
            <div style="font-size: 0.72rem; color: #10b981;">📞 ${this.escape(phoneDisplay)}</div>
          </td>
          <td>${roleBadge}</td>
          <td><span style="color:#10b981; font-weight:700; font-size:0.75rem;">● Active</span></td>
          <td style="font-size:0.75rem; color:var(--text-muted);">${createdStr}</td>
          <td style="text-align: right;">${actionsHtml}</td>
        </tr>
      `;
    }).join("");
  }

  openEditUserModal(userId) {
    const users = this.cachedUsersList || [];
    const user = users.find(u => String(u.id) === String(userId)) || (userId === "ADMIN" ? { id: "usr_admin_master", username: "ADMIN", display_name: "Administrator", role: "admin" } : null);
    if (!user) {
      if (window.quoteApp) window.quoteApp.showToast("User record not found", "error");
      return;
    }

    const modal = document.getElementById("modal-edit-user");
    if (!modal) return;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || "";
    };

    set("edit-user-id", user.id);
    set("edit-user-username", user.username);
    set("edit-user-fullname", user.display_name || user.username);
    set("edit-user-role", user.role || "sales");
    set("edit-user-phone", user.phone || "");
    set("edit-user-email", user.email || "");
    set("edit-user-password", "");
    set("edit-user-confirm-password", "");

    const errMsg = document.getElementById("edit-user-error");
    if (errMsg) errMsg.style.display = "none";

    const subTitle = document.getElementById("lbl-edit-user-subtitle");
    if (subTitle) subTitle.textContent = `Editing credentials for @${user.username} (${user.display_name || user.username})`;

    modal.classList.add("active");
  }

  closeEditUserModal() {
    const modal = document.getElementById("modal-edit-user");
    if (modal) modal.classList.remove("active");
  }

  async handleSaveEditUser(formEl) {
    const get = (id) => (document.getElementById(id)?.value || "").trim();
    const id = get("edit-user-id");
    const username = get("edit-user-username");
    const displayName = get("edit-user-fullname");
    const role = get("edit-user-role");
    const phone = get("edit-user-phone");
    const email = get("edit-user-email");
    const password = get("edit-user-password");
    const confirmPass = get("edit-user-confirm-password");
    const errMsg = document.getElementById("edit-user-error");
    const btn = document.getElementById("btn-save-edit-user");

    const showError = (msg) => {
      if (errMsg) {
        errMsg.textContent = msg;
        errMsg.style.display = "block";
      } else if (window.quoteApp) {
        window.quoteApp.showToast(msg, "error");
      }
    };

    if (errMsg) errMsg.style.display = "none";

    if (!username || username.length < 3) {
      showError("Username must be at least 3 characters long.");
      return;
    }
    if (!displayName) {
      showError("Display name is required.");
      return;
    }
    if (password && password.length < 4) {
      showError("New password must be at least 4 characters long.");
      return;
    }
    if (password && password !== confirmPass) {
      showError("Passwords do not match. Please re-enter.");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Saving Changes...</span>`;
    }

    try {
      const payload = {
        id,
        username,
        displayName,
        role,
        phone,
        email
      };
      if (password) payload.password = password;

      const res = await window.cloudDb.updateUser(payload, this.token);
      if (res && (res.success || !res.error)) {
        this.closeEditUserModal();
        if (window.quoteApp) {
          window.quoteApp.showToast(res.message || `Account '@${username}' updated successfully!`, "success");
        }
        await this.loadUsersTable();
        await this.fetchMasterSalesReps();

        // If the current admin user updated their own username
        if (this.username && (this.username.toUpperCase() === username.toUpperCase() || id === "usr_admin_master")) {
          this.username = username;
          this.displayName = displayName;
          sessionStorage.setItem("quotecraft_auth_user", username);
          sessionStorage.setItem("quotecraft_auth_display", displayName);
        }
      } else {
        showError(res?.error || "Failed to update user account.");
      }
    } catch (err) {
      console.error(err);
      showError("Server error while updating account.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>💾 Save User Changes</span>`;
      }
    }
  }

  async handleCreateUserForm(formEl) {
    const userInp = document.getElementById("new-user-username");
    const nameInp = document.getElementById("new-user-fullname");
    const passInp = document.getElementById("new-user-password");
    const phoneInp = document.getElementById("new-user-phone");
    const emailInp = document.getElementById("new-user-email");
    const btn = document.getElementById("btn-submit-create-user");

    const username = (userInp?.value || "").trim();
    const displayName = (nameInp?.value || "").trim();
    const password = (passInp?.value || "").trim();
    const phone = (phoneInp?.value || "").trim();
    const email = (emailInp?.value || "").trim();

    if (!username || username.length < 3) {
      if (window.quoteApp) window.quoteApp.showToast("Username must be at least 3 characters long.", "error");
      return;
    }
    if (!password || password.length < 4) {
      if (window.quoteApp) window.quoteApp.showToast("Password must be at least 4 characters long.", "error");
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Creating Account...</span>`;
    }

    try {
      const res = await window.cloudDb.createUser({
        username,
        displayName: displayName || username,
        password,
        phone,
        email,
        role: "sales"
      }, this.token);

      if (res.success) {
        if (window.quoteApp) {
          window.quoteApp.showToast(res.message || `Sales account '${username}' created successfully!`, "success");
        }
        if (formEl) formEl.reset();
        await this.fetchMasterSalesReps();
        await this.loadUsersTable();
      } else {
        if (window.quoteApp) {
          window.quoteApp.showToast(res.error || "Failed to create sales account.", "error");
        }
      }
    } catch (err) {
      console.error(err);
      if (window.quoteApp) window.quoteApp.showToast("Error creating sales account.", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>➕ Create Sales Account</span>`;
      }
    }
  }

  async handleDeleteUser(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete sales account "${username}"? This user will no longer be able to log in.`)) {
      return;
    }

    try {
      const res = await window.cloudDb.deleteUser(userId, this.token);
      if (res.success) {
        if (window.quoteApp) window.quoteApp.showToast(`Sales account "${username}" deleted successfully.`, "info");
        await this.fetchMasterSalesReps();
        await this.loadUsersTable();
      } else {
        if (window.quoteApp) window.quoteApp.showToast(res.error || "Failed to delete user.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async handleResetUserPassword(userId, username) {
    this.openEditUserModal(userId);
  }

  async loadAdminStats() {
    let stats = null;
    if (window.cloudDb) {
      const res = await window.cloudDb.fetchStats(this.token);
      if (res && res.success && res.stats) stats = res.stats;
    }

    if (!stats) {
      const localQuotes = window.cloudDb ? window.cloudDb.getLocalQuotes() : [];
      const totalCost = localQuotes.reduce((acc, q) => acc + Number(q.total_cost || 0), 0);
      const totalNet = localQuotes.reduce((acc, q) => acc + Number(q.net_cost || q.total_cost || 0), 0);
      const totalKw = localQuotes.reduce((acc, q) => acc + Number(q.kw_capacity || 0), 0);
      stats = {
        totalQuotes: localQuotes.length,
        totalKw: Math.round(totalKw * 10) / 10,
        totalRevenue: totalCost,
        totalNetRevenue: totalNet,
        salesReps: [],
        brands: [],
        dailyStats: []
      };
    }

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // 1. KPI Cards (Supports both ID formats)
    const formattedRev = "₹" + Math.round(Number(stats.totalRevenue || 0)).toLocaleString("en-IN");
    const formattedNet = "₹" + Math.round(Number(stats.totalNetRevenue || stats.totalRevenue || 0)).toLocaleString("en-IN");
    const formattedKw = (stats.totalKw || 0) + " kW";

    setVal("adm-stat-total-quotes", stats.totalQuotes || 0);
    setVal("stat-total-quotes", stats.totalQuotes || 0);

    setVal("adm-stat-total-kw", formattedKw);
    setVal("stat-total-kw", formattedKw);

    setVal("adm-stat-total-rev", formattedRev);
    setVal("stat-total-revenue", formattedRev);

    setVal("adm-stat-net-rev", formattedNet);

    // 2. Sales Team Performance Leaderboard
    const repsList = document.getElementById("stat-sales-reps-list");
    if (repsList) {
      if (!stats.salesReps || stats.salesReps.length === 0) {
        repsList.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding: 8px 0;">No sales rep data recorded yet.</div>`;
      } else {
        repsList.innerHTML = stats.salesReps.map((r, idx) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 10px; background: rgba(0,0,0,0.18); border-radius: 6px; font-size: 0.8rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 0.75rem; color: #10b981;">#${idx + 1}</span>
              <span style="font-weight: 600; color: var(--text-main);">👤 ${this.escape(r.sales_rep || "Direct")}</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 700;">${r.total_kw} kW</span>
              <span style="color: #10b981; font-weight: 700; font-size: 0.75rem;">${r.quote_count} quotes</span>
            </div>
          </div>
        `).join("");
      }
    }

    // 3. Solar Brands Market Share
    const brandsList = document.getElementById("stat-brands-list");
    if (brandsList) {
      if (!stats.brands || stats.brands.length === 0) {
        brandsList.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding: 8px 0;">No brand distribution recorded yet.</div>`;
      } else {
        brandsList.innerHTML = stats.brands.map(b => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 10px; background: rgba(0,0,0,0.18); border-radius: 6px; font-size: 0.8rem;">
            <span style="font-weight: 700; color: #38bdf8; text-transform: uppercase; font-size: 0.78rem;">☀️ ${this.escape(b.partner_brand || "Solar")}</span>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-size: 0.72rem; color: var(--text-secondary);">${b.kw || 0} kW</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700; font-size: 0.72rem;">${b.cnt} proposals</span>
            </div>
          </div>
        `).join("");
      }
    }

    // 4. Day-Wise Quotation History Breakdown
    const dailyList = document.getElementById("stat-daily-breakdown-list");
    if (dailyList) {
      if (!stats.dailyStats || stats.dailyStats.length === 0) {
        dailyList.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted); padding: 8px 0;">No daily activity recorded yet.</div>`;
      } else {
        dailyList.innerHTML = stats.dailyStats.map(d => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; background: rgba(0,0,0,0.18); border-radius: 6px; font-size: 0.8rem; border-left: 3px solid #10b981;">
            <div style="font-weight: 700; color: var(--text-main);">📅 ${this.formatDateDisplay(d.quote_date)}</div>
            <div style="display: flex; gap: 12px; align-items: center;">
              <span style="color: #38bdf8; font-weight: 700; font-size: 0.75rem;">${d.total_kw} kW</span>
              <span style="color: #10b981; font-weight: 700; font-size: 0.75rem;">${d.count} quotes</span>
              <span style="color: var(--text-main); font-weight: 800; font-size: 0.75rem;">₹${Math.round(Number(d.total_revenue || 0)).toLocaleString("en-IN")}</span>
            </div>
          </div>
        `).join("");
      }
    }
  }

  async loadQuoteIntoWorkspace(id) {
    if (window.cloudDb) {
      const quotesRes = await window.cloudDb.fetchQuotes("", this.token);
      const found = (quotesRes.quotes || []).find(q => q.id === id);
      if (!found) return;

      try {
        const parsed = (typeof found.quote_json === "string") ? JSON.parse(found.quote_json) : found.quote_json;
        state.currentQuote = parsed;
        state.notify();
        if (window.quoteApp) {
          window.quoteApp.renderFormFromState();
          window.quoteApp.showToast(`Loaded Quote ${found.quote_number}`, "success");
        }
        this.closeAdminDashboard();
      } catch (e) {
        console.error(e);
      }
    }
  }

  async deleteQuote(id) {
    if (!this.isAdmin) {
      if (window.quoteApp) window.quoteApp.showToast("⛔ Only Administrators have permission to delete quotations.", "error");
      else alert("Only Administrators have permission to delete quotations.");
      return;
    }

    if (!confirm("⚠️ Are you sure you want to permanently delete this quotation? This action cannot be undone.")) return;

    if (window.cloudDb) {
      const res = await window.cloudDb.deleteQuote(id, this.token);
      if (res && res.error) {
        if (window.quoteApp) window.quoteApp.showToast(`❌ ${res.error}`, "error");
        return;
      }
      if (window.quoteApp) window.quoteApp.showToast("🗑️ Quotation permanently deleted.", "info");
      await this.loadAdminQuotesTable();
      await this.loadAdminStats();
    }
  }

  async syncQuoteToBackend(quote) {
    if (!quote) return;
    try {
      const headers = { "Content-Type": "application/json" };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
      const resp = await fetch("/api/quotes", {
        method: "POST",
        headers,
        body: JSON.stringify({ quote })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (this.isLoggedIn()) {
          this.loadAdminQuotesTable();
          this.loadAdminStats();
        }
        return data;
      }
    } catch (e) {
      console.warn("syncQuoteToBackend error:", e);
    }
  }

  escape(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Instantiate Global Admin Auth Manager
window.adminAuth = new AdminAuthManager();
