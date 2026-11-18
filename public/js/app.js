/**
 * TRACE Money Manager Frontend Application
 * Fully responsive on mobile, tablet & desktop PCs
 * Backed by Node.js + SQLite REST API
 */

(function () {
  'use strict';

  // State store
  let appState = null;
  let currentTab = 'overview';
  let txMode = 'exp'; // 'exp' or 'inc'
  let selectedCategory = 'Food';
  let selectedSource = 'Pocket money';
  let selectedDateOffset = 0; // 0 = today, 1 = yesterday
  let currentTxIntent = 'need'; // 'need' or 'want'
  let currentTxFilter = 'all'; // 'all', 'need', 'want'

  const CATEGORIES = ['Food', 'Transport', 'Bills', 'Study', 'Shopping', 'Fun', 'Other'];
  const SOURCES = ['Pocket money', 'Part-time', 'Freelance', 'Gift', 'Other'];

  const CATEGORY_ICONS = {
    Food: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M14 2v20"/><path d="M6 2v20"/><path d="M4 2h4"/></svg>`,
    Transport: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="9" rx="2"/><path d="m5 11 2-5h10l2 5"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>`,
    Bills: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    Study: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    Shopping: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    Fun: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    Other: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`
  };

  const SOURCE_ICONS = {
    'Pocket money': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'Part-time': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    'Freelance': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
    'Gift': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
    'Other': `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`
  };

  const KEYWORD_MAP = {
    Food: ['chai', 'tea', 'lunch', 'dinner', 'breakfast', 'canteen', 'pizza', 'snack', 'coffee', 'momo', 'samosa', 'maggi', 'mess', 'juice', 'burger', 'swiggy', 'zomato'],
    Transport: ['auto', 'ride', 'bus', 'metro', 'uber', 'ola', 'cab', 'petrol', 'train', 'rickshaw', 'rapido', 'fuel', 'fare'],
    Bills: ['recharge', 'wifi', 'electricity', 'rent', 'bill', 'data pack', 'jio', 'airtel', 'vi'],
    Study: ['notebook', 'pen', 'book', 'printout', 'xerox', 'stationery', 'fees', 'course', 'exam', 'library', 'lab'],
    Shopping: ['shirt', 'shoes', 'amazon', 'myntra', 'headphones', 'jeans', 'earphones', 'flipkart', 'watch'],
    Fun: ['movie', 'game', 'netflix', 'spotify', 'party', 'concert', 'outing', 'pvr', 'pub']
  };

  // Helper DOM selectors
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Currency Formatter
  function fmt(n) {
    if (isNaN(n) || n === null) return '₹0';
    const isNeg = n < 0;
    return `${isNeg ? '-' : ''}₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
  }

  // Format date relative
  function formatRelativeDays(daysAgo) {
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return 'Yesterday';
    return `${daysAgo} days ago`;
  }

  // API Client
  async function api(endpoint, method = 'GET', body = null) {
    try {
      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(`/api${endpoint}`, opts);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Server request failed');
      return json.data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      Motion.toast(err.message || 'Connection error. Check your server.');
      throw err;
    }
  }

  // Fetch complete state and refresh views
  async function refreshState() {
    try {
      appState = await api('/state');
      renderCurrentView();
      renderGlobalHeader();
    } catch (e) {
      console.error('Failed to load initial state:', e);
    }
  }

  // Global Header Updates
  function renderGlobalHeader() {
    if (!appState) return;
    const { todayFormatted, financials } = appState;
    const dateEl = $('headerDate');
    if (dateEl) dateEl.textContent = todayFormatted;

    // Pulse card in PC sidebar
    const pulseText = $('sidebarPulseText');
    if (pulseText) {
      pulseText.textContent = `Safe: ${fmt(financials.safeToSpend)}/day`;
    }
  }

  // Theme Management (Light / Dark)
  const THEME_SUN_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  const THEME_MOON_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  function applyTheme(theme) {
    const valid = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', valid);
    if (document.body) document.body.setAttribute('data-theme', valid);
    try {
      localStorage.setItem('trace-theme', valid);
    } catch (e) { }

    const iconSvg = valid === 'dark' ? THEME_SUN_ICON : THEME_MOON_ICON;
    const titleText = valid === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme';

    $$('[data-action="toggle-theme"], #themeToggleBtn, #topbarThemeBtn').forEach(btn => {
      const iconWrap = btn.querySelector('.theme-btn-icon');
      if (iconWrap) {
        iconWrap.innerHTML = iconSvg;
      } else if (!btn.querySelector('.theme-btn-label')) {
        btn.innerHTML = iconSvg;
      }
      const label = btn.querySelector('.theme-btn-label');
      if (label) {
        label.textContent = valid === 'dark' ? 'Light' : 'Dark';
      }
      btn.title = titleText;
      btn.setAttribute('aria-label', titleText);
    });
  }

  // Route & View Switching
  function switchTab(tabName) {
    if (tabName === 'onboarding' || tabName === 'setup') {
      const onboardingView = $('onboardingView');
      const appLayout = $('appLayout');
      const loginView = $('loginView');
      if (onboardingView) onboardingView.style.display = 'flex';
      if (appLayout) appLayout.style.display = 'none';
      if (loginView) loginView.style.display = 'none';
      goToObStep(1);
      history.replaceState(null, '', '#onboarding');
      return;
    }

    const validTabs = ['overview', 'add', 'plan', 'insights', 'ask'];
    if (!validTabs.includes(tabName)) tabName = 'overview';
    currentTab = tabName;

    // Update URL hash without scroll jump
    history.replaceState(null, '', `#${tabName}`);

    // Update page title
    const headingEl = $('pageHeading');
    const TAB_TITLES = {
      overview: 'Dashboard',
      add: 'New Transaction',
      plan: 'Budget Plan & Settings',
      insights: 'Analytics & Insights',
      ask: 'AI Financial Advisor'
    };
    if (headingEl && TAB_TITLES[tabName]) {
      headingEl.textContent = TAB_TITLES[tabName];
    }

    // Update bottom nav & desktop sidebar active links
    $$('.bottom-tab, .nav-item a, .top-tab, .sidebar-nav-item').forEach(el => {
      if (el.dataset.tab === tabName) {
        el.setAttribute('aria-current', 'page');
      } else {
        el.removeAttribute('aria-current');
      }
    });

    // Toggle view sections
    $$('.view-section').forEach(sec => {
      sec.hidden = sec.id !== `view-${tabName}`;
    });

    renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render Current Tab View
  function renderCurrentView() {
    if (!appState) return;
    if (currentTab === 'overview') renderOverview();
    else if (currentTab === 'add') renderAddForm();
    else if (currentTab === 'plan') renderPlanView();
    else if (currentTab === 'insights') renderInsightsView();
    else if (currentTab === 'ask') renderAskView();
  }

  // ==========================================
  // 1. OVERVIEW / HOME VIEW
  // ==========================================
  function renderOverview() {
    const { financials, analytics, transactions, bills } = appState;

    // Uncalibrated account banner check
    const uncalibratedBanner = $('uncalibratedBanner');
    if (uncalibratedBanner) {
      if (financials.isOnboarded === false || (financials.balance === 0 && financials.totalIncome === 0)) {
        uncalibratedBanner.style.display = 'flex';
      } else {
        uncalibratedBanner.style.display = 'none';
      }
    }

    // Animate Hero numbers
    const heroSafeAmount = $('heroSafeAmount');
    if (heroSafeAmount) {
      Motion.animateNumber(heroSafeAmount, financials.safeToSpend, 650, '');
    }

    // Hero description & status pill
    const heroPeriodDesc = $('heroPeriodDesc');
    if (heroPeriodDesc) {
      heroPeriodDesc.textContent = financials.nextDay
        ? `Calculated over ${financials.horizon} day${financials.horizon > 1 ? 's' : ''} until your next money arrives.`
        : 'Spread over a 30-day window. Set your next expected money in the Plan tab.';
    }

    const heroStatusPill = $('heroStatusPill');
    if (heroStatusPill) {
      heroStatusPill.className = `status-pill ${financials.statusBadge}`;
      heroStatusPill.innerHTML = `
        <span class="pulse-dot" style="background: currentColor;"></span>
        <span>${financials.statusMessage}</span>
      `;
    }

    // Breakdown elements
    const heroBal = $('heroBalance');
    if (heroBal) Motion.animateNumber(heroBal, financials.balance, 500);

    const heroBuf = $('heroBuffer');
    if (heroBuf) Motion.animateNumber(heroBuf, financials.buffer, 500);

    const heroBills = $('heroBillsDue');
    if (heroBills) Motion.animateNumber(heroBills, financials.billsDue, 500);

    // Multi-grid stats
    const statRunway = $('statRunway');
    if (statRunway) {
      statRunway.textContent = financials.runway !== null ? `${financials.runway} days` : 'Calculating';
    }

    const statNextMoney = $('statNextMoney');
    if (statNextMoney) {
      if (financials.nextDay) {
        statNextMoney.textContent = financials.daysToNext <= 0 ? 'Due today' : `${financials.daysToNext} days`;
      } else {
        statNextMoney.textContent = 'Not set';
      }
    }

    const statDailyBurn = $('statDailyBurn');
    if (statDailyBurn) {
      statDailyBurn.textContent = fmt(financials.avgDailySpend);
    }

    const statUsable = $('statUsable');
    if (statUsable) {
      statUsable.textContent = fmt(financials.usable);
    }

    // Render You Want vs You Need Comparative Analysis
    renderNeedsVsWants(analytics.needsVsWants);

    // Render 7-day spending chart
    renderMiniChart(analytics.last7Days, analytics.maxDaySpend);

    // Render Recent Transactions (with filter and Want/Need badge)
    const txListEl = $('recentTxList');
    const emptyStateEl = $('txEmptyState');
    if (txListEl) {
      // Calculate filter counts
      const needCount = transactions.filter(t => t.type === 'exp' && t.classification !== 'want').length;
      const wantCount = transactions.filter(t => t.type === 'exp' && t.classification === 'want').length;
      if ($('filterNeedCount')) $('filterNeedCount').textContent = needCount;
      if ($('filterWantCount')) $('filterWantCount').textContent = wantCount;

      let filteredTx = transactions;
      if (currentTxFilter === 'need') {
        filteredTx = transactions.filter(t => t.type === 'inc' || t.classification !== 'want');
      } else if (currentTxFilter === 'want') {
        filteredTx = transactions.filter(t => t.classification === 'want');
      }

      if (filteredTx.length === 0) {
        if (emptyStateEl) {
          emptyStateEl.style.display = 'flex';
          const emptySub = emptyStateEl.querySelector('.empty-state-sub');
          if (emptySub) {
            emptySub.textContent = currentTxFilter === 'all'
              ? 'Log an expense or income entry using the buttons above to begin tracking.'
              : `No transactions tagged as ${currentTxFilter === 'need' ? 'Needs' : 'Wants'} recorded yet.`;
          }
          txListEl.innerHTML = '';
        } else {
          txListEl.innerHTML = `<li class="empty-state">No ${currentTxFilter === 'all' ? '' : (currentTxFilter === 'need' ? 'Needs' : 'Wants')} transactions recorded.</li>`;
        }
      } else {
        if (emptyStateEl) emptyStateEl.style.display = 'none';
        txListEl.innerHTML = filteredTx.slice(0, 10).map(tx => {
          const isInc = tx.type === 'inc';
          const icon = isInc ? (SOURCE_ICONS[tx.category] || SOURCE_ICONS['Other']) : (CATEGORY_ICONS[tx.category] || CATEGORY_ICONS['Other']);
          const daysAgo = appState.todayOffset - tx.date_offset;
          const isWant = tx.classification === 'want';
          const intentBadge = isInc ? '' : `
            <button type="button" class="intent-badge ${isWant ? 'want' : 'need'}" data-act="toggle-intent" data-id="${tx.id}" data-current="${isWant ? 'want' : 'need'}" title="Toggle between You Need / You Want">
              ${isWant ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Want' : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> Need'}
            </button>
          `;

          return `
            <li class="list-item">
              <div class="category-icon">${icon}</div>
              <div class="item-content">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="item-title">${escapeHtml(tx.title)}</span>
                  ${intentBadge}
                </div>
                <div class="item-meta">${escapeHtml(tx.category)} · ${formatRelativeDays(daysAgo)}</div>
              </div>
              <div class="item-amount ${isInc ? 'income' : 'expense'}">
                ${isInc ? '+' : '-'}${fmt(tx.amount)}
              </div>
              <button class="delete-btn" data-act="del-tx" data-id="${tx.id}" aria-label="Delete entry" title="Delete">×</button>
            </li>
          `;
        }).join('');
      }
    }

    // Render Dashboard Cashflow Overview Stats
    const totalInflow = transactions.filter(t => t.type === 'inc').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const totalOutflow = transactions.filter(t => t.type === 'exp').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const netFlow = totalInflow - totalOutflow;

    const dashInc = $('dashIncome');
    if (dashInc) dashInc.textContent = fmt(totalInflow);
    const dashExp = $('dashExpenses');
    if (dashExp) dashExp.textContent = fmt(totalOutflow);
    const dashNet = $('dashNetSavings');
    if (dashNet) {
      dashNet.textContent = (netFlow >= 0 ? '+' : '') + fmt(netFlow);
      dashNet.className = `cashflow-val ${netFlow >= 0 ? 'income' : 'expense'}`;
    }

    // Render Upcoming Bills widget (Top 3 unpaid)
    const upcomingBillsList = $('upcomingBillsList');
    if (upcomingBillsList) {
      const unpaid = bills.filter(b => !b.paid).sort((a, b) => a.due_offset - b.due_offset);
      if (unpaid.length === 0) {
        upcomingBillsList.innerHTML = '<li class="empty-state-mini">No pending bills right now. All clear.</li>';
      } else {
        upcomingBillsList.innerHTML = unpaid.slice(0, 3).map(bill => {
          const daysLeft = bill.due_offset - appState.todayOffset;
          const dueBadge = daysLeft < 0 ? 'Overdue!' : daysLeft === 0 ? 'Due today' : `Due in ${daysLeft}d`;
          return `
            <li class="cashflow-item">
              <div style="display: flex; flex-direction: column; min-width: 0;">
                <span class="item-title" style="font-size: 13px;">${escapeHtml(bill.name)}</span>
                <span style="font-size: 11px; color: ${daysLeft <= 2 ? '#ef4444' : 'var(--ink-secondary)'}; font-weight: 600;">
                  ${dueBadge}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; font-weight: 600;">${fmt(bill.amount)}</span>
                <button type="button" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" data-act="pay-bill" data-id="${bill.id}">Pay</button>
              </div>
            </li>
          `;
        }).join('');
      }
    }
  }

  // Render You Want vs You Need Comparison Card & Meters
  function renderNeedsVsWants(nw) {
    if (!nw) return;

    // Overview Page elements
    const compNeedPct = $('compNeedPct');
    const compWantPct = $('compWantPct');
    const compMeterNeed = $('compMeterNeed');
    const compMeterWant = $('compMeterWant');
    const compNeedAmount = $('compNeedAmount');
    const compWantAmount = $('compWantAmount');
    const compNeedCount = $('compNeedCount');
    const compWantCount = $('compWantCount');
    const compAdviceText = $('compAdviceText');
    const compAdviceBanner = $('compAdviceBanner');
    const compStatusBadge = $('compStatusBadge');

    if (compNeedPct) compNeedPct.textContent = `${nw.needsPct}%`;
    if (compWantPct) compWantPct.textContent = `${nw.wantsPct}%`;
    if (compMeterNeed) compMeterNeed.style.width = `${nw.needsPct}%`;
    if (compMeterWant) compMeterWant.style.width = `${nw.wantsPct}%`;
    if (compNeedAmount) Motion.animateNumber(compNeedAmount, nw.totalNeeds, 500);
    if (compWantAmount) Motion.animateNumber(compWantAmount, nw.totalWants, 500);
    if (compNeedCount) compNeedCount.textContent = `${nw.needsCount} entries · Mess, Travel, Study, Bills`;
    if (compWantCount) compWantCount.textContent = `${nw.wantsCount} entries · Treats, Snacks, Shopping, Fun`;
    if (compAdviceText) compAdviceText.textContent = nw.comparisonAdvice;
    if (compAdviceBanner) compAdviceBanner.className = `comparison-advice-banner ${nw.comparisonStatus}`;
    if (compStatusBadge) {
      compStatusBadge.textContent = nw.comparisonStatus === 'danger' ? 'Heavy Wants' : (nw.comparisonStatus === 'warning' ? 'Watch Treats' : 'Disciplined');
      compStatusBadge.className = `status-pill ${nw.comparisonStatus === 'danger' ? 'bad' : (nw.comparisonStatus === 'warning' ? 'warn' : 'ok')}`;
    }

    // Insights Page elements
    const insNeedPct = $('insCompNeedPct');
    if (insNeedPct) {
      insNeedPct.textContent = `${nw.needsPct}%`;
      const insWantPct = $('insCompWantPct');
      if (insWantPct) insWantPct.textContent = `${nw.wantsPct}%`;
      const insMeterNeed = $('insCompMeterNeed');
      if (insMeterNeed) insMeterNeed.style.width = `${nw.needsPct}%`;
      const insMeterWant = $('insCompMeterWant');
      if (insMeterWant) insMeterWant.style.width = `${nw.wantsPct}%`;
      Motion.animateNumber($('insCompNeedAmount'), nw.totalNeeds, 500);
      Motion.animateNumber($('insCompWantAmount'), nw.totalWants, 500);
      const insAdvice = $('insCompAdviceText');
      if (insAdvice) insAdvice.textContent = nw.comparisonAdvice;
      const insBanner = $('insCompAdviceBanner');
      if (insBanner) insBanner.className = `comparison-advice-banner ${nw.comparisonStatus}`;
    }
  }

  // 7-Day Interactive Spending Chart
  function renderMiniChart(days, maxVal) {
    const chartContainer = $('chartBars');
    if (!chartContainer) return;
    const safeMax = Math.max(maxVal, 100);

    chartContainer.innerHTML = days.map(d => {
      const heightPercent = Math.max(5, Math.round((d.amount / safeMax) * 100));
      return `
        <div class="chart-col ${d.isToday ? 'is-today' : ''}">
          <div class="chart-tooltip">${d.dayLabel} (${d.formattedDate}): ${fmt(d.amount)}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="height: ${heightPercent}%"></div>
          </div>
          <span class="chart-day-label">${d.dayLabel}</span>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // 2. ADD ENTRY VIEW
  // ==========================================
  function renderAddForm() {
    renderCategoryChips();
    renderDateChips();
    renderIntentButtons();
    updateAddPreview();
  }

  function renderIntentButtons() {
    const needBtn = $('intentNeedBtn');
    const wantBtn = $('intentWantBtn');
    if (needBtn && wantBtn) {
      needBtn.classList.toggle('active', currentTxIntent === 'need');
      wantBtn.classList.toggle('active', currentTxIntent === 'want');
    }
    const intentBox = $('addIntentBox');
    if (intentBox) {
      intentBox.hidden = txMode !== 'exp';
    }
  }

  function renderCategoryChips() {
    const chipBox = $('categoryChips');
    if (!chipBox) return;
    const list = txMode === 'exp' ? CATEGORIES : SOURCES;
    const current = txMode === 'exp' ? selectedCategory : selectedSource;

    chipBox.innerHTML = list.map(item => `
      <button type="button" class="chip" data-chip="${item}" aria-pressed="${item === current}">
        ${txMode === 'exp' ? (CATEGORY_ICONS[item] || '') : (SOURCE_ICONS[item] || '')} ${item}
      </button>
    `).join('');
  }

  function renderDateChips() {
    const dateBox = $('dateChips');
    if (!dateBox) return;
    const opts = [
      { label: 'Today', offset: 0 },
      { label: 'Yesterday', offset: 1 }
    ];
    dateBox.innerHTML = opts.map(o => `
      <button type="button" class="chip" data-offset="${o.offset}" aria-pressed="${selectedDateOffset === o.offset}">
        ${o.label}
      </button>
    `).join('');
  }

  // Live impact calculation as user types amount in Add Form
  function updateAddPreview() {
    const amountVal = parseFloat($('addAmountInput').value) || 0;
    const impactEl = $('impactPreviewText');
    if (!impactEl || !appState) return;

    const { safeToSpend, horizon, bufferPercent } = appState.financials;

    if (amountVal <= 0) {
      if (txMode === 'exp') {
        impactEl.innerHTML = `Current safe-to-spend is <b>${fmt(safeToSpend)}/day</b> over ${horizon} days.`;
      } else {
        impactEl.innerHTML = `<b>${bufferPercent}%</b> of every income goes automatically to your emergency safety buffer.`;
      }
      return;
    }

    if (txMode === 'exp') {
      const newDaily = Math.max(0, (appState.financials.usable - amountVal) / Math.max(1, horizon));
      const diff = safeToSpend - newDaily;
      const intentLabel = currentTxIntent === 'want'
        ? `<span style="color:#b062bd; font-weight:800;">✨ You Want</span> (Discretionary)`
        : `<span style="color:var(--brand-mint); font-weight:800;">🛡️ You Need</span> (Essential)`;
      impactEl.innerHTML = `Tagged as ${intentLabel}. Logging <b>${fmt(amountVal)}</b> adjusts safe-to-spend from <b>${fmt(safeToSpend)}</b> to <b>${fmt(newDaily)}/day</b> (-${fmt(diff)}/day).`;
    } else {
      const bufferShare = Math.round((amountVal * bufferPercent) / 100);
      const usableShare = amountVal - bufferShare;
      const boostDaily = usableShare / Math.max(1, horizon);
      impactEl.innerHTML = `Income <b>${fmt(amountVal)}</b>: <b>${fmt(bufferShare)}</b> goes to buffer (${bufferPercent}%), boosting safe-to-spend by <b>+${fmt(boostDaily)}/day</b>!`;
    }
  }

  // Auto-category guesser based on title input
  function guessCategory(title) {
    const lower = title.toLowerCase();
    for (const [cat, words] of Object.entries(KEYWORD_MAP)) {
      if (words.some(w => lower.includes(w))) return cat;
    }
    return null;
  }

  // ==========================================
  // 3. PLAN & RUNWAY VIEW
  // ==========================================
  function renderPlanView() {
    const { financials, bills } = appState;

    // Next Money Countdown
    const nextDaysInput = $('planNextDaysInput');
    const nextDaysHint = $('planNextDaysHint');
    if (nextDaysHint) {
      if (financials.nextDay) {
        nextDaysHint.innerHTML = `Next money expected in <b>${financials.daysToNext} days</b>. Safe to spend spreads until then.`;
      } else {
        nextDaysHint.textContent = 'No arrival date set. Safe-to-spend uses a standard 30-day horizon.';
      }
    }

    // Safety Buffer
    const bufferProgressFill = $('planBufferFill');
    if (bufferProgressFill) {
      bufferProgressFill.style.width = `${financials.bufferProgress}%`;
    }

    const bufferStatsHint = $('planBufferHint');
    if (bufferStatsHint) {
      bufferStatsHint.innerHTML = `Saved <b>${fmt(financials.buffer)}</b> of <b>${fmt(financials.bufferGoal)}</b> goal (${financials.bufferProgress}% filled). <b>${financials.bufferPercent}%</b> of all incoming cash auto-deposits here.`;
    }

    const bufferRange = $('planBufferRange');
    const bufferRangeVal = $('planBufferRangeVal');
    if (bufferRange) bufferRange.value = financials.bufferPercent;
    if (bufferRangeVal) bufferRangeVal.textContent = `${financials.bufferPercent}%`;

    const bufferGoalInput = $('planBufferGoalInput');
    if (bufferGoalInput) bufferGoalInput.value = financials.bufferGoal;

    // Full Bills List in Plan
    const fullBillsList = $('planBillsList');
    if (fullBillsList) {
      if (bills.length === 0) {
        fullBillsList.innerHTML = '<li class="empty-state">No bills recorded. Add hostel rent, mess fees, or recharges below.</li>';
      } else {
        fullBillsList.innerHTML = bills.map(b => {
          const daysLeft = b.due_offset - appState.todayOffset;
          const statusText = b.paid ? '<span style="color:var(--brand-mint);font-weight:700;">✓ Paid</span>' : (daysLeft < 0 ? '<span style="color:var(--color-bad);font-weight:700;">Overdue</span>' : `Due in ${daysLeft} days`);
          return `
            <li class="list-item">
              <div class="category-icon">${b.paid ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : CATEGORY_ICONS['Bills']}</div>
              <div class="item-content">
                <div class="item-title">${escapeHtml(b.name)}</div>
                <div class="item-meta">${statusText}</div>
              </div>
              <div class="item-amount">${fmt(b.amount)}</div>
              ${!b.paid ? `<button class="btn-secondary" style="padding:6px 14px; font-size:13px;" data-act="pay-bill" data-id="${b.id}">Pay</button>` : ''}
              <button class="delete-btn" data-act="del-bill" data-id="${b.id}" aria-label="Remove bill">×</button>
            </li>
          `;
        }).join('');
      }
    }
  }

  // ==========================================
  // 4. INSIGHTS VIEW
  // ==========================================
  function renderInsightsView() {
    const { financials, analytics } = appState;

    const inEl = $('insMoneyIn');
    if (inEl) Motion.animateNumber(inEl, financials.totalIncome, 500);

    const outEl = $('insMoneyOut');
    if (outEl) Motion.animateNumber(outEl, financials.totalExpense, 500);

    // Large 7-Day Chart
    renderMiniChart(analytics.last7Days, analytics.maxDaySpend);

    // Category distribution bars
    const catContainer = $('insCategoryBars');
    if (catContainer) {
      if (analytics.categoryBreakdown.length === 0) {
        catContainer.innerHTML = '<p class="empty-state">No spending data yet to display category breakdown.</p>';
      } else {
        catContainer.innerHTML = analytics.categoryBreakdown.map(c => `
          <div class="cat-row">
            <div class="cat-header">
              <span>${CATEGORY_ICONS[c.category] || ''} ${c.category}</span>
              <b>${fmt(c.amount)} (${c.percentage}%)</b>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${c.percentage}%; background-color: ${c.color};"></div>
            </div>
          </div>
        `).join('');
      }
    }

    // Income arrival cadence
    const patternText = $('insIncomePatternText');
    if (patternText) {
      patternText.textContent = analytics.incomePatternText;
    }
  }

  // ==========================================
  // 5. ASK AI ASSISTANT VIEW
  // ==========================================
  async function renderAskView() {
    const chatBox = $('chatMessages');
    if (!chatBox) return;

    try {
      const messages = await api('/chat');
      chatBox.innerHTML = messages.map(m => `
        <div class="message-bubble ${m.role}">
          ${escapeHtml(m.content)}
        </div>
      `).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
      console.warn('Could not load chat messages:', e);
    }
  }

  async function sendChatMessage(customQuestion = null) {
    const input = $('chatInput');
    const question = customQuestion || input.value.trim();
    if (!question) return;

    const chatBox = $('chatMessages');
    if (!customQuestion) input.value = '';

    // Append user message immediately
    const userBubble = document.createElement('div');
    userBubble.className = 'message-bubble user';
    userBubble.textContent = question;
    chatBox.appendChild(userBubble);

    // Append typing bubble
    const typingBubble = document.createElement('div');
    typingBubble.className = 'message-bubble assistant';
    typingBubble.id = 'activeTyping';
    typingBubble.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    chatBox.appendChild(typingBubble);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const res = await api('/ask', 'POST', { question });
      const activeTyping = $('activeTyping');
      if (activeTyping) {
        activeTyping.textContent = res.content;
        activeTyping.removeAttribute('id');
      }
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) {
      const activeTyping = $('activeTyping');
      if (activeTyping) {
        activeTyping.textContent = "Sorry, couldn't get financial advice right now. Please try again.";
        activeTyping.removeAttribute('id');
      }
    }
  }

  // ==========================================
  // Event Delegations & Handlers
  // ==========================================
  function setupEventListeners() {
    // Navigation & Quick Action clicks
    document.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action-mode]');
      if (actionBtn) {
        e.preventDefault();
        const mode = actionBtn.dataset.actionMode;
        switchTab('add');
        if (mode === 'exp' && $('modeExpBtn')) $('modeExpBtn').click();
        if (mode === 'inc' && $('modeIncBtn')) $('modeIncBtn').click();
        Motion.haptic(10);
        return;
      }
      const navLink = e.target.closest('[data-tab]');
      if (navLink) {
        e.preventDefault();
        const tab = navLink.dataset.tab;
        switchTab(tab);
        Motion.haptic(10);
      }
    });

    // Direct Onboarding Trigger from Login screen
    const directOnboardingBtn = $('directOnboardingBtn');
    if (directOnboardingBtn) {
      directOnboardingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setStoredAuth({ email: REGISTERED_CREDENTIALS.email, name: 'Trace User' });
        try { localStorage.removeItem('trace_onboarded'); } catch (err) { }
        updateAuthUI({ email: REGISTERED_CREDENTIALS.email, name: 'Trace User' });
        goToObStep(1);
        Motion.toast('Setup Wizard opened.');
        Motion.haptic(10);
      });
    }

    // Launch Setup Banner Button from Dashboard
    const launchSetupBannerBtn = $('launchSetupBannerBtn');
    if (launchSetupBannerBtn) {
      launchSetupBannerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { localStorage.removeItem('trace_onboarded'); } catch (err) { }
        const onboardingView = $('onboardingView');
        const appLayout = $('appLayout');
        if (onboardingView) onboardingView.style.display = 'flex';
        if (appLayout) appLayout.style.display = 'none';
        goToObStep(1);
        Motion.toast('Setup Wizard opened.');
        Motion.haptic(10);
      });
    }

    // Theme Toggle (Supports all toggle buttons across sidebar, topbar & dialogs)
    $$('[data-action="toggle-theme"], #themeToggleBtn, #topbarThemeBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        Motion.toast(`Switched to ${newTheme} theme`);
        Motion.haptic(10);
      });
    });

    // View Mode Toggle (Desktop Dashboard vs Mobile View)
    $$('.view-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.view-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        const wrapper = $('appWrapper');
        if (mode === 'mobile') {
          wrapper.classList.add('simulator-mode');
          Motion.toast('Switched to Mobile App frame');
        } else {
          wrapper.classList.remove('simulator-mode');
          Motion.toast('Expanded to Desktop Dashboard');
        }
      });
    });

    // Add Form Mode Toggle (Expense vs Income)
    const modeExpBtn = $('modeExpBtn');
    const modeIncBtn = $('modeIncBtn');
    if (modeExpBtn && modeIncBtn) {
      modeExpBtn.addEventListener('click', () => {
        txMode = 'exp';
        modeExpBtn.setAttribute('aria-pressed', 'true');
        modeIncBtn.setAttribute('aria-pressed', 'false');
        $('scannerDropzone').hidden = false;
        $('studentPresetsBox').hidden = false;
        $('addIntentBox').hidden = false;
        $('addTitleInput').placeholder = 'What was it for? e.g. canteen lunch';
        renderCategoryChips();
        renderIntentButtons();
        updateAddPreview();
      });

      modeIncBtn.addEventListener('click', () => {
        txMode = 'inc';
        modeIncBtn.setAttribute('aria-pressed', 'true');
        modeExpBtn.setAttribute('aria-pressed', 'false');
        $('scannerDropzone').hidden = true;
        $('studentPresetsBox').hidden = true;
        $('addIntentBox').hidden = true;
        $('addTitleInput').placeholder = 'Note, optional. e.g. Freelance project, Dad sent';
        renderCategoryChips();
        renderIntentButtons();
        updateAddPreview();
      });
    }

    // You Want vs You Need Classification Selector
    const intentNeedBtn = $('intentNeedBtn');
    const intentWantBtn = $('intentWantBtn');
    if (intentNeedBtn && intentWantBtn) {
      intentNeedBtn.addEventListener('click', () => {
        currentTxIntent = 'need';
        intentNeedBtn.classList.add('active');
        intentWantBtn.classList.remove('active');
        updateAddPreview();
        Motion.haptic(8);
      });
      intentWantBtn.addEventListener('click', () => {
        currentTxIntent = 'want';
        intentWantBtn.classList.add('active');
        intentNeedBtn.classList.remove('active');
        updateAddPreview();
        Motion.haptic(8);
      });
    }

    // Add Form Amount Input
    const addAmt = $('addAmountInput');
    if (addAmt) {
      addAmt.addEventListener('input', () => updateAddPreview());
    }

    // Add Form Title Input (Auto-Category Guesser)
    const addTitle = $('addTitleInput');
    if (addTitle) {
      addTitle.addEventListener('input', (e) => {
        if (txMode !== 'exp') return;
        const guessed = guessCategory(e.target.value);
        if (guessed && guessed !== selectedCategory) {
          selectedCategory = guessed;
          renderCategoryChips();
          updateAddPreview();
        }
      });
    }

    // Category Chip selection
    const chipContainer = $('categoryChips');
    if (chipContainer) {
      chipContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-chip]');
        if (chip) {
          if (txMode === 'exp') {
            selectedCategory = chip.dataset.chip;
            if (['Shopping', 'Fun'].includes(selectedCategory)) currentTxIntent = 'want';
            else if (['Bills', 'Study'].includes(selectedCategory)) currentTxIntent = 'need';
            renderIntentButtons();
          } else {
            selectedSource = chip.dataset.chip;
          }
          renderCategoryChips();
          updateAddPreview();
          Motion.haptic(8);
        }
      });
    }

    // Date Chip selection
    const dateChipContainer = $('dateChips');
    if (dateChipContainer) {
      dateChipContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-offset]');
        if (chip) {
          selectedDateOffset = parseInt(chip.dataset.offset, 10);
          renderDateChips();
          Motion.haptic(8);
        }
      });
    }

    // Student Presets Click
    const presetsBox = $('studentPresetsBox');
    if (presetsBox) {
      presetsBox.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset-amt]');
        if (btn) {
          $('addAmountInput').value = btn.dataset.presetAmt;
          $('addTitleInput').value = btn.dataset.presetTitle;
          selectedCategory = btn.dataset.presetCat;
          renderCategoryChips();
          updateAddPreview();
          Motion.haptic(10);
        }
      });
    }

    // Save Transaction Button
    const saveBtn = $('saveTxBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const amount = parseFloat($('addAmountInput').value);
        const title = $('addTitleInput').value.trim();

        if (isNaN(amount) || amount <= 0) {
          Motion.toast('Enter an amount above zero');
          $('addAmountInput').focus();
          return;
        }

        const dateOffset = appState.todayOffset - selectedDateOffset;
        const category = txMode === 'exp' ? selectedCategory : selectedSource;

        try {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving…';
          const res = await api('/transactions', 'POST', {
            type: txMode,
            title,
            amount,
            category,
            dateOffset,
            classification: currentTxIntent
          });

          appState = res.state;
          $('addAmountInput').value = '';
          $('addTitleInput').value = '';
          selectedDateOffset = 0;

          Motion.toast(txMode === 'exp' ? 'Expense logged!' : 'Income saved!');
          switchTab('overview');
        } catch (e) {
          console.error(e);
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Entry
          `;
        }
      });
    }

    // Bill Scanner File Upload
    const scanInput = $('billFileInput');
    const dropzone = $('scannerDropzone');
    if (scanInput && dropzone) {
      scanInput.addEventListener('change', async () => {
        const file = scanInput.files[0];
        if (!file) return;

        dropzone.classList.add('scanning');
        const hint = $('scannerHint');
        if (hint) hint.textContent = 'Reading receipt with AI & OCR…';

        const formData = new FormData();
        formData.append('billImage', file);

        try {
          const res = await fetch('/api/scan-bill', {
            method: 'POST',
            body: formData
          });
          const json = await res.json();
          if (json.success && json.data) {
            const { merchant, amount, category } = json.data;
            if (amount) $('addAmountInput').value = amount;
            if (merchant) $('addTitleInput').value = merchant;
            if (category && CATEGORIES.includes(category)) {
              selectedCategory = category;
              renderCategoryChips();
            }
            updateAddPreview();
            Motion.toast('Bill parsed! Review & tap Save');
            if (hint) hint.textContent = `Extracted: ${merchant || 'Bill'} · ₹${amount || 0}`;
          }
        } catch (err) {
          console.error('Scan error:', err);
          Motion.toast('Could not parse image. You can type it manually.');
          if (hint) hint.textContent = 'Photo uploaded. Fill in details.';
        } finally {
          dropzone.classList.remove('scanning');
          scanInput.value = '';
        }
      });
    }

    // Plan Actions (Set Next Money, Slider, Goal, Add Bill)
    const setNextBtn = $('setNextMoneyBtn');
    if (setNextBtn) {
      setNextBtn.addEventListener('click', async () => {
        const days = parseInt($('planNextDaysInput').value, 10);
        if (isNaN(days) || days < 0 || days > 365) {
          Motion.toast('Enter days between 0 and 365');
          return;
        }
        appState = await api('/plan', 'PUT', { nextDays: days });
        $('planNextDaysInput').value = '';
        renderPlanView();
        renderGlobalHeader();
        Motion.toast('Next money arrival set');
      });
    }

    const clearNextBtn = $('clearNextMoneyBtn');
    if (clearNextBtn) {
      clearNextBtn.addEventListener('click', async () => {
        appState = await api('/plan', 'PUT', { clearNextDay: true });
        renderPlanView();
        renderGlobalHeader();
        Motion.toast('Next money date cleared (using 30-day window)');
      });
    }

    const bufferRange = $('planBufferRange');
    if (bufferRange) {
      bufferRange.addEventListener('input', (e) => {
        $('planBufferRangeVal').textContent = `${e.target.value}%`;
      });
      bufferRange.addEventListener('change', async (e) => {
        appState = await api('/plan', 'PUT', { pct: parseInt(e.target.value, 10) });
        renderPlanView();
        Motion.toast(`Buffer rule set to ${e.target.value}%`);
      });
    }

    const setGoalBtn = $('setBufferGoalBtn');
    if (setGoalBtn) {
      setGoalBtn.addEventListener('click', async () => {
        const goal = parseFloat($('planBufferGoalInput').value);
        if (isNaN(goal) || goal <= 0) {
          Motion.toast('Enter a positive buffer goal');
          return;
        }
        appState = await api('/plan', 'PUT', { goal });
        renderPlanView();
        Motion.toast('Buffer savings goal updated');
      });
    }

    // Add Bill
    const addBillBtn = $('addBillBtn');
    if (addBillBtn) {
      addBillBtn.addEventListener('click', async () => {
        const name = $('newBillName').value.trim();
        const amount = parseFloat($('newBillAmount').value);
        const days = parseInt($('newBillDays').value, 10);

        if (!name || isNaN(amount) || amount <= 0 || isNaN(days) || days < 0) {
          Motion.toast('Enter bill title, amount, and due days');
          return;
        }

        const res = await api('/bills', 'POST', { name, amount, dueInDays: days });
        appState = res.state;
        $('newBillName').value = '';
        $('newBillAmount').value = '';
        $('newBillDays').value = '';
        renderPlanView();
        Motion.toast('Upcoming bill added');
      });
    }

    // Chat Ask Input & Prompt Chips
    const chatInput = $('chatInput');
    const chatSendBtn = $('chatSendBtn');
    if (chatSendBtn && chatInput) {
      chatSendBtn.addEventListener('click', () => sendChatMessage());
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
      });
    }

    const promptChipsBox = $('chatPromptChips');
    if (promptChipsBox) {
      promptChipsBox.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-q]');
        if (chip) {
          sendChatMessage(chip.dataset.q);
          Motion.haptic(10);
        }
      });
    }

    // Delegated actions for Delete Tx, Pay Bill, Remove Bill, Intent Toggle, Filtering
    document.addEventListener('click', async (e) => {
      // Handle Needs vs Wants transaction filter pills
      const filterPill = e.target.closest('[data-tx-filter]');
      if (filterPill) {
        $$('.tx-filter-pill').forEach(b => b.classList.remove('active'));
        filterPill.classList.add('active');
        currentTxFilter = filterPill.dataset.txFilter;
        renderOverview();
        Motion.haptic(8);
        return;
      }

      const target = e.target.closest('[data-act]');
      if (!target) return;
      const act = target.dataset.act;
      const id = target.dataset.id;

      if (act === 'toggle-intent') {
        const current = target.dataset.current;
        const nextIntent = current === 'want' ? 'need' : 'want';
        try {
          appState = await api(`/transactions/${id}/classification`, 'PATCH', { classification: nextIntent });
          renderCurrentView();
          Motion.toast(`Switched to ${nextIntent === 'want' ? '✨ You Want' : '🛡️ You Need'}`);
        } catch (err) {
          console.error('Error toggling classification:', err);
        }
        return;
      }

      if (act === 'del-tx') {
        if (confirm('Delete this transaction?')) {
          appState = await api(`/transactions/${id}`, 'DELETE');
          renderCurrentView();
          Motion.toast('Entry removed');
        }
      } else if (act === 'pay-bill') {
        appState = await api(`/bills/${id}/pay`, 'PATCH');
        renderCurrentView();
        Motion.toast('Bill paid & logged in expenses!');
      } else if (act === 'del-bill') {
        if (confirm('Remove this bill?')) {
          appState = await api(`/bills/${id}`, 'DELETE');
          renderCurrentView();
          Motion.toast('Bill removed');
        }
      } else if (act === 'load-sample') {
        if (confirm('Reset to student sample data?')) {
          appState = await api('/reset-sample', 'POST');
          renderCurrentView();
          Motion.toast('Sample data loaded');
        }
      } else if (act === 'clear-all') {
        if (confirm('Clear all your data? This cannot be undone.')) {
          appState = await api('/clear-all', 'POST');
          renderCurrentView();
          Motion.toast('All data cleared');
        }
      } else if (act === 'export-data') {
        window.location.href = '/api/export';
      }
    });

    // API Key Settings Modal
    const apiKeyModal = $('apiKeyModal');
    const openApiKeyBtn = $('apiKeySettingsBtn');
    const closeApiKeyBtn = $('closeApiKeyModalBtn');
    const saveApiKeyBtn = $('saveApiKeyBtn');
    const clearApiKeyBtn = $('clearApiKeyBtn');
    const apiKeyInput = $('apiKeyInput');
    const aiProviderSelect = $('aiProviderSelect');
    const toggleKeyVisBtn = $('toggleApiKeyVisibility');
    const keyBadge = $('apiKeyStatusBadge');

    async function loadApiKeyStatus() {
      try {
        const config = await api('/ai-config');
        if (config && config.configured) {
          if (keyBadge) {
            keyBadge.textContent = `🟢 ${config.provider.toUpperCase()} Connected`;
            keyBadge.className = 'status-pill ok';
          }
          if (apiKeyInput) apiKeyInput.placeholder = `Configured: ${config.preview}`;
          if (aiProviderSelect) aiProviderSelect.value = config.provider || 'gemini';
        } else {
          if (keyBadge) {
            keyBadge.textContent = 'Offline Engine';
            keyBadge.className = 'status-pill warn';
          }
          if (apiKeyInput) apiKeyInput.placeholder = 'Paste your API key here (AIzaSy...)';
        }
      } catch (e) {
        console.warn('Could not load AI config:', e);
      }
    }

    if (openApiKeyBtn && apiKeyModal) {
      openApiKeyBtn.addEventListener('click', () => {
        loadApiKeyStatus();
        apiKeyModal.showModal();
        Motion.haptic(10);
      });

      if (closeApiKeyBtn) {
        closeApiKeyBtn.addEventListener('click', () => apiKeyModal.close());
      }

      apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) apiKeyModal.close();
      });

      if (toggleKeyVisBtn && apiKeyInput) {
        toggleKeyVisBtn.addEventListener('click', () => {
          const isPass = apiKeyInput.type === 'password';
          apiKeyInput.type = isPass ? 'text' : 'password';
          toggleKeyVisBtn.textContent = isPass ? 'Hide' : 'Show';
        });
      }

      if (saveApiKeyBtn && apiKeyInput) {
        saveApiKeyBtn.addEventListener('click', async () => {
          const key = apiKeyInput.value.trim();
          const provider = aiProviderSelect.value;
          if (!key) {
            Motion.toast('Please paste a key or click Clear');
            return;
          }

          saveApiKeyBtn.disabled = true;
          saveApiKeyBtn.textContent = 'Connecting…';

          try {
            const res = await fetch('/api/ai-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: key, provider })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Connection failed');

            Motion.toast(data.message || 'AI API Key connected!');
            apiKeyInput.value = '';
            apiKeyModal.close();
            loadApiKeyStatus();
          } catch (err) {
            Motion.toast(err.message || 'Connection error. Check key.');
          } finally {
            saveApiKeyBtn.disabled = false;
            saveApiKeyBtn.textContent = 'Save & Connect';
          }
        });
      }

      if (clearApiKeyBtn) {
        clearApiKeyBtn.addEventListener('click', async () => {
          if (confirm('Disconnect AI key and switch to offline financial engine?')) {
            try {
              await api('/ai-config', 'POST', { apiKey: '' });
              if (apiKeyInput) apiKeyInput.value = '';
              Motion.toast('AI key cleared. Switched to offline engine.');
              loadApiKeyStatus();
            } catch (e) {
              console.error(e);
            }
          }
        });
      }
    }

    // Listen for hash change for browser back/forward buttons
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash && hash !== currentTab) {
        switchTab(hash);
      }
    });
  }

  // ==========================================
  // Authentication Management
  // ==========================================
  const REGISTERED_CREDENTIALS = {
    email: 'trace@khil.tech',
    password: '123456787654321'
  };

  function getStoredAuth() {
    try {
      const raw = localStorage.getItem('trace_auth');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setStoredAuth(userData) {
    try {
      localStorage.setItem('trace_auth', JSON.stringify(userData));
    } catch (e) { }
  }

  function clearStoredAuth() {
    try {
      localStorage.removeItem('trace_auth');
    } catch (e) { }
  }

  function updateAuthUI(user) {
    const loginView = $('loginView');
    const appLayout = $('appLayout');
    const onboardingView = $('onboardingView');
    const bottomNav = document.querySelector('.bottom-nav');

    // If backend state says not onboarded, remove any stale localStorage flag
    if (appState && appState.financials && appState.financials.isOnboarded === false) {
      try { localStorage.removeItem('trace_onboarded'); } catch(e) {}
    }

    const isHashOnboarding = location.hash === '#onboarding' || location.hash === '#setup';
    const isCompleted = localStorage.getItem('trace_onboarded') === 'true';

    // Show onboarding if requested via hash OR if not completed yet
    const shouldShowOnboarding = isHashOnboarding || !isCompleted;

    if (user) {
      if (loginView) loginView.style.display = 'none';

      if (shouldShowOnboarding) {
        if (onboardingView) onboardingView.style.display = 'flex';
        if (appLayout) appLayout.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        goToObStep(1);
      } else {
        if (onboardingView) onboardingView.style.display = 'none';
        if (appLayout) appLayout.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = '';
      }

      // Update user identity in sidebar & topbar
      const userDisplayEmail = $('userDisplayEmail');
      if (userDisplayEmail) userDisplayEmail.textContent = user.email || REGISTERED_CREDENTIALS.email;
      const topbarUserEmail = $('topbarUserEmail');
      if (topbarUserEmail) topbarUserEmail.textContent = user.email || REGISTERED_CREDENTIALS.email;
      const userDisplayName = $('userDisplayName');
      if (userDisplayName) userDisplayName.textContent = user.name || 'Trace User';
    } else {
      // If not logged in, but hash requests onboarding, auto-login with registered account
      if (isHashOnboarding) {
        const defaultUser = { email: REGISTERED_CREDENTIALS.email, name: 'Trace User' };
        setStoredAuth(defaultUser);
        updateAuthUI(defaultUser);
        return;
      }
      if (loginView) loginView.style.display = 'flex';
      if (onboardingView) onboardingView.style.display = 'none';
      if (appLayout) appLayout.style.display = 'none';
      if (bottomNav) bottomNav.style.display = 'none';
    }
  }

  // ==========================================
  // Onboarding Wizard Controller (8 Questions)
  // ==========================================
  const obState = {
    step: 1,
    balance: 5000,
    incomeSource: 'Pocket Money',
    horizon: 15,
    topCategories: ['Food', 'Transport'],
    hasBill: false,
    billName: '',
    billAmount: 0,
    billDays: 5,
    budgetStyle: 'Balanced 50/30/20',
    bufferPct: 20,
    primaryGoal: 'Never Go Broke'
  };

  function updateObSummaryPreview() {
    const balance = Math.max(0, obState.balance);
    const horizon = Math.max(1, obState.horizon);
    const bufferPct = obState.bufferPct;
    const bufferAmt = Math.round(balance * (bufferPct / 100));
    const billAmt = (obState.hasBill && obState.billAmount > 0) ? obState.billAmount : 0;
    const spendable = Math.max(0, balance - bufferAmt - billAmt);
    const daily = Math.max(0, Math.floor(spendable / horizon));

    const dailyEl = $('obPreviewDaily');
    const totalEl = $('obPreviewTotal');
    const billsEl = $('obPreviewBills');
    const bufferEl = $('obPreviewBuffer');
    const horizonEl = $('obPreviewHorizon');
    const styleTagEl = $('obPreviewBudgetStyle');
    const goalTagEl = $('obPreviewGoal');
    const goalTargetEl = $('obBufferGoalDisplay');

    if (dailyEl) dailyEl.textContent = daily.toLocaleString('en-IN');
    if (totalEl) totalEl.textContent = fmt(balance);
    if (billsEl) billsEl.textContent = fmt(billAmt);
    if (bufferEl) bufferEl.textContent = fmt(bufferAmt);
    if (horizonEl) horizonEl.textContent = `${horizon} days`;
    if (styleTagEl) styleTagEl.textContent = `⚖️ ${obState.budgetStyle}`;
    if (goalTagEl) goalTagEl.textContent = `🎯 ${obState.primaryGoal}`;
    if (goalTargetEl) goalTargetEl.textContent = fmt(bufferAmt);
  }

  function goToObStep(stepNum) {
    obState.step = Math.max(1, Math.min(8, stepNum));

    // Show/hide all 8 step panels
    for (let i = 1; i <= 8; i++) {
      const stepEl = $(`onboardingStep${i}`);
      if (stepEl) {
        stepEl.style.display = i === obState.step ? 'block' : 'none';
      }
    }

    // Update progress indicator & labels
    const stepLabels = {
      1: 'Current Funds',
      2: 'Income Source',
      3: 'Time Horizon',
      4: 'Top Spending',
      5: 'Fixed Commitments',
      6: 'Budget Style',
      7: 'Safety Cushion',
      8: 'Goal & Calibration'
    };

    const indicatorEl = $('onboardingStepIndicator');
    const catEl = $('onboardingStepCategory');
    const fillEl = $('onboardingProgressFill');

    if (indicatorEl) indicatorEl.textContent = `Step ${obState.step} of 8`;
    if (catEl) catEl.textContent = stepLabels[obState.step] || '';
    if (fillEl) fillEl.style.width = `${(obState.step / 8) * 100}%`;

    // Update buttons
    const backBtn = $('obBackBtn');
    const nextBtn = $('obNextBtn');

    if (backBtn) {
      backBtn.style.visibility = obState.step === 1 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      if (obState.step === 8) {
        nextBtn.innerHTML = `<span>Finish & Launch Dashboard</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else {
        nextBtn.innerHTML = `<span>Continue</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>`;
      }
    }

    updateObSummaryPreview();
  }

  function setupOnboardingEvents() {
    const obBalanceInput = $('obBalanceInput');
    const obCustomDaysInput = $('obCustomDaysInput');
    const obNoBillsCheckbox = $('obNoBillsCheckbox');
    const obBillForm = $('obBillForm');
    const obBillName = $('obBillName');
    const obBillAmount = $('obBillAmount');
    const obBillDays = $('obBillDays');
    const obBackBtn = $('obBackBtn');
    const obNextBtn = $('obNextBtn');
    const skipBtn = $('skipOnboardingBtn');
    const recalibrateBtn = $('recalibrateSetupBtn');

    // Step 1: Preset chips
    $$('#onboardingStep1 .ob-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const val = parseFloat(chip.dataset.val) || 0;
        obState.balance = val;
        if (obBalanceInput) obBalanceInput.value = val.toLocaleString('en-IN');
        $$('#onboardingStep1 .ob-chip').forEach(c => c.classList.toggle('active', c === chip));
        updateObSummaryPreview();
        Motion.haptic(10);
      });
    });

    // Step 1: Balance input
    if (obBalanceInput) {
      obBalanceInput.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        const val = parseFloat(raw) || 0;
        obState.balance = val;
        $$('#onboardingStep1 .ob-chip').forEach(chip => {
          chip.classList.toggle('active', parseFloat(chip.dataset.val) === val);
        });
        updateObSummaryPreview();
      });
      obBalanceInput.addEventListener('blur', (e) => {
        if (obState.balance > 0) {
          e.target.value = obState.balance.toLocaleString('en-IN');
        }
      });
    }

    // Step 2: Income Source cards
    $$('#onboardingStep2 .ob-select-card-detailed').forEach(card => {
      card.addEventListener('click', () => {
        const src = card.dataset.incomeSource;
        if (src) {
          obState.incomeSource = src;
          $$('#onboardingStep2 .ob-select-card-detailed').forEach(c => c.classList.toggle('active', c === card));
          Motion.haptic(10);
        }
      });
    });

    // Step 3: Horizon select cards
    $$('#onboardingStep3 .ob-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const days = parseInt(card.dataset.days, 10);
        if (days) {
          obState.horizon = days;
          $$('#onboardingStep3 .ob-select-card').forEach(c => c.classList.toggle('active', c === card));
          if (obCustomDaysInput) obCustomDaysInput.value = '';
          updateObSummaryPreview();
          Motion.haptic(10);
        }
      });
    });

    // Step 3: Custom days input
    if (obCustomDaysInput) {
      obCustomDaysInput.addEventListener('input', (e) => {
        const days = parseInt(e.target.value, 10);
        if (days && days > 0) {
          obState.horizon = days;
          $$('#onboardingStep3 .ob-select-card').forEach(c => c.classList.remove('active'));
          updateObSummaryPreview();
        }
      });
    }

    // Step 4: Top Categories multi-select
    $$('#onboardingStep4 .ob-multi-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('active');
        const activeCards = $$('#onboardingStep4 .ob-multi-card.active');
        obState.topCategories = Array.from(activeCards).map(c => c.dataset.cat);
        Motion.haptic(10);
      });
    });

    // Step 5: Quick Bill Preset Chips
    $$('.ob-quick-bill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.presetName;
        const amount = parseFloat(btn.dataset.presetAmount) || 0;
        const days = parseInt(btn.dataset.presetDays, 10) || 5;

        obState.hasBill = true;
        obState.billName = name;
        obState.billAmount = amount;
        obState.billDays = days;

        if (obNoBillsCheckbox) obNoBillsCheckbox.checked = false;
        if (obBillForm) obBillForm.style.display = 'block';
        if (obBillName) obBillName.value = name;
        if (obBillAmount) obBillAmount.value = amount.toLocaleString('en-IN');
        if (obBillDays) obBillDays.value = days;

        updateObSummaryPreview();
        Motion.haptic(10);
      });
    });

    // Step 5: Bills Checkbox & Form
    if (obNoBillsCheckbox) {
      obNoBillsCheckbox.addEventListener('change', (e) => {
        obState.hasBill = !e.target.checked;
        if (obBillForm) {
          obBillForm.style.display = obState.hasBill ? 'block' : 'none';
        }
        updateObSummaryPreview();
        Motion.haptic(10);
      });
    }

    if (obBillName) {
      obBillName.addEventListener('input', (e) => {
        obState.billName = e.target.value.trim();
      });
    }

    if (obBillAmount) {
      obBillAmount.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        obState.billAmount = parseFloat(raw) || 0;
        updateObSummaryPreview();
      });
    }

    if (obBillDays) {
      obBillDays.addEventListener('input', (e) => {
        obState.billDays = parseInt(e.target.value, 10) || 5;
      });
    }

    // Step 6: Budget Style selection
    $$('#onboardingStep6 .ob-select-card-detailed').forEach(card => {
      card.addEventListener('click', () => {
        const style = card.dataset.budgetStyle;
        if (style) {
          obState.budgetStyle = style;
          $$('#onboardingStep6 .ob-select-card-detailed').forEach(c => c.classList.toggle('active', c === card));
          updateObSummaryPreview();
          Motion.haptic(10);
        }
      });
    });

    // Step 7: Safety Cushion cards
    $$('#onboardingStep7 .ob-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const pct = parseInt(card.dataset.bufferPct, 10);
        if (pct) {
          obState.bufferPct = pct;
          $$('#onboardingStep7 .ob-select-card').forEach(c => c.classList.toggle('active', c === card));
          updateObSummaryPreview();
          Motion.haptic(10);
        }
      });
    });

    // Step 8: Primary Goal selection
    $$('#onboardingStep8 .ob-select-card-detailed').forEach(card => {
      card.addEventListener('click', () => {
        const goal = card.dataset.goal;
        if (goal) {
          obState.primaryGoal = goal;
          $$('#onboardingStep8 .ob-select-card-detailed').forEach(c => c.classList.toggle('active', c === card));
          updateObSummaryPreview();
          Motion.haptic(10);
        }
      });
    });

    // Navigation: Back button
    if (obBackBtn) {
      obBackBtn.addEventListener('click', () => {
        if (obState.step > 1) {
          goToObStep(obState.step - 1);
          Motion.haptic(10);
        }
      });
    }

    // Navigation: Next / Finish button
    if (obNextBtn) {
      obNextBtn.addEventListener('click', async () => {
        if (obState.step === 1) {
          if (obState.balance <= 0) {
            Motion.toast('Please enter your starting funds (e.g. ₹5,000)');
            Motion.haptic(20);
            return;
          }
          goToObStep(2);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 2) {
          goToObStep(3);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 3) {
          if (!obState.horizon || obState.horizon < 1) {
            Motion.toast('Please select how many days until your next money.');
            Motion.haptic(20);
            return;
          }
          goToObStep(4);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 4) {
          goToObStep(5);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 5) {
          if (obState.hasBill && (!obState.billAmount || obState.billAmount <= 0)) {
            Motion.toast('Please enter your bill amount or select "No bills due".');
            Motion.haptic(20);
            return;
          }
          goToObStep(6);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 6) {
          goToObStep(7);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 7) {
          goToObStep(8);
          Motion.haptic(10);
          return;
        }

        if (obState.step === 8) {
          // Finish and save setup to backend
          obNextBtn.disabled = true;
          obNextBtn.classList.add('loading');

          try {
            // 1. Save Horizon, Buffer Goal, and Profile to Plan
            const bufferGoal = Math.round(obState.balance * (obState.bufferPct / 100));
            await api('/plan', 'PUT', {
              nextDays: obState.horizon,
              pct: obState.bufferPct,
              goal: bufferGoal,
              incomeSource: obState.incomeSource,
              primaryGoal: obState.primaryGoal,
              budgetStyle: obState.budgetStyle,
              topCategories: obState.topCategories
            });

            // 2. Add starting funds transaction if positive
            if (obState.balance > 0) {
              await api('/transactions', 'POST', {
                type: 'inc',
                title: `Starting Balance (${obState.incomeSource})`,
                amount: obState.balance,
                category: 'Pocket money'
              });
            }

            // 3. Add bill if specified
            if (obState.hasBill && obState.billAmount > 0) {
              await api('/bills', 'POST', {
                name: obState.billName || 'Fixed Bill',
                amount: obState.billAmount,
                dueInDays: obState.billDays || 5
              });
            }

            // 4. Mark onboarded in localStorage
            localStorage.setItem('trace_onboarded', 'true');

            // 5. Transition to Dashboard
            const onboardingView = $('onboardingView');
            const appLayout = $('appLayout');
            const bottomNav = document.querySelector('.bottom-nav');

            if (onboardingView) onboardingView.style.display = 'none';
            if (appLayout) appLayout.style.display = 'flex';
            if (bottomNav) bottomNav.style.display = '';

            await refreshState();
            switchTab('overview');
            Motion.toast('Setup complete! Your calibrated profile is active.');
            Motion.haptic(30);
          } catch (err) {
            console.error('Failed to submit onboarding:', err);
            Motion.toast('Error saving setup: ' + (err.message || 'Please try again'));
            Motion.haptic(40);
          } finally {
            obNextBtn.disabled = false;
            obNextBtn.classList.remove('loading');
          }
        }
      });
    }

    // Skip Onboarding Button
    if (skipBtn) {
      skipBtn.addEventListener('click', async () => {
        localStorage.setItem('trace_onboarded', 'true');
        const onboardingView = $('onboardingView');
        const appLayout = $('appLayout');
        const bottomNav = document.querySelector('.bottom-nav');

        if (onboardingView) onboardingView.style.display = 'none';
        if (appLayout) appLayout.style.display = 'flex';
        if (bottomNav) bottomNav.style.display = '';

        await refreshState();
        switchTab('overview');
        Motion.toast('Skipped to dashboard. You can customize anytime in Plan.');
        Motion.haptic(10);
      });
    }

    // Recalibrate Button in Plan View
    if (recalibrateBtn) {
      recalibrateBtn.addEventListener('click', () => {
        localStorage.removeItem('trace_onboarded');
        const auth = getStoredAuth();
        if (auth) {
          goToObStep(1);
          updateAuthUI(auth);
          Motion.toast('Calibration Wizard opened.');
          Motion.haptic(10);
        }
      });
    }
  }

  // Allow recalibrating onboarding from console or scripts
  window.recalibrateOnboarding = function() {
    localStorage.removeItem('trace_onboarded');
    const auth = getStoredAuth();
    if (auth) {
      goToObStep(1);
      updateAuthUI(auth);
    }
  };

  function setupAuthEvents() {
    const loginForm = $('loginForm');
    const loginEmail = $('loginEmail');
    const loginPassword = $('loginPassword');
    const loginError = $('loginError');
    const loginErrorMsg = $('loginErrorMsg');
    const loginSubmitBtn = $('loginSubmitBtn');
    const togglePasswordBtn = $('togglePasswordBtn');
    const forgotPwLink = $('forgotPwLink');
    const logoutBtn = $('logoutBtn');
    const topbarLogoutBtn = $('topbarLogoutBtn');

    // Forgot password hint
    if (forgotPwLink) {
      forgotPwLink.addEventListener('click', (e) => {
        e.preventDefault();
        Motion.toast('Password reset request logged. Contact your administrator.');
        Motion.haptic(10);
      });
    }

    // Toggle password visibility
    if (togglePasswordBtn && loginPassword) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPw = loginPassword.type === 'password';
        loginPassword.type = isPw ? 'text' : 'password';
        togglePasswordBtn.innerHTML = isPw
          ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
          : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      });
    }

    // Handle Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (loginEmail?.value || '').trim();
        const password = loginPassword?.value || '';

        if (!email || !password) {
          if (loginError) {
            loginError.style.display = 'flex';
            if (loginErrorMsg) loginErrorMsg.textContent = 'Please provide both email and password.';
          }
          return;
        }

        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = true;
          loginSubmitBtn.classList.add('loading');
        }

        try {
          // Attempt backend authentication
          let authSuccess = false;
          let userData = null;

          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
              authSuccess = true;
              userData = data.user;
            } else {
              throw new Error(data.error || 'Invalid credentials');
            }
          } catch (apiErr) {
            // Local fallback validation matching requested credentials
            if (email.toLowerCase() === REGISTERED_CREDENTIALS.email.toLowerCase() && password === REGISTERED_CREDENTIALS.password) {
              authSuccess = true;
              userData = { email: REGISTERED_CREDENTIALS.email, name: 'Trace User' };
            } else {
              throw apiErr;
            }
          }

          if (authSuccess && userData) {
            setStoredAuth(userData);
            if (loginError) loginError.style.display = 'none';
            updateAuthUI(userData);
            Motion.toast(`Welcome back, ${userData.email}!`);
            Motion.haptic(20);
            await refreshState();
            const isOnboarded = localStorage.getItem('trace_onboarded') === 'true';
            if (isOnboarded) {
              const initialTab = location.hash.slice(1) || 'overview';
              switchTab(initialTab);
            }
          }
        } catch (err) {
          if (loginError) {
            loginError.style.display = 'flex';
            if (loginErrorMsg) loginErrorMsg.textContent = err.message || 'Invalid email or password.';
          }
          Motion.haptic(50);
        } finally {
          if (loginSubmitBtn) {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.classList.remove('loading');
          }
        }
      });
    }

    // Logout Action Handlers
    function handleLogout() {
      clearStoredAuth();
      updateAuthUI(null);
      if (loginPassword) loginPassword.value = '';
      Motion.toast('Signed out successfully.');
      Motion.haptic(10);
    }

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (topbarLogoutBtn) topbarLogoutBtn.addEventListener('click', handleLogout);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Initial load
  async function init() {
    // Restore saved theme or detect system preference
    const savedTheme = localStorage.getItem('trace-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyTheme(savedTheme);

    setupAuthEvents();
    setupOnboardingEvents();
    setupEventListeners();

    // Check auth status
    const auth = getStoredAuth();

    if (auth) {
      await refreshState();
      // If backend reports uncalibrated/0 data, ensure user gets asked into onboarding
      if (!appState || !appState.financials || appState.financials.isOnboarded === false) {
        try { localStorage.removeItem('trace_onboarded'); } catch (e) { }
      }
      updateAuthUI(auth);
      const isCompleted = localStorage.getItem('trace_onboarded') === 'true';
      if (isCompleted && location.hash !== '#onboarding' && location.hash !== '#setup') {
        const initialTab = location.hash.slice(1) || 'overview';
        switchTab(initialTab);
      }
    } else {
      updateAuthUI(null);
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
