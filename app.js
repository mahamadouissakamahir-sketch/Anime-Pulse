// =====================================================================
// ANIMEPULSE - LOGIQUE PRINCIPALE (v2)
// Données anime/manga : API AniList (GraphQL, gratuite, sans clé).
// Favoris + notifications : localStorage (pas de compte requis).
// =====================================================================

const ANILIST_URL = "https://graphql.anilist.co";
const STORAGE_KEY = "animepulse_data_v2";
let searchType = "ANIME";
let searchTimeout = null;
let lastView = "home";

// ---------------------------------------------------------------------
// STOCKAGE LOCAL
// ---------------------------------------------------------------------
function defaultData() {
  return {
    favorites: [],       // [{ id, title, image, notify: true, knownEpisode: 0 }]
    notifyGlobal: true
  };
}
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : defaultData();
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
function bestTitle(title) {
  return title?.english || title?.romaji || title?.native || "Sans titre";
}

// ---------------------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------------------
function showTab(tab) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(`view-${tab}`).classList.add("active");
  const navBtn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (navBtn) navBtn.classList.add("active");
  if (tab !== "detail") lastView = tab;
  if (tab === "profile") renderProfile();
  if (tab === "support") renderSupportMethods();
}
function goBackFromDetail() { showTab(lastView); }

// ---------------------------------------------------------------------
// APPEL ANILIST (GraphQL)
// ---------------------------------------------------------------------
async function anilistQuery(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`Erreur API AniList (${res.status})`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Erreur AniList");
  return json.data;
}

const MEDIA_CARD_FIELDS = `
  id
  title { romaji english native }
  coverImage { large color }
  averageScore
  status
  episodes
  startDate { year month day }
`;

// ---------------------------------------------------------------------
// ACCUEIL — à venir, calendrier de la semaine, tendances
// ---------------------------------------------------------------------
async function loadUpcoming() {
  const container = document.getElementById("upcoming-list");
  const query = `
    query {
      Page(page: 1, perPage: 10) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }`;
  try {
    const data = await anilistQuery(query);
    const list = data.Page.media;
    if (!list.length) { container.innerHTML = `<p class="empty-state">Rien d'annoncé pour l'instant.</p>`; return; }
    container.innerHTML = list.map((a) => `
      <div class="upcoming-card" onclick="showDetail(${a.id})">
        <img src="${a.coverImage?.large || ""}" alt="" loading="lazy">
        <div class="upcoming-card-body">
          <span class="upcoming-date">${formatDate(a.startDate)}</span>
          <div class="upcoming-title">${escapeHtml(bestTitle(a.title))}</div>
        </div>
      </div>`
    ).join("");
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Impossible de charger les sorties à venir.</p>`;
  }
}

async function loadWeekSchedule() {
  const container = document.getElementById("schedule-list");
  const now = Math.floor(Date.now() / 1000);
  const weekLater = now + 7 * 24 * 60 * 60;
  const query = `
    query ($start: Int, $end: Int) {
      Page(page: 1, perPage: 12) {
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
          airingAt
          episode
          media {
            id
            title { romaji english native }
            coverImage { large }
          }
        }
      }
    }`;
  try {
    const data = await anilistQuery(query, { start: now, end: weekLater });
    const list = data.Page.airingSchedules;
    if (!list.length) { container.innerHTML = `<p class="empty-state">Aucune diffusion prévue cette semaine.</p>`; return; }
    container.innerHTML = list.map((s) => `
      <div class="schedule-row" onclick="showDetail(${s.media.id})">
        <img src="${s.media.coverImage?.large || ""}" alt="" loading="lazy">
        <div class="schedule-info">
          <div class="schedule-title">${escapeHtml(bestTitle(s.media.title))}</div>
          <div class="schedule-meta">Épisode ${s.episode}</div>
        </div>
        <span class="schedule-badge">${formatAiringDate(s.airingAt)}</span>
      </div>`
    ).join("");
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Impossible de charger le calendrier.</p>`;
  }
}

async function loadTrending() {
  const container = document.getElementById("trending-grid");
  const query = `
    query {
      Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }`;
  try {
    const data = await anilistQuery(query);
    renderAnimeGrid(container, data.Page.media);
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Impossible de charger les tendances.</p>`;
  }
}

function formatDate(d) {
  if (!d || !d.year) return "Date à venir";
  const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
  return d.month ? `${d.day || ""} ${months[d.month - 1]} ${d.year}`.trim() : `${d.year}`;
}
function formatAiringDate(ts) {
  const d = new Date(ts * 1000);
  const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
  return `${days[d.getDay()]} ${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------
// RECHERCHE
// ---------------------------------------------------------------------
function setSearchType(type) {
  searchType = type;
  document.querySelectorAll(".search-type-tab").forEach((b) => b.classList.toggle("active", b.dataset.type === type));
  const query = document.getElementById("search-input").value;
  if (query.trim()) runSearch(query);
}

function onSearchInput(query) {
  clearTimeout(searchTimeout);
  const container = document.getElementById("search-results");
  if (!query.trim()) {
    container.innerHTML = `<p class="empty-state">Tape un nom pour commencer.</p>`;
    return;
  }
  container.innerHTML = `<p class="loading">Recherche en cours...</p>`;
  searchTimeout = setTimeout(() => runSearch(query), 400);
}

async function runSearch(query) {
  query = query.trim();
  if (!query) return;
  const container = document.getElementById("search-results");
  const gql = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 16) {
        media(search: $search, type: $type, sort: POPULARITY_DESC) {
          ${MEDIA_CARD_FIELDS}
        }
      }
    }`;
  try {
    const data = await anilistQuery(gql, { search: query, type: searchType });
    const results = data.Page.media;
    if (!results.length) {
      container.innerHTML = `<p class="empty-state">Aucun résultat pour "${escapeHtml(query)}".</p>`;
      return;
    }
    renderAnimeGrid(container, results);
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Erreur pendant la recherche. Réessaie dans un instant.</p>`;
  }
}

// ---------------------------------------------------------------------
// RENDU GRILLE
// ---------------------------------------------------------------------
function renderAnimeGrid(container, list) {
  if (typeof container === "string") container = document.getElementById(container);
  container.innerHTML = list.map((a) => `
    <div class="anime-card" onclick="showDetail(${a.id})">
      <img src="${a.coverImage?.large || ""}" alt="${escapeHtml(bestTitle(a.title))}" loading="lazy">
      <div class="anime-card-body">
        <div class="anime-card-title">${escapeHtml(bestTitle(a.title))}</div>
        <div class="anime-card-meta">${a.averageScore ? `⭐ ${a.averageScore / 10}` : ""} ${statusLabel(a.status)}</div>
      </div>
    </div>`
  ).join("");
}

function statusLabel(status) {
  const map = {
    RELEASING: "En cours", FINISHED: "Terminé", NOT_YET_RELEASED: "À venir",
    CANCELLED: "Annulé", HIATUS: "En pause"
  };
  return map[status] || "";
}

// ---------------------------------------------------------------------
// FICHE DÉTAIL
// ---------------------------------------------------------------------
async function showDetail(id) {
  showTab("detail");
  const container = document.getElementById("detail-content");
  container.innerHTML = `<p class="loading">Chargement de la fiche...</p>`;
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        id
        title { romaji english native }
        coverImage { large extraLarge }
        bannerImage
        description(asHtml: false)
        status
        episodes
        duration
        genres
        averageScore
        studios(isMain: true) { nodes { name } }
        startDate { year month day }
        nextAiringEpisode { episode airingAt }
        siteUrl
      }
    }`;
  try {
    const data = await anilistQuery(query, { id });
    renderDetail(data.Media);
    applyAdsState();
  } catch (e) {
    container.innerHTML = `<p class="empty-state">Impossible de charger cette fiche pour l'instant.</p>`;
  }
}

function renderDetail(a) {
  const data = loadData();
  const fav = data.favorites.find((f) => f.id === a.id);
  const genres = (a.genres || []).join(", ");
  const studios = (a.studios?.nodes || []).map((s) => s.name).join(", ");
  const title = bestTitle(a.title);
  const image = a.coverImage?.extraLarge || a.coverImage?.large || "";

  document.getElementById("detail-content").innerHTML = `
    <img class="detail-hero-img" src="${image}" alt="${escapeHtml(title)}">
    <h2 class="detail-title">${escapeHtml(title)}</h2>
    <div class="detail-sub">${escapeHtml(a.title.native || "")}</div>
    <div class="detail-tags">
      ${a.status ? `<span class="tag">${statusLabel(a.status)}</span>` : ""}
      ${a.averageScore ? `<span class="tag accent">⭐ ${a.averageScore / 10}</span>` : ""}
      ${a.episodes ? `<span class="tag">${a.episodes} ép.</span>` : ""}
      ${a.nextAiringEpisode ? `<span class="tag accent">Ép. ${a.nextAiringEpisode.episode} bientôt</span>` : ""}
    </div>

    <div class="ad-slot" id="ad-slot-detail">Emplacement publicitaire</div>

    <div class="detail-actions">
      <button class="fav-btn ${fav ? "active" : ""}" onclick="toggleFavorite(${a.id}, '${escapeHtml(title).replace(/'/g, "\\'")}', '${image}')">
        ${fav ? "💗 Dans mes favoris" : "🤍 Ajouter aux favoris"}
      </button>
    </div>

    ${fav ? `
    <div class="notify-row">
      <span>🔔 Me notifier des nouveaux épisodes</span>
      <label class="switch">
        <input type="checkbox" ${fav.notify ? "checked" : ""} onchange="toggleFavoriteNotify(${a.id})">
        <span class="switch-track"></span>
      </label>
    </div>` : ""}

    <div class="detail-block">
      <div class="detail-label">Synopsis</div>
      <p class="detail-text">${escapeHtml(stripTags(a.description) || "Synopsis non disponible.")}</p>
    </div>

    <div class="detail-block">
      <div class="detail-label">Infos</div>
      <div class="detail-info-row"><span>Début</span><span>${formatDate(a.startDate)}</span></div>
      <div class="detail-info-row"><span>Studio</span><span>${escapeHtml(studios || "?")}</span></div>
      <div class="detail-info-row"><span>Genres</span><span>${escapeHtml(genres || "?")}</span></div>
      <div class="detail-info-row"><span>Durée/ép.</span><span>${a.duration ? a.duration + " min" : "?"}</span></div>
    </div>

    <div class="detail-block">
      <div class="detail-label">Où le regarder</div>
      <div class="affiliate-row">
        <a class="btn affiliate-btn" target="_blank" rel="noopener" href="https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}">▶️ Crunchyroll</a>
        <a class="btn btn-outline affiliate-btn" target="_blank" rel="noopener" href="https://animedigitalnetwork.fr/search?q=${encodeURIComponent(title)}">▶️ ADN</a>
      </div>
      <p class="affiliate-note">Liens partenaires — nous pouvons toucher une commission si tu t'abonnes, sans surcoût pour toi.</p>
    </div>
  `;
}

function stripTags(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

// ---------------------------------------------------------------------
// FAVORIS & NOTIFICATIONS
// ---------------------------------------------------------------------
function toggleFavorite(id, title, image) {
  const data = loadData();
  const idx = data.favorites.findIndex((f) => f.id === id);
  if (idx >= 0) {
    data.favorites.splice(idx, 1);
    toast("Retiré des favoris");
  } else {
    data.favorites.push({ id, title, image, notify: true, knownEpisode: null });
    toast("Ajouté aux favoris 💗");
  }
  saveData(data);
  showDetail(id);
}

function toggleFavoriteNotify(id) {
  const data = loadData();
  const fav = data.favorites.find((f) => f.id === id);
  if (fav) fav.notify = !fav.notify;
  saveData(data);
}

function toggleGlobalNotify(checked) {
  const data = loadData();
  data.notifyGlobal = checked;
  saveData(data);
}

function renderProfile() {
  const data = loadData();
  document.getElementById("profile-fav-count").textContent = data.favorites.length;
  document.getElementById("profile-notif-count").textContent = data.favorites.filter((f) => f.notify).length;
  document.getElementById("global-notif-toggle").checked = data.notifyGlobal;

  const container = document.getElementById("favorites-list");
  if (data.favorites.length === 0) {
    container.innerHTML = `<p class="empty-state">Aucun favori pour l'instant. Ajoute des animes depuis leur fiche.</p>`;
    return;
  }
  container.innerHTML = data.favorites.map((f) => `
    <div class="fav-list-item" onclick="showDetail(${f.id})">
      <img src="${f.image}" alt="">
      <div class="fav-list-title">${escapeHtml(f.title)}</div>
      <span>${f.notify ? "🔔" : "🔕"}</span>
    </div>`
  ).join("");
}

// Vérifie, à l'ouverture de l'app, si de nouveaux épisodes sont sortis
// pour les favoris "notifiés". Pas de vrai push en arrière-plan (ça
// demanderait un backend) — juste une vérification au lancement.
async function checkNewEpisodes() {
  const data = loadData();
  if (!data.notifyGlobal) return;
  const toCheck = data.favorites.filter((f) => f.notify);
  if (!toCheck.length) return;

  let newCount = 0;
  for (const fav of toCheck) {
    try {
      const q = `query ($id: Int) { Media(id: $id) { nextAiringEpisode { episode } episodes status } }`;
      const res = await anilistQuery(q, { id: fav.id });
      const media = res.Media;
      const airedCount = media.nextAiringEpisode
        ? media.nextAiringEpisode.episode - 1
        : (media.status === "FINISHED" ? media.episodes : null);

      if (airedCount != null) {
        if (fav.knownEpisode != null && airedCount > fav.knownEpisode) newCount++;
        fav.knownEpisode = airedCount;
      }
    } catch (e) { /* silencieux : un échec ponctuel n'empêche pas le reste */ }
  }
  saveData(data);
  if (newCount > 0) {
    toast(`🔔 ${newCount} anime${newCount > 1 ? "s" : ""} suivi${newCount > 1 ? "s" : ""} ${newCount > 1 ? "ont" : "a"} un nouvel épisode !`);
  }
}

// ---------------------------------------------------------------------
// SOUTENIR — Wave, Amana, Airtel Money (config dans monetization-config.js)
// ---------------------------------------------------------------------
function renderSupportMethods() {
  const container = document.getElementById("support-methods-list");

  if (typeof ICON_DATA === "undefined") {
    container.innerHTML = `<p class="empty-state">⚠️ Le fichier icon-data.js n'est pas chargé. Vérifie qu'il est bien présent à côté d'index.html et que la ligne &lt;script src="icon-data.js"&gt; existe dans index.html.</p>`;
    return;
  }

  const icons = { wave: ICON_DATA.wave, amana: ICON_DATA.amana, airtel: ICON_DATA.airtel };
  const subs = { wave: "Transfert Wave", amana: "Transfert Amana", airtel: "Airtel Money" };

  container.innerHTML = Object.entries(SUPPORT_CONFIG).map(([key, m]) => `
    <div class="support-method-card" onclick="triggerSupport('${key}')">
      <img src="${icons[key]}" alt="${m.label}">
      <div>
        <div class="support-method-name">${m.label}</div>
        <div class="support-method-sub">${subs[key]}</div>
      </div>
    </div>`
  ).join("")
  + `<div id="support-number-reveal"></div>`
  + renderWhatsAppContact();
}

function renderWhatsAppContact() {
  if (typeof ICON_DATA === "undefined" || typeof WHATSAPP_CONFIG === "undefined") return "";
  const waLink = `https://wa.me/${WHATSAPP_CONFIG.number}`;
  return `
    <div class="section-title" style="margin-top:22px;"><span class="dot"></span>Contactez-nous</div>
    <a class="support-method-card" href="${waLink}" target="_blank" rel="noopener" style="text-decoration:none;">
      <img src="${ICON_DATA.whatsapp}" alt="WhatsApp">
      <div>
        <div class="support-method-name">WhatsApp</div>
        <div class="support-method-sub">Une question, un bug, une idée ? Écris-nous</div>
      </div>
    </a>`;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function triggerSupport(key) {
  const m = SUPPORT_CONFIG[key];
  if (!m) return;

  if (m.link) {
    window.open(m.link, "_blank");
    return;
  }

  // Le lien "intent://" ne fonctionne que si la page est servie en
  // http/https (donc pas quand tu testes le fichier directement dans
  // Acode ou en ouvrant index.html en local — protocole "file://").
  // Une fois l'app en ligne, ça marchera. Si androidPackage est à null
  // (ex: Airtel Money), on saute directement à l'affichage du numéro —
  // jamais d'erreur dans tous les cas.
  const canUseIntent = isAndroid() && m.androidPackage && location.protocol.startsWith("http");
  if (canUseIntent) {
    const intentUrl =
      `intent://open#Intent;package=${m.androidPackage};scheme=https;` +
      `S.browser_fallback_url=${encodeURIComponent(m.storeUrl)};end`;
    window.location.href = intentUrl;
  }

  // Le numéro reste toujours affiché en secours (utile aussi sur
  // iOS/desktop, ou tant que l'app n'est pas encore hébergée en ligne)
  const reveal = document.getElementById("support-number-reveal");
  reveal.innerHTML = `
    <div class="support-number-box">${m.number}</div>
    <button class="btn" style="width:100%;" onclick="copyNumber('${m.number}')">Copier le numéro ${m.label}</button>
    <p class="affiliate-note" style="text-align:center;">Si l'appli ${m.label} ne s'est pas ouverte automatiquement, envoie ton soutien manuellement à ce numéro. Merci infiniment 🙏</p>
  `;
}

function copyNumber(number) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(number).then(() => toast("Numéro copié !"));
  } else {
    toast(`Numéro : ${number}`);
  }
}

// ---------------------------------------------------------------------
// PUBLICITÉ — masquée tant que ADS_ENABLED = false (monetization-config.js)
// ---------------------------------------------------------------------
function applyAdsState() {
  document.querySelectorAll(".ad-slot").forEach((el) => {
    el.style.display = ADS_ENABLED ? "flex" : "none";
  });
}
function initAdsScriptIfNeeded() {
  if (!ADS_ENABLED || AD_CLIENT_ID === "REMPLACE_MOI") return;
  if (document.getElementById("adsense-script")) return;
  const script = document.createElement("script");
  script.id = "adsense-script";
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT_ID}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

// ---------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  applyAdsState();
  initAdsScriptIfNeeded();

  loadUpcoming();
  loadWeekSchedule();
  loadTrending();
  checkNewEpisodes();

  document.getElementById("search-input").addEventListener("input", (e) => onSearchInput(e.target.value));
  document.getElementById("global-notif-toggle").addEventListener("change", (e) => toggleGlobalNotify(e.target.checked));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
});
