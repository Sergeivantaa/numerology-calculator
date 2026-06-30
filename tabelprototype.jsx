import React, { useState, useEffect, useMemo } from "react";
import { Clock, Calendar as CalIcon, Building2, Package, Play, Square, Plus, ChevronLeft, ChevronRight, X, User, Users, Globe } from "lucide-react";

// ===================== i18n =====================
const LANGS = ["ru", "fi", "en"];
const LANG_NAMES = { ru: "RU", fi: "FI", en: "EN" };

const DICT = {
  appTitle: { ru: "PlanX · Табель", fi: "PlanX · Tuntilista", en: "PlanX · Timesheet" },
  allObjects: { ru: "Все объекты", fi: "Kaikki kohteet", en: "All sites" },
  foreman: { ru: "Прораб", fi: "Työnjohtaja", en: "Foreman" },
  worker: { ru: "Работник", fi: "Työntekijä", en: "Worker" },

  navHome: { ru: "Главная", fi: "Etusivu", en: "Home" },
  navCalendar: { ru: "Календарь", fi: "Kalenteri", en: "Calendar" },
  navObjects: { ru: "Объекты", fi: "Kohteet", en: "Sites" },
  navTabel: { ru: "Табель", fi: "Tuntilista", en: "Timesheet" },

  shiftRunning: { ru: "Смена идёт", fi: "Työvuoro käynnissä", en: "Shift in progress" },
  todayLogged: { ru: "Сегодня отмечено", fi: "Tänään kirjattu", en: "Logged today" },
  startShift: { ru: "Начать смену", fi: "Aloita työvuoro", en: "Start shift" },
  endShift: { ru: "Закончить смену", fi: "Lopeta työvuoro", en: "End shift" },
  pickObject: { ru: "Выберите объект:", fi: "Valitse kohde:", en: "Choose a site:" },
  manualHours: { ru: "Внести часы вручную", fi: "Lisää tunnit käsin", en: "Add hours manually" },
  addMaterialCost: { ru: "Добавить материал/затрату", fi: "Lisää materiaali/kulu", en: "Add material/cost" },

  tasksToday: { ru: "Задачи на сегодня", fi: "Tämän päivän tehtävät", en: "Today's tasks" },
  noTasksToday: { ru: "Задач на сегодня нет.", fi: "Ei tehtäviä tänään.", en: "No tasks today." },
  thisWeek: { ru: "На неделю", fi: "Tällä viikolla", en: "This week" },
  newTask: { ru: "Новая задача", fi: "Uusi tehtävä", en: "New task" },
  upcomingTasks: { ru: "Ближайшие задачи", fi: "Tulevat tehtävät", en: "Upcoming tasks" },
  noTasks: { ru: "Задач нет.", fi: "Ei tehtäviä.", en: "No tasks." },

  companyToday: { ru: "Сегодня по компании", fi: "Tänään koko yritys", en: "Company today" },
  hoursLogged: { ru: "часов отмечено", fi: "tuntia kirjattu", en: "hours logged" },
  records: { ru: "записей", fi: "kirjausta", en: "entries" },
  onShift: { ru: "человек на смене", fi: "henkilöä työvuorossa", en: "people on shift" },
  whoWhereToday: { ru: "Кто где сегодня", fi: "Kuka missä tänään", en: "Who's where today" },
  notLogged: { ru: "не отмечено", fi: "ei kirjattu", en: "not logged" },

  objects: { ru: "Объекты", fi: "Kohteet", en: "Sites" },
  active: { ru: "Активен", fi: "Aktiivinen", en: "Active" },
  done: { ru: "Завершён", fi: "Valmis", en: "Done" },
  hoursByWorker: { ru: "Часы по работникам", fi: "Tunnit työntekijöittäin", en: "Hours by worker" },
  materialsAndCosts: { ru: "Материалы и затраты", fi: "Materiaalit ja kulut", en: "Materials & costs" },
  add: { ru: "Добавить", fi: "Lisää", en: "Add" },
  noCostsYet: { ru: "Затрат пока нет.", fi: "Ei kuluja vielä.", en: "No costs yet." },
  hoursLabel: { ru: "часов", fi: "tuntia", en: "hours" },
  materialsLabel: { ru: "материалы", fi: "materiaalit", en: "materials" },
  back: { ru: "Все объекты", fi: "Kaikki kohteet", en: "All sites" },

  allWorkers: { ru: "Все работники", fi: "Kaikki työntekijät", en: "All workers" },
  allSites: { ru: "Все объекты", fi: "Kaikki kohteet", en: "All sites" },
  hoursThisMonth: { ru: "часов за месяц", fi: "tuntia kuukaudessa", en: "hours this month" },

  modalAddHours: { ru: "Внести часы", fi: "Lisää tunnit", en: "Add hours" },
  modalNewTask: { ru: "Новая задача", fi: "Uusi tehtävä", en: "New task" },
  modalAddMaterial: { ru: "Добавить материал", fi: "Lisää materiaali", en: "Add material" },

  fieldWorker: { ru: "Работник", fi: "Työntekijä", en: "Worker" },
  fieldObject: { ru: "Объект", fi: "Kohde", en: "Site" },
  fieldDate: { ru: "Дата", fi: "Päivämäärä", en: "Date" },
  fieldHours: { ru: "Часы", fi: "Tunnit", en: "Hours" },
  fieldType: { ru: "Тип", fi: "Tyyppi", en: "Type" },
  fieldTaskTitle: { ru: "Название задачи", fi: "Tehtävän nimi", en: "Task title" },
  fieldTaskPlaceholder: { ru: "Например: Заливка пола", fi: "Esim. Lattian valu", en: "e.g. Pour the floor" },
  fieldExecutor: { ru: "Исполнитель", fi: "Suorittaja", en: "Assignee" },
  fieldTime: { ru: "Время", fi: "Aika", en: "Time" },
  fieldNoteOptional: { ru: "Комментарий (необязательно)", fi: "Kommentti (valinnainen)", en: "Note (optional)" },
  fieldMaterialName: { ru: "Название материала", fi: "Materiaalin nimi", en: "Material name" },
  fieldMaterialPlaceholder: { ru: "Например: Бетон C25/30", fi: "Esim. Betoni C25/30", en: "e.g. Concrete C25/30" },
  fieldQty: { ru: "Кол-во", fi: "Määrä", en: "Qty" },
  fieldUnit: { ru: "Ед.", fi: "Yks.", en: "Unit" },
  fieldPrice: { ru: "Цена €", fi: "Hinta €", en: "Price €" },

  save: { ru: "Сохранить", fi: "Tallenna", en: "Save" },
  createTask: { ru: "Создать задачу", fi: "Luo tehtävä", en: "Create task" },

  typeNormal: { ru: "Обычные", fi: "Normaali", en: "Normal" },
  typeOvertime: { ru: "Переработка", fi: "Ylityö", en: "Overtime" },
  typeAbsence: { ru: "Отпуск/больн.", fi: "Loma/sairas", en: "Leave/sick" },
};

function makeT(lang) {
  return (key) => (DICT[key] ? (DICT[key][lang] || DICT[key].en) : key);
}

const WEEKDAYS = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  fi: ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
};
const LOCALE = { ru: "ru-RU", fi: "fi-FI", en: "en-GB" };

// ---------- demo seed data (names stay as-is across languages — real data, not UI text) ----------
const SEED_WORKERS = [
  { id: "w1", name: "Андрей Котов", role: "Бетонщик" },
  { id: "w2", name: "Сергей Лаак", role: "Плиточник" },
  { id: "w3", name: "Михаил Орлов", role: "Разнорабочий" },
];

const SEED_OBJECTS = [
  { id: "o1", name: "Teljänrinne — гараж", address: "Asunto Oy Teljänrinne", status: "active", color: "#C8602B" },
  { id: "o2", name: "Terasun — склад", address: "Helsinki, Vantaa", status: "active", color: "#2B5C6B" },
  { id: "o3", name: "Котельная, реновация", address: "Espoo", status: "done", color: "#6B6358" },
];

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fmtDateHuman(key, lang) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short", weekday: "short" });
}
function todayKey() { return dateKey(new Date()); }
function monthLabel(y, m, lang) {
  return new Date(y, m, 1).toLocaleDateString(LOCALE[lang], { month: "long", year: "numeric" });
}
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function uid() { return Math.random().toString(36).slice(2, 9); }

const TYPE_KEY = { normal: "typeNormal", overtime: "typeOvertime", absence: "typeAbsence" };
const TYPE_COLOR = { normal: "#2B5C6B", overtime: "#C8602B", absence: "#9A8C7A" };

const seedEntries = () => {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    out.push({
      id: uid(), workerId: "w1", objectId: i % 2 === 0 ? "o1" : "o2",
      date: dateKey(d), hours: 7.5 + (i % 3 === 0 ? 1 : 0), type: i % 4 === 0 ? "overtime" : "normal", note: "",
    });
    out.push({
      id: uid(), workerId: "w2", objectId: "o1",
      date: dateKey(d), hours: 8, type: "normal", note: "",
    });
  }
  return out;
};

const seedTasks = () => {
  const now = new Date();
  const mk = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); return dateKey(d); };
  return [
    { id: uid(), title: "Заливка пола, сектор A", objectId: "o1", workerId: "w1", date: mk(0), time: "08:00", note: "Привезти вибратор" },
    { id: uid(), title: "Гидроизоляция стен", objectId: "o1", workerId: "w2", date: mk(0), time: "09:00", note: "" },
    { id: uid(), title: "Приёмка материалов", objectId: "o2", workerId: "w3", date: mk(1), time: "08:30", note: "ТСМ панели, 40 шт" },
    { id: uid(), title: "Демонтаж старой стяжки", objectId: "o1", workerId: "w1", date: mk(2), time: "08:00", note: "" },
    { id: uid(), title: "Установка опалубки", objectId: "o1", workerId: "w2", date: mk(3), time: "08:00", note: "Проверить уровень" },
  ];
};

const seedCosts = () => [
  { id: uid(), objectId: "o1", name: "Бетон C25/30", qty: 31.5, unit: "т", price: 95, date: dateKey(new Date()), by: "Андрей Котов" },
  { id: uid(), objectId: "o1", name: "Щебень", qty: 34, unit: "м³", price: 18, date: dateKey(new Date()), by: "Сергей Лаак" },
  { id: uid(), objectId: "o2", name: "ТСМ панель 12мм", qty: 40, unit: "шт", price: 28, date: dateKey(new Date()), by: "Михаил Орлов" },
];

// ---------- shared UI bits ----------
const Pill = ({ children, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55` }}
    className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">{children}</span>
);

const Card = ({ children, className = "", onClick, style }) => (
  <div onClick={onClick} style={style}
    className={`bg-white rounded-2xl border border-[#E7E2D8] shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ children, action }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-[15px] font-semibold tracking-tight text-[#1E2421]">{children}</h2>
    {action}
  </div>
);

const PrimaryBtn = ({ children, onClick, full, icon: Icon, danger }) => (
  <button onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl font-medium text-sm py-3 px-4 active:scale-[0.97] transition
      ${danger ? "bg-[#B23A2E] text-white" : "bg-[#1E2421] text-white"} ${full ? "w-full" : ""}`}>
    {Icon && <Icon size={16} />}{children}
  </button>
);

const GhostBtn = ({ children, onClick, full, icon: Icon }) => (
  <button onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-xl font-medium text-sm py-3 px-4 border border-[#D8D2C4] text-[#1E2421] active:scale-[0.97] transition bg-white ${full ? "w-full" : ""}`}>
    {Icon && <Icon size={16} />}{children}
  </button>
);

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-[#FAF8F3] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2D8] sticky top-0 bg-[#FAF8F3]">
          <h3 className="font-semibold text-[#1E2421]">{title}</h3>
          <button onClick={onClose} className="p-1 text-[#6B6358]"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-[#6B6358] mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full rounded-xl border border-[#D8D2C4] bg-white px-3 py-2.5 text-sm text-[#1E2421] focus:outline-none focus:ring-2 focus:ring-[#C8602B]/40";

export default function App() {
  // ---- persistent app data (independent of UI language) ----
  const [workers] = useState(SEED_WORKERS);
  const [objects] = useState(SEED_OBJECTS);
  const [entries, setEntries] = useState(seedEntries);
  const [tasks, setTasks] = useState(seedTasks);
  const [costs, setCosts] = useState(seedCosts);

  // ---- UI-only state (language switch never touches the data above) ----
  const [lang, setLang] = useState("ru");
  const t = makeT(lang);

  const [role, setRole] = useState("worker"); // worker | admin
  const [activeWorkerId, setActiveWorkerId] = useState("w1");
  const [tab, setTab] = useState("home"); // home | calendar | objects | tabel
  const [running, setRunning] = useState(null); // { objectId, startedAt }

  const [showHourModal, setShowHourModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [calCursor, setCalCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [tabelCursor, setTabelCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [tabelWorkerFilter, setTabelWorkerFilter] = useState("all");
  const [tabelObjFilter, setTabelObjFilter] = useState("all");
  const [selectedObject, setSelectedObject] = useState(null);

  function cycleLang() {
    const i = LANGS.indexOf(lang);
    setLang(LANGS[(i + 1) % LANGS.length]);
  }

  const activeWorker = workers.find(w => w.id === activeWorkerId);

  const myTasksToday = tasks.filter(task => task.workerId === activeWorkerId && task.date === todayKey());
  const myTasksWeek = useMemo(() => {
    const now = new Date();
    const end = new Date(now); end.setDate(end.getDate() + 7);
    return tasks.filter(task => task.workerId === activeWorkerId && new Date(task.date) >= new Date(dateKey(now)) && new Date(task.date) <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, activeWorkerId]);

  const todaysHours = entries.filter(e => e.workerId === activeWorkerId && e.date === todayKey())
    .reduce((s, e) => s + e.hours, 0);

  function startShift(objectId) {
    setRunning({ objectId, startedAt: Date.now() });
  }
  function stopShift() {
    if (!running) return;
    const hrs = Math.max(0.25, Math.round(((Date.now() - running.startedAt) / 3600000) * 4) / 4);
    setEntries(prev => [...prev, { id: uid(), workerId: activeWorkerId, objectId: running.objectId, date: todayKey(), hours: hrs, type: "normal", note: "" }]);
    setRunning(null);
  }

  function addManualEntry(data) {
    setEntries(prev => [...prev, { id: uid(), ...data }]);
    setShowHourModal(false);
  }
  function addTask(data) {
    setTasks(prev => [...prev, { id: uid(), ...data }]);
    setShowTaskModal(false);
  }
  function addCost(data) {
    setCosts(prev => [...prev, { id: uid(), ...data }]);
    setShowCostModal(false);
  }

  return (
    <div className="min-h-[700px] bg-[#FAF8F3] text-[#1E2421] font-sans flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* top bar */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-30 bg-[#FAF8F3]/95 backdrop-blur border-b border-[#E7E2D8]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-[#9A8C7A] font-medium">{t("appTitle")}</div>
            <div className="text-lg font-bold leading-tight truncate">
              {role === "admin" ? t("allObjects") : activeWorker?.name}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={cycleLang}
              className="flex items-center gap-1 bg-white border border-[#D8D2C4] rounded-full px-2.5 py-1.5 text-xs font-semibold">
              <Globe size={13} />{LANG_NAMES[lang]}
            </button>
            <button
              onClick={() => setRole(r => r === "worker" ? "admin" : "worker")}
              className="flex items-center gap-1.5 bg-white border border-[#D8D2C4] rounded-full px-3 py-1.5 text-xs font-medium">
              {role === "admin" ? <Users size={14} /> : <User size={14} />}
              {role === "admin" ? t("foreman") : t("worker")}
            </button>
          </div>
        </div>
        {role === "worker" && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {workers.map(w => (
              <button key={w.id} onClick={() => setActiveWorkerId(w.id)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border ${activeWorkerId === w.id ? "bg-[#1E2421] text-white border-[#1E2421]" : "bg-white text-[#6B6358] border-[#D8D2C4]"}`}>
                {w.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {tab === "home" && (
          <HomeTab
            t={t} lang={lang}
            role={role}
            workers={workers}
            objects={objects}
            running={running}
            todaysHours={todaysHours}
            myTasksToday={myTasksToday}
            myTasksWeek={myTasksWeek}
            entries={entries}
            onStart={startShift}
            onStop={stopShift}
            onManualHours={() => setShowHourModal(true)}
            onAddCost={() => setShowCostModal(true)}
          />
        )}

        {tab === "calendar" && (
          <CalendarTab
            t={t} lang={lang}
            cursor={calCursor} setCursor={setCalCursor}
            tasks={tasks} workers={workers} objects={objects}
            role={role} activeWorkerId={activeWorkerId}
            onAddTask={() => setShowTaskModal(true)}
          />
        )}

        {tab === "objects" && (
          <ObjectsTab
            t={t} lang={lang}
            objects={objects} entries={entries} costs={costs} workers={workers}
            selected={selectedObject} setSelected={setSelectedObject}
            onAddCost={() => setShowCostModal(true)}
          />
        )}

        {tab === "tabel" && (
          <TabelTab
            t={t} lang={lang}
            cursor={tabelCursor} setCursor={setTabelCursor}
            entries={entries} workers={workers} objects={objects}
            role={role} activeWorkerId={activeWorkerId}
            workerFilter={tabelWorkerFilter} setWorkerFilter={setTabelWorkerFilter}
            objFilter={tabelObjFilter} setObjFilter={setTabelObjFilter}
          />
        )}
      </div>

      {/* bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E7E2D8] px-2 py-2 flex justify-around z-30 max-w-full">
        {[
          { id: "home", label: t("navHome"), icon: Clock },
          { id: "calendar", label: t("navCalendar"), icon: CalIcon },
          { id: "objects", label: t("navObjects"), icon: Building2 },
          { id: "tabel", label: t("navTabel"), icon: Package },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl ${tab === id ? "text-[#C8602B]" : "text-[#9A8C7A]"}`}>
            <Icon size={20} strokeWidth={tab === id ? 2.4 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {showHourModal && (
        <HourModal
          t={t}
          objects={objects} workers={workers} role={role} activeWorkerId={activeWorkerId}
          onClose={() => setShowHourModal(false)} onSave={addManualEntry}
        />
      )}
      {showTaskModal && (
        <TaskModal
          t={t}
          objects={objects} workers={workers}
          onClose={() => setShowTaskModal(false)} onSave={addTask}
        />
      )}
      {showCostModal && (
        <CostModal
          t={t}
          objects={objects} workers={workers} activeWorkerId={activeWorkerId}
          onClose={() => setShowCostModal(false)} onSave={addCost}
        />
      )}
    </div>
  );
}

// ---------------- HOME ----------------
function HomeTab({ t, lang, role, workers, objects, running, todaysHours, myTasksToday, myTasksWeek, entries, onStart, onStop, onManualHours, onAddCost }) {
  const [elapsed, setElapsed] = useState(0);
  const hUnit = lang === "ru" ? "ч" : "h";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed(Date.now() - running.startedAt), 1000);
    return () => clearInterval(timer);
  }, [running]);

  if (role === "admin") {
    const today = todayKey();
    const todays = entries.filter(e => e.date === today);
    const totalToday = todays.reduce((s, e) => s + e.hours, 0);
    return (
      <div>
        <SectionTitle>{t("companyToday")}</SectionTitle>
        <Card className="p-4 mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalToday}</span>
            <span className="text-sm text-[#6B6358]">{t("hoursLogged")}</span>
          </div>
          <div className="text-xs text-[#9A8C7A] mt-1">{todays.length} {t("records")} · {new Set(todays.map(e => e.workerId)).size} {t("onShift")}</div>
        </Card>

        <SectionTitle>{t("whoWhereToday")}</SectionTitle>
        <div className="space-y-2 mb-5">
          {workers.map(w => {
            const we = todays.filter(e => e.workerId === w.id);
            const hrs = we.reduce((s, e) => s + e.hours, 0);
            return (
              <Card key={w.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{w.name}</div>
                  <div className="text-xs text-[#9A8C7A]">{w.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{hrs || "—"} {hUnit}</div>
                  <div className="text-[11px] text-[#9A8C7A]">
                    {[...new Set(we.map(e => objects.find(o => o.id === e.objectId)?.name))].join(", ") || t("notLogged")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <GhostBtn full icon={Plus} onClick={onAddCost}>{t("addMaterialCost")}</GhostBtn>
      </div>
    );
  }

  return (
    <div>
      <Card className="p-5 mb-4 bg-[#1E2421] border-[#1E2421]">
        <div className="text-[#C8B8A6] text-xs font-medium mb-1">{running ? t("shiftRunning") : t("todayLogged")}</div>
        {running ? (
          <div className="text-3xl font-bold text-white tabular-nums">
            {String(Math.floor(elapsed / 3600000)).padStart(2, "0")}:{String(Math.floor((elapsed / 60000) % 60)).padStart(2, "0")}:{String(Math.floor((elapsed / 1000) % 60)).padStart(2, "0")}
          </div>
        ) : (
          <div className="text-3xl font-bold text-white">{todaysHours} {hUnit}</div>
        )}
        <div className="mt-4">
          {running ? (
            <PrimaryBtn full icon={Square} danger onClick={onStop}>{t("endShift")}</PrimaryBtn>
          ) : (
            <ObjectPicker t={t} objects={objects} onPick={onStart} />
          )}
        </div>
      </Card>

      <GhostBtn full icon={Plus} onClick={onManualHours}>{t("manualHours")}</GhostBtn>

      <div className="mt-5">
        <SectionTitle>{t("tasksToday")}</SectionTitle>
        {myTasksToday.length === 0 && (
          <Card className="p-4 text-sm text-[#9A8C7A]">{t("noTasksToday")}</Card>
        )}
        <div className="space-y-2">
          {myTasksToday.map(task => {
            const obj = objects.find(o => o.id === task.objectId);
            return (
              <Card key={task.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-[#9A8C7A] mt-0.5">{task.time} · {obj?.name}</div>
                    {task.note && <div className="text-xs text-[#6B6358] mt-1">{task.note}</div>}
                  </div>
                  {obj && <Pill color={obj.color}>{obj.name.split("—")[0].trim()}</Pill>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle>{t("thisWeek")}</SectionTitle>
        <div className="space-y-2">
          {myTasksWeek.filter(task => task.date !== todayKey()).slice(0, 5).map(task => {
            const obj = objects.find(o => o.id === task.objectId);
            return (
              <Card key={task.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-[#9A8C7A]">{fmtDateHuman(task.date, lang)} · {task.time}</div>
                </div>
                {obj && <Pill color={obj.color}>{obj.name.split("—")[0].trim()}</Pill>}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ObjectPicker({ t, objects, onPick }) {
  const [open, setOpen] = useState(false);
  if (!open) return <PrimaryBtn full icon={Play} onClick={() => setOpen(true)}>{t("startShift")}</PrimaryBtn>;
  return (
    <div>
      <div className="text-xs text-[#C8B8A6] mb-2">{t("pickObject")}</div>
      <div className="space-y-2">
        {objects.filter(o => o.status === "active").map(o => (
          <button key={o.id} onClick={() => onPick(o.id)}
            className="w-full text-left bg-white/10 hover:bg-white/15 rounded-xl px-3 py-2.5 text-white text-sm flex items-center justify-between">
            {o.name}
            <Play size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------- CALENDAR ----------------
function CalendarTab({ t, lang, cursor, setCursor, tasks, workers, objects, role, activeWorkerId, onAddTask }) {
  const { y, m } = cursor;
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Monday=0
  const total = daysInMonth(y, m);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);

  const visibleTasks = role === "admin" ? tasks : tasks.filter(task => task.workerId === activeWorkerId);
  const byDate = useMemo(() => {
    const map = {};
    visibleTasks.forEach(task => { (map[task.date] = map[task.date] || []).push(task); });
    return map;
  }, [visibleTasks]);

  const [openDay, setOpenDay] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })} className="p-2 bg-white rounded-full border border-[#D8D2C4]"><ChevronLeft size={16} /></button>
        <div className="font-semibold capitalize">{monthLabel(y, m, lang)}</div>
        <button onClick={() => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })} className="p-2 bg-white rounded-full border border-[#D8D2C4]"><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS[lang].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-[#9A8C7A] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = `${y}-${pad(m + 1)}-${pad(d)}`;
          const dayTasks = byDate[key] || [];
          const isToday = key === todayKey();
          return (
            <button key={i} onClick={() => setOpenDay(key)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center relative text-xs
                ${isToday ? "bg-[#1E2421] text-white" : "bg-white text-[#1E2421] border border-[#E7E2D8]"}`}>
              {d}
              {dayTasks.length > 0 && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#C8602B]" />
              )}
            </button>
          );
        })}
      </div>

      <PrimaryBtn full icon={Plus} onClick={onAddTask}>{t("newTask")}</PrimaryBtn>

      <div className="mt-5">
        <SectionTitle>{t("upcomingTasks")}</SectionTitle>
        <div className="space-y-2">
          {visibleTasks.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map(task => {
            const obj = objects.find(o => o.id === task.objectId);
            const w = workers.find(x => x.id === task.workerId);
            return (
              <Card key={task.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="text-xs text-[#9A8C7A] mt-0.5">
                      {fmtDateHuman(task.date, lang)} · {task.time} {role === "admin" && w ? `· ${w.name}` : ""}
                    </div>
                  </div>
                  {obj && <Pill color={obj.color}>{obj.name.split("—")[0].trim()}</Pill>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {openDay && (
        <Modal title={fmtDateHuman(openDay, lang)} onClose={() => setOpenDay(null)}>
          <div className="space-y-2">
            {(byDate[openDay] || []).length === 0 && <div className="text-sm text-[#9A8C7A]">{t("noTasks")}</div>}
            {(byDate[openDay] || []).map(task => {
              const obj = objects.find(o => o.id === task.objectId);
              const w = workers.find(x => x.id === task.workerId);
              return (
                <Card key={task.id} className="p-3">
                  <div className="text-sm font-medium">{task.title}</div>
                  <div className="text-xs text-[#9A8C7A] mt-0.5">{task.time} {role === "admin" && w ? `· ${w.name}` : ""} {obj ? `· ${obj.name}` : ""}</div>
                  {task.note && <div className="text-xs text-[#6B6358] mt-1">{task.note}</div>}
                </Card>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------- OBJECTS ----------------
function ObjectsTab({ t, lang, objects, entries, costs, workers, selected, setSelected, onAddCost }) {
  const hUnit = lang === "ru" ? "ч" : "h";
  if (selected) {
    const obj = objects.find(o => o.id === selected);
    const objEntries = entries.filter(e => e.objectId === selected);
    const objCosts = costs.filter(c => c.objectId === selected);
    const totalHours = objEntries.reduce((s, e) => s + e.hours, 0);
    const totalCost = objCosts.reduce((s, c) => s + c.qty * c.price, 0);
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-[#6B6358] mb-3"><ChevronLeft size={16} /> {t("back")}</button>
        <Card className="p-4 mb-4" style={{ borderLeft: `4px solid ${obj.color}` }}>
          <div className="font-semibold text-base">{obj.name}</div>
          <div className="text-xs text-[#9A8C7A] mt-0.5">{obj.address}</div>
          <div className="flex gap-4 mt-3">
            <div><div className="text-xl font-bold">{totalHours}</div><div className="text-[11px] text-[#9A8C7A]">{t("hoursLabel")}</div></div>
            <div><div className="text-xl font-bold">€{totalCost.toFixed(0)}</div><div className="text-[11px] text-[#9A8C7A]">{t("materialsLabel")}</div></div>
          </div>
        </Card>

        <SectionTitle>{t("hoursByWorker")}</SectionTitle>
        <div className="space-y-2 mb-5">
          {workers.map(w => {
            const hrs = objEntries.filter(e => e.workerId === w.id).reduce((s, e) => s + e.hours, 0);
            if (!hrs) return null;
            return (
              <Card key={w.id} className="p-3 flex items-center justify-between">
                <span className="text-sm">{w.name}</span>
                <span className="text-sm font-semibold">{hrs} {hUnit}</span>
              </Card>
            );
          })}
        </div>

        <SectionTitle action={<button onClick={onAddCost} className="text-xs font-medium text-[#C8602B] flex items-center gap-1"><Plus size={14} />{t("add")}</button>}>
          {t("materialsAndCosts")}
        </SectionTitle>
        <div className="space-y-2">
          {objCosts.map(c => (
            <Card key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-[#9A8C7A]">{c.qty} {c.unit} × €{c.price} · {c.by}</div>
              </div>
              <div className="text-sm font-semibold">€{(c.qty * c.price).toFixed(0)}</div>
            </Card>
          ))}
          {objCosts.length === 0 && <Card className="p-4 text-sm text-[#9A8C7A]">{t("noCostsYet")}</Card>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>{t("objects")}</SectionTitle>
      <div className="space-y-2">
        {objects.map(o => {
          const hrs = entries.filter(e => e.objectId === o.id).reduce((s, e) => s + e.hours, 0);
          return (
            <Card key={o.id} className="p-4" onClick={() => setSelected(o.id)} style={{ borderLeft: `4px solid ${o.color}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{o.name}</div>
                  <div className="text-xs text-[#9A8C7A] mt-0.5">{o.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{hrs} {hUnit}</div>
                  <Pill color={o.status === "active" ? "#3E7A4F" : "#9A8C7A"}>{o.status === "active" ? t("active") : t("done")}</Pill>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- TABEL (monthly timesheet) ----------------
function TabelTab({ t, lang, cursor, setCursor, entries, workers, objects, role, activeWorkerId, workerFilter, setWorkerFilter, objFilter, setObjFilter }) {
  const { y, m } = cursor;
  const total = daysInMonth(y, m);
  const days = Array.from({ length: total }, (_, i) => `${y}-${pad(m + 1)}-${pad(i + 1)}`);
  const hUnit = lang === "ru" ? "ч" : "h";

  const effectiveWorkers = role === "admin"
    ? (workerFilter === "all" ? workers : workers.filter(w => w.id === workerFilter))
    : workers.filter(w => w.id === activeWorkerId);

  const filtered = entries.filter(e =>
    e.date.startsWith(`${y}-${pad(m + 1)}`) &&
    effectiveWorkers.some(w => w.id === e.workerId) &&
    (objFilter === "all" || e.objectId === objFilter)
  );

  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })} className="p-2 bg-white rounded-full border border-[#D8D2C4]"><ChevronLeft size={16} /></button>
        <div className="font-semibold capitalize">{monthLabel(y, m, lang)}</div>
        <button onClick={() => setCursor(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })} className="p-2 bg-white rounded-full border border-[#D8D2C4]"><ChevronRight size={16} /></button>
      </div>

      {role === "admin" && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <select value={workerFilter} onChange={e => setWorkerFilter(e.target.value)} className="text-xs rounded-full border border-[#D8D2C4] bg-white px-3 py-1.5">
            <option value="all">{t("allWorkers")}</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={objFilter} onChange={e => setObjFilter(e.target.value)} className="text-xs rounded-full border border-[#D8D2C4] bg-white px-3 py-1.5">
            <option value="all">{t("allSites")}</option>
            {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{totalHours}</span>
          <span className="text-sm text-[#6B6358]">{t("hoursThisMonth")}</span>
        </div>
      </Card>

      <div className="space-y-1.5">
        {days.map(key => {
          const dayEntries = byDay[key] || [];
          if (dayEntries.length === 0) {
            const d = Number(key.split("-")[2]);
            const dow = new Date(y, m, d).getDay();
            if (dow === 0 || dow === 6) return null; // hide empty weekends for compactness
          }
          const sum = dayEntries.reduce((s, e) => s + e.hours, 0);
          return (
            <Card key={key} className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6B6358] capitalize w-20">{fmtDateHuman(key, lang)}</span>
                <span className="text-sm font-semibold">{sum || "—"} {hUnit}</span>
              </div>
              {dayEntries.length > 0 && (
                <div className="mt-2 space-y-1">
                  {dayEntries.map(e => {
                    const obj = objects.find(o => o.id === e.objectId);
                    const w = workers.find(x => x.id === e.workerId);
                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#6B6358]">{role === "admin" ? `${w?.name.split(" ")[0]} · ` : ""}{obj?.name}</span>
                        <span className="flex items-center gap-1.5">
                          <Pill color={TYPE_COLOR[e.type]}>{e.hours} {hUnit}</Pill>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- MODALS ----------------
function HourModal({ t, objects, workers, role, activeWorkerId, onClose, onSave }) {
  const [workerId, setWorkerId] = useState(activeWorkerId);
  const [objectId, setObjectId] = useState(objects[0]?.id);
  const [date, setDate] = useState(todayKey());
  const [hours, setHours] = useState(8);
  const [type, setType] = useState("normal");

  return (
    <Modal title={t("modalAddHours")} onClose={onClose}>
      {role === "admin" && (
        <Field label={t("fieldWorker")}>
          <select className={inputCls} value={workerId} onChange={e => setWorkerId(e.target.value)}>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t("fieldObject")}>
        <select className={inputCls} value={objectId} onChange={e => setObjectId(e.target.value)}>
          {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </Field>
      <Field label={t("fieldDate")}>
        <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
      </Field>
      <Field label={t("fieldHours")}>
        <input type="number" step="0.25" className={inputCls} value={hours} onChange={e => setHours(Number(e.target.value))} />
      </Field>
      <Field label={t("fieldType")}>
        <div className="flex gap-2">
          {Object.entries(TYPE_KEY).map(([k, labelKey]) => (
            <button key={k} onClick={() => setType(k)}
              className={`flex-1 text-xs py-2 rounded-lg border ${type === k ? "bg-[#1E2421] text-white border-[#1E2421]" : "bg-white border-[#D8D2C4] text-[#6B6358]"}`}>
              {t(labelKey)}
            </button>
          ))}
        </div>
      </Field>
      <PrimaryBtn full onClick={() => onSave({ workerId, objectId, date, hours, type, note: "" })}>{t("save")}</PrimaryBtn>
    </Modal>
  );
}

function TaskModal({ t, objects, workers, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [objectId, setObjectId] = useState(objects[0]?.id);
  const [workerId, setWorkerId] = useState(workers[0]?.id);
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("08:00");
  const [note, setNote] = useState("");

  return (
    <Modal title={t("modalNewTask")} onClose={onClose}>
      <Field label={t("fieldTaskTitle")}>
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder={t("fieldTaskPlaceholder")} />
      </Field>
      <Field label={t("fieldObject")}>
        <select className={inputCls} value={objectId} onChange={e => setObjectId(e.target.value)}>
          {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </Field>
      <Field label={t("fieldExecutor")}>
        <select className={inputCls} value={workerId} onChange={e => setWorkerId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("fieldDate")}>
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label={t("fieldTime")}>
          <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label={t("fieldNoteOptional")}>
        <textarea className={inputCls} rows={2} value={note} onChange={e => setNote(e.target.value)} />
      </Field>
      <PrimaryBtn full onClick={() => title && onSave({ title, objectId, workerId, date, time, note })}>{t("createTask")}</PrimaryBtn>
    </Modal>
  );
}

function CostModal({ t, objects, workers, activeWorkerId, onClose, onSave }) {
  const [objectId, setObjectId] = useState(objects[0]?.id);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("шт");
  const [price, setPrice] = useState(0);
  const by = workers.find(w => w.id === activeWorkerId)?.name || "Foreman";

  return (
    <Modal title={t("modalAddMaterial")} onClose={onClose}>
      <Field label={t("fieldObject")}>
        <select className={inputCls} value={objectId} onChange={e => setObjectId(e.target.value)}>
          {objects.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </Field>
      <Field label={t("fieldMaterialName")}>
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder={t("fieldMaterialPlaceholder")} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("fieldQty")}>
          <input type="number" step="0.1" className={inputCls} value={qty} onChange={e => setQty(Number(e.target.value))} />
        </Field>
        <Field label={t("fieldUnit")}>
          <select className={inputCls} value={unit} onChange={e => setUnit(e.target.value)}>
            {["шт", "м³", "м²", "т", "кг", "л"].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label={t("fieldPrice")}>
          <input type="number" step="0.1" className={inputCls} value={price} onChange={e => setPrice(Number(e.target.value))} />
        </Field>
      </div>
      <PrimaryBtn full onClick={() => name && onSave({ objectId, name, qty, unit, price, date: todayKey(), by })}>{t("save")}</PrimaryBtn>
    </Modal>
  );
}
