/* =========================================================================
   storage.js — Penyimpanan lokal & util umum
   ========================================================================= */

const STORAGE_KEY = "toples-nabung:v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return dateToISO(new Date());
}

function dateToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function addMonths(d, n) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

function isoToDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKeyToDate(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Format angka jadi grup ribuan sesuai locale bahasa aktif. Tanpa simbol mata uang —
 *  pengguna bebas memakai mata uang apa pun. */
function formatNumber(n) {
  const lang = (window.APP_STATE && window.APP_STATE.settings && window.APP_STATE.settings.lang) || "id";
  const localeMap = { id: "id-ID", en: "en-US" };
  const locale = localeMap[lang] || lang || "id-ID";
  try {
    return new Intl.NumberFormat(locale).format(Math.round(n || 0));
  } catch (e) {
    return new Intl.NumberFormat("en-US").format(Math.round(n || 0));
  }
}

function parseNum(v) {
  const n = parseFloat(String(v).replace(/[^0-9.,-]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
// getDay(): 0=Sunday..6=Saturday -> map ke DAY_ORDER (mon..sun)
const JSDAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function defaultSettings() {
  return { theme: "light", lang: "id" };
}

function defaultState() {
  return { settings: defaultSettings(), goals: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed.settings) parsed.settings = defaultSettings();
    if (!parsed.goals) parsed.goals = [];
    return parsed;
  } catch (e) {
    return defaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Gagal menyimpan data:", e);
  }
}

function createEmptyGoal() {
  return {
    id: uid(),
    name: "",
    items: [{ id: uid(), name: "", price: 0 }],
    incomeType: "daily", // 'daily' | 'monthly'
    dailyIncome: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
    monthlyIncome: 0,
    expense: 0, // berlaku harian atau bulanan sesuai incomeType
    createdAt: null,
    startDate: null, // ISO atau month-key, diisi saat confirm
    targetPeriods: 0, // jumlah hari/bulan target, bisa bertambah saat ada "X"
    entries: {}, // { 'YYYY-MM-DD' atau 'YYYY-MM': {status:'received'|'missed', amount:number} }
    savedAmount: 0,
    completed: false,
  };
}

function goalTotal(goal) {
  return goal.items.reduce((sum, it) => sum + (parseNum(it.price) || 0), 0);
}

/** Rata-rata pendapatan bersih per periode (hari/bulan), dipakai untuk memproyeksikan target. */
function netPerPeriod(goal) {
  if (goal.incomeType === "monthly") {
    return (parseNum(goal.monthlyIncome) || 0) - (parseNum(goal.expense) || 0);
  }
  const weeklyIncome = DAY_ORDER.reduce((sum, k) => sum + (parseNum(goal.dailyIncome[k]) || 0), 0);
  const weeklyExpense = (parseNum(goal.expense) || 0) * 7;
  return (weeklyIncome - weeklyExpense) / 7;
}

function projectedPeriods(goal) {
  const total = goalTotal(goal);
  const net = netPerPeriod(goal);
  if (net <= 0) return null; // tidak bisa diproyeksikan
  return Math.max(1, Math.ceil(total / net));
}
