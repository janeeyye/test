// View-only marketing calendar
const SOLUTIONS = [
  "AI Business Solutions",
  "Cloud and AI Platforms",
  "Security",
  "All CSAs",
];

const SOLUTION_LABEL = {
  "AI Business Solutions": "Copilot",
  "Cloud and AI Platforms": "Cloud & AI",
  "Security": "Security",
  "All CSAs": "Multi-Solution",
};

const SOLUTION_COLOR = {
  "AI Business Solutions": "var(--sol-ai-business)",
  "Cloud and AI Platforms": "var(--sol-cloud-ai)",
  "Security": "var(--sol-security)",
  "All CSAs": "var(--sol-all-csas)",
};

const monthTitleEl = document.getElementById("monthTitle");
const calendarGridEl = document.getElementById("calendarGrid");
const filterBarEl = document.getElementById("filterBar");
const searchInput = document.getElementById("searchInput");
const searchMetaEl = document.getElementById("searchMeta");
const highlightListEl = document.getElementById("highlightList");
const onDemandListEl = document.getElementById("onDemandList");
const quickLinkListEl = document.getElementById("quickLinkList");

const prevBtn = document.getElementById("prevMonthBtn");
const nextBtn = document.getElementById("nextMonthBtn");
const todayBtn = document.getElementById("todayBtn");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCloseBtn2 = document.getElementById("modalCloseBtn2");
const modalTitle = document.getElementById("modalTitle");
const modalSolutionPill = document.getElementById("modalSolutionPill");
const modalDate = document.getElementById("modalDate");
const modalLocation = document.getElementById("modalLocation");
const modalTimeRow = document.getElementById("modalTimeRow");
const modalTime = document.getElementById("modalTime");
const modalRegRow = document.getElementById("modalRegRow");
const modalRegLink = document.getElementById("modalRegLink");

let allEvents = [];
let highlights = [];
let onDemand = [];
let quickLinks = [];
let activeFilters = new Set(SOLUTIONS);
let searchQuery = "";
let currentDate = new Date(); // month being shown

function pad2(n){ return String(n).padStart(2,'0'); }
function fmtISO(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function parseISODate(iso){ // treat as local date
  const [y,m,d] = iso.split("-").map(Number);
  return new Date(y, m-1, d);
}
function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function clampEnd(startIso, endIso){
  return endIso && endIso.trim() ? endIso : startIso;
}
function isInRange(dayIso, startIso, endIso){
  const day = parseISODate(dayIso).getTime();
  const s = parseISODate(startIso).getTime();
  const e = parseISODate(clampEnd(startIso,endIso)).getTime();
  return day>=s && day<=e;
}
function getEventPosition(dayIso, startIso, endIso){
  const end = clampEnd(startIso, endIso);
  if (startIso === end) return "single";
  if (dayIso === startIso) return "start";
  if (dayIso === end) return "end";
  return "middle";
}

function getCalendarGrid(year, monthIndex){ // monthIndex 0-11
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex+1, 0);

  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // back to Sunday

  const end = new Date(last);
  end.setDate(last.getDate() + (6 - last.getDay())); // forward to Saturday

  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
    days.push({
      date: new Date(d),
      iso: fmtISO(d),
      isCurrentMonth: d.getMonth() === monthIndex,
    });
  }
  return days;
}

function setPillActive(el, solution, active){
  el.classList.toggle("active", active);
  if (active){
    el.style.background = SOLUTION_COLOR[solution];
  } else {
    el.style.background = "var(--card)";
    el.style.color = "var(--foreground)";
    el.style.borderColor = "var(--border)";
  }
}

function renderFilters(){
  filterBarEl.innerHTML = "";
  SOLUTIONS.forEach(sol => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "filter-pill";
    pill.textContent = SOLUTION_LABEL[sol] || sol;

    const PRIMARY_SOLUTIONS = [
      "AI Business Solutions",
      "Cloud and AI Platforms",
      "Security",
    ];
    const ALL_CSAS = "All CSAs";
    
    const anyPrimaryOn = PRIMARY_SOLUTIONS.some(s => activeFilters.has(s));

    const isActive =
      sol === ALL_CSAS
      ? anyPrimaryOn || activeFilters.has(ALL_CSAS)
      : activeFilters.has(sol);
    
    setPillActive(pill, sol, isActive);

    pill.addEventListener("click", () => {
      if (activeFilters.has(sol)) activeFilters.delete(sol);
      else activeFilters.add(sol);

      // if user turned everything off, turn everything back on
      if (activeFilters.size === 0){
        SOLUTIONS.forEach(s => activeFilters.add(s));
      }
      renderFilters();
      renderCalendar();
    });

    filterBarEl.appendChild(pill);
  });
}

function monthTitle(date){
  const y = date.getFullYear();
  const m = date.getMonth()+1;
  return `${y}년 ${m}월`;
}

function openModal(event){
  modalTitle.textContent = event.title || "(Untitled)";
  const sol = event.solution || "";
  modalSolutionPill.textContent = SOLUTION_LABEL[sol] || sol;
  modalSolutionPill.style.background = SOLUTION_COLOR[sol] || "var(--muted-foreground)";

  const start = event.startDate;
  const end = clampEnd(event.startDate, event.endDate);
  modalDate.textContent = (start === end) ? start : `${start} ~ ${end}`;

  const loc = (event.location || "").trim();
  const isOnline = /digital|online/i.test(loc);

  modalLocation.textContent = loc
    ? (isOnline ? `온라인 · ${loc}` : `오프라인 · ${loc}`)
    : "-";

  if (event.time && event.time.trim()){
    modalTimeRow.classList.remove("hidden");
    modalTime.textContent = event.time;
  } else {
    modalTimeRow.classList.add("hidden");
  }

  if (event.registrationUrl && event.registrationUrl.trim()){
    modalRegRow.classList.remove("hidden");
    modalRegLink.textContent = "등록 페이지로 이동";
    modalRegLink.href = event.registrationUrl;
  } else {
    modalRegRow.classList.add("hidden");
    modalRegLink.removeAttribute("href");
    modalRegLink.textContent = "";
  }

  modalBackdrop.classList.remove("hidden");
  modalBackdrop.setAttribute("aria-hidden", "false");
}

function closeModal(){
  modalBackdrop.classList.add("hidden");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

function linkEl(label, url){
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  a.addEventListener("click", (e) => e.stopPropagation()); // do not open modal
  return a;
}

function renderCalendar(){
  monthTitleEl.textContent = monthTitle(currentDate);

  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();
  const days = getCalendarGrid(year, monthIndex);

  // Filter events by solution (All CSAs conditional always-on)
  const PRIMARY_SOLUTIONS = [
    "AI Business Solutions",
    "Cloud and AI Platforms",
    "Security",
  ];
  const ALL_CSAS = "All CSAs";
  
  const anyPrimaryOn = PRIMARY_SOLUTIONS.some(sol => activeFilters.has(sol));

  const events = allEvents.filter(ev => {
    if (ev.solution === ALL_CSAS) {
      // 다른 솔루션이 하나라도 켜져 있으면 자동 포함
      return anyPrimaryOn || activeFilters.has(ALL_CSAS);
    }
    return activeFilters.has(ev.solution);
  });

  const searchedEvents = searchQuery
    ? events.filter(ev => {
        const t = (ev.title || "").toLowerCase();
        const l = (ev.location || "").toLowerCase();
        return t.includes(searchQuery) || l.includes(searchQuery);
      })
    : events;

  // Search feedback (current month + current filters)
  if (searchMetaEl){
    const monthStart = fmtISO(new Date(year, monthIndex, 1));
    const monthEnd = fmtISO(new Date(year, monthIndex + 1, 0));
    const matchesThisMonth = searchedEvents.some(ev => {
      const evEnd = clampEnd(ev.startDate, ev.endDate);
      return ev.startDate <= monthEnd && evEnd >= monthStart;
    });
    if (searchQuery && !matchesThisMonth){
      searchMetaEl.textContent = "검색 결과가 없습니다. 필터를 조정해 보세요.";
    } else {
      searchMetaEl.textContent = "현재 필터/월 기준 검색";
    }
  }

  calendarGridEl.innerHTML = "";

  days.forEach(day => {
    const cell = document.createElement("div");
    cell.className = "day" + (day.isCurrentMonth ? "" : " other-month");

    const num = document.createElement("div");
    num.className = "day-number";
    num.textContent = String(day.date.getDate());
    cell.appendChild(num);

    const stack = document.createElement("div");
    stack.className = "events";

    // Events that intersect this day
    const todays = searchedEvents.filter(ev => isInRange(day.iso, ev.startDate, ev.endDate));

    // Sort: starts first, then middles/ends, stable by title
    todays.sort((a,b) => {
      const pa = getEventPosition(day.iso, a.startDate, a.endDate);
      const pb = getEventPosition(day.iso, b.startDate, b.endDate);
      const score = (p) => (p==="single"||p==="start") ? 0 : 1;
      if (score(pa) !== score(pb)) return score(pa)-score(pb);
      return (a.title||"").localeCompare(b.title||"");
    });

    todays.forEach(ev => {
      const pos = getEventPosition(day.iso, ev.startDate, ev.endDate);
      const color = SOLUTION_COLOR[ev.solution] || "var(--muted-foreground)";

      if (pos === "single" || pos === "start"){
        const card = document.createElement("div");
        card.className = "event-card";
        card.style.borderLeftColor = color;
        card.addEventListener("click", () => openModal(ev));

        const title = document.createElement("div");
        title.className = "event-title";
        title.textContent = ev.title || "(Untitled)";
        card.appendChild(title);

        const loc = document.createElement("div");
        loc.className = "event-location";
        const pin = document.createElement("span");
        pin.className = "pin";
        pin.textContent = "📍";
        const locText = document.createElement("span");
        locText.textContent = ev.location || "-";
        loc.appendChild(pin);
        loc.appendChild(locText);
        card.appendChild(loc);

        const links = document.createElement("div");
        links.className = "event-links";

        if (ev.registrationUrl && ev.registrationUrl.trim()){
          links.appendChild(linkEl("등록하러 가기❯", ev.registrationUrl));
        }
        if (links.childNodes.length > 0){
          card.appendChild(links);
        }

        stack.appendChild(card);
      } else {
        // continuation cards for middle/end
        const cont = document.createElement("div");
        cont.className = "cont-card";
        cont.style.borderLeftColor = color;
        cont.addEventListener("click", () => openModal(ev));

        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.style.color = color;
        arrow.textContent = "→";

        const t = document.createElement("span");
        t.className = "cont-title";
        t.style.color = color;
        t.textContent = ev.title || "(Untitled)";

        cont.appendChild(arrow);
        cont.appendChild(t);

        stack.appendChild(cont);
      }
    });

    cell.appendChild(stack);
    calendarGridEl.appendChild(cell);
  });
}


function byDisplayOrder(items){
  return [...items].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.displayOrder)) ? Number(a.displayOrder) : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(Number(b.displayOrder)) ? Number(b.displayOrder) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function renderSidebar(){
  if (highlightListEl){
    highlightListEl.innerHTML = "";
    const highlightColors = [
      "var(--sol-all-csas)",
      "var(--sol-ai-business)",
      "var(--sol-cloud-ai)",
      "var(--sol-security)",
    ];
    byDisplayOrder(highlights).slice(0, 2).forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "highlight-card";
      card.style.borderLeftColor = SOLUTION_COLOR[item.solution] || highlightColors[index % highlightColors.length];

      const title = document.createElement("div");
      title.className = "highlight-title";
      title.textContent = item.title || "(Untitled)";

      const meta = document.createElement("div");
      meta.className = "highlight-meta";
      meta.textContent = item.metaText || item.meta || [item.date, item.location].filter(Boolean).join(" | ");

      const desc = document.createElement("div");
      desc.className = "highlight-description";
      desc.textContent = item.description || "";

      card.append(title, meta);
      if (item.description) card.appendChild(desc);
      if (item.url){
        const a = document.createElement("a");
        a.className = "sidebar-link";
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        a.textContent = "자세히 보기 ❯";
        card.appendChild(a);
      }
      highlightListEl.appendChild(card);
    });
  }

  if (onDemandListEl){
    onDemandListEl.innerHTML = "";
    byDisplayOrder(onDemand).slice(0, 3).forEach(item => {
      const a = document.createElement("a");
      a.className = "ondemand-item";
      a.href = item.url || "#";
      if (item.url){ a.target = "_blank"; a.rel = "noreferrer"; }
      else a.classList.add("disabled");

      const icon = document.createElement("span");
      icon.className = "ondemand-icon";
      icon.textContent = "▶";
      const copy = document.createElement("span");
      copy.className = "ondemand-copy";
      const title = document.createElement("div");
      title.className = "ondemand-title";
      title.textContent = item.title || "(Untitled)";
      const date = document.createElement("div");
      date.className = "ondemand-date";
      date.textContent = item.metaText || item.meta || (item.date ? `${item.date} 진행` : "On-demand");
      copy.append(title, date);
      const arrow = document.createElement("span");
      arrow.className = "ondemand-arrow";
      arrow.textContent = "›";
      a.append(icon, copy, arrow);
      onDemandListEl.appendChild(a);
    });
  }

  if (quickLinkListEl){
    quickLinkListEl.innerHTML = "";
    byDisplayOrder(quickLinks).slice(0, 2).forEach(item => {
      const el = item.url ? document.createElement("a") : document.createElement("div");
      el.className = "quicklink-item" + (item.url ? "" : " disabled");
      if (item.url){ el.href = item.url; el.target = "_blank"; el.rel = "noreferrer"; }
      const icon = document.createElement("span");
      icon.className = "quicklink-icon";
      icon.textContent = "↗";
      const title = document.createElement("span");
      title.className = "quicklink-title";
      title.textContent = item.title || "TBD";
      const arrow = document.createElement("span");
      arrow.className = "quicklink-arrow";
      arrow.textContent = item.url ? "›" : "";
      el.append(icon, title, arrow);
      quickLinkListEl.appendChild(el);
    });
  }
}

async function loadEvents(){
  const res = await fetch("./marketing-events.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load marketing-events.json");
  const data = await res.json();
  const eventData = Array.isArray(data) ? data : (data.events || []);
  allEvents = eventData.map((e, idx) => ({ id: e.id || `event-${idx}`, ...e }));
  highlights = Array.isArray(data) ? [] : (data.highlights || []);
  onDemand = Array.isArray(data) ? [] : (data.onDemand || []);
  quickLinks = Array.isArray(data) ? [] : (data.quickLinks || []);
}

function attachEvents(){
  prevBtn.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1);
    renderCalendar();
  });
  nextBtn.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1);
    renderCalendar();
  });
  todayBtn.addEventListener("click", () => {
    const now = new Date();
    currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
  });
  if (searchInput){
    searchInput.addEventListener("input", () => {
      searchQuery = (searchInput.value || "").trim().toLowerCase();
      renderCalendar();
    });
  }

  const closeHandlers = [modalCloseBtn, modalCloseBtn2];
  closeHandlers.forEach(btn => btn.addEventListener("click", closeModal));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.classList.contains("hidden")) closeModal();
  });
}

async function bootstrap(reload=false){
  try{
    await loadEvents();
    if (reload) {
      // no-op: loadEvents already uses no-store cache
    }
    renderFilters();
    renderCalendar();
    renderSidebar();
  } catch (err){
    console.error(err);
    alert("Failed to load marketing-events.json. Check console.");
  }
}

attachEvents();
bootstrap();
