(() => {
  "use strict";

  const STORAGE_LANG_KEY = "hamuya_guide_lang";
  const SUPPORTED_LANGS = ["ja", "zh-TW", "en", "ko"];

  // Map UI language code -> data/spots.json key
  const DATA_LANG_KEY = {
    ja: "ja",
    "zh-TW": "zh",
    en: "en",
    ko: "ko",
  };

  const TIME_OPTIONS = ["morning", "lunch", "dinner", "late_night"];
  const CATEGORY_OPTIONS = ["local_food", "cafe_sweets", "bar", "sightseeing"];
  const DISTANCE_OPTIONS = ["walk_5", "walk_15", "bike_far"];

  const I18N = {
    ja: {
      pageTitle: "はむ家 台南ローカル案内",
      appTitle: "はむ家 台南ローカル案内",
      appSubtitle: "はむ家のリアルなおすすめ案内",
      filterTime: "時間帯",
      filterCategory: "ジャンル",
      filterDistance: "距離",
      all: "すべて",
      time: {
        morning: "朝",
        lunch: "昼",
        dinner: "夜",
        late_night: "深夜",
      },
      category: {
        local_food: "グルメ",
        cafe_sweets: "カフェ・スイーツ",
        bar: "お酒",
        sightseeing: "散歩・観光",
      },
      distance: {
        walk_5: "徒歩5分以内",
        walk_15: "徒歩6〜15分",
        bike_far: "自転車・少し遠く",
      },
      walkMinutesLabel: (m) => `はむ家から徒歩約${m}分`,
      filterPick: "特集",
      hamuPickFilter: "⭐ 迷ったらここ",
      hamuPickBadge: "⭐ はむ家推し",
      tags: {
        breakfast: "朝ごはん",
        late_night: "深夜OK",
        drinks: "お酒あり",
        solo_ok: "ひとりOK",
        first_tainan: "台南名物",
        jp_friendly: "日本語OK",
        vegetarian_ok: "ベジ対応",
        animal_cafe: "動物カフェ",
        retro: "レトロ・古民家",
        work_friendly: "作業・休憩OK",
        reservation: "予約推奨",
      },
      hoursNotice: "ⓘ 営業時間・定休日は変更される場合があります。最新情報はGoogleマップ等でご確認ください。",
      searchPlaceholder: "店名・料理名で検索（例：牛肉湯、豆花）",
      searchClearLabel: "検索ワードをクリア",
      resultsCount: (n) => `${n}件のスポット`,
      resetInline: "条件クリア",
      ownerNoteLabel: "はむ家の一言メモ",
      pointOrderLabel: "指差し注文ワード",
      pointExpand: "拡大表示",
      pointModalBadge: "お店の人に見せてください",
      pointModalClose: "閉じる",
      openMaps: "Googleマップで行く",
      readBlog: "ブログ記事を読む",
      emptyTitle: "条件に合うスポットが見つかりませんでした",
      emptyDesc: "検索ワードや時間帯・ジャンル・距離の絞り込み条件を変えてみてください。",
      resetEmpty: "フィルターをすべて解除",
      errorTitle: "スポットデータを読み込めませんでした",
      errorDesc: "通信状況を確認して、もう一度お試しください。",
      retryLoad: "再読み込み",
      footerNote: "台南ゲストハウス はむ家（Hamuya / 哈木家）ローカル案内 v1.1",
    },
    "zh-TW": {
      pageTitle: "哈木家 台南在地散步指南",
      appTitle: "哈木家 台南在地指南",
      appSubtitle: "哈木家的台南私房推薦",
      filterTime: "時段",
      filterCategory: "類型",
      filterDistance: "距離",
      all: "全部",
      time: {
        morning: "早",
        lunch: "午",
        dinner: "晚",
        late_night: "宵夜",
      },
      category: {
        local_food: "美食",
        cafe_sweets: "咖啡・甜點",
        bar: "酒吧・小酌",
        sightseeing: "散步・景點",
      },
      distance: {
        walk_5: "步行5分鐘內",
        walk_15: "步行6～15分鐘",
        bike_far: "騎車・稍遠",
      },
      walkMinutesLabel: (m) => `從哈木家步行約${m}分鐘`,
      filterPick: "精選",
      hamuPickFilter: "⭐ 不知道去哪？看這裡",
      hamuPickBadge: "⭐ 哈木家精選",
      tags: {
        breakfast: "早餐",
        late_night: "宵夜・深夜",
        drinks: "有酒類",
        solo_ok: "適合獨旅",
        first_tainan: "台南經典",
        jp_friendly: "日文友善",
        vegetarian_ok: "素食友善",
        animal_cafe: "動物咖啡廳",
        retro: "老宅・復古",
        work_friendly: "適合休息・工作",
        reservation: "建議預約",
      },
      hoursNotice: "ⓘ 營業時間與公休日可能有所變動，出發前請以 Google 地圖等最新資訊為準。",
      searchPlaceholder: "搜尋店名或料理（例：牛肉湯、豆花）",
      searchClearLabel: "清除搜尋文字",
      resultsCount: (n) => `共 ${n} 個推薦地點`,
      resetInline: "清除篩選",
      ownerNoteLabel: "哈木家私房筆記",
      pointOrderLabel: "點餐小卡",
      pointExpand: "放大顯示",
      pointModalBadge: "可直接給店員看",
      pointModalClose: "關閉",
      openMaps: "開啟 Google 地圖",
      readBlog: "閱讀部落格介紹",
      emptyTitle: "找不到符合條件的地點",
      emptyDesc: "試試看更換搜尋關鍵字，或調整時段、類型、距離等篩選條件吧！",
      resetEmpty: "重設所有篩選",
      errorTitle: "無法載入地點資料",
      errorDesc: "請確認網路連線後再試一次。",
      retryLoad: "重新載入",
      footerNote: "台南旅宿 哈木家（Hamuya / はむ家）在地指南 v1.1",
    },
    en: {
      pageTitle: "Hamuya Tainan Local Guide",
      appTitle: "Hamuya Tainan Guide",
      appSubtitle: "Hamuya's Local Favorites",
      filterTime: "Time",
      filterCategory: "Type",
      filterDistance: "Distance",
      all: "All",
      time: {
        morning: "Morning",
        lunch: "Lunch",
        dinner: "Dinner",
        late_night: "Late Night",
      },
      category: {
        local_food: "Food",
        cafe_sweets: "Cafe & Sweets",
        bar: "Drinks / Bar",
        sightseeing: "Walk & Sights",
      },
      distance: {
        walk_5: "Within a 5-min walk",
        walk_15: "6–15 min walk",
        bike_far: "Bike / A Little Farther",
      },
      walkMinutesLabel: (m) => `~${m} min walk from Hamuya`,
      filterPick: "Picks",
      hamuPickFilter: "⭐ Hamuya Picks",
      hamuPickBadge: "⭐ Hamuya Pick",
      tags: {
        breakfast: "Breakfast",
        late_night: "Late Night",
        drinks: "Drinks",
        solo_ok: "Solo-Friendly",
        first_tainan: "Tainan Classic",
        jp_friendly: "Japanese-Friendly",
        vegetarian_ok: "Veg-Friendly",
        animal_cafe: "Animal Cafe",
        retro: "Retro / Old House",
        work_friendly: "Good for a Break / Work",
        reservation: "Reservation Recommended",
      },
      hoursNotice: "ⓘ Hours and closing days may change. Please check Google Maps for the latest info.",
      searchPlaceholder: "Search spot or food (e.g. beef soup)",
      searchClearLabel: "Clear search",
      resultsCount: (n) => (n === 1 ? "1 spot found" : `${n} spots found`),
      resetInline: "Clear filters",
      ownerNoteLabel: "Hamuya's Note",
      pointOrderLabel: "Show This to Order",
      pointExpand: "Fullscreen",
      pointModalBadge: "Show this screen to staff",
      pointModalClose: "Close",
      openMaps: "Open in Google Maps",
      readBlog: "Read Blog Post",
      emptyTitle: "No spots match your filters",
      emptyDesc: "Try another keyword or adjust your time, category, or distance filters.",
      resetEmpty: "Reset all filters",
      errorTitle: "Could not load spots",
      errorDesc: "Please check your connection and try again.",
      retryLoad: "Retry",
      footerNote: "Hamuya Guesthouse (はむ家 / 哈木家) Tainan Local Guide v1.1",
    },
    ko: {
      pageTitle: "하무야 타이난 로컬 가이드",
      appTitle: "하무야 타이난 로컬 가이드",
      appSubtitle: "하무야의 진짜 로컬 추천 가이드",
      filterTime: "시간대",
      filterCategory: "카테고리",
      filterDistance: "거리",
      all: "전체",
      time: {
        morning: "아침",
        lunch: "점심",
        dinner: "저녁",
        late_night: "심야",
      },
      category: {
        local_food: "맛집",
        cafe_sweets: "카페·디저트",
        bar: "술·바",
        sightseeing: "산책·관광",
      },
      distance: {
        walk_5: "도보 5분 이내",
        walk_15: "도보 6~15분",
        bike_far: "자전거 추천·조금 먼 곳",
      },
      walkMinutesLabel: (m) => `하무야에서 도보 약 ${m}분`,
      filterPick: "추천",
      hamuPickFilter: "⭐ 고민될 땐 여기",
      hamuPickBadge: "⭐ 하무야 추천",
      tags: {
        breakfast: "아침 식사",
        late_night: "심야 영업",
        drinks: "주류 있음",
        solo_ok: "혼밥·혼술 OK",
        first_tainan: "타이난 명물",
        jp_friendly: "일본어 가능",
        vegetarian_ok: "채식 가능",
        animal_cafe: "동물 카페",
        retro: "레트로·고택",
        work_friendly: "휴식·작업 OK",
        reservation: "예약 권장",
      },
      hoursNotice: "ⓘ 영업시간 및 휴무일은 변경될 수 있습니다. 방문 전 Google 지도 등에서 최신 정보를 확인해 주세요.",
      searchPlaceholder: "가게명·메뉴 검색 (예: 우육탕, 또우화)",
      searchClearLabel: "검색어 지우기",
      resultsCount: (n) => `총 ${n}곳`,
      resetInline: "필터 초기화",
      ownerNoteLabel: "하무야 한마디",
      pointOrderLabel: "주문할 때 보여주세요",
      pointExpand: "크게 보기",
      pointModalBadge: "가게 직원에게 보여주세요",
      pointModalClose: "닫기",
      openMaps: "Google 지도에서 보기",
      readBlog: "블로그 글 보기",
      emptyTitle: "조건에 맞는 스팟을 찾지 못했어요",
      emptyDesc: "검색어나 시간대·장르·거리 필터를 변경해 보세요.",
      resetEmpty: "모든 필터 해제",
      errorTitle: "스팟 데이터를 불러오지 못했어요",
      errorDesc: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      retryLoad: "다시 불러오기",
      footerNote: "타이난 게스트하우스 하무야(Hamuya / はむ家 / 哈木家) 로컬 가이드 v1.1",
    },
  };

  const state = {
    lang: detectInitialLang(),
    spots: [],
    loadError: false,
    filters: {
      query: "",
      time: null,
      category: null,
      distance: null,
      pickOnly: false,
    },
    modalSpotId: null,
  };

  const searchIndexCache = new WeakMap();

  // DOM References
  const dom = {
    appTitle: document.getElementById("app-title"),
    appSubtitle: document.getElementById("app-subtitle"),
    langButtons: Array.from(document.querySelectorAll(".lang-btn")),
    searchInput: document.getElementById("search-input"),
    searchClear: document.getElementById("search-clear"),
    labelTime: document.getElementById("label-time"),
    labelCategory: document.getElementById("label-category"),
    labelDistance: document.getElementById("label-distance"),
    hamuPickRow: document.getElementById("hamu-pick-row"),
    labelPick: document.getElementById("label-pick"),
    filterTime: document.getElementById("filter-time"),
    filterCategory: document.getElementById("filter-category"),
    filterDistance: document.getElementById("filter-distance"),
    filterPick: document.getElementById("filter-pick"),
    resultsCount: document.getElementById("results-count"),
    resetInline: document.getElementById("reset-filters-inline"),
    hoursNotice: document.getElementById("hours-notice"),
    spotsContainer: document.getElementById("spots-container"),
    emptyState: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptyDesc: document.getElementById("empty-desc"),
    resetEmpty: document.getElementById("reset-filters-empty"),
    errorState: document.getElementById("error-state"),
    errorTitle: document.getElementById("error-title"),
    errorDesc: document.getElementById("error-desc"),
    retryLoadBtn: document.getElementById("retry-load-btn"),
    footerNote: document.getElementById("footer-note"),
    pointModal: document.getElementById("point-modal"),
    pointModalBadge: document.getElementById("point-modal-badge"),
    pointModalShop: document.getElementById("point-modal-shop"),
    pointModalZh: document.getElementById("point-modal-zh"),
    pointModalSub: document.getElementById("point-modal-sub"),
    pointModalClose: document.getElementById("point-modal-close"),
  };

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && SUPPORTED_LANGS.includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage access errors in private mode
    }
    const browserLang = (navigator.language || "").toLowerCase();
    if (browserLang.startsWith("zh")) return "zh-TW";
    if (browserLang.startsWith("ko")) return "ko";
    if (browserLang.startsWith("en")) return "en";
    return "ja";
  }

  function isSafeExternalUrl(url) {
    if (typeof url !== "string") return false;
    const trimmed = url.trim();
    return trimmed.startsWith("https://") || trimmed.startsWith("http://");
  }

  function getLocalizedField(fieldObj, lang) {
    if (!fieldObj || typeof fieldObj !== "object") return "";
    const key = DATA_LANG_KEY[lang] || "ja";
    return (fieldObj[key] || fieldObj.ja || fieldObj.zh || fieldObj.en || "").trim();
  }

  function normalizeSearchText(str) {
    if (typeof str !== "string") return "";
    return str.normalize("NFKC").toLowerCase();
  }

  function getSpotSearchHaystack(spot) {
    if (searchIndexCache.has(spot)) {
      return searchIndexCache.get(spot);
    }
    const parts = [];
    for (const field of ["name", "owner_note", "point_and_order"]) {
      const obj = spot[field];
      if (obj && typeof obj === "object") {
        Object.values(obj).forEach((val) => {
          if (typeof val === "string" && val.trim()) parts.push(val);
        });
      }
    }
    if (Array.isArray(spot.tags)) {
      spot.tags.forEach((tagId) => {
        if (typeof tagId !== "string") return;
        parts.push(tagId);
        SUPPORTED_LANGS.forEach((lang) => {
          const label = I18N[lang] && I18N[lang].tags ? I18N[lang].tags[tagId] : "";
          if (label) parts.push(label);
        });
      });
    }
    const haystack = normalizeSearchText(parts.join(" "));
    searchIndexCache.set(spot, haystack);
    return haystack;
  }

  function hasActiveFilters() {
    return Boolean(
      state.filters.query.trim() ||
      state.filters.time ||
      state.filters.category ||
      state.filters.distance ||
      state.filters.pickOnly
    );
  }

  function getSpotCategories(spot) {
    if (Array.isArray(spot.category)) {
      return spot.category.filter((c) => typeof c === "string" && c.trim() !== "");
    }
    if (typeof spot.category === "string" && spot.category.trim() !== "") {
      return [spot.category.trim()];
    }
    return [];
  }

  function getFilteredSpots() {
    const queryTokens = normalizeSearchText(state.filters.query)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return state.spots.filter((spot) => {
      if (spot.is_active === false) return false;
      if (state.filters.pickOnly && spot.hamu_pick !== true) {
        return false;
      }
      if (state.filters.time) {
        const slots = Array.isArray(spot.time_slots) ? spot.time_slots : [];
        if (!slots.includes(state.filters.time)) return false;
      }
      if (state.filters.category && !getSpotCategories(spot).includes(state.filters.category)) {
        return false;
      }
      if (state.filters.distance && spot.distance !== state.filters.distance) {
        return false;
      }
      if (queryTokens.length > 0) {
        const haystack = getSpotSearchHaystack(spot);
        if (!queryTokens.every((token) => haystack.includes(token))) {
          return false;
        }
      }
      return true;
    });
  }

  function createChip(label, isActive, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = isActive ? "chip is-active" : "chip";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", String(isActive));
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderFilterGroup(container, options, currentVal, labelsMap, onSelect) {
    const t = I18N[state.lang];
    container.innerHTML = "";
    container.appendChild(
      createChip(t.all, currentVal === null, () => onSelect(null))
    );
    options.forEach((opt) => {
      const isSelected = currentVal === opt;
      container.appendChild(
        createChip(labelsMap[opt] || opt, isSelected, () => {
          onSelect(isSelected ? null : opt);
        })
      );
    });
  }

  function createSvgIcon(pathD) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.1");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("btn-icon");

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  function renderSpotCard(spot) {
    const t = I18N[state.lang];
    const dataKey = DATA_LANG_KEY[state.lang];

    const card = document.createElement("article");
    card.className = "spot-card";

    // Meta badges: hamu_pick, distance / walk_minutes, category, time slots
    const meta = document.createElement("div");
    meta.className = "spot-meta";

    if (spot.hamu_pick === true) {
      const pickBadge = document.createElement("span");
      pickBadge.className = "badge badge-pick";
      pickBadge.textContent = t.hamuPickBadge;
      meta.appendChild(pickBadge);
    }

    if (Number.isInteger(spot.walk_minutes) && spot.walk_minutes > 0) {
      const distBadge = document.createElement("span");
      distBadge.className = "badge badge-distance";
      distBadge.textContent = `🚶 ${t.walkMinutesLabel(spot.walk_minutes)}`;
      meta.appendChild(distBadge);
    } else if (spot.distance && t.distance[spot.distance]) {
      const distBadge = document.createElement("span");
      distBadge.className = "badge badge-distance";
      const iconPrefix = spot.distance === "bike_far" ? "🚲 " : "🚶 ";
      distBadge.textContent = `${iconPrefix}${t.distance[spot.distance]}`;
      meta.appendChild(distBadge);
    }

    getSpotCategories(spot).forEach((cat) => {
      if (!t.category[cat]) return;
      const catBadge = document.createElement("span");
      catBadge.className = "badge badge-category";
      catBadge.textContent = t.category[cat];
      meta.appendChild(catBadge);
    });

    if (Array.isArray(spot.time_slots)) {
      spot.time_slots.forEach((slot) => {
        if (!t.time[slot]) return;
        const timeBadge = document.createElement("span");
        timeBadge.className = "badge badge-time";
        timeBadge.textContent = t.time[slot];
        meta.appendChild(timeBadge);
      });
    }
    card.appendChild(meta);

    // Language-independent internal tags rendered in current language
    if (Array.isArray(spot.tags) && spot.tags.length > 0) {
      const validTags = spot.tags.filter((tagId) => t.tags && t.tags[tagId]);
      if (validTags.length > 0) {
        const tagRow = document.createElement("div");
        tagRow.className = "spot-tags";
        validTags.forEach((tagId) => {
          const pill = document.createElement("span");
          pill.className = "tag-pill";
          pill.textContent = `#${t.tags[tagId]}`;
          tagRow.appendChild(pill);
        });
        card.appendChild(tagRow);
      }
    }

    // Spot Name (local zh + selected language)
    const heading = document.createElement("div");
    heading.className = "spot-heading";

    const localName = (spot.name && spot.name.zh ? spot.name.zh : "").trim();
    const translatedName = getLocalizedField(spot.name, state.lang);

    const h2 = document.createElement("h2");
    h2.className = "spot-name-local";
    h2.setAttribute("lang", "zh-Hant");
    h2.textContent = localName || translatedName;
    heading.appendChild(h2);

    if (translatedName && translatedName !== localName) {
      const subName = document.createElement("p");
      subName.className = "spot-name-translated";
      subName.textContent = translatedName;
      heading.appendChild(subName);
    }
    card.appendChild(heading);

    // Hamuya's Note
    const noteText = getLocalizedField(spot.owner_note, state.lang);
    if (noteText) {
      const noteBox = document.createElement("div");
      noteBox.className = "owner-note";

      const noteLabel = document.createElement("div");
      noteLabel.className = "owner-note-label";
      noteLabel.textContent = `🏠 ${t.ownerNoteLabel}`;
      noteBox.appendChild(noteLabel);

      const noteP = document.createElement("p");
      noteP.className = "owner-note-text";
      noteP.textContent = noteText;
      noteBox.appendChild(noteP);

      card.appendChild(noteBox);
    }

    // Point & Order Card
    const zhPhrase = (spot.point_and_order && spot.point_and_order.zh ? spot.point_and_order.zh : "").trim();
    const translatedPhrase = (spot.point_and_order && spot.point_and_order[dataKey] ? spot.point_and_order[dataKey] : "").trim();

    if (zhPhrase) {
      const pointBox = document.createElement("div");
      pointBox.className = "point-order-box";

      const pointHead = document.createElement("div");
      pointHead.className = "point-order-head";

      const pointLabel = document.createElement("span");
      pointLabel.className = "point-order-label";
      pointLabel.textContent = `☝️ ${t.pointOrderLabel}`;
      pointHead.appendChild(pointLabel);

      const expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "point-expand-btn";
      expandBtn.textContent = `⛶ ${t.pointExpand}`;
      expandBtn.addEventListener("click", () => openPointModal(spot));
      pointHead.appendChild(expandBtn);

      pointBox.appendChild(pointHead);

      const zhP = document.createElement("p");
      zhP.className = "point-order-zh";
      zhP.setAttribute("lang", "zh-Hant");
      zhP.textContent = zhPhrase;
      pointBox.appendChild(zhP);

      if (state.lang !== "zh-TW" && translatedPhrase && translatedPhrase !== zhPhrase) {
        const transP = document.createElement("p");
        transP.className = "point-order-translation";
        transP.textContent = translatedPhrase;
        pointBox.appendChild(transP);
      }

      card.appendChild(pointBox);
    }

    // Action Buttons
    const actions = document.createElement("div");
    actions.className = "spot-actions";

    if (isSafeExternalUrl(spot.google_maps_url)) {
      const mapsLink = document.createElement("a");
      mapsLink.className = "btn btn-primary";
      mapsLink.href = spot.google_maps_url.trim();
      mapsLink.target = "_blank";
      mapsLink.rel = "noopener noreferrer";
      mapsLink.appendChild(
        createSvgIcon("M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10z M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z")
      );
      const mapsText = document.createElement("span");
      mapsText.textContent = t.openMaps;
      mapsLink.appendChild(mapsText);
      actions.appendChild(mapsLink);
    }

    const blogUrl = spot.blog_url && typeof spot.blog_url[dataKey] === "string"
      ? spot.blog_url[dataKey].trim()
      : "";

    if (isSafeExternalUrl(blogUrl)) {
      const blogLink = document.createElement("a");
      blogLink.className = "btn btn-secondary";
      blogLink.href = blogUrl;
      blogLink.target = "_blank";
      blogLink.rel = "noopener noreferrer";
      blogLink.appendChild(
        createSvgIcon("M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z")
      );
      const blogText = document.createElement("span");
      blogText.textContent = t.readBlog;
      blogLink.appendChild(blogText);
      actions.appendChild(blogLink);
    }

    if (actions.childNodes.length > 0) {
      card.appendChild(actions);
    }

    return card;
  }

  function openPointModal(spot) {
    state.modalSpotId = spot.id;
    renderPointModal(spot);
    dom.pointModal.hidden = false;
    document.body.style.overflow = "hidden";
    dom.pointModalClose.focus();
  }

  function renderPointModal(spot) {
    const t = I18N[state.lang];
    const dataKey = DATA_LANG_KEY[state.lang];
    const localName = (spot.name && spot.name.zh) || "";
    const zhPhrase = (spot.point_and_order && spot.point_and_order.zh) || "";
    const subPhrase = state.lang !== "zh-TW" && spot.point_and_order ? (spot.point_and_order[dataKey] || "") : "";

    dom.pointModalBadge.textContent = t.pointModalBadge;
    dom.pointModalShop.textContent = localName;
    dom.pointModalZh.textContent = zhPhrase;
    dom.pointModalSub.textContent = subPhrase;
    dom.pointModalSub.hidden = !subPhrase || subPhrase === zhPhrase;
    dom.pointModalClose.textContent = t.pointModalClose;
  }

  function closePointModal() {
    state.modalSpotId = null;
    dom.pointModal.hidden = true;
    document.body.style.overflow = "";
  }

  function resetFilters() {
    state.filters.query = "";
    state.filters.time = null;
    state.filters.category = null;
    state.filters.distance = null;
    state.filters.pickOnly = false;
    if (dom.searchInput) dom.searchInput.value = "";
    render();
  }

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    state.lang = lang;
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch {
      // Ignore storage errors
    }
    render();
  }

  function render() {
    const t = I18N[state.lang];

    // Document metadata & header
    document.documentElement.lang = state.lang;
    document.title = t.pageTitle;
    dom.appTitle.textContent = t.appTitle;
    dom.appSubtitle.textContent = t.appSubtitle;
    dom.footerNote.textContent = t.footerNote;

    // Language buttons
    dom.langButtons.forEach((btn) => {
      const isSelected = btn.dataset.lang === state.lang;
      btn.setAttribute("aria-selected", String(isSelected));
    });

    // Search input labels & clear button state
    dom.searchInput.placeholder = t.searchPlaceholder;
    dom.searchInput.setAttribute("aria-label", t.searchPlaceholder);
    dom.searchClear.setAttribute("aria-label", t.searchClearLabel);
    dom.searchClear.hidden = state.filters.query.length === 0;

    // Filter labels & chips
    dom.labelTime.textContent = t.filterTime;
    dom.labelCategory.textContent = t.filterCategory;
    dom.labelDistance.textContent = t.filterDistance;
    dom.hoursNotice.textContent = t.hoursNotice;

    renderFilterGroup(dom.filterTime, TIME_OPTIONS, state.filters.time, t.time, (val) => {
      state.filters.time = val;
      render();
    });
    renderFilterGroup(dom.filterCategory, CATEGORY_OPTIONS, state.filters.category, t.category, (val) => {
      state.filters.category = val;
      render();
    });
    renderFilterGroup(dom.filterDistance, DISTANCE_OPTIONS, state.filters.distance, t.distance, (val) => {
      state.filters.distance = val;
      render();
    });

    // Show hamu_pick filter row only when at least one active spot has hamu_pick: true
    const hasHamuPicks = state.spots.some((s) => s.is_active !== false && s.hamu_pick === true);
    dom.hamuPickRow.hidden = !hasHamuPicks;
    if (hasHamuPicks) {
      dom.labelPick.textContent = t.filterPick;
      dom.filterPick.innerHTML = "";
      dom.filterPick.appendChild(
        createChip(t.hamuPickFilter, state.filters.pickOnly, () => {
          state.filters.pickOnly = !state.filters.pickOnly;
          render();
        })
      );
    } else if (state.filters.pickOnly) {
      state.filters.pickOnly = false;
    }

    // Reset button text
    dom.resetInline.textContent = t.resetInline;
    dom.resetInline.hidden = !hasActiveFilters();

    // Error state
    if (state.loadError) {
      dom.resultsCount.textContent = "";
      dom.spotsContainer.innerHTML = "";
      dom.emptyState.hidden = true;
      dom.errorTitle.textContent = t.errorTitle;
      dom.errorDesc.textContent = t.errorDesc;
      dom.retryLoadBtn.textContent = t.retryLoad;
      dom.errorState.hidden = false;
      return;
    }

    dom.errorState.hidden = true;

    const filtered = getFilteredSpots();
    dom.resultsCount.textContent = t.resultsCount(filtered.length);
    dom.spotsContainer.innerHTML = "";

    if (filtered.length === 0) {
      dom.emptyTitle.textContent = t.emptyTitle;
      dom.emptyDesc.textContent = t.emptyDesc;
      dom.resetEmpty.textContent = t.resetEmpty;
      dom.emptyState.hidden = false;
    } else {
      dom.emptyState.hidden = true;
      const frag = document.createDocumentFragment();
      filtered.forEach((spot) => frag.appendChild(renderSpotCard(spot)));
      dom.spotsContainer.appendChild(frag);
    }

    // Update open modal if language changed
    if (state.modalSpotId && !dom.pointModal.hidden) {
      const activeSpot = state.spots.find((s) => s.id === state.modalSpotId);
      if (activeSpot) renderPointModal(activeSpot);
    }
  }

  async function loadSpots() {
    state.loadError = false;
    try {
      const res = await fetch("./data/spots.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid spots data");
      state.spots = data;
    } catch (err) {
      console.error("Failed to load spots.json:", err);
      state.loadError = true;
    }
    render();
  }

  function bindEvents() {
    dom.langButtons.forEach((btn) => {
      btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
    });

    dom.searchInput.addEventListener("input", (e) => {
      state.filters.query = e.target.value;
      render();
    });

    dom.searchClear.addEventListener("click", () => {
      state.filters.query = "";
      dom.searchInput.value = "";
      render();
      dom.searchInput.focus();
    });

    dom.resetInline.addEventListener("click", resetFilters);
    dom.resetEmpty.addEventListener("click", resetFilters);
    dom.retryLoadBtn.addEventListener("click", loadSpots);

    dom.pointModalClose.addEventListener("click", closePointModal);
    dom.pointModal.addEventListener("click", (e) => {
      if (e.target && e.target.hasAttribute("data-close-modal")) {
        closePointModal();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!dom.pointModal.hidden) {
          closePointModal();
        } else if (document.activeElement === dom.searchInput && state.filters.query) {
          state.filters.query = "";
          dom.searchInput.value = "";
          render();
        }
      }
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((err) => {
          console.warn("Service worker registration skipped:", err);
        });
      });
    }
  }

  bindEvents();
  registerServiceWorker();
  render();
  loadSpots();
})();
