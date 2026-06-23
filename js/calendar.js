/* =========================================================================
   calendar.js — Kalender "koin" untuk check-in tabungan
   - Mode harian: grid kalender sungguhan (Senin–Minggu) sepanjang targetPeriods hari.
   - Mode bulanan: grid kotak bulan sepanjang targetPeriods bulan.
   ========================================================================= */

function startOfGoal(goal) {
  if (!goal.startDate) return new Date();
  return goal.incomeType === "daily" ? isoToDate(goal.startDate) : monthKeyToDate(goal.startDate);
}

/** Bangun daftar periode (hari atau bulan) dari awal goal sepanjang targetPeriods. */
function buildPeriods(goal) {
  const start = startOfGoal(goal);
  const periods = [];
  for (let i = 0; i < goal.targetPeriods; i++) {
    if (goal.incomeType === "daily") {
      const d = addDays(start, i);
      periods.push({ key: dateToISO(d), date: d, index: i });
    } else {
      const d = addMonths(start, i);
      periods.push({ key: monthToKey(d), date: d, index: i });
    }
  }
  return periods;
}

function periodStatus(goal, period, todayRef) {
  const entry = goal.entries[period.key];
  if (entry) return entry.status; // 'received' | 'missed'
  const isFuture = goal.incomeType === "daily"
    ? period.date.getTime() > stripTime(todayRef).getTime()
    : (period.date.getFullYear() > todayRef.getFullYear() ||
       (period.date.getFullYear() === todayRef.getFullYear() && period.date.getMonth() > todayRef.getMonth()));
  return isFuture ? "locked" : "actionable";
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/* ---------------------------- MODE HARIAN ---------------------------- */

function renderDailyCalendar(goal) {
  const periods = buildPeriods(goal);
  const today = new Date();
  // Kelompokkan per bulan kalender (tahun-bulan) agar tampil sebagai grid kalender asli
  const byMonth = new Map();
  periods.forEach((p) => {
    const mk = monthToKey(p.date);
    if (!byMonth.has(mk)) byMonth.set(mk, []);
    byMonth.get(mk).push(p);
  });

  let html = "";
  for (const [mk, list] of byMonth) {
    const monthDate = monthKeyToDate(mk);
    const monthNames = t("monthNames");
    const label = `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const jsDay = firstOfMonth.getDay(); // 0=Min..6=Sab
    const leadBlanks = (jsDay === 0 ? 6 : jsDay - 1); // jadikan Senin index 0

    const daysShort = t("daysShort");
    const headerRow = DAY_ORDER.map((k) => `<div class="cal-head">${daysShort[k]}</div>`).join("");

    const periodByDay = new Map(list.map((p) => [p.date.getDate(), p]));
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    let cells = "";
    for (let i = 0; i < leadBlanks; i++) cells += `<div class="cal-cell cal-blank"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const p = periodByDay.get(day);
      if (!p) { cells += `<div class="cal-cell cal-blank"></div>`; continue; }
      cells += renderDailyCell(goal, p, today);
    }
    html += `
      <div class="cal-month-block">
        <div class="cal-month-label">${escapeHtml(label)}</div>
        <div class="cal-grid">${headerRow}${cells}</div>
      </div>`;
  }
  return html;
}

function renderDailyCell(goal, period, today) {
  const status = periodStatus(goal, period, today);
  const isToday = isSameDay(period.date, today);
  const dayNum = period.date.getDate();
  const entry = goal.entries[period.key];
  let cls = "cal-cell cal-day";
  let inner = `<span class="cal-daynum">${dayNum}</span>`;

  if (status === "received") {
    cls += " is-received";
    inner += `<span class="cal-coin" title="${formatNumber(entry.amount)}">●</span>`;
  } else if (status === "missed") {
    cls += " is-missed";
    inner += `<span class="cal-x">✕</span>`;
  } else if (status === "locked") {
    cls += " is-locked";
  } else {
    cls += " is-actionable";
    if (isToday) cls += " is-today";
  }
  if (goal.completed) cls += " is-frozen";

  return `<button type="button" class="${cls}" data-period-key="${period.key}" ${status !== "actionable" || goal.completed ? "" : ""}>${inner}</button>`;
}

/* ---------------------------- MODE BULANAN ---------------------------- */

function renderMonthlyCalendar(goal) {
  const periods = buildPeriods(goal);
  const today = new Date();
  const byYear = new Map();
  periods.forEach((p) => {
    const y = p.date.getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  });

  let html = "";
  for (const [year, list] of byYear) {
    let cells = "";
    list.forEach((p) => { cells += renderMonthlyCell(goal, p, today); });
    html += `
      <div class="cal-month-block">
        <div class="cal-month-label">${year}</div>
        <div class="cal-grid cal-grid-months">${cells}</div>
      </div>`;
  }
  return html;
}

function renderMonthlyCell(goal, period, today) {
  const status = periodStatus(goal, period, today);
  const isCurrent = isSameMonth(period.date, today);
  const entry = goal.entries[period.key];
  const monthNames = t("monthNames");
  const label = monthNames[period.date.getMonth()].slice(0, 3);
  let cls = "cal-cell cal-monthbox";
  let inner = `<span class="cal-monthname">${label}</span>`;

  if (status === "received") {
    cls += " is-received";
    inner += `<span class="cal-coin" title="${formatNumber(entry.amount)}">●</span>`;
  } else if (status === "missed") {
    cls += " is-missed";
    inner += `<span class="cal-x">✕</span>`;
  } else if (status === "locked") {
    cls += " is-locked";
  } else {
    cls += " is-actionable";
    if (isCurrent) cls += " is-today";
  }
  if (goal.completed) cls += " is-frozen";

  return `<button type="button" class="${cls}" data-period-key="${period.key}">${inner}</button>`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
