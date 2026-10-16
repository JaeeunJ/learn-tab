// ============================================================================
// Waterloo LEARN Custom Sidebar & Enhancements (Manifest V3)
// ============================================================================

const STORAGE_KEY_DUES = 'uw_learn_saved_due_dates';

// ----------------------------------------------------------------------------
// 1. Navigation Band & Full-Width Header/Footer Overrides
// ----------------------------------------------------------------------------
function applyNavWidths() {
  const hosts = document.querySelectorAll('d2l-labs-navigation-main-header, d2l-labs-navigation-main-footer');
  let styledCount = 0;

  hosts.forEach(host => {
    if (!host || !host.shadowRoot) return;

    const centerer = host.shadowRoot.querySelector('.d2l-labs-navigation-centerer');
    if (centerer) {
      centerer.style.setProperty('max-width', 'none', 'important');
      centerer.style.setProperty('padding', '0 16px', 'important');
      styledCount++;
    }

    const gutters = host.shadowRoot.querySelector('.d2l-labs-navigation-gutters');
    if (gutters) {
      gutters.style.setProperty('margin', '0', 'important');
    }

    if (!host.shadowRoot.querySelector('#uw-custom-nav-style')) {
      const customStyle = document.createElement('style');
      customStyle.id = 'uw-custom-nav-style';
      customStyle.textContent = `
        .d2l-labs-navigation-centerer {
          max-width: none !important;
          padding: 0 16px !important;
        }
        .d2l-labs-navigation-gutters {
          margin: 0 !important;
        }
      `;
      host.shadowRoot.appendChild(customStyle);
    }
  });

  return styledCount >= 1;
}

function stripNavBand() {
  const bands = document.querySelectorAll('d2l-labs-navigation-band, .d2l-navigation-s-header-band');
  bands.forEach(band => band.remove());
}

function removeUnwantedWidgets() {
  stripNavBand();
  applyNavWidths();

  const unwantedSelectors = [
    '.d2l-course-banner',
    '.d2l-course-banner-container',
    '[data-widget-name="Mental Health"]',
    '[data-widget-name*="Mental Health"]'
  ];

  unwantedSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => el.remove());
  });
}

// ----------------------------------------------------------------------------
// 2. Due Dates Parser (DOM Scraping + SessionStorage Cache)
// ----------------------------------------------------------------------------
function loadUpcomingDueDates() {
  // 1. Parse live homepage widget items if present on screen
  const rawElements = document.querySelectorAll('.d2l-datalist-item, [class*="calendar-event"]');
  const parsedDates = [];

  rawElements.forEach(el => {
    const link = el.querySelector('a');
    if (!link || !link.href) return;

    const isCalendarLink = link.href.includes('/d2l/le/calendar/') || link.href.includes('detailsview');
    if (!isCalendarLink) return;

    const fullText = el.innerText.trim();

    let title = (link.innerText || '').trim();
    title = title.replace(/^View\s+Event\s*[-–]\s*/i, '').replace(/[-–]\s*Due\$/i, '').trim();

    const dateMatch =
      fullText.match(/([A-Za-z]{3})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i) ||
      fullText.match(/([A-Za-z]{3})\s+(\d{1,2})[,\s]+(\d{1,2}:\d{2}\s*(?:AM|PM))/i);

    let month = 'DUE';
    let day = '•';
    let timeStr = '';

    if (dateMatch) {
      month = dateMatch[1].toUpperCase();
      day = dateMatch[2];
      timeStr = dateMatch[3];
    }

    parsedDates.push({
      title: title || 'Deliverable Due',
      month: month,
      day: day,
      timeStr: timeStr,
      url: link.href
    });
  });

  // 2. Cache if found
  if (parsedDates.length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY_DUES, JSON.stringify(parsedDates));
    } catch (e) {}
    return Promise.resolve(parsedDates);
  }

  // 3. Fallback to cached items when inside individual course pages
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY_DUES);
    if (cached) {
      return Promise.resolve(JSON.parse(cached));
    }
  } catch (e) {}

  return Promise.resolve([]);
}

function populateDueDates(dueDates = []) {
  const container = document.getElementById('uw-due-dates-container');
  if (!container) return;

  const countText = dueDates.length > 0 ? ` (${dueDates.length})` : '';

  // Initial markup starts collapsed with right arrow and hidden list
  container.innerHTML = `
    <button class="uw-collapsible-toggle" id="uw-due-toggle-btn">
      <span>Due Dates${countText}</span>
      <span class="uw-due-toggle-icon">▶</span>
    </button>
    <div class="uw-due-list" id="uw-due-list" style="display: none;"></div>
  `;

  const dueList = container.querySelector('#uw-due-list');

  if (dueDates.length === 0) {
    dueList.innerHTML = `
      <div style="padding: 10px 14px; font-size: 11.5px; color: #64748b; font-style: italic;">
        No upcoming due dates
      </div>
    `;
  } else {
    dueDates.forEach(d => {
      const a = document.createElement('a');
      a.className = 'uw-due-item';
      a.href = d.url;
      a.title = d.title;
      a.innerHTML = `
        <div class="uw-due-badge">
          <span class="uw-due-badge-month">${d.month}</span>
          <span class="uw-due-badge-day">${d.day}</span>
        </div>
        <div class="uw-due-details">
          <div class="uw-due-title">${d.title}</div>
          <div class="uw-due-meta">${d.timeStr}</div>
        </div>
      `;
      dueList.appendChild(a);
    });
  }

  // Collapsed state logic
  let isDueOpen = false;
  const toggleBtn = container.querySelector('#uw-due-toggle-btn');
  toggleBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('uw-learn-sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) return;
    isDueOpen = !isDueOpen;
    dueList.style.display = isDueOpen ? 'block' : 'none';
    toggleBtn.querySelector('.uw-due-toggle-icon').textContent = isDueOpen ? '▼' : '▶';
  });
}

// ----------------------------------------------------------------------------
// 3. Render Sidebar (Flat Course List, No Faculty Dividers)
// ----------------------------------------------------------------------------
function renderSidebar(academicCourses, communityModules) {
  const existing = document.getElementById('uw-learn-sidebar');
  if (existing) existing.remove();

  document.documentElement.classList.add('uw-sidebar-open');

  const sidebar = document.createElement('aside');
  sidebar.id = 'uw-learn-sidebar';

  // Waterloo LEARN Brand Header
  const brandHeader = document.createElement('div');
  brandHeader.className = 'uw-sidebar-brand';

  const brandLink = document.createElement('a');
  brandLink.className = 'uw-brand-link';
  brandLink.href = '/d2l/home';
  brandLink.title = 'LEARN Homepage';
  brandLink.innerHTML = `
    <div class="uw-brand-logo-text">
      <span class="uw-logo-word-top">WATERLOO</span>
      <span class="uw-logo-word-bot">LEARN</span>
    </div>
  `;

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'uw-collapse-toggle';
  collapseBtn.id = 'uw-sidebar-collapse';
  collapseBtn.title = 'Collapse sidebar';
  collapseBtn.textContent = '◀';

  brandHeader.appendChild(brandLink);
  brandHeader.appendChild(collapseBtn);
  sidebar.appendChild(brandHeader);

  // Scroll Container
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'uw-sidebar-scroll';

  // Academic Courses Group
  const academicGroup = document.createElement('div');
  academicGroup.className = 'uw-section-group';

  academicCourses.forEach(c => {
    const itemContainer = document.createElement('div');
    itemContainer.className = 'uw-course-accordion-item';

    const headerLink = document.createElement('a');
    headerLink.className = 'uw-course-accordion-btn';
    headerLink.href = `/d2l/home/${c.id}`;
    headerLink.innerHTML = `
      <div class="uw-course-btn-text">
        <div class="uw-course-title">${c.title}</div>
      </div>
      <span class="uw-course-chevron">›</span>
    `;

    const tray = document.createElement('div');
    tray.className = 'uw-quicknav-tray';
    tray.innerHTML = `
      <a href="/d2l/home/${c.id}">Home</a>
      <a href="/d2l/le/content/${c.id}/Home">Content</a>
      <a href="/d2l/lms/grades/my_grades/main.d2l?ou=${c.id}">Grades</a>
      <a href="/d2l/lms/dropbox/user/folders_list.d2l?ou=${c.id}">Dropbox</a>
      <a href="/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${c.id}">Quizzes</a>
      <a href="/d2l/le/${c.id}/discussions/List">Discussions</a>
    `;

    itemContainer.appendChild(headerLink);
    itemContainer.appendChild(tray);
    academicGroup.appendChild(itemContainer);
  });
  scrollContainer.appendChild(academicGroup);

  // Due Dates Slot (Directly below courses, above communities)
  const dueContainer = document.createElement('div');
  dueContainer.id = 'uw-due-dates-container';
  dueContainer.className = 'uw-due-dates-section';
  scrollContainer.appendChild(dueContainer);

  // Communities Section
  if (communityModules.length > 0) {
    const communitySection = document.createElement('div');
    communitySection.className = 'uw-community-section';

    const toggleHeader = document.createElement('button');
    toggleHeader.className = 'uw-collapsible-toggle';
    toggleHeader.innerHTML = `
      <span>Communities (${communityModules.length})</span>
      <span class="uw-toggle-icon">▶</span>
    `;

    const communityList = document.createElement('div');
    communityList.className = 'uw-community-list';
    communityList.style.display = 'none';

    communityModules.forEach(c => {
      const a = document.createElement('a');
      a.className = 'uw-community-item';
      a.href = `/d2l/home/${c.id}`;
      a.title = c.fullTitle;
      a.textContent = c.title;
      communityList.appendChild(a);
    });

    let isOpen = false;
    toggleHeader.addEventListener('click', () => {
      if (sidebar.classList.contains('collapsed')) return;
      isOpen = !isOpen;
      communityList.style.display = isOpen ? 'block' : 'none';
      toggleHeader.querySelector('.uw-toggle-icon').textContent = isOpen ? '▼' : '▶';
    });

    communitySection.appendChild(toggleHeader);
    communitySection.appendChild(communityList);
    scrollContainer.appendChild(communitySection);
  }

  sidebar.appendChild(scrollContainer);
  document.documentElement.appendChild(sidebar);

  collapseBtn.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    document.documentElement.classList.toggle('uw-sidebar-collapsed', isCollapsed);
    collapseBtn.textContent = isCollapsed ? '▶' : '◀';
  });
}

// ----------------------------------------------------------------------------
// 4. Data Fetching & Execution Pipeline
// ----------------------------------------------------------------------------
async function loadCourses() {
  try {
    const coursesRes = await fetch('/d2l/api/lp/1.43/enrollments/myenrollments/?canAccess=true&orgUnitTypeId=3&pageSize=100');
    if (!coursesRes.ok) throw new Error(`HTTP ${coursesRes.status}`);

    const data = await coursesRes.json();
    const items = data.Items || [];

    const relevant = items.filter(item => {
      const code = item.OrgUnit?.Code || '';
      const name = item.OrgUnit?.Name || '';
      const isCurrentTerm = code.includes('1269') || name.includes('1269');
      const isCommunity =
        name.includes('Engineering') ||
        name.includes('Announcements') ||
        name.includes('Orientation') ||
        name.includes('Tutoring');
      return isCurrentTerm || isCommunity;
    });

    const academicCourses = [];
    const communityModules = [];

    relevant.forEach(item => {
      const rawName = item.OrgUnit.Name || '';
      let cleanTitle = rawName;
      if (rawName.includes(' - ')) {
        cleanTitle = rawName.split(' - ')[0].trim();
      }

      const isCommunity =
        rawName.includes('Orientation') ||
        rawName.includes('Tutoring') ||
        rawName.includes('Announcements') ||
        rawName.includes('Community') ||
        rawName.includes('Skills:');

      const entry = {
        id: item.OrgUnit.Id,
        title: cleanTitle,
        fullTitle: rawName,
        code: item.OrgUnit.Code || ''
      };

      if (isCommunity) {
        communityModules.push(entry);
      } else {
        academicCourses.push(entry);
      }
    });

    academicCourses.sort((a, b) => a.title.localeCompare(b.title));

    renderSidebar(academicCourses, communityModules);

    loadUpcomingDueDates().then(dueDates => {
      populateDueDates(dueDates);
    });

  } catch (err) {
    console.error("[LEARN Extension] Failed to load courses:", err);
  }
}

// ----------------------------------------------------------------------------
// 5. Lifecycle & Mutation Observer
// ----------------------------------------------------------------------------
function init() {
  removeUnwantedWidgets();
  loadCourses();

  // Polling to catch widget render timing on cold loads
  setTimeout(() => {
    loadUpcomingDueDates().then(dueDates => {
      if (dueDates && dueDates.length > 0) populateDueDates(dueDates);
    });
  }, 1000);

  // Poll navigation shadow hydration
  let ticks = 0;
  const poll = setInterval(() => {
    ticks++;
    const ready = applyNavWidths();
    if (ticks > 50 || (ready && ticks > 20)) {
      clearInterval(poll);
    }
  }, 60);

  // MutationObserver for client-side navigation
  const observer = new MutationObserver(() => {
    removeUnwantedWidgets();
    if (!document.getElementById('uw-learn-sidebar')) {
      loadCourses();
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}