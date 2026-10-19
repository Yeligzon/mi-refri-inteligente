/* ============================================================
   Mi Refri Inteligente — UI
   ============================================================ */

(function () {
  const { CATALOG, CATALOG_BY_ID, CATEGORIES, CATEGORY_META, UNITS, TIPS, TONES, RECIPES } = window.REFRI;
  const S = window.Store;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    view: 'inicio',
    search: '',
    freshness: 'all',
    category: 'Todas',
    sort: 'expiry',
    recipeFilter: 'all',
    onlyPantry: true,
    priceTouched: false,
    lastCatalog: null,
  };

  /* ---------------- utilidades ---------------- */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function daysLabel(days) {
    if (days < 0) {
      const n = Math.abs(days);
      return n === 1 ? 'Venció ayer' : `Venció hace ${n} días`;
    }
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    if (days <= 30) return `Vence en ${days} días`;
    if (days < 365) {
      const months = Math.round(days / 30);
      return `Vence en ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    return 'Vence en más de un año';
  }

  function expiryMeta(item) {
    const days = S.daysUntil(item.expiresAt);
    if (days < 0) return { days, status: 'expired', label: daysLabel(days) };
    if (days <= 3) return { days, status: 'urgent', label: daysLabel(days) };
    return { days, status: 'fresh', label: daysLabel(days) };
  }

  function shelfPercent(item) {
    const remaining = S.daysUntil(item.expiresAt);
    if (remaining <= 0) return 0;
    const total = Math.max(1, remaining + Math.max(0, -S.daysUntil(item.addedAt)));
    return Math.max(4, Math.min(100, Math.round((remaining / total) * 100)));
  }

  function relativeDate(iso) {
    const days = -S.daysUntil(iso);
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.round(days / 7)} sem.`;
    return S.fmtDateLong(iso);
  }

  function greetingText() {
    const h = new Date().getHours();
    if (h < 6) return 'Buenas noches';
    if (h < 12) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function todayLong() {
    const text = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  const ICON = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5V12l3 1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2m-8 0 1 12h8l1-12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16v4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.7"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2.2l2.3 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.3" fill="currentColor"/><circle cx="17.5" cy="20" r="1.3" fill="currentColor"/></svg>',
    chef: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20V9.5a8 8 0 0 1 16 0V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  /* ---------------- toasts ---------------- */

  function toast(message, emoji = '✅') {
    const stack = $('#toastStack');
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<span class="toast__emoji">${emoji}</span><span>${esc(message)}</span>`;
    stack.appendChild(node);
    setTimeout(() => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 260);
    }, 2600);
  }

  /* ---------------- tema ---------------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    const label = $('#themeLabel');
    const checkbox = $('#settingsTheme');
    if (label) label.textContent = dark ? 'Modo claro' : 'Modo oscuro';
    if (checkbox) checkbox.checked = dark;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#111613' : '#F6F5F0');
  }

  function toggleTheme() {
    const next = S.getSettings().theme === 'dark' ? 'light' : 'dark';
    S.setTheme(next);
    applyTheme(next);
    toast(next === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado', next === 'dark' ? '🌙' : '☀️');
  }

  /* ---------------- navegación ---------------- */

  function navigate(view) {
    if (!view) return;
    state.view = view;
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === view));
    $$('[data-nav]').forEach((el) => {
      if (el.tagName === 'BUTTON') el.classList.toggle('is-active', el.dataset.nav === view);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    render();
  }

  /* ---------------- render raíz ---------------- */

  function render() {
    renderChrome();
    if (state.view === 'inicio') renderHome();
    if (state.view === 'nevera') renderInventory();
    if (state.view === 'recetas') renderRecipes();
    if (state.view === 'compras') renderShopping();
    if (state.view === 'impacto') renderImpact();
  }

  function renderChrome() {
    const items = S.getItems();
    const shopping = S.getShopping();
    const score = S.healthScore();
    const health = S.healthLabel(score);

    $('#greeting').textContent = greetingText();
    $('#todayLabel').textContent = todayLong();
    $('#navCountNevera').textContent = items.length;
    $('#navCountCompras').textContent = shopping.filter((s) => !s.done).length;
    $('#sideHealthLabel').textContent = health.label;
    $('#sideHealthBar').style.width = `${score}%`;
    $('#sideHealthHint').textContent = health.detail;
  }

  /* ---------------- INICIO ---------------- */

  function renderHome() {
    const items = S.getItems();
    const urgent = S.urgentItems();
    const expired = items.filter((it) => S.daysUntil(it.expiresAt) < 0);
    const stats = S.getStats(30);
    const matches = RECIPES.map((r) => ({ recipe: r, match: S.recipeMatch(r) }));
    const ready = matches.filter((m) => m.match.ready);

    $('#heroBadge').textContent = urgent.length
      ? `🧊 ${urgent.length} ${urgent.length === 1 ? 'producto necesita' : 'productos necesitan'} atención`
      : '✨ Tu nevera está al día';
    $('#heroItems').textContent = `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`;
    $('#heroValue').textContent = S.fmtMoney(S.totalValue());
    $('#heroUrgent').textContent = urgent.length;
    $('#heroExpired').textContent = expired.length;
    $('#heroRecipes').textContent = ready.length;

    // atención
    const attention = $('#attentionGrid');
    if (!urgent.length) {
      attention.innerHTML = `
        <div class="attention-empty">
          <span>🥳</span>
          <div><strong>Nada se está venciendo.</strong> Aprovecha para cocinar algo rico o revisar tu lista de compras.</div>
        </div>`;
    } else {
      attention.innerHTML = urgent.slice(0, 4).map((item) => {
        const meta = expiryMeta(item);
        const best = bestRecipeFor(item.catalogId);
        const tone = meta.status === 'expired' ? 'pill--danger' : 'pill--coral';
        return `
          <article class="attention-card ${meta.status === 'expired' ? 'is-expired' : ''} ${meta.days === 0 ? 'is-today' : ''}">
            <span class="attention-card__emoji">${esc(item.emoji)}</span>
            <div class="attention-card__body">
              <strong>${esc(item.name)}</strong>
              <div class="attention-card__meta">${S.fmtQty(item.qty, item.unit)} · <span class="pill ${tone}" style="padding:1px 6px;font-size:10px">${meta.label}</span></div>
            </div>
            <div class="attention-card__actions">
              ${best
                ? `<button class="btn btn--soft" data-recipe="${best.id}">Usar en receta</button>`
                : `<button class="btn btn--soft" data-action="recipe-fallback">Ver recetas</button>`}
              <button class="attention-card__action" data-action="discard" data-id="${item.id}">Descartar</button>
            </div>
          </article>`;
      }).join('');
    }

    // recetas
    const homeRecipes = matches
      .filter((m) => m.match.percent >= 60)
      .sort((a, b) => b.match.percent - a.match.percent || a.recipe.time - b.recipe.time)
      .slice(0, 4);
    $('#homeRecipes').innerHTML = homeRecipes.map((m) => recipeCard(m.recipe, m.match)).join('') ||
      `<div class="attention-empty"><span>🍽️</span><div>Agrega productos a tu nevera para ver recetas posibles.</div></div>`;

    // sugerencias
    const suggestions = S.suggestions().slice(0, 4);
    $('#homeSuggestions').innerHTML = suggestions.length
      ? suggestions.map(suggestRow).join('')
      : `<div class="attention-empty"><span>👌</span><div>No hay nada urgente por comprar.</div></div>`;

    // impacto
    $('#homeImpact').innerHTML = `
      <div class="impact-card__stat">
        <strong>${S.fmtMoney(stats.savedValue)}</strong>
        <span>comida rescatada</span>
      </div>
      <div class="impact-card__stat">
        <strong>${stats.consumedCount}</strong>
        <span>productos usados</span>
      </div>
      <div class="impact-card__divider"></div>
      <div class="impact-card__bar">
        <div class="meter"><span style="width:${stats.efficiency}%"></span></div>
        <p>${stats.efficiency}% de aprovechamiento · ${stats.co2} kg de CO₂ evitados</p>
      </div>`;

    // tips
    $('#tipsRow').innerHTML = TIPS.map((tip) => `
      <article class="tip-card">
        <div class="tip-card__emoji">${tip.emoji}</div>
        <h4>${esc(tip.title)}</h4>
        <p>${esc(tip.text)}</p>
      </article>`).join('');
  }

  function bestRecipeFor(catalogId) {
    if (!catalogId) return null;
    const candidates = RECIPES
      .filter((r) => r.ingredients.some((i) => i.id === catalogId))
      .map((r) => ({ recipe: r, match: S.recipeMatch(r) }))
      .sort((a, b) => b.match.percent - a.match.percent || a.match.missingCount - b.match.missingCount);
    return candidates.length ? candidates[0].recipe : null;
  }

  function suggestRow({ catalog, reason }) {
    const inList = S.getShopping().some((s) => !s.done && s.name.toLowerCase() === catalog.name.toLowerCase());
    return `
      <div class="suggest-row">
        <span class="suggest-row__emoji">${catalog.emoji}</span>
        <div class="suggest-row__body">
          <strong>${esc(catalog.name)}</strong>
          <small>${esc(reason)}</small>
        </div>
        <button class="suggest-row__add ${inList ? 'is-done' : ''}" data-action="add-shopping" data-catalog="${catalog.id}" aria-label="Agregar ${esc(catalog.name)} a la lista">
          ${inList ? ICON.check : ICON.plus}
        </button>
      </div>`;
  }

  function recipeCard(recipe, match) {
    const tone = TONES[recipe.tone] || TONES.green;
    const chips = recipe.ingredients.slice(0, 5).map((ing) => {
      const c = CATALOG_BY_ID[ing.id];
      const have = S.pantryQty(ing.id) > 0;
      return `<span class="mini-chip ${have ? 'mini-chip--have' : 'mini-chip--miss'}">${have ? '✓' : '+'} ${esc(c ? c.name : ing.id)}</span>`;
    }).join('');

    const badge = match.ready
      ? `<span class="recipe-card__tag">Lista ✓</span>`
      : match.missingCount === 0
        ? `<span class="recipe-card__tag">Casi lista</span>`
        : `<span class="recipe-card__tag">Faltan ${match.missingCount}</span>`;

    return `
      <article class="recipe-card">
        <div class="recipe-card__art" style="background:${tone.bg}">
          <span class="recipe-card__emoji">${recipe.emoji}</span>
          ${badge}
          <span class="recipe-card__time">${ICON.clock} ${recipe.time} min</span>
        </div>
        <div class="recipe-card__body">
          <h4 class="recipe-card__title">${esc(recipe.name)}</h4>
          <p class="recipe-card__desc">${esc(recipe.description)}</p>
          <div class="recipe-card__match">
            <div class="meter"><span style="width:${match.percent}%"></span></div>
            <strong>${match.haveCount}/${match.total}</strong>
            <span>ingredientes</span>
          </div>
          <div class="recipe-card__chips">${chips}</div>
          <div class="recipe-card__foot">
            <button class="btn btn--soft btn--sm" data-recipe="${recipe.id}">Ver receta</button>
            ${match.ready ? `<button class="btn btn--primary btn--sm" data-cook="${recipe.id}" aria-label="Cocinar ${esc(recipe.name)}">Cocinar</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  /* ---------------- NEVERA ---------------- */

  function renderInventory() {
    const items = S.getItems();
    const urgent = items.filter((it) => {
      const d = S.daysUntil(it.expiresAt);
      return d >= 0 && d <= 3;
    });
    const expired = items.filter((it) => S.daysUntil(it.expiresAt) < 0);

    $('#neveraSub').textContent = items.length
      ? `${items.length} ${items.length === 1 ? 'producto' : 'productos'} · ${S.fmtMoney(S.totalValue())} en comida`
      : 'Tu nevera está vacía';

    $('#inventorySummary').innerHTML = `
      <div class="summary-tile">
        <div class="summary-tile__label">Productos</div>
        <div class="summary-tile__value">${items.length}</div>
        <div class="summary-tile__hint">en la nevera y despensa</div>
      </div>
      <div class="summary-tile">
        <div class="summary-tile__label">Valor estimado</div>
        <div class="summary-tile__value">${S.fmtMoney(S.totalValue())}</div>
        <div class="summary-tile__hint">de comida disponible</div>
      </div>
      <div class="summary-tile ${urgent.length ? 'summary-tile--warn' : ''}">
        <div class="summary-tile__label">Por vencer</div>
        <div class="summary-tile__value">${urgent.length}</div>
        <div class="summary-tile__hint">en los próximos 3 días</div>
      </div>
      <div class="summary-tile ${expired.length ? 'summary-tile--danger' : ''}">
        <div class="summary-tile__label">Vencidos</div>
        <div class="summary-tile__value">${expired.length}</div>
        <div class="summary-tile__hint">necesitan salir hoy</div>
      </div>`;

    // chips de categoría
    const counts = new Map();
    for (const item of items) counts.set(item.category, (counts.get(item.category) || 0) + 1);
    $('#categoryChips').innerHTML = [
      `<button class="chip ${state.category === 'Todas' ? 'is-active' : ''}" data-cat="Todas">Todo <span class="chip__count">${items.length}</span></button>`,
      ...CATEGORIES.filter((c) => counts.has(c)).map((category) => `
        <button class="chip ${state.category === category ? 'is-active' : ''}" data-cat="${esc(category)}">
          ${CATEGORY_META[category].emoji} ${esc(CATEGORY_META[category].short)} <span class="chip__count">${counts.get(category)}</span>
        </button>`),
    ].join('');

    // filtrado
    let list = items.filter((item) => {
      if (state.category !== 'Todas' && item.category !== state.category) return false;
      const d = S.daysUntil(item.expiresAt);
      if (state.freshness === 'urgent' && !(d >= 0 && d <= 3)) return false;
      if (state.freshness === 'expired' && d >= 0) return false;
      if (state.freshness === 'fresh' && d <= 3) return false;
      if (state.search) {
        const q = state.search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const sorters = {
      expiry: (a, b) => S.daysUntil(a.expiresAt) - S.daysUntil(b.expiresAt),
      name: (a, b) => a.name.localeCompare(b.name, 'es'),
      recent: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''),
      category: (a, b) => a.category.localeCompare(b.category, 'es') || a.name.localeCompare(b.name, 'es'),
    };
    list = [...list].sort(sorters[state.sort] || sorters.expiry);

    const grid = $('#inventoryGrid');
    grid.innerHTML = list.map(foodCard).join('');
    $('#inventoryEmpty').hidden = list.length > 0;
    grid.hidden = list.length === 0;
  }

  function foodCard(item) {
    const meta = expiryMeta(item);
    const percent = shelfPercent(item);
    const status = meta.status;
    const badgeClass = status === 'expired' ? 'pill--danger' : status === 'urgent' ? 'pill--coral' : 'pill--neutral';
    return `
      <article class="food-card" data-status="${status}">
        <div class="food-card__top">
          <span class="food-card__emoji">${esc(item.emoji)}</span>
          <div class="food-card__head">
            <div class="food-card__name" title="${esc(item.name)}">${esc(item.name)}</div>
            <div class="food-card__cat">${esc(item.category)}</div>
          </div>
          <button class="food-card__menu" data-menu="${item.id}" aria-label="Opciones de ${esc(item.name)}">${ICON.dots}</button>
        </div>
        <div class="food-card__qty">
          <div class="qty-display">${S.fmtQty(item.qty, item.unit)}</div>
          <div class="qty-controls">
            <button class="qty-btn" data-qty="-1" data-id="${item.id}" aria-label="Restar uno">−</button>
            <button class="qty-btn" data-qty="1" data-id="${item.id}" aria-label="Sumar uno">+</button>
          </div>
        </div>
        <div class="food-card__shelf">
          <div class="shelf-label">
            <span class="pill ${badgeClass}" style="padding:1px 7px;font-size:10px">${meta.label}</span>
            <strong>${percent}%</strong>
          </div>
          <div class="shelf-bar"><span data-status="${status}" style="width:${percent}%"></span></div>
        </div>
        <div class="food-card__foot">
          <span class="food-card__price">${item.price ? S.fmtMoney(item.price) : 'Sin precio'}</span>
          <button class="link-btn" data-recipe-for="${item.id}" style="font-size:11px">Qué cocinar ${ICON.arrow}</button>
        </div>
      </article>`;
  }

  /* ---------------- RECETAS ---------------- */

  function renderRecipes() {
    const all = RECIPES.map((recipe) => ({ recipe, match: S.recipeMatch(recipe) }));

    const readyCount = all.filter((m) => m.match.ready).length;
    $('#recipesSub').textContent = readyCount
      ? `${readyCount} ${readyCount === 1 ? 'receta lista' : 'recetas listas'} para cocinar con lo que tienes hoy`
      : 'Agrega ingredientes para desbloquear recetas';

    let list = all.slice();

    if (state.onlyPantry) list = list.filter((m) => m.match.ready);
    if (state.recipeFilter === 'ready') list = list.filter((m) => m.match.ready);
    if (state.recipeFilter === 'quick') list = list.filter((m) => m.recipe.time <= 15);
    if (state.recipeFilter === 'veg') list = list.filter((m) => m.recipe.tags.includes('vegetariano'));

    list.sort((a, b) => b.match.percent - a.match.percent || a.match.missingCount - b.match.missingCount || a.recipe.time - b.recipe.time);

    const grid = $('#recipeGrid');
    grid.innerHTML = list.map((m) => recipeCard(m.recipe, m.match)).join('');
    grid.hidden = list.length === 0;
    $('#recipeEmpty').hidden = list.length > 0;
  }

  function openRecipeModal(recipeId) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    const match = S.recipeMatch(recipe);
    const tone = TONES[recipe.tone] || TONES.green;

    const ingredients = recipe.ingredients.map((ing) => {
      const c = CATALOG_BY_ID[ing.id];
      const qty = S.pantryQty(ing.id);
      const enough = qty + 1e-9 >= Number(ing.use || 0);
      const status = qty <= 0 ? 'falta' : enough ? '✓' : `solo ${S.fmtQty(qty, c ? c.unit : '')}`;
      return `
        <div class="ing-row ${qty <= 0 ? 'is-missing' : enough ? '' : 'is-short'}">
          <span class="ing-row__emoji">${c ? c.emoji : '🍽️'}</span>
          <span class="ing-row__name">${esc(c ? c.name : ing.id)}</span>
          <span class="ing-row__qty">${ing.use} ${c ? c.unit : ''}</span>
          <span class="ing-row__check">${status}</span>
        </div>`;
    }).join('');

    $('#recipeModalTitle').textContent = recipe.name;
    $('#recipeDetail').innerHTML = `
      <div class="recipe-hero" style="background:${tone.bg};color:${tone.ink}">
        <span class="recipe-hero__emoji">${recipe.emoji}</span>
        <div>
          <h4>${esc(recipe.name)}</h4>
          <p>${esc(recipe.description)}</p>
        </div>
      </div>
      <div class="recipe-meta">
        <span class="pill">⏱️ ${recipe.time} min</span>
        <span class="pill">🍽️ ${recipe.servings} porciones</span>
        <span class="pill">📊 ${recipe.difficulty}</span>
        <span class="pill">${match.ready ? '✅ Tienes todo' : match.missingCount ? `🛒 Faltan ${match.missingCount}` : '⚠️ Cantidades justas'}</span>
      </div>
      <div class="recipe-section">
        <h5>Ingredientes</h5>
        <div class="ing-list">${ingredients}</div>
      </div>
      <div class="recipe-section">
        <h5>Paso a paso</h5>
        <ol class="steps-list">${recipe.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
      </div>
      <div class="recipe-tip"><span>💡</span><div>${esc(recipe.tip)}</div></div>
      <div class="recipe-actions">
        <button class="btn btn--ghost" data-close-modal>Cerrar</button>
        <button class="btn btn--primary" data-cook="${recipe.id}">Cocinar y descontar</button>
      </div>`;

    openModal('#recipeModal');
  }

  function cook(recipeId) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    const match = S.recipeMatch(recipe);
    if (match.haveCount === 0) {
      toast('No tienes ningún ingrediente de esta receta', '🤔');
      return;
    }
    const result = S.cookRecipe(recipe);
    closeModals();
    navigate('inicio');
    const extra = match.missingCount ? ` · faltaban ${match.missingCount}` : '';
    toast(`${recipe.name}: usaste ${result.used} ingrediente${result.used === 1 ? '' : 's'} · ${S.fmtMoney(result.savedValue)} rescatados${extra}`, '🍳');
  }

  /* ---------------- COMPRAS ---------------- */

  function renderShopping() {
    const list = S.getShopping();
    const pending = list.filter((s) => !s.done);
    const done = list.filter((s) => s.done);

    $('#shoppingSub').textContent = pending.length
      ? `${pending.length} ${pending.length === 1 ? 'producto pendiente' : 'productos pendientes'} · ${done.length} en el carrito`
      : 'Todo comprado por hoy';

    const ordered = [...pending, ...done];
    $('#shoppingList').innerHTML = ordered.map((entry) => `
      <li class="shopping-row ${entry.done ? 'is-done' : ''}">
        <button class="shopping-row__check" data-toggle-shopping="${entry.id}" aria-label="${entry.done ? 'Marcar pendiente' : 'Marcar comprado'}">${ICON.check}</button>
        <span class="shopping-row__emoji">${esc(entry.emoji)}</span>
        <div class="shopping-row__body">
          <div class="shopping-row__name">${esc(entry.name)}</div>
          <div class="shopping-row__meta">
            <span>${S.fmtQty(entry.qty, entry.unit)}</span>
            ${entry.auto ? '<span class="tag-auto">Sugerido</span>' : ''}
            ${entry.done ? '<span>· en el carrito</span>' : ''}
          </div>
        </div>
        <button class="shopping-row__remove" data-remove-shopping="${entry.id}" aria-label="Quitar ${esc(entry.name)}">${ICON.close}</button>
      </li>`).join('');

    $('#shoppingEmpty').hidden = ordered.length > 0;

    const estimated = pending.reduce((sum, entry) => {
      const catalog = entry.catalogId ? CATALOG_BY_ID[entry.catalogId] : null;
      if (!catalog) return sum;
      const defaultQty = S._catalogDefaultQty(catalog);
      return sum + catalog.price * (entry.qty / defaultQty);
    }, 0);

    $('#shoppingFooter').innerHTML = `
      <div class="shopping-total">Costo estimado <strong>${S.fmtMoney(estimated)}</strong></div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${done.length ? `<button class="btn btn--ghost btn--sm" id="clearDoneBtn">Limpiar comprados</button>` : ''}
        ${done.length ? `<button class="btn btn--soft btn--sm" id="moveDoneBtn">Pasar a la nevera (${done.length})</button>` : ''}
      </div>`;

    const suggestions = S.getSuggestions();
    $('#shoppingSuggestions').innerHTML = suggestions.length
      ? suggestions.map(suggestRow).join('')
      : `<div class="attention-empty"><span>✅</span><div>No hay sugerencias por ahora. Tu despensa está bien surtida.</div></div>`;

    const clearBtn = $('#clearDoneBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => { S.clearCompletedShopping(); toast('Lista depurada', '🧹'); });
    const moveBtn = $('#moveDoneBtn');
    if (moveBtn) moveBtn.addEventListener('click', () => {
      const count = S.moveCompletedToPantry();
      toast(`${count} ${count === 1 ? 'producto pasó' : 'productos pasaron'} a la nevera`, '🧊');
    });
  }

  function submitShopping(event) {
    event.preventDefault();
    const input = $('#shoppingInput');
    const name = input.value.trim();
    if (!name) return;
    const qty = Math.max(0.25, Number($('#shoppingQty').value) || 1);
    const unit = $('#shoppingUnit').value;

    const catalog = CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase())
      || CATALOG.find((c) => c.name.toLowerCase().includes(name.toLowerCase()))
      || null;

    S.addShopping({
      catalogId: catalog ? catalog.id : null,
      name: catalog ? catalog.name : name,
      emoji: catalog ? catalog.emoji : '🛒',
      category: catalog ? catalog.category : 'Otros',
      qty,
      unit: catalog ? catalog.unit : unit,
    });

    input.value = '';
    $('#shoppingQty').value = 1;
    input.focus();
    toast(`${catalog ? catalog.name : name} agregado a la lista`, '🛒');
  }

  /* ---------------- IMPACTO ---------------- */

  function renderImpact() {
    const stats = S.getStats(30);

    $('#impactStats').innerHTML = `
      <div class="stat-card stat-card--accent">
        <div class="stat-card__icon">💰</div>
        <div class="stat-card__value">${S.fmtMoney(stats.savedValue)}</div>
        <div class="stat-card__label">comida rescatada</div>
        <div class="stat-card__delta">${stats.consumedCount} productos usados</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon">🌱</div>
        <div class="stat-card__value">${stats.co2} kg</div>
        <div class="stat-card__label">de CO₂ evitado</div>
        <div class="stat-card__delta">Equivale a ${Math.max(1, Math.round(stats.co2 / 0.2))} km en auto</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon">🗑️</div>
        <div class="stat-card__value">${S.fmtMoney(stats.wastedValue)}</div>
        <div class="stat-card__label">desperdiciado</div>
        <div class="stat-card__delta" style="color:var(--coral)">${stats.wastedCount} productos perdidos</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon">📈</div>
        <div class="stat-card__value">${stats.efficiency}%</div>
        <div class="stat-card__label">aprovechamiento</div>
        <div class="stat-card__delta">Últimos 30 días</div>
      </div>`;

    // gráfica
    $('#weekChart').innerHTML = stats.week.map((day, index) => {
      const consumedH = Math.round((day.consumed / stats.maxWeek) * 100);
      const wastedH = Math.round((day.wasted / stats.maxWeek) * 100);
      return `
        <div class="chart__col ${index === stats.week.length - 1 ? 'is-today' : ''}">
          <div class="chart__bars">
            <div class="chart__bar chart__bar--consumed" style="height:${Math.max(consumedH, 2)}%" title="${day.consumed} consumidos"></div>
            <div class="chart__bar chart__bar--wasted" style="height:${Math.max(wastedH, 2)}%" title="${day.wasted} desperdiciados"></div>
          </div>
          <span class="chart__label">${esc(day.label)}</span>
        </div>`;
    }).join('');

    // anillo
    const ring = $('#efficiencyRing .ring__value');
    const circumference = 314.159;
    ring.style.strokeDashoffset = String(circumference * (1 - stats.efficiency / 100));
    $('#efficiencyValue').textContent = `${stats.efficiency}%`;
    $('#efficiencyNote').textContent = stats.efficiency >= 85
      ? 'Excelente: casi nada de lo que compras termina en la basura.'
      : stats.efficiency >= 65
        ? 'Buen trabajo. Revisa los productos por vencer para subir aún más.'
        : 'Hay margen de mejora: usa la pestaña Cocinar para rescatar lo urgente.';

    // top
    $('#topSaved').innerHTML = stats.topSaved.length
      ? stats.topSaved.map((item) => {
          const max = stats.topSaved[0].count || 1;
          return `
            <div class="top-row">
              <span class="top-row__emoji">${esc(item.emoji)}</span>
              <div class="top-row__body">
                <div class="top-row__name">${esc(item.name)}</div>
                <div class="top-row__bar"><span style="width:${Math.round((item.count / max) * 100)}%"></span></div>
              </div>
              <span class="top-row__value">${S.fmtMoney(item.value)}</span>
            </div>`;
        }).join('')
      : `<div class="attention-empty"><span>🌿</span><div>Aún no hay productos consumidos este mes.</div></div>`;

    // categorías
    const breakdown = S.getCategoryBreakdown();
    const max = Math.max(1, ...breakdown.map((b) => b.count));
    $('#categoryBars').innerHTML = breakdown.length
      ? breakdown.map(({ category, count }) => {
          const meta = CATEGORY_META[category] || CATEGORY_META.Otros;
          return `
            <div class="cat-row">
              <span class="cat-row__emoji">${meta.emoji}</span>
              <span class="cat-row__name">${esc(meta.short)}</span>
              <div class="cat-row__bar"><span style="width:${Math.round((count / max) * 100)}%;background:${meta.color}"></span></div>
              <span class="cat-row__count">${count}</span>
            </div>`;
        }).join('')
      : `<div class="attention-empty"><span>🧺</span><div>Agrega productos para ver el reparto.</div></div>`;

    // historial
    const history = S.getHistory().slice(0, 12);
    $('#historyList').innerHTML = history.length
      ? history.map((entry) => `
          <li class="history-row">
            <span class="history-row__emoji">${esc(entry.emoji)}</span>
            <div class="history-row__body">
              <div class="history-row__name">${esc(entry.name)}</div>
              <div class="history-row__meta">${esc(entry.source || 'Consumo')} · ${relativeDate(entry.date)}</div>
            </div>
            <span class="history-row__value ${entry.type === 'wasted' ? 'is-wasted' : ''}">${entry.type === 'wasted' ? '−' : ''}${S.fmtMoney(entry.value)}</span>
          </li>`).join('')
      : `<li class="attention-empty"><span>📖</span><div>Tu historial aparecerá aquí.</div></li>`;
  }

  /* ---------------- modal producto ---------------- */

  function catalogChips(filter = '') {
    const query = filter.toLowerCase().trim();
    const list = CATALOG
      .filter((c) => !query || c.name.toLowerCase().includes(query))
      .slice(0, 24);
    return list.map((c) => `
      <button type="button" class="catalog-chip ${state.lastCatalog === c.id ? 'is-active' : ''}" data-catalog-chip="${c.id}">
        <span>${c.emoji}</span>${esc(c.name)}
      </button>`).join('');
  }

  function openItemModal(item) {
    const isEdit = !!item;
    $('#itemModalEyebrow').textContent = isEdit ? 'Editar producto' : 'Nuevo producto';
    $('#itemModalTitle').textContent = isEdit ? 'Editar en la nevera' : 'Agregar a la nevera';
    $('#itemSubmit').textContent = isEdit ? 'Guardar cambios' : 'Agregar a la nevera';

    $('#itemId').value = isEdit ? item.id : '';
    $('#itemCatalogId').value = isEdit ? (item.catalogId || '') : '';
    $('#itemName').value = isEdit ? item.name : '';
    $('#itemCategory').value = isEdit ? item.category : 'Otros';
    $('#itemEmoji').value = isEdit ? item.emoji : '🍽️';
    $('#itemQty').value = isEdit ? item.qty : 1;
    $('#itemUnit').value = isEdit ? item.unit : 'uds';
    $('#itemExpires').value = isEdit ? item.expiresAt : S.addDaysISO(7);
    $('#itemPrice').value = isEdit ? item.price || '' : '';
    $('#itemSearch').value = '';
    state.priceTouched = isEdit;
    state.lastCatalog = isEdit ? item.catalogId : null;

    $('#catalogGrid').innerHTML = catalogChips('');

    $('#quickExpiry').innerHTML = [3, 7, 15, 30, 180].map((days) => `
      <button type="button" data-days="${days}">${days >= 180 ? '6 meses' : days + ' días'}</button>`).join('');

    openModal('#itemModal');
    setTimeout(() => $('#itemName').focus(), 80);
  }

  function selectCatalog(catalogId) {
    const catalog = CATALOG_BY_ID[catalogId];
    if (!catalog) return;
    state.lastCatalog = catalogId;
    state.priceTouched = false;
    $('#itemCatalogId').value = catalogId;
    $('#itemName').value = catalog.name;
    $('#itemCategory').value = catalog.category;
    $('#itemEmoji').value = catalog.emoji;
    $('#itemUnit').value = catalog.unit;

    const qty = Math.max(0.25, Number($('#itemQty').value) || 1);
    const defaultQty = S._catalogDefaultQty(catalog);
    $('#itemPrice').value = (catalog.price * (qty / defaultQty)).toFixed(2);
    if (!$('#itemId').value) {
      $('#itemExpires').value = S.addDaysISO(catalog.shelf);
    }
    $('#catalogGrid').innerHTML = catalogChips($('#itemSearch').value);
    $('#itemName').focus();
  }

  function submitItem(event) {
    event.preventDefault();
    const id = $('#itemId').value;
    const name = $('#itemName').value.trim();
    const expiresAt = $('#itemExpires').value;

    if (!name) {
      toast('Ponle un nombre al producto', '✏️');
      $('#itemName').focus();
      return;
    }
    if (!expiresAt) {
      toast('Indica la fecha de vencimiento', '📅');
      $('#itemExpires').focus();
      return;
    }

    const payload = {
      catalogId: $('#itemCatalogId').value || null,
      name,
      emoji: $('#itemEmoji').value.trim() || '🍽️',
      category: $('#itemCategory').value,
      unit: $('#itemUnit').value,
      qty: Number($('#itemQty').value) || 1,
      price: Number($('#itemPrice').value) || 0,
      expiresAt,
    };

    if (id) {
      S.updateItem(id, payload);
      closeModals();
      toast(`${name} actualizado`, '✏️');
    } else {
      S.addItem(payload);
      closeModals();
      toast(`${name} agregado a la nevera`, '🧊');
    }
  }

  /* ---------------- menú contextual ---------------- */

  let ctxNode = null;

  function closeCtxMenu() {
    if (ctxNode) { ctxNode.remove(); ctxNode = null; }
  }

  function openCtxMenu(anchor, itemId) {
    closeCtxMenu();
    const item = S.getItem(itemId);
    if (!item) return;
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.innerHTML = `
      <button data-edit="${item.id}">${ICON.edit} Editar</button>
      <button data-duplicate="${item.id}">${ICON.copy} Duplicar</button>
      <button data-recipe-for="${item.id}">${ICON.chef} Qué cocinar</button>
      <button class="is-danger" data-delete="${item.id}">${ICON.trash} Eliminar</button>`;
    document.body.appendChild(menu);
    const width = 158;
    const left = Math.min(window.innerWidth - width - 10, Math.max(10, rect.right - width));
    const top = Math.min(window.innerHeight - menu.offsetHeight - 10, rect.bottom + 6);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    ctxNode = menu;
  }

  /* ---------------- modales ---------------- */

  function openModal(selector) {
    closeCtxMenu();
    const modal = $(selector);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModals() {
    $$('.modal').forEach((m) => { m.hidden = true; });
    document.body.style.overflow = '';
    closeCtxMenu();
  }

  /* ---------------- eventos ---------------- */

  function bind() {
    document.addEventListener('click', (event) => {
      const navEl = event.target.closest('[data-nav]');
      if (navEl) {
        event.preventDefault();
        navigate(navEl.dataset.nav);
        return;
      }

      if (event.target.closest('[data-open-add]')) {
        openItemModal(null);
        return;
      }

      if (event.target.closest('[data-close-modal]')) {
        closeModals();
        return;
      }

      if (event.target.closest('#addBtn')) { openItemModal(null); return; }
      if (event.target.closest('#themeToggle')) { toggleTheme(); return; }
      if (event.target.closest('#settingsBtn')) { openModal('#settingsModal'); return; }

      if (event.target.closest('#searchBtn')) {
        navigate('nevera');
        setTimeout(() => $('#searchInput').focus(), 120);
        return;
      }

      // chips de catálogo en el formulario
      const catalogChip = event.target.closest('[data-catalog-chip]');
      if (catalogChip) { selectCatalog(catalogChip.dataset.catalogChip); return; }

      // botones de vencimiento rápido
      const daysBtn = event.target.closest('[data-days]');
      if (daysBtn) {
        $('#itemExpires').value = S.addDaysISO(Number(daysBtn.dataset.days));
        return;
      }

      // recetas
      const recipeBtn = event.target.closest('[data-recipe]');
      if (recipeBtn) { openRecipeModal(recipeBtn.dataset.recipe); return; }

      const cookBtn = event.target.closest('[data-cook]');
      if (cookBtn) { cook(cookBtn.dataset.cook); return; }

      const recipeFor = event.target.closest('[data-recipe-for]');
      if (recipeFor) {
        closeCtxMenu();
        const itemId = recipeFor.dataset.recipeFor;
        const item = S.getItem(itemId);
        const recipe = item ? bestRecipeFor(item.catalogId) : null;
        if (recipe) openRecipeModal(recipe.id);
        else { navigate('recetas'); toast('No hay receta con ese producto todavía', '🥄'); }
        return;
      }

      if (event.target.closest('[data-action="recipe-fallback"]')) {
        navigate('recetas');
        return;
      }

      // descartar desde inicio
      const discardBtn = event.target.closest('[data-action="discard"]');
      if (discardBtn) {
        const item = S.removeItem(discardBtn.dataset.id);
        if (item) toast(`${item.name} salió de la nevera`, '🗑️');
        return;
      }

      // agregar sugerido a la lista de compras
      const addShoppingBtn = event.target.closest('[data-action="add-shopping"]');
      if (addShoppingBtn) {
        const catalog = CATALOG_BY_ID[addShoppingBtn.dataset.catalog];
        if (catalog) {
          S.addShopping({
            catalogId: catalog.id,
            name: catalog.name,
            emoji: catalog.emoji,
            category: catalog.category,
            qty: S._catalogDefaultQty(catalog) > 1 ? S._catalogDefaultQty(catalog) : 1,
            unit: catalog.unit,
            auto: true,
          });
          toast(`${catalog.name} en la lista`, '🛒');
        }
        return;
      }

      // navegación dentro de nevera
      const chip = event.target.closest('[data-cat]');
      if (chip) { state.category = chip.dataset.cat; renderInventory(); return; }

      const freshBtn = event.target.closest('[data-fresh]');
      if (freshBtn) {
        state.freshness = freshBtn.dataset.fresh;
        $$('#freshnessFilter .segmented__item').forEach((b) => b.classList.toggle('is-active', b === freshBtn));
        renderInventory();
        return;
      }

      const recipeFilterBtn = event.target.closest('[data-filter]');
      if (recipeFilterBtn) {
        state.recipeFilter = recipeFilterBtn.dataset.filter;
        $$('#recipeFilter .segmented__item').forEach((b) => b.classList.toggle('is-active', b === recipeFilterBtn));
        renderRecipes();
        return;
      }

      // cantidad
      const qtyBtn = event.target.closest('[data-qty]');
      if (qtyBtn) {
        S.adjustQty(qtyBtn.dataset.id, Number(qtyBtn.dataset.qty));
        return;
      }

      // menú de producto
      const menuBtn = event.target.closest('[data-menu]');
      if (menuBtn) { openCtxMenu(menuBtn, menuBtn.dataset.menu); return; }

      if (!event.target.closest('.ctx-menu')) closeCtxMenu();

      const editBtn = event.target.closest('[data-edit]');
      if (editBtn) {
        const item = S.getItem(editBtn.dataset.edit);
        closeCtxMenu();
        if (item) openItemModal(item);
        return;
      }

      const dupBtn = event.target.closest('[data-duplicate]');
      if (dupBtn) {
        const item = S.getItem(dupBtn.dataset.duplicate);
        if (item) {
          S.addItem({ ...item, id: undefined, addedAt: S.todayISO() });
          closeCtxMenu();
          toast(`${item.name} duplicado`, '📋');
        }
        return;
      }

      const delBtn = event.target.closest('[data-delete]');
      if (delBtn) {
        const item = S.removeItem(delBtn.dataset.delete);
        closeCtxMenu();
        if (item) toast(`${item.name} eliminado`, '🗑️');
        return;
      }

      // compras
      const toggleShoppingBtn = event.target.closest('[data-toggle-shopping]');
      if (toggleShoppingBtn) { S.toggleShopping(toggleShoppingBtn.dataset.toggleShopping); return; }

      const removeShoppingBtn = event.target.closest('[data-remove-shopping]');
      if (removeShoppingBtn) { S.removeShopping(removeShoppingBtn.dataset.removeShopping); return; }

      if (event.target.closest('#moveToPantryBtn')) {
        const count = S.moveCompletedToPantry();
        toast(count ? `${count} ${count === 1 ? 'producto pasó' : 'productos pasaron'} a la nevera` : 'Marca primero lo que compraste', count ? '🧊' : '🛒');
        return;
      }

      // impacto
      if (event.target.closest('#exportBtn')) { exportData(); return; }
      if (event.target.closest('#resetDemoBtn')) {
        S.resetDemo();
        toast('Datos de demostración restaurados', '🧊');
        return;
      }
      if (event.target.closest('#settingsDemo')) {
        S.resetDemo();
        closeModals();
        toast('Datos de demostración restaurados', '🧊');
        return;
      }
      if (event.target.closest('#settingsClear')) {
        if (confirm('¿Borrar todos tus datos? Esta acción no se puede deshacer.')) {
          S.clearAll();
          closeModals();
          toast('Todo listo para empezar de cero', '🧼');
        }
        return;
      }
    });

    // formularios
    $('#itemForm').addEventListener('submit', submitItem);
    $('#shoppingForm').addEventListener('submit', submitShopping);

    $('#itemSearch').addEventListener('input', (event) => {
      $('#catalogGrid').innerHTML = catalogChips(event.target.value) ||
        '<div class="attention-empty" style="padding:12px"><div>Sin resultados. Completa el nombre manualmente.</div></div>';
    });

    // precio sugerido
    $('#itemQty').addEventListener('input', () => {
      const catalog = CATALOG_BY_ID[$('#itemCatalogId').value];
      if (!catalog || state.priceTouched) return;
      const qty = Math.max(0.25, Number($('#itemQty').value) || 1);
      $('#itemPrice').value = (catalog.price * (qty / S._catalogDefaultQty(catalog))).toFixed(2);
    });
    $('#itemPrice').addEventListener('input', () => { state.priceTouched = true; });
    $('#itemUnit').addEventListener('change', () => { state.priceTouched = true; });
    $('#itemName').addEventListener('input', () => {
      const match = CATALOG.find((c) => c.name.toLowerCase() === $('#itemName').value.trim().toLowerCase());
      if (match) {
        $('#itemCatalogId').value = match.id;
        state.lastCatalog = match.id;
        $('#itemCategory').value = match.category;
        $('#itemEmoji').value = match.emoji;
      }
    });

    // stepper
    $$('#itemForm .stepper__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = $('#itemQty');
        const step = 0.25;
        const next = Math.max(0.25, (Number(input.value) || 1) + Number(btn.dataset.step) * step);
        input.value = Math.round(next * 100) / 100;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    // búsqueda y orden
    $('#searchInput').addEventListener('input', (event) => {
      state.search = event.target.value;
      renderInventory();
    });
    $('#sortSelect').addEventListener('change', (event) => {
      state.sort = event.target.value;
      renderInventory();
    });
    $('#onlyPantry').addEventListener('change', (event) => {
      state.onlyPantry = event.target.checked;
      renderRecipes();
    });

    // ajustes
    $('#settingsTheme').addEventListener('change', (event) => {
      const theme = event.target.checked ? 'dark' : 'light';
      S.setTheme(theme);
      applyTheme(theme);
    });

    $('#importInput').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          S.importJSON(String(reader.result));
          closeModals();
          toast('Datos importados correctamente', '📥');
          render();
        } catch (err) {
          toast(err.message || 'No se pudo importar el archivo', '⚠️');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    });

    // modal: clic en backdrop y escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { closeModals(); }
    });

    window.addEventListener('resize', closeCtxMenu);
    window.addEventListener('scroll', closeCtxMenu, { passive: true });

    window.addEventListener('refri:change', () => {
      render();
      btnStateRefresh();
    });
  }

  function btnStateRefresh() {
    // mantiene sincronizados los controles estáticos del formulario de compras
    if (state.view === 'compras') {
      const unit = $('#shoppingUnit').value;
      if (!UNITS.includes(unit)) $('#shoppingUnit').value = 'uds';
    }
  }

  function exportData() {
    const blob = new Blob([S.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mi-refri-${S.todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Datos exportados', '📤');
  }

  /* ---------------- arranque ---------------- */

  function init() {
    applyTheme(S.getSettings().theme || 'light');

    // selects
    $('#itemCategory').innerHTML = CATEGORIES.map((c) => `<option value="${esc(c)}">${c}</option>`).join('');
    $('#itemUnit').innerHTML = UNITS.map((u) => `<option value="${u}">${u}</option>`).join('');
    $('#itemCategory').value = 'Otros';

    bind();
    render();

    // estado inicial de la fecha
    $('#itemExpires').value = S.addDaysISO(7);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
