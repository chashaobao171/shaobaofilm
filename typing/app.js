'use strict';

/* ============================================================
   烧包数码训练 — 交互逻辑
   - 数码：4 位一组，10 组一行，10 行一页，共 6 页
   - 五笔：每页 5 行，用输入法跟打，自动结算速度与准确率
   - 第一次输入自动开始计时，页完成后自动进入下一页
   ============================================================ */

(() => {
  const CONFIG = {
    groupsPerLine: 10,
    rowsPerPage: 10,
    pagesPerSession: 6,
    groupLength: 4,
  };
  const CELLS_PER_PAGE = CONFIG.groupsPerLine * CONFIG.rowsPerPage;
  const WUBI_ROWS_PER_PAGE = 5;
  const WUBI_COLUMN_MIN = 32;
  const WUBI_ARTICLE_CHARS = 2000;
  const WUBI_MAX_CHARS = 20000;
  const LS = {
    settings: 'shaobao.settings.v1',
    lastNumber: 'shaobao.number.last.v1',
    lastWubi: 'shaobao.wubi.last.v1',
    history: 'shaobao.history.v1',
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    app: $('#app'),
    home: $('#screen-home'),
    practice: $('#screen-practice'),

    homeHelp: $('#home-help'),
    homeHelp2: $('#home-help-2'),
    practiceHelp: $('#practice-help'),
    startHome: $('#start-home'),
    importButton: $('#import-button'),
    fileInput: $('#file-input'),

    lastStats: $('#last-stats'),
    lastAvg: $('#last-avg'),
    lastAcc: $('#last-acc'),
    lastGroups: $('#last-groups'),
    lastAvgLabel: $('#last-avg-label'),
    lastGroupsLabel: $('#last-groups-label'),

    trendNumberValue: $('#trend-number-value'),
    trendNumberChart: $('#trend-number-chart'),
    trendWubiValue: $('#trend-wubi-value'),
    trendWubiChart: $('#trend-wubi-chart'),

    limitSeg: $('#limit-seg'),
    limitHint: $('#limit-hint'),
    modeCards: $$('.mode-card'),

    pageLabel: $('#page-label'),
    doneLabel: $('#done-label'),
    backHome: $('#back-home'),

    timeFill: $('#time-fill'),
    timeCaption: $('#time-caption'),

    referenceGrid: $('#reference-grid'),
    inputGrid: $('#input-grid'),
    inputHint: $('#input-hint'),
    statusPill: $('#status-pill'),
    sourcePill: $('#source-pill'),

    numberReferencePanel: $('#number-reference-panel'),
    numberInputPanel: $('#number-input-panel'),
    wubiReferencePanel: $('#wubi-reference-panel'),
    wubiInputPanel: $('#wubi-input-panel'),
    wubiReference: $('#wubi-reference'),
    wubiInput: $('#wubi-input'),
    wubiInputHint: $('#wubi-input-hint'),
    wubiStatusPill: $('#wubi-status-pill'),
    wubiSourcePill: $('#wubi-source-pill'),
    sideTip: $('#side-tip'),

    pauseLayer: $('#pause-layer'),
    resumeButton: $('#resume-button'),

    checkPopover: $('#check-popover'),
    checkClose: $('#check-close'),
    checkTitle: $('#check-title'),
    checkDetail: $('#check-detail'),

    statTime: $('#stat-time'),
    statLimit: $('#stat-limit'),
    statAverage: $('#stat-average'),
    statRecent: $('#stat-recent'),
    statErrors: $('#stat-errors'),
    statPageErrors: $('#stat-page-errors'),
    statAverageUnit: $('#stat-average-unit'),
    statRecentUnit: $('#stat-recent-unit'),
    statErrorsUnit: $('#stat-errors-unit'),
    statPageErrorsUnit: $('#stat-page-errors-unit'),

    toggleButton: $('#toggle-button'),
    toggleLabel: $('#toggle-label'),
    checkButton: $('#check-button'),
    resetButton: $('#reset-button'),
    statusLine: $('#status-line'),

    modal: $('#modal'),
    modalCard: $('#modal-card'),
    modalClose: $('#modal-close'),
    modalContent: $('#modal-content'),

    toast: $('#toast'),
  };

  const state = {
    session: null,
    limitMin: 6,
    bank: null,
    bankLabel: '自动生成',
    wubiBank: null,
    wubiLabel: '内置文本',
    wubiComposing: false,
    cells: [],
    refGroups: [],
    modalOpen: false,
    modalResume: false,
    modalOnClose: null,
    confirmAction: null,
    toastTimer: null,
    checkTimer: null,
    selectedMode: 'number',
  };

  /* ------------------------- 工具函数 ------------------------- */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* 无痕模式或 file:// 限制下不影响训练 */
    }
  }

  function randomGroup() {
    let value = '';
    for (let i = 0; i < CONFIG.groupLength; i += 1) {
      value += String(Math.floor(Math.random() * 10));
    }
    return value;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function formatSpeed(value) {
    if (!Number.isFinite(value) || value <= 0) return '0';
    if (value >= 100) return String(Math.round(value));
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('zh-CN').format(Math.max(0, Math.round(value)));
  }

  function setText(element, value) {
    if (element && element.textContent !== value) element.textContent = value;
  }

  function blurActiveControl() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }

  /* ------------------------- 会话数据 ------------------------- */

  function createSession(groups) {
    let pages;

    if (groups && groups.length > 0) {
      pages = [];
      for (let pageIndex = 0; pageIndex < CONFIG.pagesPerSession; pageIndex += 1) {
        const page = [];
        for (let cellIndex = 0; cellIndex < CELLS_PER_PAGE; cellIndex += 1) {
          page.push(groups[(pageIndex * CELLS_PER_PAGE + cellIndex) % groups.length]);
        }
        pages.push(page);
      }
    } else {
      pages = Array.from({ length: CONFIG.pagesPerSession }, () =>
        Array.from({ length: CELLS_PER_PAGE }, randomGroup)
      );
    }

    return {
      kind: 'number',
      pages,
      typed: Array.from({ length: CONFIG.pagesPerSession }, () =>
        Array(CELLS_PER_PAGE).fill('')
      ),
      page: 0,
      cell: 0,
      status: 'ready',
      elapsedMs: 0,
      lastTick: 0,
      timerId: null,
      limitMs: state.limitMin * 60 * 1000,
      backspaces: 0,
      history: [],
      finishedReason: '',
      pageTurnLock: false,
    };
  }

  function isWubi() {
    return !!state.session && state.session.kind === 'wubi';
  }

  function normalizeWubiText(text) {
    return String(text || '').replace(/\s+/g, '');
  }

  function pickWubiText() {
    const list = (Array.isArray(window.WUBI_TEXTS) ? window.WUBI_TEXTS : [])
      .map(normalizeWubiText)
      .filter((text) => text.length > 0);
    if (!list.length) return '烧包五笔训练，用输入法跟打上方文字，练出稳定的中文输入速度。';
    /* 每篇 2000 字：从随机一篇的篇首开始，按顺序拼接后续文本 */
    const start = Math.floor(Math.random() * list.length);
    const corpus = list.slice(start).concat(list.slice(0, start)).join('');
    return corpus.slice(0, WUBI_ARTICLE_CHARS);
  }

  /* 一页固定 5 行，列数随窗口自适应，因此每页字数按当前列数计算 */
  function wubiCharsPerPage() {
    const width = els.wubiReference.clientWidth;
    const contentWidth = Math.max(0, width - 28);
    const columns = contentWidth > 0 ? Math.floor(contentWidth / WUBI_COLUMN_MIN) : 30;
    return Math.max(10, columns) * WUBI_ROWS_PER_PAGE;
  }

  function createWubiSession(text, label) {
    let source = normalizeWubiText(text) || normalizeWubiText(pickWubiText());
    if (source.length > WUBI_MAX_CHARS) source = source.slice(0, WUBI_MAX_CHARS);
    const pageSize = wubiCharsPerPage();
    const pageCount = Math.max(1, Math.ceil(source.length / pageSize));
    const pages = [];
    for (let index = 0; index < pageCount; index += 1) {
      pages.push(source.slice(index * pageSize, (index + 1) * pageSize));
    }
    return {
      kind: 'wubi',
      pages,
      pageSize,
      typedPages: Array.from({ length: pages.length }, () => ''),
      sourceLabel: label || state.wubiLabel,
      page: 0,
      status: 'ready',
      elapsedMs: 0,
      lastTick: 0,
      timerId: null,
      limitMs: state.limitMin * 60 * 1000,
      backspaces: 0,
      history: [],
      finishedReason: '',
      pageTurnLock: false,
    };
  }

  function wubiPageText() {
    return isWubi() ? state.session.pages[state.session.page] || '' : '';
  }

  function wubiPageTyped() {
    return isWubi() ? state.session.typedPages[state.session.page] || '' : '';
  }

  function wubiPageErrors(pageIndex) {
    if (!isWubi()) return 0;
    const expected = state.session.pages[pageIndex] || '';
    const typed = state.session.typedPages[pageIndex] || '';
    let errors = 0;
    for (let index = 0; index < typed.length; index += 1) {
      if (typed[index] !== expected[index]) errors += 1;
    }
    return errors;
  }

  function renderWubiPage() {
    if (!isWubi()) return;
    const expected = wubiPageText();
    const typed = wubiPageTyped();
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < expected.length; index += 1) {
      const span = document.createElement('span');
      span.className = 'wubi-char';
      span.textContent = expected[index];
      if (index < typed.length) {
        span.classList.add(typed[index] === expected[index] ? 'is-correct' : 'is-wrong');
      } else if (index === typed.length && state.session.status !== 'finished') {
        span.classList.add('is-current');
      }
      fragment.appendChild(span);
    }

    els.wubiReference.replaceChildren(fragment);
    if (els.wubiInput.value !== typed) els.wubiInput.value = typed;
    setText(els.wubiSourcePill, state.session.sourceLabel);
  }

  function completeWubiPage(remainder) {
    if (!isWubi()) return;
    const session = state.session;
    const nextPage = session.page + 1;

    if (nextPage >= session.pages.length) {
      finish('complete');
      return;
    }

    const nextText = session.pages[nextPage] || '';
    const rest = normalizeWubiText(remainder || '');
    const carried = rest.slice(0, nextText.length);
    session.page = nextPage;
    session.typedPages[nextPage] = carried;
    renderWubiPage();
    updateAll();
    showToast(`第 ${nextPage} 页完成 · 进入第 ${nextPage + 1} 页`, 'ok');

    if (carried.length >= nextText.length) {
      completeWubiPage(rest.slice(nextText.length));
    } else {
      els.wubiInput.focus({ preventScroll: true });
    }
  }

  function handleWubiInput() {
    if (!isWubi() || state.wubiComposing) return;
    const session = state.session;

    if (session.status === 'paused' || session.status === 'finished') {
      els.wubiInput.value = wubiPageTyped();
      return;
    }

    const value = normalizeWubiText(els.wubiInput.value);
    const pageLength = wubiPageText().length;

    if (session.status === 'ready' && value.length > 0) {
      startOrResume();
    }
    if (session.status !== 'running') {
      els.wubiInput.value = wubiPageTyped();
      return;
    }

    session.typedPages[session.page] = value.slice(0, pageLength);
    updateStats();
    renderWubiPage();

    if (session.typedPages[session.page].length >= pageLength) {
      completeWubiPage(value.slice(pageLength));
    }
  }

  function pageDone(pageIndex) {
    if (!state.session) return 0;
    if (isWubi()) return (state.session.typedPages[pageIndex] || '').length;
    return state.session.typed[pageIndex].reduce(
      (count, value) => count + (value.length === CONFIG.groupLength ? 1 : 0),
      0
    );
  }

  function totalDone() {
    if (!state.session) return 0;
    if (isWubi()) {
      return state.session.typedPages.reduce((count, value) => count + value.length, 0);
    }
    let count = 0;
    for (let pageIndex = 0; pageIndex < CONFIG.pagesPerSession; pageIndex += 1) {
      count += pageDone(pageIndex);
    }
    return count;
  }

  function pageErrors(pageIndex) {
    if (!state.session) return 0;
    if (isWubi()) return wubiPageErrors(pageIndex);
    const expected = state.session.pages[pageIndex];
    const typed = state.session.typed[pageIndex];
    let errors = 0;
    for (let index = 0; index < CELLS_PER_PAGE; index += 1) {
      if (typed[index].length === CONFIG.groupLength && typed[index] !== expected[index]) {
        errors += 1;
      }
    }
    return errors;
  }

  function totalErrors() {
    if (!state.session) return 0;
    if (isWubi()) {
      return state.session.typedPages.reduce(
        (count, _typed, pageIndex) => count + wubiPageErrors(pageIndex),
        0
      );
    }
    let errors = 0;
    for (let pageIndex = 0; pageIndex < CONFIG.pagesPerSession; pageIndex += 1) {
      errors += pageErrors(pageIndex);
    }
    return errors;
  }

  function collectMistakes() {
    if (!state.session) return [];
    const mistakes = [];
    if (isWubi()) {
      const session = state.session;
      session.typedPages.forEach((typed, pageIndex) => {
        const expected = session.pages[pageIndex] || '';
        for (let index = 0; index < typed.length; index += 1) {
          if (typed[index] !== expected[index]) {
            mistakes.push({
              page: pageIndex + 1,
              index: index + 1,
              expected: expected[index],
              typed: typed[index],
            });
          }
        }
      });
      return mistakes;
    }
    for (let pageIndex = 0; pageIndex < CONFIG.pagesPerSession; pageIndex += 1) {
      const expected = state.session.pages[pageIndex];
      const typed = state.session.typed[pageIndex];
      for (let index = 0; index < CELLS_PER_PAGE; index += 1) {
        if (typed[index].length === CONFIG.groupLength && typed[index] !== expected[index]) {
          mistakes.push({
            page: pageIndex + 1,
            index: index + 1,
            expected: expected[index],
            typed: typed[index],
          });
        }
      }
    }
    return mistakes;
  }

  function pagesCompleted() {
    if (!state.session) return 0;
    if (isWubi()) {
      const session = state.session;
      return session.typedPages.reduce((count, typed, pageIndex) => {
        return count + (typed.length >= (session.pages[pageIndex] || '').length ? 1 : 0);
      }, 0);
    }
    let count = 0;
    for (let pageIndex = 0; pageIndex < CONFIG.pagesPerSession; pageIndex += 1) {
      if (pageDone(pageIndex) === CELLS_PER_PAGE) count += 1;
    }
    return count;
  }

  function accuracy() {
    const done = totalDone();
    if (done === 0) return 0;
    return Math.max(0, Math.round(((done - totalErrors()) / done) * 100));
  }

  function averageSpeed() {
    if (!state.session || state.session.elapsedMs <= 0) return 0;
    const unit = isWubi() ? 60 : 360;
    return (totalDone() / (state.session.elapsedMs / 1000)) * unit;
  }

  function recentSpeed() {
    if (!state.session) return 0;
    const history = state.session.history;
    if (history.length < 2) return 0;
    const now = state.session.elapsedMs / 1000;
    const samples = history.filter((sample) => now - sample.t <= 5);
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const deltaTime = Math.max(0.5, last.t - first.t);
    const deltaCount = Math.max(0, last.count - first.count);
    return (deltaCount / deltaTime) * (isWubi() ? 60 : 360);
  }

  /* ------------------------- 界面状态 ------------------------- */

  function setAppStatus(status) {
    els.app.dataset.status = status;
    if (!state.session) return;

    const labels = {
      ready: '准备中',
      running: '计时中',
      paused: '已暂停',
      finished: '已结束',
    };
    setText(els.statusPill, labels[status] || '准备中');
    setText(els.wubiStatusPill, labels[status] || '准备中');

    const hints = isWubi()
      ? {
          ready: '在输入框里打第一个字开始计时',
          running: '跟打上方文字，按 Esc 暂停',
          paused: '已暂停，按 Esc 继续',
          finished: '本局已结束',
        }
      : {
          ready: '输入任意数字开始计时',
          running: '满 4 位自动跳格',
          paused: '已暂停，按 Esc 继续',
          finished: '本局已结束',
        };
    setText(els.inputHint, isWubi() ? '四位数一组，十组一行' : hints[status] || '');
    setText(els.wubiInputHint, isWubi() ? hints[status] || '' : '在下方直接用五笔输入法跟打');
    setText(els.statusLine, hints[status] || '');
    setText(
      els.sideTip,
      isWubi()
        ? `五笔模式直接用输入法跟打，满 ${state.session?.pageSize || '整'} 字自动翻页。`
        : '空格无需输入，满 4 位自动跳格。'
    );
    els.wubiInput.readOnly = status === 'paused' || status === 'finished';

    const toggleLabels = {
      ready: '开始',
      running: '暂停',
      paused: '继续',
      finished: '已结束',
    };
    setText(els.toggleLabel, toggleLabels[status] || '开始');
    els.toggleButton.disabled = status === 'finished';

    if (status === 'paused') {
      els.pauseLayer.classList.remove('is-hidden');
    } else {
      els.pauseLayer.classList.add('is-hidden');
    }
  }

  function updateStats() {
    if (!state.session) return;
    const session = state.session;
    const wubi = isWubi();
    const elapsedSeconds = Math.floor(session.elapsedMs / 1000);
    const done = pageDone(session.page);
    const doneTotal = totalDone();
    const errorsPage = pageErrors(session.page);
    const errorsTotal = totalErrors();
    const totalPages = wubi ? session.pages.length : CONFIG.pagesPerSession;

    setText(els.pageLabel, `第 ${session.page + 1} / ${totalPages} 页`);
    setText(
      els.doneLabel,
      wubi ? `${done} / ${wubiPageText().length} 字` : `${done} / ${CELLS_PER_PAGE} 组`
    );
    setText(els.statAverageUnit, wubi ? '字 / 分' : '组 / 6 分');
    setText(els.statRecentUnit, wubi ? '字 / 分' : '组 / 6 分');
    setText(els.statErrorsUnit, wubi ? '字' : '组');
    setText(els.statPageErrorsUnit, wubi ? '字' : '组');
    setText(els.statTime, formatTime(elapsedSeconds));
    setText(els.statLimit, state.limitMin > 0 ? `限时 ${state.limitMin} 分` : '不限时');
    setText(els.statAverage, formatSpeed(averageSpeed()));
    setText(els.statRecent, formatSpeed(recentSpeed()));
    setText(els.statErrors, String(errorsTotal));
    setText(els.statPageErrors, String(errorsPage));

    if (session.limitMs > 0) {
      const remaining = Math.max(0, session.limitMs / 1000 - elapsedSeconds);
      setText(els.timeCaption, `${formatTime(remaining)} 剩余`);
      els.timeFill.style.width = `${clamp((elapsedSeconds * 1000 / session.limitMs) * 100, 0, 100)}%`;
    } else {
      setText(els.timeCaption, `${formatTime(elapsedSeconds)} 已用`);
      els.timeFill.style.width = '0%';
    }

    if (doneTotal === 0 && session.status === 'ready') {
      setText(els.statusLine, wubi ? '在输入框里打第一个字开始计时' : '输入任意数字开始计时');
    }
  }

  function updateActiveCell() {
    if (!state.session) return;
    state.cells.forEach((cell, index) => {
      cell.classList.toggle('is-active', index === state.session.cell);
    });
    state.refGroups.forEach((group, index) => {
      group.classList.toggle('is-current', index === state.session.cell);
    });
  }

  function syncCell(index) {
    if (!state.session || !state.cells[index]) return;
    const value = state.session.typed[state.session.page][index];
    const expected = state.session.pages[state.session.page][index];
    const cell = state.cells[index];
    const text = $('.cell-text', cell);
    if (text) text.textContent = value;
    cell.classList.toggle('is-complete', value.length === CONFIG.groupLength);
    cell.classList.toggle('is-wrong', value.length === CONFIG.groupLength && value !== expected);
  }

  function syncAllCells() {
    for (let index = 0; index < CELLS_PER_PAGE; index += 1) syncCell(index);
  }

  function updateSourcePill() {
    if (state.bank) {
      setText(els.sourcePill, `题库 · ${formatNumber(state.bank.length)} 组`);
    } else {
      setText(els.sourcePill, '自动生成');
    }
  }

  function updateAll() {
    if (!state.session) return;
    updateSourcePill();
    setAppStatus(state.session.status);
    updateStats();
    updateActiveCell();
  }

  /* ------------------------- 训练网格 ------------------------- */

  function buildGrids() {
    if (!state.session) return;
    const pageIndex = state.session.page;
    const expected = state.session.pages[pageIndex];
    const typed = state.session.typed[pageIndex];

    els.referenceGrid.innerHTML = '';
    els.inputGrid.innerHTML = '';

    const referenceFragment = document.createDocumentFragment();
    const inputFragment = document.createDocumentFragment();

    for (let row = 0; row < CONFIG.rowsPerPage; row += 1) {
      const band = Math.floor(row / 2) % 2;
      const rowStart = row * CONFIG.groupsPerLine;

      const referenceRow = document.createElement('div');
      referenceRow.className = `digit-row band-${band}`;

      const referenceNo = document.createElement('span');
      referenceNo.className = 'row-no';
      referenceNo.textContent = String(row + 1);

      const referenceGroups = document.createElement('div');
      referenceGroups.className = 'groups';

      const inputRow = document.createElement('div');
      inputRow.className = `digit-row input-row band-${band}`;

      const inputNo = document.createElement('span');
      inputNo.className = 'row-no';
      inputNo.textContent = String(row + 1);

      const inputGroups = document.createElement('div');
      inputGroups.className = 'groups';

      for (let column = 0; column < CONFIG.groupsPerLine; column += 1) {
        const index = rowStart + column;

        const group = document.createElement('span');
        group.className = 'group';
        group.dataset.index = String(index);
        group.textContent = expected[index];
        referenceGroups.appendChild(group);

        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = String(index);
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '-1');
        cell.setAttribute('aria-label', `第 ${index + 1} 组`);

        const cellText = document.createElement('span');
        cellText.className = 'cell-text';
        cellText.textContent = typed[index];

        const caret = document.createElement('span');
        caret.className = 'caret';

        cell.append(cellText, caret);
        inputGroups.appendChild(cell);
      }

      referenceRow.append(referenceNo, referenceGroups);
      inputRow.append(inputNo, inputGroups);
      referenceFragment.appendChild(referenceRow);
      inputFragment.appendChild(inputRow);
    }

    els.referenceGrid.appendChild(referenceFragment);
    els.inputGrid.appendChild(inputFragment);

    state.refGroups = $$('.group', els.referenceGrid);
    state.cells = $$('.cell', els.inputGrid);

    syncAllCells();
    updateActiveCell();
  }

  function addPageEnterAnimation() {
    [els.referenceGrid, els.inputGrid].forEach((grid) => {
      grid.classList.remove('page-enter');
      void grid.offsetWidth;
      grid.classList.add('page-enter');
    });
  }

  /* ------------------------- 计时 ------------------------- */

  function startTimer() {
    if (!state.session || state.session.timerId) return;
    state.session.lastTick = performance.now();
    state.session.timerId = window.setInterval(tick, 200);
  }

  function stopTimer() {
    if (!state.session) return;
    if (state.session.timerId) {
      window.clearInterval(state.session.timerId);
      state.session.timerId = null;
    }
  }

  function tick() {
    if (!state.session || state.session.status !== 'running') return;
    const session = state.session;
    const now = performance.now();
    session.elapsedMs += now - session.lastTick;
    session.lastTick = now;

    const second = Math.floor(session.elapsedMs / 1000);
    const history = session.history;
    if (history.length === 0 || history[history.length - 1].t < second) {
      history.push({ t: second, count: totalDone() });
      if (history.length > 2400) history.splice(0, history.length - 2400);
    }

    if (session.limitMs > 0 && session.elapsedMs >= session.limitMs) {
      session.elapsedMs = session.limitMs;
      updateStats();
      finish('time');
      return;
    }

    updateStats();
  }

  function startOrResume() {
    if (!state.session || state.session.status === 'finished') return;
    if (state.session.status === 'running') {
      pause();
      return;
    }

    state.session.status = 'running';
    startTimer();
    setAppStatus('running');
    updateStats();
    blurActiveControl();
    if (isWubi()) {
      els.wubiInput.readOnly = false;
      els.wubiInput.focus({ preventScroll: true });
    } else {
      els.practice.focus({ preventScroll: true });
    }
  }

  function pause() {
    if (!state.session || state.session.status !== 'running') return;
    state.session.elapsedMs += performance.now() - state.session.lastTick;
    state.session.status = 'paused';
    stopTimer();
    setAppStatus('paused');
    updateStats();
  }

  function finish(reason) {
    if (!state.session || state.session.status === 'finished') return;
    if (state.session.status === 'running') {
      state.session.elapsedMs += performance.now() - state.session.lastTick;
    }
    state.session.status = 'finished';
    state.session.finishedReason = reason;
    stopTimer();
    hideToast();
    setAppStatus('finished');
    updateStats();
    if (isWubi()) {
      renderWubiPage();
      els.wubiInput.blur();
    }

    const result = buildResult();
    saveLastSession(result);
    openResultModal(result);
  }

  function buildResult() {
    const session = state.session;
    const wubi = session.kind === 'wubi';
    const seconds = Math.max(0, Math.floor(session.elapsedMs / 1000));
    const done = totalDone();
    const mistakes = collectMistakes();
    const correct = Math.max(0, done - mistakes.length);
    const acc = done > 0 ? Math.round((correct / done) * 100) : 0;
    const avg = seconds > 0 ? (done / seconds) * (wubi ? 60 : 360) : 0;

    return {
      mode: wubi ? 'wubi' : 'number',
      date: new Date().toISOString(),
      reason: session.finishedReason,
      seconds,
      done,
      mistakes: mistakes.length,
      accuracy: acc,
      average: avg,
      backspaces: session.backspaces,
      pages: pagesCompleted(),
      pagesTotal: wubi ? session.pages.length : CONFIG.pagesPerSession,
      limit: state.limitMin,
      source: wubi ? session.sourceLabel : '自动生成',
      detail: mistakes.slice(0, 60),
    };
  }

  function saveLastSession(result) {
    writeJSON(result.mode === 'wubi' ? LS.lastWubi : LS.lastNumber, result);
    const history = readJSON(LS.history, []);
    history.unshift(result);
    writeJSON(LS.history, history.slice(0, 30));
  }

  /* ------------------------- 输入逻辑 ------------------------- */

  function findNextEmpty(fromIndex) {
    if (!state.session) return -1;
    const values = state.session.typed[state.session.page];
    for (let index = fromIndex + 1; index < CELLS_PER_PAGE; index += 1) {
      if (values[index].length < CONFIG.groupLength) return index;
    }
    for (let index = 0; index < fromIndex; index += 1) {
      if (values[index].length < CONFIG.groupLength) return index;
    }
    return -1;
  }

  function afterGroupDone(index) {
    updateStats();

    if (pageDone(state.session.page) >= CELLS_PER_PAGE) {
      completePage();
      return;
    }

    const next = findNextEmpty(index);
    if (next !== -1) state.session.cell = next;
    updateActiveCell();
  }

  function handleDigit(digit) {
    if (!state.session) return;
    if (state.session.status === 'paused' || state.session.status === 'finished') return;
    if (state.session.status === 'ready') startOrResume();
    if (state.session.status !== 'running') return;

    const session = state.session;
    const pageValues = session.typed[session.page];
    let index = session.cell;

    if (pageValues[index].length >= CONFIG.groupLength) {
      const next = findNextEmpty(index);
      if (next === -1) return;
      index = next;
      session.cell = index;
      updateActiveCell();
    }

    if (pageValues[index].length >= CONFIG.groupLength) return;

    pageValues[index] += digit;
    syncCell(index);

    if (pageValues[index].length === CONFIG.groupLength) {
      afterGroupDone(index);
    } else {
      updateStats();
    }
  }

  function handleBackspace() {
    if (!state.session) return;
    if (state.session.status !== 'running' && state.session.status !== 'ready') return;
    if (state.session.status === 'ready') return;

    const session = state.session;
    const values = session.typed[session.page];
    let index = session.cell;

    if (values[index].length === 0) {
      index -= 1;
      while (index >= 0 && values[index].length === 0) index -= 1;
      if (index < 0) return;
      session.cell = index;
    }

    if (values[index].length === 0) return;
    values[index] = values[index].slice(0, -1);
    session.backspaces += 1;

    syncCell(index);
    updateActiveCell();
    updateStats();
  }

  function moveCell(delta) {
    if (!state.session) return;
    const next = clamp(state.session.cell + delta, 0, CELLS_PER_PAGE - 1);
    state.session.cell = next;
    updateActiveCell();
  }

  function moveRow(delta) {
    if (!state.session) return;
    const column = state.session.cell % CONFIG.groupsPerLine;
    const row = Math.floor(state.session.cell / CONFIG.groupsPerLine);
    const nextRow = clamp(row + delta, 0, CONFIG.rowsPerPage - 1);
    state.session.cell = nextRow * CONFIG.groupsPerLine + column;
    updateActiveCell();
  }

  function completePage() {
    if (!state.session || state.session.pageTurnLock) return;
    const session = state.session;
    session.pageTurnLock = true;
    const finishedPage = session.page + 1;

    if (session.page < CONFIG.pagesPerSession - 1) {
      session.page += 1;
      session.cell = 0;
      hideCheckPopover();
      buildGrids();
      addPageEnterAnimation();
      updateAll();
      showToast(`第 ${finishedPage} 页完成 · 进入第 ${session.page + 1} 页`);
      session.pageTurnLock = false;
    } else {
      session.pageTurnLock = false;
      finish('complete');
    }
  }

  /* ------------------------- 训练页操作 ------------------------- */

  function enterPractice(options = {}) {
    const mode = options.mode || state.selectedMode;
    state.selectedMode = mode === 'wubi' ? 'wubi' : 'number';
    const wubi = state.selectedMode === 'wubi';

    const wubiText = wubi ? options.text || state.wubiBank || pickWubiText() : '';
    const wubiLabel = wubi ? options.label || state.wubiLabel || '内置文本' : '';

    if (!wubi) {
      const bank = options.bank || null;
      state.bank = bank;
      state.bankLabel = options.label || (bank ? `题库 · ${bank.length} 组` : '自动生成');
      state.session = createSession(bank);
    }

    els.home.classList.remove('is-active');
    els.practice.classList.add('is-active');
    els.practice.setAttribute('tabindex', '-1');
    els.practice.classList.toggle('is-wubi', wubi);
    els.numberReferencePanel.classList.toggle('is-hidden', wubi);
    els.numberInputPanel.classList.toggle('is-hidden', wubi);
    els.wubiReferencePanel.classList.toggle('is-hidden', !wubi);
    els.wubiInputPanel.classList.toggle('is-hidden', !wubi);

    hideCheckPopover();
    els.pauseLayer.classList.add('is-hidden');
    if (wubi) {
      state.session = createWubiSession(wubiText, wubiLabel);
      renderWubiPage();
    } else {
      buildGrids();
    }
    updateAll();

    window.requestAnimationFrame(() => {
      els.practice.scrollTop = 0;
      if (wubi) {
        els.wubiInput.focus({ preventScroll: true });
      } else {
        els.practice.focus({ preventScroll: true });
      }
    });
  }

  function resetSession() {
    if (!state.session) return;
    stopTimer();
    const wubi = isWubi();
    if (wubi) {
      state.session = createWubiSession(state.wubiBank || pickWubiText(), state.wubiLabel || '内置文本');
    } else {
      state.session = createSession(state.bank);
    }
    hideCheckPopover();
    els.pauseLayer.classList.add('is-hidden');
    if (wubi) {
      renderWubiPage();
      els.wubiInput.focus({ preventScroll: true });
    } else {
      buildGrids();
      els.practice.focus({ preventScroll: true });
    }
    updateAll();
    showToast(wubi ? '已换一篇，打第一个字开始计时' : '已生成新题目，输入数字开始计时');
  }

  function requestReset() {
    if (!state.session) return;
    if (totalDone() > 0 && state.session.status !== 'finished') {
      openConfirm(
        '重来一局？',
        '当前页的输入会被清空，计时也会归零。',
        '重来',
        () => resetSession()
      );
    } else {
      resetSession();
    }
  }

  function requestHome() {
    if (!state.session || state.session.status === 'finished' || totalDone() === 0) {
      goHome();
      return;
    }
    openConfirm(
      '返回首页？',
      '当前训练进度会丢失，成绩不会保存。',
      '返回首页',
      () => goHome()
    );
  }

  function goHome() {
    stopTimer();
    state.session = null;
    state.bank = null;
    state.bankLabel = '自动生成';
    state.wubiBank = null;
    state.wubiLabel = '内置文本';
    els.practice.classList.remove('is-active');
    els.home.classList.add('is-active');
    els.app.dataset.status = 'home';
    els.pauseLayer.classList.add('is-hidden');
    hideCheckPopover();
    hideToast();
    updateHomeStats();
    window.scrollTo(0, 0);
  }

  function performCheck() {
    if (!state.session) return;
    const wubi = isWubi();
    const done = totalDone();
    const errorsPage = pageErrors(state.session.page);
    const errorsTotal = totalErrors();
    const acc = done > 0 ? Math.max(0, Math.round(((done - errorsTotal) / done) * 100)) : 0;
    const unit = wubi ? '字' : '组';

    if (done === 0) {
      setText(els.checkTitle, wubi ? '还没有输入内容' : '还没有完整的组');
      setText(els.checkDetail, wubi ? '先在输入框里打几个字，再校对。' : '先输入完整的 4 位数字，再校对。');
    } else {
      setText(els.checkTitle, `本页错误 ${errorsPage} ${unit}`);
      setText(els.checkDetail, `累计错误 ${errorsTotal} ${unit} · 准确率 ${acc}%`);
    }

    els.checkPopover.classList.remove('is-hidden');
    window.clearTimeout(state.checkTimer);
    state.checkTimer = window.setTimeout(hideCheckPopover, 9000);

    if (wubi) {
      $$('.wubi-char.is-wrong', els.wubiReference).forEach((char) => {
        char.classList.remove('is-shake');
        void char.offsetWidth;
        char.classList.add('is-shake');
      });
    } else {
      state.cells.forEach((cell) => {
        if (cell.classList.contains('is-wrong')) {
          cell.classList.remove('is-shake');
          void cell.offsetWidth;
          cell.classList.add('is-shake');
        }
      });
    }

    showToast(
      done === 0 ? '还没有可校对的内容' : `校对完成：本页 ${errorsPage} ${unit}错误`,
      errorsPage > 0 ? 'error' : 'ok'
    );
  }

  function hideCheckPopover() {
    els.checkPopover.classList.add('is-hidden');
    window.clearTimeout(state.checkTimer);
  }

  /* ------------------------- 首页设置 ------------------------- */

  function updateHomeStats() {
    const wubi = state.selectedMode === 'wubi';
    const last = readJSON(wubi ? LS.lastWubi : LS.lastNumber, null);
    const hasLast = last && last.done;
    setText(els.lastAvgLabel, wubi ? '上次平均 · 字/分' : '上次平均 · 组/6分');
    setText(els.lastGroupsLabel, wubi ? '上次完成字数' : '上次完成组数');
    setText(els.lastAvg, hasLast ? formatSpeed(last.average || 0) : '—');
    setText(els.lastAcc, hasLast ? `${Math.round(last.accuracy || 0)}%` : '—');
    setText(els.lastGroups, hasLast ? formatNumber(last.done || 0) : '—');
    updateTrendCharts();
  }

  function renderTrendChart(chartElement, valueElement, records, emptyText, label, color) {
    const values = records.map((item) => Number(item.done) || 0);
    if (!values.length) {
      setText(valueElement, '—');
      chartElement.innerHTML = `<p class="trend-empty">${emptyText}</p>`;
      return;
    }

    setText(valueElement, formatNumber(values[values.length - 1]));

    const width = 240;
    const height = 56;
    const padX = 6;
    const padY = 8;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const flat = max === min;
    const span = flat ? 1 : max - min;
    const stepX = values.length > 1 ? (width - padX * 2) / (values.length - 1) : 0;
    const points = values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : padX + index * stepX;
      const y = flat
        ? height / 2
        : height - padY - ((value - min) / span) * (height - padY * 2);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });
    const line = points.map((point) => point.join(',')).join(' ');
    const area = `M ${points[0][0]} ${height} L ${points
      .map((point) => `${point[0]} ${point[1]}`)
      .join(' L ')} L ${points[points.length - 1][0]} ${height} Z`;
    const gradientId = `trend-grad-${chartElement.id}`;
    const lastPoint = points[points.length - 1];

    chartElement.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img"
           aria-label="${label}进步曲线，最近 ${values.length} 次">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.24"></stop>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#${gradientId})"></path>
        ${
          values.length > 1
            ? `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline>`
            : ''
        }
        <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="2.4" fill="${color}"></circle>
      </svg>`;
  }

  function updateTrendCharts() {
    const history = readJSON(LS.history, []);
    const list = Array.isArray(history) ? history : [];
    /* 只取时长可比的成绩：数码 6 分钟、五笔 10 分钟，最近 10 次 */
    const pick = (mode, limit) =>
      list
        .filter((item) => item && item.mode === mode && Number(item.limit) === limit)
        .slice(0, 10)
        .reverse();

    renderTrendChart(
      els.trendNumberChart,
      els.trendNumberValue,
      pick('number', 6),
      '暂无 6 分钟记录',
      '数码 6 分钟总组数',
      '#e8791e'
    );
    renderTrendChart(
      els.trendWubiChart,
      els.trendWubiValue,
      pick('wubi', 10),
      '暂无 10 分钟记录',
      '五笔 10 分钟总字数',
      '#3f6e94'
    );
  }

  function updateLimitUI() {
    $$('button', els.limitSeg).forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.limit) === state.limitMin);
    });
    if (state.limitMin === 0) {
      setText(els.limitHint, '不限时，手动结束');
    } else {
      setText(els.limitHint, `${state.limitMin} 分钟后自动结算`);
    }
  }

  function selectLimit(limit) {
    state.limitMin = Number(limit);
    updateLimitUI();
    writeJSON(LS.settings, { limit: state.limitMin, mode: state.selectedMode });
  }

  function selectMode(mode) {
    state.selectedMode = mode === 'wubi' ? 'wubi' : 'number';
    els.modeCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.mode === state.selectedMode);
    });
    updateHomeStats();
    writeJSON(LS.settings, { limit: state.limitMin, mode: state.selectedMode });
  }

  function startFromHome() {
    enterPractice({ mode: state.selectedMode });
  }

  /* ------------------------- 导入题库 ------------------------- */

  async function importFile(file) {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      let text;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch (error) {
        text = new TextDecoder('gb18030').decode(buffer);
      }

      if (state.selectedMode === 'wubi') {
        const content = normalizeWubiText(text);
        if (content.length < 10) {
          showToast('文件里的文字太少，至少需要 10 个字', 'error');
          return;
        }
        state.wubiBank = content;
        state.wubiLabel = `题库 · ${formatNumber(content.length)} 字`;
        enterPractice({ mode: 'wubi', text: content, label: state.wubiLabel });
        showToast(`已导入 ${formatNumber(content.length)} 字，开始跟打`, 'ok');
        return;
      }

      const digits = text.replace(/\D/g, '');
      if (digits.length < CONFIG.groupLength) {
        showToast('文件里没有足够的数字', 'error');
        return;
      }

      const groups = [];
      for (let index = 0; index + CONFIG.groupLength <= digits.length; index += CONFIG.groupLength) {
        groups.push(digits.slice(index, index + CONFIG.groupLength));
      }

      state.bank = groups;
      state.bankLabel = `题库 · ${groups.length} 组`;
      enterPractice({ bank: groups, label: state.bankLabel });
      showToast(`已导入 ${formatNumber(groups.length)} 组，循环使用`, 'ok');
    } catch (error) {
      showToast('读取文件失败，请检查文件格式', 'error');
    }
  }

  /* ------------------------- 弹层 ------------------------- */

  function openModal(html, options = {}) {
    const shouldPause = options.pause !== false && state.session && state.session.status === 'running';
    if (shouldPause) {
      pause();
      state.modalResume = true;
    } else {
      state.modalResume = false;
    }

    els.modalContent.innerHTML = html;
    els.modal.classList.remove('is-hidden');
    state.modalOpen = true;
    state.modalOnClose = options.onClose || null;

    $$('[data-action]', els.modalContent).forEach((button) => {
      button.addEventListener('click', () => handleModalAction(button.dataset.action));
    });

    window.requestAnimationFrame(() => {
      const primary = $('[data-primary]', els.modalContent);
      if (primary) primary.focus({ preventScroll: true });
    });
  }

  function closeModal(options = {}) {
    els.modal.classList.add('is-hidden');
    state.modalOpen = false;

    const shouldResume = options.resume !== false && state.modalResume;
    state.modalResume = false;

    const callback = state.modalOnClose;
    state.modalOnClose = null;
    if (callback) callback();

    if (shouldResume && state.session && state.session.status === 'paused') {
      startOrResume();
    }
  }

  function handleModalAction(action) {
    switch (action) {
      case 'close':
        closeModal();
        break;
      case 'confirm':
        {
          const callback = state.confirmAction;
          state.confirmAction = null;
          closeModal({ resume: false });
          if (callback) callback();
        }
        break;
      case 'again':
        closeModal({ resume: false });
        resetSession();
        break;
      case 'home':
        closeModal({ resume: false });
        goHome();
        break;
      case 'export':
        exportCSV();
        break;
      default:
        closeModal();
    }
  }

  function openConfirm(title, message, confirmLabel, onConfirm) {
    state.confirmAction = onConfirm;
    openModal(
      `<span class="modal-kicker">CONFIRM</span>
       <h2 class="modal-title" id="modal-title">${title}</h2>
       <p class="modal-subtitle">${message}</p>
       <div class="modal-actions">
         <button class="button button-primary" data-action="confirm" data-primary type="button">${confirmLabel}</button>
         <button class="button button-ghost" data-action="close" type="button">取消</button>
       </div>`,
      {
        onClose: () => {
          if (state.confirmAction) state.confirmAction = null;
        },
      }
    );
  }

  function openResultModal(result) {
    const wubi = result.mode === 'wubi';
    const unit = wubi ? '字' : '组';
    const reasonTitle = result.reason === 'time' ? '时间到' : '全部完成';
    const reasonText =
      result.reason === 'time'
        ? '限时结束，下面是这一局的统计。'
        : wubi
          ? '这篇文本已经全部打完。'
          : '六页数码已经全部完成。';

    const detailItems = result.detail.length
      ? result.detail
          .map(
            (item) =>
              `<div class="mistake-item"><b>第 ${item.page} 页 · 第 ${item.index} ${unit}</b><span>期望 ${item.expected} / 实际 ${item.typed}</span></div>`
          )
          .join('')
      : `<div class="mistake-item"><b>全部正确</b><span>这一局没有错误${unit}。</span></div>`;

    const html = `
      <span class="modal-kicker">${result.reason === 'time' ? 'TIME UP' : 'SESSION COMPLETE'}</span>
      <h2 class="modal-title" id="modal-title">${reasonTitle}</h2>
      <p class="modal-subtitle">${reasonText}</p>

      <div class="result-hero">
        <strong>${formatSpeed(result.average)}</strong>
        <span>${wubi ? '字 / 分 · 平均速度' : '组 / 6 分 · 平均速度'}</span>
      </div>

      <div class="result-grid">
        <div><span>用时</span><strong>${formatTime(result.seconds)}</strong></div>
        <div><span>完成${unit}数</span><strong>${formatNumber(result.done)}</strong></div>
        <div><span>准确率</span><strong>${result.accuracy}%</strong></div>
        <div><span>错误${unit}数</span><strong>${formatNumber(result.mistakes)}</strong></div>
        <div><span>回删次数</span><strong>${formatNumber(result.backspaces)}</strong></div>
        <div><span>完成页数</span><strong>${result.pages} / ${result.pagesTotal}</strong></div>
      </div>

      <details class="mistake-block">
        <summary>错误明细（${formatNumber(result.mistakes)} ${unit}）</summary>
        <div class="mistake-list">${detailItems}</div>
      </details>

      <div class="modal-actions">
        <button class="button button-primary" data-action="again" data-primary type="button">再来一局 <kbd>Enter</kbd></button>
        <button class="button button-ghost" data-action="home" type="button">返回首页</button>
        <button class="link-button" data-action="export" type="button">导出成绩</button>
      </div>
    `;

    openModal(html, { pause: false });
  }

  function openHelp() {
    const wubi = state.selectedMode === 'wubi';
    const rows = wubi
      ? [
          ['跟打文字', '<kbd>五笔输入法</kbd>'],
          ['删除上一位', '<kbd>Backspace</kbd>'],
          ['开始 / 继续', '<kbd>Alt+Q</kbd>'],
          ['暂停 / 继续', '<kbd>Esc</kbd>'],
          ['校对当前页', '<kbd>Alt+E</kbd>'],
          ['重来一局', '<kbd>Alt+R</kbd>'],
          ['快捷键说明', '<kbd>F1</kbd>'],
        ]
      : [
          ['输入数字', '<kbd>0–9</kbd>'],
          ['删除上一位', '<kbd>Backspace</kbd>'],
          ['上一组 / 下一组', '<kbd>←</kbd><kbd>→</kbd>'],
          ['上一行 / 下一行', '<kbd>↑</kbd><kbd>↓</kbd>'],
          ['下一组 / 上一组', '<kbd>Tab</kbd><kbd>Shift+Tab</kbd>'],
          ['开始 / 下一行', '<kbd>Enter</kbd>'],
          ['暂停 / 继续', '<kbd>Esc</kbd>'],
          ['开始 / 继续', '<kbd>Alt+Q</kbd>'],
          ['校对当前页', '<kbd>Alt+E</kbd>'],
          ['重来一局', '<kbd>Alt+R</kbd>'],
          ['打开快捷键说明', '<kbd>F1</kbd>'],
        ];

    const html = `
      <span class="modal-kicker">SHORTCUTS</span>
      <h2 class="modal-title" id="modal-title">快捷键与操作</h2>
      <p class="modal-subtitle">${wubi ? '五笔模式直接用输入法跟打，专注文字即可。' : '键盘优先，不需要用鼠标点输入框。'}</p>

      <div class="help-list">
        ${rows
          .map(
            (row) =>
              `<div class="help-row"><span>${row[0]}</span><span class="help-keys">${row[1]}</span></div>`
          )
          .join('')}
      </div>

      <p class="help-note">${
        wubi
          ? '每页 5 行，打满自动翻页。文字会实时比对，打错的字标红；时间用完或整篇打完即结算。'
          : '空格不需要输入：每满 4 位会自动跳到下一组。每页 100 组，完成后自动进入下一页；6 页全部完成或时间用完即结算。'
      }</p>

      <div class="modal-actions">
        <button class="button button-primary" data-action="close" data-primary type="button">知道了</button>
      </div>
    `;
    openModal(html, { pause: true });
  }

  /* ------------------------- 导出 ------------------------- */

  function exportCSV() {
    if (!state.session) return;
    const wubi = isWubi();
    const rows = [['page', 'index', 'expected', 'typed', 'correct']];

    if (wubi) {
      state.session.typedPages.forEach((typed, pageIndex) => {
        const expected = state.session.pages[pageIndex] || '';
        for (let index = 0; index < typed.length; index += 1) {
          rows.push([
            pageIndex + 1,
            index + 1,
            expected[index],
            typed[index],
            typed[index] === expected[index] ? 1 : 0,
          ]);
        }
      });
    } else {
      state.session.pages.forEach((expectedPage, pageIndex) => {
        expectedPage.forEach((expected, cellIndex) => {
          const typed = state.session.typed[pageIndex][cellIndex];
          rows.push([
            pageIndex + 1,
            cellIndex + 1,
            expected,
            typed,
            typed.length === CONFIG.groupLength && typed === expected ? 1 : 0,
          ]);
        });
      });
    }

    const csv = `\ufeff${rows.map((row) => row.join(',')).join('\r\n')}`;
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `烧包${wubi ? '五笔' : '数码'}训练_${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('成绩已导出为 CSV', 'ok');
  }

  /* ------------------------- Toast ------------------------- */

  function showToast(message, type = 'info') {
    window.clearTimeout(state.toastTimer);
    els.toast.classList.remove('is-visible', 'is-error', 'is-ok', 'is-hidden');
    if (type === 'error') els.toast.classList.add('is-error');
    if (type === 'ok') els.toast.classList.add('is-ok');
    els.toast.textContent = message;

    window.requestAnimationFrame(() => {
      els.toast.classList.add('is-visible');
    });

    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove('is-visible');
      state.toastTimer = window.setTimeout(() => {
        els.toast.classList.add('is-hidden');
      }, 200);
    }, 2600);
  }

  function hideToast() {
    window.clearTimeout(state.toastTimer);
    state.toastTimer = null;
    els.toast.classList.remove('is-visible', 'is-ok', 'is-error');
    els.toast.classList.add('is-hidden');
  }

  /* ------------------------- 键盘 ------------------------- */

  function handleHomeKey(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startFromHome();
      return;
    }
    if (event.key === '1') {
      event.preventDefault();
      selectMode('number');
      return;
    }
    if (event.key === '2') {
      event.preventDefault();
      selectMode('wubi');
      return;
    }
    if (event.key === 'F1' || event.key === '?') {
      event.preventDefault();
      openHelp();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      selectMode(state.selectedMode === 'wubi' ? 'number' : 'wubi');
    }
  }

  function handlePracticeKey(event) {
    if (event.key === 'F1' || (event.key === '?' && !isWubi())) {
      event.preventDefault();
      openHelp();
      return;
    }

    if (event.altKey) {
      if (event.code === 'KeyQ') {
        event.preventDefault();
        startOrResume();
        return;
      }
      if (event.code === 'KeyE') {
        event.preventDefault();
        performCheck();
        return;
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        requestReset();
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (!state.session) return;
      if (state.session.status === 'running') pause();
      else if (state.session.status === 'paused') startOrResume();
      else if (state.session.status === 'finished') goHome();
      return;
    }

    if (!state.session) return;

    if (isWubi()) {
      if (state.session.status === 'running' && event.key === 'Backspace') {
        state.session.backspaces += 1;
      }
      return;
    }

    if (state.session.status === 'paused' || state.session.status === 'finished') return;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (state.session.status === 'ready') startOrResume();
      else moveRow(1);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      moveCell(event.shiftKey ? -1 : 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveCell(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveCell(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveRow(-1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveRow(1);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      handleBackspace();
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      handleDigit(event.key);
    }
  }

  function handleModalKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key === 'Enter') {
      const primary = $('[data-primary]', els.modalContent);
      if (primary) {
        event.preventDefault();
        primary.click();
      }
      return;
    }
    if (event.key === 'Tab') {
      const focusables = $$(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        els.modal
      ).filter((element) => !element.disabled);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function onKeyDown(event) {
    if (state.modalOpen) {
      handleModalKey(event);
      return;
    }
    if (els.home.classList.contains('is-active')) {
      handleHomeKey(event);
      return;
    }
    if (els.practice.classList.contains('is-active')) {
      handlePracticeKey(event);
    }
  }

  /* ------------------------- 事件绑定 ------------------------- */

  function bindEvents() {
    window.addEventListener('keydown', onKeyDown, true);

    els.startHome.addEventListener('click', startFromHome);
    els.homeHelp.addEventListener('click', openHelp);
    els.homeHelp2.addEventListener('click', openHelp);
    els.practiceHelp.addEventListener('click', openHelp);
    els.backHome.addEventListener('click', requestHome);
    els.resumeButton.addEventListener('click', startOrResume);
    els.toggleButton.addEventListener('click', startOrResume);
    els.checkButton.addEventListener('click', performCheck);
    els.resetButton.addEventListener('click', requestReset);
    els.checkClose.addEventListener('click', hideCheckPopover);
    els.modalClose.addEventListener('click', () => closeModal());

    els.modal.addEventListener('click', (event) => {
      if (event.target === els.modal) closeModal();
    });

    els.modeCards.forEach((card) => {
      card.addEventListener('click', () => selectMode(card.dataset.mode));
    });

    els.limitSeg.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-limit]');
      if (button) selectLimit(button.dataset.limit);
    });

    els.importButton.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', () => {
      const file = els.fileInput.files && els.fileInput.files[0];
      els.fileInput.value = '';
      if (file) importFile(file);
    });

    els.inputGrid.addEventListener('click', (event) => {
      const cell = event.target.closest('.cell');
      if (!cell || !state.session) return;
      state.session.cell = Number(cell.dataset.index);
      updateActiveCell();
      elFocusPractice();
    });

    els.wubiInput.addEventListener('input', handleWubiInput);
    els.wubiInput.addEventListener('compositionstart', () => {
      state.wubiComposing = true;
    });
    els.wubiInput.addEventListener('compositionend', () => {
      state.wubiComposing = false;
      window.setTimeout(handleWubiInput, 0);
    });
    els.wubiInputPanel.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      if (state.session && state.session.status !== 'finished') {
        els.wubiInput.focus({ preventScroll: true });
      }
    });

    const startCard = $('.start-card');
    if (startCard) {
      ['dragenter', 'dragover'].forEach((type) => {
        startCard.addEventListener(type, (event) => {
          event.preventDefault();
          startCard.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach((type) => {
        startCard.addEventListener(type, (event) => {
          event.preventDefault();
          startCard.classList.remove('is-dragover');
        });
      });
      startCard.addEventListener('drop', (event) => {
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) importFile(file);
      });
    }

    window.addEventListener('blur', () => {
      if (state.session && state.session.status === 'running') pause();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.session && state.session.status === 'running') pause();
    });
  }

  function elFocusPractice() {
    if (!els.practice.classList.contains('is-active')) return;
    if (isWubi()) {
      els.wubiInput.focus({ preventScroll: true });
    } else {
      els.practice.focus({ preventScroll: true });
    }
  }

  /* ------------------------- 初始化 ------------------------- */

  function init() {
    const settings = readJSON(LS.settings, {});
    state.limitMin = [3, 6, 10, 0].includes(Number(settings.limit)) ? Number(settings.limit) : 6;
    state.selectedMode = settings.mode === 'wubi' ? 'wubi' : 'number';
    els.modeCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.mode === state.selectedMode);
    });

    updateLimitUI();
    updateHomeStats();
    bindEvents();

    els.app.dataset.status = 'home';
    els.practice.setAttribute('tabindex', '-1');
    els.home.classList.add('is-active');
    els.practice.classList.remove('is-active');

    /* 防止按钮保持焦点导致 Enter 误触发 */
    $$('button').forEach((button) => {
      button.addEventListener('mouseup', () => button.blur());
    });
  }

  init();
})();
