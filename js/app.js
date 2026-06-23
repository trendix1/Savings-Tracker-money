/* =========================================================================
   app.js — Controller utama Toples Nabung
   ========================================================================= */

window.APP_STATE = loadState();

const RTL_LANGS = ["ar", "he", "ur", "fa", "ps", "sd", "ug"];

let draftGoal = null;       // goal yang sedang dibuat di form
let activeGoalId = null;    // goal yang sedang dilihat di detail
let pendingPeriod = null;   // { goalId, key } saat modal periode terbuka
let pendingDeleteId = null;

/* ----------------------------- INIT ----------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(APP_STATE.settings.theme);
  applyLanguage(APP_STATE.settings.lang, { persist: false });
  buildLanguageList();
  bindEvents();
  renderHome();
});

/* ----------------------------- THEME ----------------------------- */
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  document.querySelectorAll("#themeToggle button").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.themeChoice === theme);
  });
}

function setTheme(theme) {
  APP_STATE.settings.theme = theme;
  saveState(APP_STATE);
  applyTheme(theme);
}

/* ----------------------------- LANGUAGE ----------------------------- */
function applyLanguage(lang, opts = {}) {
  APP_STATE.settings.lang = lang;
  if (opts.persist !== false) saveState(APP_STATE);
  document.documentElement.lang = lang.split("-")[0];
  document.body.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  applyStaticText();
  highlightSelectedLanguage();
  // Render ulang tampilan yang sedang aktif supaya teks dinamis ikut berubah
  renderHome();
  if (draftGoal) renderItemRows();
  if (draftGoal) renderDayIncomeGrid();
  if (activeGoalId) renderDetail(activeGoalId);
}

function highlightSelectedLanguage() {
  document.querySelectorAll(".lang-item").forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.code === APP_STATE.settings.lang);
  });
}

function buildLanguageList(filter = "") {
  const list = document.getElementById("langList");
  const q = filter.trim().toLowerCase();
  const filtered = LANGUAGES.filter((l) =>
    !q || l.native.toLowerCase().includes(q) || l.en.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
  );
  list.innerHTML = filtered
    .map(
      (l) => `<div class="lang-item${l.code === APP_STATE.settings.lang ? " is-selected" : ""}" data-code="${l.code}">
        <span>${escapeHtml(l.native)}</span><span class="lang-item-en">${escapeHtml(l.en)}</span>
      </div>`
    )
    .join("");
}

/* ----------------------------- STATIC TEXT (i18n) ----------------------------- */
function applyStaticText() {
  const map = {
    appTitle: "appName", txtTagline: "tagline", txtAddGoalBtn: "addSavingsBtn",
    txtNoSavingsYet: "noSavingsYet", txtNoSavingsDesc: "noSavingsDesc",
    txtNewSavings: "newSavings", lblSavingsName: "savingsName", lblItems: "items",
    btnAddItem: "addItem", lblTotal: "total", lblIncomeSection: "incomeSection",
    lblIncomeType: "incomeType", btnIncomeDaily: "daily", btnIncomeMonthly: "monthly",
    lblDailyIncomeNote: "dailyIncomeNote", lblMonthlyIncome: "monthlyIncomeLabel",
    lblExpenseSection: "expenseSection", btnConfirmGoal: "confirmBtn",
    lblTargetAmount: "targetAmount", lblSavedAmount: "savedAmount",
    legendReceived: "markReceived", legendMissed: "markMissed", legendToday: "todayLabel",
    periodModalQuestion: "gotIncomeQuestion", lblMarkMissed: "markMissed", lblMarkReceived: "markReceived",
    lblEnterAmountTitle: "enterAmountTitle", congratsTitle: "congratsTitle",
    btnCloseCongrats: "congratsCloseBtn", lblDeleteSavings: "deleteSavings",
    lblDeleteSavingsConfirm: "deleteSavingsConfirm", btnCancelDelete: "cancel",
    btnConfirmDelete: "delete", lblSettingsTitle: "settingsTitle", lblAppearance: "appearance",
    lblLanguageTitle: "languageTitle",
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  document.getElementById("btnThemeLight").innerHTML = `☀️ ${t("themeLight")}`;
  document.getElementById("btnThemeDark").innerHTML = `🌙 ${t("themeDark")}`;
  document.getElementById("inputGoalName").placeholder = t("savingsNamePlaceholder");
  document.getElementById("inputMonthlyIncome").placeholder = t("monthlyIncomePlaceholder");
  document.getElementById("inputExpense").placeholder = t("expensePlaceholder");
  document.getElementById("langSearch").placeholder = t("searchLanguage");
  document.getElementById("btnSavePeriodAmount").textContent = t("save");
  document.getElementById("inputPeriodAmount").placeholder = t("enterAmountPlaceholder");
  document.title = t("appName");

  const expenseLabel = draftGoal && draftGoal.incomeType === "monthly" ? t("monthlyExpenseLabel") : t("dailyExpenseLabel");
  document.getElementById("lblExpense").textContent = expenseLabel;
}

/* ----------------------------- VIEW ROUTING ----------------------------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  document.getElementById(`view-${name}`).classList.add("is-active");
}

/* ----------------------------- HOME ----------------------------- */
function renderHome() {
  const grid = document.getElementById("goalGrid");
  const empty = document.getElementById("emptyState");
  const goals = APP_STATE.goals;
  empty.hidden = goals.length !== 0;
  grid.innerHTML = goals.map(renderGoalCard).join("");
}

function renderGoalCard(goal) {
  const total = goalTotal(goal);
  const pct = total > 0 ? Math.min(100, Math.round((goal.savedAmount / total) * 100)) : 0;
  const badge = goal.completed ? `<span class="goal-card-badge">${t("completed")}</span>` : "";
  return `
    <div class="goal-card" data-goal-id="${goal.id}">
      <button class="goal-card-del" data-del-goal-id="${goal.id}" title="${t("deleteSavings")}" aria-label="${t("deleteSavings")}">🗑</button>
      <div class="goal-card-title">${escapeHtml(goal.name || t("newSavings"))}</div>
      ${badge}
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      <div class="goal-card-amounts">
        <span>${t("saved")}: <strong>${formatNumber(goal.savedAmount)}</strong></span>
        <span>${t("target")}: <strong>${formatNumber(total)}</strong></span>
      </div>
    </div>`;
}

/* ----------------------------- FORM: BUKA / TUTUP ----------------------------- */
function openForm() {
  draftGoal = createEmptyGoal();
  document.getElementById("inputGoalName").value = "";
  document.getElementById("inputMonthlyIncome").value = "";
  document.getElementById("inputExpense").value = "";
  setIncomeType("daily");
  renderItemRows();
  renderDayIncomeGrid();
  hideFormError();
  showView("form");
}

function hideFormError() {
  const el = document.getElementById("formError");
  el.classList.remove("is-visible");
  el.textContent = "";
}
function showFormError(msg) {
  const el = document.getElementById("formError");
  el.textContent = msg;
  el.classList.add("is-visible");
}

/* ----------------------------- FORM: ITEMS ----------------------------- */
function renderItemRows() {
  const wrap = document.getElementById("itemRows");
  wrap.innerHTML = draftGoal.items
    .map(
      (it, idx) => `
    <div class="item-row" data-item-id="${it.id}">
      <input type="text" class="input item-name-input" placeholder="${t("itemNamePlaceholder")}" value="${escapeHtml(it.name)}" data-id="${it.id}" />
      <input type="number" min="0" class="input item-price-input" placeholder="${t("itemPricePlaceholder")}" value="${it.price || ""}" data-id="${it.id}" />
      <button type="button" class="row-remove-btn" data-remove-id="${it.id}" aria-label="${t("removeItem")}" ${draftGoal.items.length <= 1 ? "disabled style='opacity:.3;cursor:not-allowed'" : ""}>✕</button>
    </div>`
    )
    .join("");
  updateFormTotal();
}

function updateFormTotal() {
  const total = draftGoal.items.reduce((s, it) => s + (parseNum(it.price) || 0), 0);
  document.getElementById("formTotal").textContent = formatNumber(total);
}

/* ----------------------------- FORM: INCOME TYPE ----------------------------- */
function setIncomeType(type) {
  draftGoal.incomeType = type;
  document.querySelectorAll("#incomeTypeToggle button").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.incomeType === type);
  });
  document.getElementById("dailyIncomeBlock").style.display = type === "daily" ? "" : "none";
  document.getElementById("monthlyIncomeBlock").style.display = type === "monthly" ? "" : "none";
  document.getElementById("lblExpense").textContent = type === "monthly" ? t("monthlyExpenseLabel") : t("dailyExpenseLabel");
}

function renderDayIncomeGrid() {
  const wrap = document.getElementById("dayIncomeGrid");
  const days = t("days");
  wrap.innerHTML = DAY_ORDER.map(
    (k) => `
    <div class="day-name">${days[k]}</div>
    <input type="number" min="0" class="input" data-day="${k}" placeholder="${t("dayIncomePlaceholder")}" value="${draftGoal.dailyIncome[k] || ""}" />`
  ).join("");
}

/* ----------------------------- FORM: CONFIRM ----------------------------- */
function confirmGoal() {
  hideFormError();
  draftGoal.name = document.getElementById("inputGoalName").value.trim();
  draftGoal.expense = parseNum(document.getElementById("inputExpense").value);
  if (draftGoal.incomeType === "monthly") {
    draftGoal.monthlyIncome = parseNum(document.getElementById("inputMonthlyIncome").value);
  }

  const total = goalTotal(draftGoal);
  const hasValidItem = draftGoal.items.some((it) => it.name.trim() && parseNum(it.price) > 0);
  if (!hasValidItem || total <= 0) {
    showFormError(t("formErrorNeedItem"));
    return;
  }

  const net = netPerPeriod(draftGoal);
  const hasIncome =
    draftGoal.incomeType === "monthly"
      ? parseNum(draftGoal.monthlyIncome) > 0
      : DAY_ORDER.some((k) => parseNum(draftGoal.dailyIncome[k]) > 0);
  if (!hasIncome) {
    showFormError(t("formErrorNeedIncome"));
    return;
  }

  draftGoal.createdAt = new Date().toISOString();
  draftGoal.startDate = draftGoal.incomeType === "daily" ? todayISO() : monthToKey(new Date());
  const proj = projectedPeriods(draftGoal);
  draftGoal.targetPeriods = proj || (draftGoal.incomeType === "daily" ? 30 : 12);

  APP_STATE.goals.unshift(draftGoal);
  saveState(APP_STATE);
  const newId = draftGoal.id;
  draftGoal = null;
  renderHome();
  openDetail(newId);
}

/* ----------------------------- DETAIL / KALENDER ----------------------------- */
function openDetail(goalId) {
  activeGoalId = goalId;
  renderDetail(goalId);
  showView("detail");
}

function getGoal(id) {
  return APP_STATE.goals.find((g) => g.id === id);
}

function renderDetail(goalId) {
  const goal = getGoal(goalId);
  if (!goal) { showView("home"); return; }

  const total = goalTotal(goal);
  const answeredCount = Object.keys(goal.entries).length;
  const remainingPeriods = Math.max(0, goal.targetPeriods - answeredCount);
  const pct = total > 0 ? Math.min(100, Math.round((goal.savedAmount / total) * 100)) : 0;

  document.getElementById("detailGoalName").textContent = goal.name || t("newSavings");
  document.getElementById("detailHeroName").textContent = goal.name || t("newSavings");
  document.getElementById("detailTarget").textContent = formatNumber(total);
  document.getElementById("detailSaved").textContent = formatNumber(goal.savedAmount);

  const projLabel = goal.incomeType === "daily" ? t("daysLeft") : t("monthsLeft");
  document.getElementById("lblProjected").textContent = goal.completed ? "" : projLabel;
  document.getElementById("detailProjected").textContent = goal.completed ? "✓ " + t("completed") : remainingPeriods;

  document.getElementById("jarFill").style.width = pct + "%";
  const remaining = Math.max(0, total - goal.savedAmount);
  let caption = `${formatNumber(goal.savedAmount)} / ${formatNumber(total)}`;
  if (!goal.completed) caption += ` · ${t("remainingAmount")}: ${formatNumber(remaining)}`;
  if (netPerPeriod(goal) <= 0) caption += ` — ${t("projectionUnavailable")}`;
  document.getElementById("jarCaption").textContent = caption;

  document.getElementById("calendarTitle").textContent = goal.incomeType === "daily" ? t("calendarTitleDaily") : t("calendarTitleMonthly");
  document.getElementById("calendarSub").textContent = t("calendarInstruction");

  const container = document.getElementById("calendarContainer");
  container.innerHTML = goal.incomeType === "daily" ? renderDailyCalendar(goal) : renderMonthlyCalendar(goal);
}

function handlePeriodCellClick(goalId, key) {
  const goal = getGoal(goalId);
  if (!goal || goal.completed) return;
  if (goal.entries[key]) return; // sudah dijawab
  pendingPeriod = { goalId, key };
  document.getElementById("periodModalQuestion").textContent =
    goal.incomeType === "daily" ? t("gotIncomeQuestion") : t("gotIncomeQuestionMonth");
  document.getElementById("periodModalDate").textContent = formatPeriodLabel(goal, key);
  document.getElementById("amountEntryBlock").classList.remove("is-visible");
  document.getElementById("inputPeriodAmount").value = "";
  openModal("modalPeriod");
}

function formatPeriodLabel(goal, key) {
  const monthNames = t("monthNames");
  if (goal.incomeType === "daily") {
    const d = isoToDate(key);
    return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }
  const d = monthKeyToDate(key);
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function choosePeriod(receivedFlag) {
  if (!pendingPeriod) return;
  const goal = getGoal(pendingPeriod.goalId);
  if (!goal) return;

  if (!receivedFlag) {
    goal.entries[pendingPeriod.key] = { status: "missed", amount: 0 };
    goal.targetPeriods += 1;
    saveState(APP_STATE);
    closeModal("modalPeriod");
    renderDetail(goal.id);
    renderHome();
    showToast(t("extendedNotice"));
    pendingPeriod = null;
    return;
  }
  document.getElementById("amountEntryBlock").classList.add("is-visible");
}

function savePeriodAmount() {
  if (!pendingPeriod) return;
  const goal = getGoal(pendingPeriod.goalId);
  if (!goal) return;
  const amount = parseNum(document.getElementById("inputPeriodAmount").value);
  goal.entries[pendingPeriod.key] = { status: "received", amount };
  goal.savedAmount += amount;
  saveState(APP_STATE);
  closeModal("modalPeriod");

  const total = goalTotal(goal);
  const justCompleted = !goal.completed && goal.savedAmount >= total && total > 0;
  if (justCompleted) {
    goal.completed = true;
    saveState(APP_STATE);
    renderDetail(goal.id);
    renderHome();
    document.getElementById("congratsMessage").textContent = tf("congratsMessage", { name: goal.name || t("newSavings") });
    openModal("modalCongrats");
  } else {
    renderDetail(goal.id);
    renderHome();
    showToast(t("savedToast"));
  }
  pendingPeriod = null;
}

/* ----------------------------- DELETE GOAL ----------------------------- */
function askDeleteGoal(id) {
  pendingDeleteId = id;
  openModal("modalDelete");
}
function confirmDeleteGoal() {
  if (!pendingDeleteId) return;
  APP_STATE.goals = APP_STATE.goals.filter((g) => g.id !== pendingDeleteId);
  saveState(APP_STATE);
  pendingDeleteId = null;
  closeModal("modalDelete");
  renderHome();
  if (activeGoalId && !getGoal(activeGoalId)) {
    activeGoalId = null;
    showView("home");
  }
  showToast(t("deletedToast"));
}

/* ----------------------------- MODAL HELPERS ----------------------------- */
function openModal(id) { document.getElementById(id).classList.add("is-open"); }
function closeModal(id) { document.getElementById(id).classList.remove("is-open"); }

/* ----------------------------- TOAST ----------------------------- */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2200);
}

/* ----------------------------- EVENT BINDING ----------------------------- */
function bindEvents() {
  document.getElementById("btnAddGoal").addEventListener("click", openForm);
  document.getElementById("btnFormBack").addEventListener("click", () => { draftGoal = null; showView("home"); });
  document.getElementById("btnDetailBack").addEventListener("click", () => { activeGoalId = null; showView("home"); });

  document.getElementById("btnAddItem").addEventListener("click", () => {
    draftGoal.items.push({ id: uid(), name: "", price: 0 });
    renderItemRows();
  });

  document.getElementById("itemRows").addEventListener("input", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    const item = draftGoal.items.find((it) => it.id === id);
    if (!item) return;
    if (e.target.classList.contains("item-name-input")) item.name = e.target.value;
    if (e.target.classList.contains("item-price-input")) { item.price = parseNum(e.target.value); updateFormTotal(); }
  });

  document.getElementById("itemRows").addEventListener("click", (e) => {
    const id = e.target.closest("[data-remove-id]")?.dataset.removeId;
    if (!id || draftGoal.items.length <= 1) return;
    draftGoal.items = draftGoal.items.filter((it) => it.id !== id);
    renderItemRows();
  });

  document.getElementById("incomeTypeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-income-type]");
    if (btn) setIncomeType(btn.dataset.incomeType);
  });

  document.getElementById("dayIncomeGrid").addEventListener("input", (e) => {
    const day = e.target.dataset.day;
    if (day) draftGoal.dailyIncome[day] = parseNum(e.target.value);
  });

  document.getElementById("btnConfirmGoal").addEventListener("click", confirmGoal);

  document.getElementById("goalGrid").addEventListener("click", (e) => {
    const delId = e.target.closest("[data-del-goal-id]")?.dataset.delGoalId;
    if (delId) { askDeleteGoal(delId); return; }
    const card = e.target.closest("[data-goal-id]");
    if (card) openDetail(card.dataset.goalId);
  });

  document.getElementById("calendarContainer").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-period-key]");
    if (!btn || !btn.classList.contains("is-actionable")) return;
    handlePeriodCellClick(activeGoalId, btn.dataset.periodKey);
  });

  document.getElementById("btnChoiceNo").addEventListener("click", () => choosePeriod(false));
  document.getElementById("btnChoiceYes").addEventListener("click", () => choosePeriod(true));
  document.getElementById("btnSavePeriodAmount").addEventListener("click", savePeriodAmount);
  document.getElementById("btnClosePeriodModal").addEventListener("click", () => { closeModal("modalPeriod"); pendingPeriod = null; });

  document.getElementById("btnCloseCongrats").addEventListener("click", () => closeModal("modalCongrats"));

  document.getElementById("btnCancelDelete").addEventListener("click", () => { closeModal("modalDelete"); pendingDeleteId = null; });
  document.getElementById("btnConfirmDelete").addEventListener("click", confirmDeleteGoal);

  document.getElementById("btnSettings").addEventListener("click", () => openModal("modalSettings"));
  document.getElementById("btnCloseSettings").addEventListener("click", () => closeModal("modalSettings"));
  document.getElementById("themeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-choice]");
    if (btn) setTheme(btn.dataset.themeChoice);
  });
  document.getElementById("langSearch").addEventListener("input", (e) => buildLanguageList(e.target.value));
  document.getElementById("langList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-code]");
    if (item) applyLanguage(item.dataset.code);
  });

  // Klik di luar modal untuk menutup (kecuali modal selamat, agar tidak tertutup tanpa sengaja)
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && overlay.id !== "modalCongrats") {
        overlay.classList.remove("is-open");
        if (overlay.id === "modalPeriod") pendingPeriod = null;
        if (overlay.id === "modalDelete") pendingDeleteId = null;
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.is-open").forEach((o) => {
        if (o.id !== "modalCongrats") o.classList.remove("is-open");
      });
    }
  });
}
