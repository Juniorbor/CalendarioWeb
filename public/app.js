(() => {
  const MONTHS_PT = [
    'JANEIRO',
    'FEVEREIRO',
    'MARÇO',
    'ABRIL',
    'MAIO',
    'JUNHO',
    'JULHO',
    'AGOSTO',
    'SETEMBRO',
    'OUTUBRO',
    'NOVEMBRO',
    'DEZEMBRO',
  ];

  const MONTHS_CAP = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const WEEKDAYS_CAP = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  const LIT_LABELS = {
    branco: 'Branco',
    verde: 'Verde',
    vermelho: 'Vermelho',
    roxo: 'Roxo',
    rosa: 'Rosa',
    dourado: 'Dourado',
    preto: 'Preto',
  };

  const ROLE_LABELS = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Visualizador',
  };

  const THEME_LABELS = {
    finados: 'Finados',
    culto: 'Culto',
    biblia: 'Bíblia',
    cruz: 'Páscoa / Cruz',
    anonovo: 'Ano Novo',
    natal: 'Natal',
    consciencia: 'Consciência Negra',
    brasil: 'Brasil',
    formacao: 'Formação',
    reuniao: 'Reunião',
    aniversario: 'Aniversário',
    citacao: 'Reflexão',
    eucaristia: 'Santa Ceia',
    trabalho: 'Trabalho',
    coracao: 'Ação Social',
    musica: 'Música / Coral',
    carnaval: 'Carnaval',
  };

  const state = {
    user: null,
    today: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
    },
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth() + 1,
    monthData: { verse: '', cells: {} },
    editingCellKey: null,
    selectedLitColor: '',
    selectedCellColor: '',
    selectedThemeImage: '',
    customImageData: '',
    flashCellKey: null,
  };

  function normalizeTextForMatch(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function detectThemeKey(text) {
    const t = normalizeTextForMatch(text);
    if (!t.trim()) return '';
    if (/(finado|memoria|falecid|saudade|luto)/.test(t)) return 'finados';
    if (/(ano novo|confraterniza|reveillon)/.test(t)) return 'anonovo';
    if (/(natal|advento|presepio)/.test(t)) return 'natal';
    if (/(pascoa|sexta-feira santa|sexta feira santa|paixao|crucific|ressurreic|cruz)/.test(t)) return 'cruz';
    if (/(corpus christi|santa ceia|eucarist|\bceia\b)/.test(t)) return 'eucaristia';
    if (/(consciencia negra|zumbi)/.test(t)) return 'consciencia';
    if (/(independencia|republica|tiradentes|patria|brasil)/.test(t)) return 'brasil';
    if (/(carnaval)/.test(t)) return 'carnaval';
    if (/(trabalho|trabalhador)/.test(t)) return 'trabalho';
    if (/(teologic|formacao|estudo|curso|palestra|seminario|escola|ensino)/.test(t)) return 'formacao';
    if (/(biblia|evangelho|palavra|salmo|escritura)/.test(t)) return 'biblia';
    if (/(reuniao|assembleia|diretoria|conselho|presbiterio|encontro)/.test(t)) return 'reuniao';
    if (/(aniversario|parabens|comemoracao)/.test(t)) return 'aniversario';
    if (/(coral|musica|louvor|cantico|ensaio|cantata)/.test(t)) return 'musica';
    if (/(crianca|aparecida|social|caridade|doacao|diaconia|maes|pais)/.test(t)) return 'coracao';
    if (/(citacao|reflexao|lutero|lema|meditacao)/.test(t)) return 'citacao';
    if (/(culto|missa|epifania|igreja|oracao|vigilia|adoracao|batismo|confirmacao)/.test(t)) return 'culto';
    return '';
  }

  function resolveThemeImage(cellData, fallbackText) {
    if (cellData && cellData.customImage) {
      return { src: cellData.customImage, alt: cellData.title || fallbackText || 'Imagem do tema' };
    }
    if (cellData && cellData.themeImage === 'none') {
      return null;
    }
    if (cellData && cellData.themeImage && THEME_LABELS[cellData.themeImage]) {
      return {
        src: `/images/themes/${cellData.themeImage}.svg`,
        alt: THEME_LABELS[cellData.themeImage],
      };
    }
    const combined = `${cellData?.title || ''} ${cellData?.tag || ''} ${fallbackText || ''}`;
    const detected = detectThemeKey(combined);
    if (detected && THEME_LABELS[detected]) {
      return {
        src: `/images/themes/${detected}.svg`,
        alt: THEME_LABELS[detected],
      };
    }
    return null;
  }

  const $ = (id) => document.getElementById(id);

  // =========================
  // UTILITÁRIOS DE DATA & FERIADOS BR
  // =========================
  function getEasterDate(year) {
    // Algoritmo de Meeus/Jones/Butcher
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function addDays(date, days) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function getBrazilianHolidays(year) {
    const map = {
      '1-1': 'Ano Novo (Confraternização Universal)',
      '4-21': 'Tiradentes',
      '5-1': 'Dia do Trabalho',
      '9-7': 'Independência do Brasil',
      '10-12': 'Nossa Senhora Aparecida / Dia das Crianças',
      '11-2': 'Finados',
      '11-15': 'Proclamação da República',
      '11-20': 'Dia da Consciência Negra',
      '12-25': 'Natal',
    };
    const easter = getEasterDate(year);
    const addMovable = (offset, label) => {
      const dt = addDays(easter, offset);
      map[`${dt.getMonth() + 1}-${dt.getDate()}`] = label;
    };
    addMovable(-47, 'Carnaval');
    addMovable(-2, 'Sexta-Feira Santa');
    addMovable(0, 'Páscoa');
    addMovable(60, 'Corpus Christi');
    return map;
  }

  function normalizeTagClass(tag) {
    const clean = (tag || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (clean.includes('feriado')) return 'tag-feriado';
    if (clean.includes('culto')) return 'tag-culto';
    if (clean.includes('reuniao')) return 'tag-reuniao';
    if (clean.includes('evento')) return 'tag-evento';
    if (clean.includes('formacao')) return 'tag-formacao';
    if (clean.includes('citacao')) return 'tag-citacao';
    if (clean.includes('aniversario')) return 'tag-aniversario';
    return '';
  }

  function formatDateTimePt(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  let toastTimer = null;
  function showToast(message, type = 'info') {
    const el = $('toast');
    el.textContent = message;
    el.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add('hidden');
    }, 3200);
  }

  const TOKEN_STORAGE_KEY = 'calendario_auth_token';
  const CACHE_STORAGE_KEY = 'calendario_months_cache';

  function getStoredToken() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  }

  function setStoredToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  }

  function readCachedMonths() {
    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.months === 'object') return parsed;
    } catch {}
    return null;
  }

  function writeCachedMonths(months, updatedAt) {
    try {
      localStorage.setItem(
        CACHE_STORAGE_KEY,
        JSON.stringify({ months, updatedAt: Number(updatedAt) || Date.now() })
      );
    } catch {}
  }

  async function syncWithServer() {
    try {
      const cached = readCachedMonths();
      const body = cached && canEdit() ? cached : {};
      const res = await apiFetch('/api/calendar/sync', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res && res.months) {
        writeCachedMonths(res.months, res.updatedAt || Date.now());
      }
    } catch {}
  }

  function updateLocalMonthCache(year, month, monthObj, updatedAt) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const cached = readCachedMonths() || { months: {}, updatedAt: 0 };
    cached.months[key] = monthObj;
    writeCachedMonths(cached.months, updatedAt || Date.now());
  }

  async function apiFetch(url, options = {}) {
    const token = getStoredToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const opts = {
      credentials: 'same-origin',
      ...options,
      headers,
    };
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/login') {
      state.user = null;
      setStoredToken('');
      showLogin();
      throw new Error(data.error || 'Sessão expirada.');
    }
    if (!res.ok) {
      throw new Error(data.error || `Erro HTTP ${res.status}`);
    }
    return data;
  }

  function canEdit() {
    return state.user && (state.user.role === 'admin' || state.user.role === 'editor');
  }

  function isAdmin() {
    return state.user && state.user.role === 'admin';
  }

  // =========================
  // AUTENTICAÇÃO
  // =========================
  function showLogin() {
    $('appView').classList.add('hidden');
    $('loginView').classList.remove('hidden');
    $('loginError').classList.add('hidden');
    setTimeout(() => $('loginUsername').focus(), 50);
  }

  function showApp() {
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');

    const roleLabel = ROLE_LABELS[state.user.role] || state.user.role;
    $('userBadge').textContent = `${state.user.displayName} • ${roleLabel}`;
    $('todayBanner').textContent = `Hoje: ${state.today.day} de ${MONTHS_CAP[state.today.month - 1]} de ${state.today.year}`;

    if (canEdit()) {
      $('editModeTip').textContent = 'Clique em qualquer quadrado ou no lema superior para editar';
      $('verseEditBadge').classList.remove('hidden');
      $('calVerseBox').classList.remove('readonly');
    } else {
      $('editModeTip').textContent = 'Modo visualização — acesse como Editor ou Administrador para alterar';
      $('verseEditBadge').classList.add('hidden');
      $('calVerseBox').classList.add('readonly');
    }

    $('tabUsersBtn').classList.toggle('hidden', !isAdmin());
    $('tabBackupBtn').classList.toggle('hidden', !canEdit());
    $('restoreBackupBox').classList.toggle('hidden', !isAdmin());

    loadMonth(state.viewYear, state.viewMonth);
  }

  async function initSession() {
    try {
      const data = await apiFetch('/api/me');
      state.user = data.user;
      if (data.serverToday) {
        state.today = data.serverToday;
        state.viewYear = data.serverToday.year;
        state.viewMonth = data.serverToday.month;
      }
      await syncWithServer();
      showApp();
    } catch {
      showLogin();
    }
  }

  // =========================
  // CARREGAMENTO & RENDERIZAÇÃO DO CALENDÁRIO
  // =========================
  async function loadMonth(year, month) {
    const safeYear = Math.max(1900, Math.min(2200, Number(year) || state.today.year));
    const safeMonth = Math.max(1, Math.min(12, Number(month) || state.today.month));
    state.viewYear = safeYear;
    state.viewMonth = safeMonth;

    $('monthSelect').value = String(safeMonth);
    $('yearInput').value = String(safeYear);
    $('calMonthLabel').textContent = MONTHS_PT[safeMonth - 1];
    $('calYearLabel').textContent = String(safeYear);

    try {
      const data = await apiFetch(`/api/calendar/${safeYear}/${safeMonth}`);
      state.monthData = {
        verse: data.verse || '',
        cells: data.cells || {},
      };
      renderCalendar();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderCalendar() {
    const year = state.viewYear;
    const month = state.viewMonth;
    const editable = canEdit();

    // Versículo / Lema mensal
    const verseEl = $('calVerseText');
    if (state.monthData.verse) {
      verseEl.textContent = state.monthData.verse;
      verseEl.classList.remove('placeholder');
    } else {
      verseEl.textContent = editable
        ? 'Clique aqui para adicionar o versículo ou lema deste mês...'
        : `${MONTHS_CAP[month - 1]} de ${year}`;
      verseEl.classList.add('placeholder');
    }

    const firstDayDow = new Date(year, month - 1, 1).getDay(); // 0=Dom .. 6=Sab
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalUsed = firstDayDow + daysInMonth;
    const trailingPads = (7 - (totalUsed % 7)) % 7;
    const holidays = getBrazilianHolidays(year);

    const grid = $('calGrid');
    grid.innerHTML = '';

    // 1. Quadrados iniciais antes do dia 1 (editáveis para citações/notas)
    for (let i = 0; i < firstDayDow; i++) {
      const cellKey = `pad-start-${i}`;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow: i,
          dayNum: null,
          isPad: true,
          holidayName: null,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    // 2. Quadrados dos dias reais do mês (1 até daysInMonth)
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = (firstDayDow + day - 1) % 7;
      const cellKey = `day-${day}`;
      const holidayName = holidays[`${month}-${day}`] || null;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow,
          dayNum: day,
          isPad: false,
          holidayName,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    // 3. Quadrados finais após o último dia do mês (editáveis para notas)
    for (let j = 0; j < trailingPads; j++) {
      const dow = (firstDayDow + daysInMonth + j) % 7;
      const cellKey = `pad-end-${j}`;
      grid.appendChild(
        buildCellElement({
          cellKey,
          dow,
          dayNum: null,
          isPad: true,
          holidayName: null,
          cellData: state.monthData.cells[cellKey] || null,
        })
      );
    }

    if (state.flashCellKey) {
      const target = grid.querySelector(`[data-cell-key="${state.flashCellKey}"]`);
      if (target) {
        target.classList.add('search-flash');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      state.flashCellKey = null;
    }
  }

  function buildCellElement({ cellKey, dow, dayNum, isPad, holidayName, cellData }) {
    const editable = canEdit();
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.dataset.cellKey = cellKey;
    cell.setAttribute('role', 'gridcell');

    if (dow === 0) cell.classList.add('col-sun');
    if (dow === 6) cell.classList.add('col-sat');
    if (isPad) cell.classList.add('is-pad');
    if (!editable) cell.classList.add('readonly');

    const isToday =
      dayNum !== null &&
      state.viewYear === state.today.year &&
      state.viewMonth === state.today.month &&
      dayNum === state.today.day;

    if (isToday) cell.classList.add('is-today');

    if (cellData && cellData.cellColor) {
      cell.classList.add(`theme-${cellData.cellColor}`);
    }
    if (cellData && cellData.isQuote) {
      cell.classList.add('is-quote');
    }

    // Linha superior: Número do dia + HOJE + Cor Litúrgica
    const topRow = document.createElement('div');
    topRow.className = 'cell-top-row';

    const dayWrap = document.createElement('div');
    dayWrap.className = 'cell-day-wrap';

    if (dayNum !== null) {
      const numSpan = document.createElement('span');
      numSpan.className = 'cell-day-num';
      numSpan.textContent = `${dayNum}.`;
      dayWrap.appendChild(numSpan);
    }

    if (isToday) {
      const todayBadge = document.createElement('span');
      todayBadge.className = 'today-pill';
      todayBadge.textContent = 'HOJE';
      dayWrap.appendChild(todayBadge);
    }

    topRow.appendChild(dayWrap);

    if (cellData && cellData.liturgicalColor && LIT_LABELS[cellData.liturgicalColor]) {
      const litBadge = document.createElement('span');
      litBadge.className = `lit-badge lit-${cellData.liturgicalColor}`;
      litBadge.textContent = LIT_LABELS[cellData.liturgicalColor];
      topRow.appendChild(litBadge);
    }

    if (dayNum !== null || (cellData && cellData.liturgicalColor)) {
      cell.appendChild(topRow);
    }

    // Corpo do quadrado
    const body = document.createElement('div');
    body.className = 'cell-body';

    const hasCustomTitle = Boolean(cellData && cellData.title);
    const themeImg = resolveThemeImage(cellData, hasCustomTitle ? '' : holidayName);

    if (cellData) {
      if (cellData.tag) {
        const tagEl = document.createElement('span');
        tagEl.className = `cell-tag ${normalizeTagClass(cellData.tag)}`;
        tagEl.textContent = cellData.tag;
        body.appendChild(tagEl);
      }
      if (cellData.title) {
        const titleRow = document.createElement('div');
        titleRow.className = 'cell-title-row';

        const titleEl = document.createElement('div');
        titleEl.className = 'cell-title';
        titleEl.textContent = cellData.title;
        titleRow.appendChild(titleEl);

        if (themeImg) {
          const imgEl = document.createElement('img');
          imgEl.className = 'theme-thumb';
          imgEl.src = themeImg.src;
          imgEl.alt = themeImg.alt;
          imgEl.title = themeImg.alt;
          imgEl.loading = 'lazy';
          titleRow.appendChild(imgEl);
        }

        body.appendChild(titleRow);
      }
      if (cellData.notes) {
        const notesEl = document.createElement('div');
        notesEl.className = cellData.isQuote ? 'quote-text' : 'cell-notes';
        notesEl.textContent = cellData.notes;
        body.appendChild(notesEl);
      }
    }

    // Se houver feriado nacional e o usuário ainda não preencheu um título
    if (holidayName && !hasCustomTitle) {
      const holEl = document.createElement('div');
      holEl.className = 'cell-holiday-auto';

      const holText = document.createElement('span');
      holText.className = 'cell-holiday-name';
      holText.textContent = holidayName;
      holEl.appendChild(holText);

      if (themeImg) {
        const imgEl = document.createElement('img');
        imgEl.className = 'theme-thumb theme-thumb-sm';
        imgEl.src = themeImg.src;
        imgEl.alt = themeImg.alt;
        imgEl.title = themeImg.alt;
        imgEl.loading = 'lazy';
        holEl.appendChild(imgEl);
      }

      body.appendChild(holEl);
    }

    cell.appendChild(body);

    if (editable) {
      const hint = document.createElement('span');
      hint.className = 'cell-hover-hint no-print';
      hint.textContent = isPad ? '+ Nota / Citação' : 'Editar';
      cell.appendChild(hint);

      cell.tabIndex = 0;
      cell.addEventListener('click', () => openCellModal(cellKey, dow, dayNum, isPad, holidayName));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCellModal(cellKey, dow, dayNum, isPad, holidayName);
        }
      });
    }

    return cell;
  }

  // =========================
  // MODAL: EDITAR QUADRADO
  // =========================
  function openModal(id) {
    $(id).classList.remove('hidden');
  }

  function closeModal(id) {
    $(id).classList.add('hidden');
  }

  function setSelectedLit(val) {
    state.selectedLitColor = val || '';
    document.querySelectorAll('#litColorPicker .lit-opt').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.lit === state.selectedLitColor);
    });
  }

  function setSelectedCellColor(val) {
    state.selectedCellColor = val || '';
    document.querySelectorAll('#cellColorPicker .swatch-opt').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.color === state.selectedCellColor);
    });
  }

  function setSelectedThemeImage(val) {
    state.selectedThemeImage = val || '';
    document.querySelectorAll('#themeImagePicker .theme-opt').forEach((btn) => {
      btn.classList.toggle('selected', !state.customImageData && btn.dataset.theme === state.selectedThemeImage);
    });
  }

  function setCustomImagePreview(dataUrl) {
    state.customImageData = dataUrl || '';
    const wrap = $('customImagePreviewWrap');
    const img = $('customImagePreview');
    if (state.customImageData) {
      img.src = state.customImageData;
      wrap.classList.remove('hidden');
      document.querySelectorAll('#themeImagePicker .theme-opt').forEach((b) => b.classList.remove('selected'));
    } else {
      img.src = '';
      wrap.classList.add('hidden');
      setSelectedThemeImage(state.selectedThemeImage);
    }
  }

  function resizeImageToDataUrl(file, size = 96) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Erro ao carregar o arquivo.'));
      reader.readAsDataURL(file);
    });
  }

  function openCellModal(cellKey, dow, dayNum, isPad, holidayName) {
    if (!canEdit()) return;
    state.editingCellKey = cellKey;
    const existing = state.monthData.cells[cellKey] || {};

    if (dayNum !== null) {
      $('cellModalTitle').textContent = `${WEEKDAYS_CAP[dow]}, ${dayNum} de ${MONTHS_CAP[state.viewMonth - 1]} de ${state.viewYear}`;
      $('cellModalSub').textContent = holidayName
        ? `Feriado nacional nesta data: ${holidayName}`
        : 'Personalize as informações, cor litúrgica, destaque e miniatura do tema deste quadrado.';
    } else {
      $('cellModalTitle').textContent = `Quadrado Extra (${WEEKDAYS_CAP[dow]})`;
      $('cellModalSub').textContent = `Espaço complementar de ${MONTHS_CAP[state.viewMonth - 1]}/${state.viewYear} — ideal para citações, reflexões ou avisos gerais.`;
    }

    $('cellTitle').value = existing.title || '';
    $('cellTag').value = existing.tag || '';
    $('cellNotes').value = existing.notes || '';
    $('cellIsQuote').checked = Boolean(existing.isQuote);
    $('cellCustomImageInput').value = '';

    setSelectedLit(existing.liturgicalColor || '');
    setSelectedCellColor(existing.cellColor || '');
    state.selectedThemeImage = existing.themeImage || '';
    setCustomImagePreview(existing.customImage || '');

    if (existing.updatedBy && existing.updatedAt) {
      $('cellMetaInfo').textContent = `Última edição por ${existing.updatedBy} em ${formatDateTimePt(existing.updatedAt)}`;
    } else {
      $('cellMetaInfo').textContent = '';
    }

    openModal('cellModal');
    setTimeout(() => $('cellTitle').focus(), 40);
  }

  async function saveCurrentCell(clearAll = false) {
    const key = state.editingCellKey;
    if (!key) return;
    const payload = clearAll
      ? {
          title: '',
          notes: '',
          liturgicalColor: '',
          cellColor: '',
          tag: '',
          themeImage: '',
          customImage: '',
          isQuote: false,
        }
      : {
          title: $('cellTitle').value,
          notes: $('cellNotes').value,
          liturgicalColor: state.selectedLitColor,
          cellColor: state.selectedCellColor,
          tag: $('cellTag').value,
          themeImage: state.selectedThemeImage,
          customImage: state.customImageData,
          isQuote: $('cellIsQuote').checked,
        };

    try {
      const res = await apiFetch(`/api/calendar/${state.viewYear}/${state.viewMonth}/cell/${key}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.cell) {
        state.monthData.cells[key] = res.cell;
      } else {
        delete state.monthData.cells[key];
      }
      updateLocalMonthCache(state.viewYear, state.viewMonth, state.monthData, res.updatedAt);
      renderCalendar();
      closeModal('cellModal');
      showToast(clearAll ? 'Quadrado limpo com sucesso!' : 'Alterações salvas!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // =========================
  // MODAL: VERSÍCULO / LEMA DO MÊS
  // =========================
  function openVerseModal() {
    if (!canEdit()) return;
    $('verseModalSub').textContent = `${MONTHS_CAP[state.viewMonth - 1]} de ${state.viewYear}`;
    $('verseInput').value = state.monthData.verse || '';
    openModal('verseModal');
    setTimeout(() => $('verseInput').focus(), 40);
  }

  async function saveVerse(verseText) {
    try {
      const res = await apiFetch(`/api/calendar/${state.viewYear}/${state.viewMonth}/verse`, {
        method: 'PUT',
        body: JSON.stringify({ verse: verseText }),
      });
      state.monthData.verse = res.verse;
      updateLocalMonthCache(state.viewYear, state.viewMonth, state.monthData, res.updatedAt);
      renderCalendar();
      closeModal('verseModal');
      showToast('Versículo / lema atualizado!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // =========================
  // BUSCA GLOBAL
  // =========================
  async function performSearch() {
    const q = $('searchInput').value.trim();
    const container = $('searchResults');
    if (!q) {
      container.innerHTML = '<div class="empty-state">Digite um termo para pesquisar.</div>';
      return;
    }
    container.innerHTML = '<div class="empty-state">Pesquisando...</div>';
    try {
      const data = await apiFetch(`/api/calendar/search?q=${encodeURIComponent(q)}`);
      if (!data.results.length) {
        container.innerHTML = '<div class="empty-state">Nenhum resultado encontrado.</div>';
        return;
      }
      container.innerHTML = '';
      for (const item of data.results) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-item';
        const dayText = item.cellKey.startsWith('day-')
          ? `Dia ${item.cellKey.replace('day-', '')}`
          : item.cellKey === 'verse'
          ? 'Lema do Mês'
          : 'Quadrado Extra';

        const head = document.createElement('div');
        head.className = 'search-item-head';
        head.textContent = `${MONTHS_PT[item.month - 1]} ${item.year} • ${dayText}`;

        const title = document.createElement('div');
        title.className = 'search-item-title';
        title.textContent = item.title;

        const snippet = document.createElement('div');
        snippet.className = 'search-item-snippet';
        snippet.textContent = item.snippet;

        btn.append(head, title);
        if (item.snippet) btn.append(snippet);

        btn.addEventListener('click', () => {
          closeModal('searchModal');
          if (item.cellKey !== 'verse') {
            state.flashCellKey = item.cellKey;
          }
          loadMonth(item.year, item.month);
        });
        container.appendChild(btn);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state">${err.message}</div>`;
    }
  }

  // =========================
  // CONTA, USUÁRIOS & BACKUP
  // =========================
  async function loadUsersList() {
    if (!isAdmin()) return;
    const list = $('usersList');
    list.innerHTML = '<div class="empty-state">Carregando usuários...</div>';
    try {
      const data = await apiFetch('/api/users');
      list.innerHTML = '';
      for (const u of data.users) {
        const row = document.createElement('div');
        row.className = 'user-row';

        const info = document.createElement('div');
        info.className = 'user-row-info';

        const nameLine = document.createElement('div');
        nameLine.className = 'user-row-name';
        nameLine.textContent = u.displayName;

        const badge = document.createElement('span');
        badge.className = `role-badge role-${u.role}`;
        badge.textContent = ROLE_LABELS[u.role] || u.role;
        nameLine.appendChild(badge);

        const meta = document.createElement('div');
        meta.className = 'user-row-meta';
        meta.textContent = `Login: @${u.username}`;

        info.append(nameLine, meta);

        const actions = document.createElement('div');
        actions.className = 'user-row-actions';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn btn-outline';
        resetBtn.textContent = 'Redefinir senha';
        resetBtn.addEventListener('click', async () => {
          const newPw = window.prompt(`Digite a nova senha para "${u.username}" (mín. 4 caracteres):`);
          if (!newPw) return;
          try {
            await apiFetch(`/api/users/${encodeURIComponent(u.username)}`, {
              method: 'PUT',
              body: JSON.stringify({ password: newPw }),
            });
            showToast(`Senha de ${u.username} redefinida!`, 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
        actions.appendChild(resetBtn);

        if (u.username !== state.user.username) {
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-danger-outline';
          delBtn.textContent = 'Excluir';
          delBtn.addEventListener('click', async () => {
            if (!window.confirm(`Tem certeza que deseja excluir o usuário "${u.username}"?`)) return;
            try {
              await apiFetch(`/api/users/${encodeURIComponent(u.username)}`, { method: 'DELETE' });
              showToast('Usuário excluído.', 'success');
              loadUsersList();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
          actions.appendChild(delBtn);
        }

        row.append(info, actions);
        list.appendChild(row);
      }
    } catch (err) {
      list.innerHTML = `<div class="empty-state">${err.message}</div>`;
    }
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === tabId);
    });
    if (tabId === 'tabUsers') {
      loadUsersList();
    }
  }

  // =========================
  // LISTENERS DE EVENTOS
  // =========================
  function bindEvents() {
    // Login form
    $('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('loginError');
      errBox.classList.add('hidden');
      const username = $('loginUsername').value.trim();
      const password = $('loginPassword').value;

      $('loginSubmitBtn').disabled = true;
      try {
        const res = await apiFetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        if (res.token) setStoredToken(res.token);
        $('loginPassword').value = '';
        await initSession();
        showToast('Bem-vindo ao Calendário!', 'success');
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      } finally {
        $('loginSubmitBtn').disabled = false;
      }
    });

    $('togglePasswordBtn').addEventListener('click', () => {
      const inp = $('loginPassword');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    document.querySelectorAll('.hint-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('loginUsername').value = btn.dataset.u;
        $('loginPassword').value = btn.dataset.p;
        $('loginUsername').focus();
      });
    });

    // Logout
    $('logoutBtn').addEventListener('click', async () => {
      await apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
      setStoredToken('');
      state.user = null;
      showLogin();
    });

    // Navegação de Mês e Ano
    $('prevMonthBtn').addEventListener('click', () => {
      let m = state.viewMonth - 1;
      let y = state.viewYear;
      if (m < 1) {
        m = 12;
        y -= 1;
      }
      loadMonth(y, m);
    });

    $('nextMonthBtn').addEventListener('click', () => {
      let m = state.viewMonth + 1;
      let y = state.viewYear;
      if (m > 12) {
        m = 1;
        y += 1;
      }
      loadMonth(y, m);
    });

    $('monthSelect').addEventListener('change', (e) => {
      loadMonth(state.viewYear, Number(e.target.value));
    });

    $('yearInput').addEventListener('change', (e) => {
      loadMonth(Number(e.target.value), state.viewMonth);
    });

    $('todayBtn').addEventListener('click', () => {
      loadMonth(state.today.year, state.today.month);
    });

    $('sample2027Btn').addEventListener('click', () => {
      loadMonth(2027, 1);
    });

    // Versículo
    $('calVerseBox').addEventListener('click', openVerseModal);
    $('calVerseBox').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVerseModal();
      }
    });

    $('verseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveVerse($('verseInput').value);
    });

    $('clearVerseBtn').addEventListener('click', () => {
      saveVerse('');
    });

    // Modal de Célula
    $('cellForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveCurrentCell(false);
    });

    $('clearCellBtn').addEventListener('click', () => {
      saveCurrentCell(true);
    });

    document.querySelectorAll('#litColorPicker .lit-opt').forEach((btn) => {
      btn.addEventListener('click', () => setSelectedLit(btn.dataset.lit));
    });

    document.querySelectorAll('#cellColorPicker .swatch-opt').forEach((btn) => {
      btn.addEventListener('click', () => setSelectedCellColor(btn.dataset.color));
    });

    document.querySelectorAll('#themeImagePicker .theme-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.customImageData = '';
        $('cellCustomImageInput').value = '';
        $('customImagePreviewWrap').classList.add('hidden');
        setSelectedThemeImage(btn.dataset.theme);
      });
    });

    $('cellCustomImageInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImageToDataUrl(file, 96);
        setCustomImagePreview(dataUrl);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('removeCustomImageBtn').addEventListener('click', () => {
      $('cellCustomImageInput').value = '';
      setCustomImagePreview('');
    });

    document.querySelectorAll('.qtag').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('cellTag').value = btn.dataset.tag;
      });
    });

    // Imprimir
    $('printBtn').addEventListener('click', () => window.print());

    // Busca
    $('openSearchBtn').addEventListener('click', () => {
      openModal('searchModal');
      setTimeout(() => $('searchInput').focus(), 40);
    });
    $('doSearchBtn').addEventListener('click', performSearch);
    $('searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    // Conta / Usuários / Backup
    $('openUsersBtn').addEventListener('click', () => {
      switchTab('tabPassword');
      openModal('usersModal');
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $('changePasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = $('curPass').value;
      const newPassword = $('newPass').value;
      const confirmPass = $('confirmPass').value;
      if (newPassword !== confirmPass) {
        showToast('A confirmação da nova senha não confere.', 'error');
        return;
      }
      try {
        await apiFetch('/api/me/password', {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        $('changePasswordForm').reset();
        showToast('Senha atualizada com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('createUserForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            username: $('nuUsername').value,
            displayName: $('nuDisplay').value,
            role: $('nuRole').value,
            password: $('nuPassword').value,
          }),
        });
        $('createUserForm').reset();
        showToast('Novo usuário cadastrado!', 'success');
        loadUsersList();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('exportBackupBtn').addEventListener('click', async () => {
      try {
        const data = await apiFetch('/api/backup');
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-calendario-${state.today.year}-${String(state.today.month).padStart(2, '0')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup baixado com sucesso!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('restoreBackupBtn').addEventListener('click', async () => {
      const file = $('restoreFileInput').files[0];
      if (!file) {
        showToast('Selecione um arquivo .json primeiro.', 'error');
        return;
      }
      if (!window.confirm('Restaurar este backup substituirá os dados atuais dos meses. Deseja continuar?')) {
        return;
      }
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        await apiFetch('/api/restore', {
          method: 'POST',
          body: JSON.stringify(json),
        });
        showToast('Backup restaurado com sucesso!', 'success');
        loadMonth(state.viewYear, state.viewMonth);
      } catch (err) {
        showToast(err.message || 'Erro ao ler o arquivo de backup.', 'error');
      }
    });

    // Fechar modais
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
      }
    });
  }

  bindEvents();
  initSession();
})();
