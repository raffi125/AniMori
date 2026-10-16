const API_BASE = "https://otakudesu-api.herokuapp.com/api";
const SCRAPE_BASE = "https://otakudesu.moe";
const SCRAPE_PROXY = "https://api.allorigins.win/raw?url=";

const ongoingGrid = document.getElementById("ongoing-grid");
const completeGrid = document.getElementById("complete-grid");
const trendingList = document.getElementById("trending-list");
const latestEpisode = document.getElementById("latest-episode");
const dataSource = document.getElementById("data-source");
const searchForm = document.querySelector(".search");
const searchInput = document.getElementById("search-input");

const statOngoing = document.getElementById("stat-ongoing");
const statComplete = document.getElementById("stat-complete");
const statEpisode = document.getElementById("stat-episode");

const fallbackData = {
  ongoing: [
    {
      title: "Re:Zero kara Hajimeru Isekai Seikatsu S3",
      episode: "Episode 6",
      day: "Rabu",
      thumb: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Kaiju No. 8",
      episode: "Episode 9",
      day: "Sabtu",
      thumb: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Dungeon Meshi",
      episode: "Episode 14",
      day: "Kamis",
      thumb: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    },
  ],
  complete: [
    {
      title: "Frieren: Beyond Journey's End",
      episode: "28 Episode",
      genre: "Adventure",
      thumb: "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Jujutsu Kaisen S2",
      episode: "23 Episode",
      genre: "Action",
      thumb: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Solo Leveling",
      episode: "12 Episode",
      genre: "Fantasy",
      thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
    },
  ],
};

let currentData = fallbackData;

const createCard = (item) => {
  const card = document.createElement("article");
  card.className = "card";

  const image = document.createElement("img");
  image.src = item.thumb || item.thumbnail || "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?auto=format&fit=crop&w=800&q=80";
  image.alt = item.title || "Anime";

  const body = document.createElement("div");
  body.className = "card__body";

  const title = document.createElement("h4");
  title.textContent = item.title || "Judul belum tersedia";

  const meta = document.createElement("div");
  meta.className = "card__meta";
  meta.innerHTML = `<span>${item.episode || item.latest_episode || "Episode baru"}</span><span>${item.day || item.genre || "Sub Indo"}</span>`;

  body.append(title, meta);
  card.append(image, body);

  return card;
};

const normalizeText = (value) => (value || "").toString().trim();

const renderList = (container, items = []) => {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = "<p>Data belum tersedia.</p>";
    return;
  }
  items.slice(0, 6).forEach((item) => container.appendChild(createCard(item)));
};

const renderTrending = (items = []) => {
  trendingList.innerHTML = "";
  if (!items.length) {
    trendingList.innerHTML = "<li>Data belum tersedia.</li>";
    return;
  }
  items.slice(0, 5).forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${index + 1}. ${item.title}</span><span>${item.episode || "--"}</span>`;
    trendingList.appendChild(li);
  });
};

const updateStats = ({ ongoing, complete, episode }) => {
  statOngoing.textContent = ongoing;
  statComplete.textContent = complete;
  statEpisode.textContent = episode;
};

const setDataSource = (label) => {
  dataSource.textContent = `Sumber data: ${label}`;
};

const fetchApi = async (path) => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error("Gagal memuat data.");
  }
  return response.json();
};

const fetchApiHome = async () => {
  const homeData = await fetchApi("/home");
  return {
    ongoing: homeData?.ongoing || [],
    complete: homeData?.complete || [],
    source: "Otakudesu API",
  };
};

const buildProxyUrl = (url) => `${SCRAPE_PROXY}${encodeURIComponent(url)}`;

const parseSeriesList = (doc) => {
  const candidates = [
    ...doc.querySelectorAll(".venz ul li"),
    ...doc.querySelectorAll(".venz .detpost"),
    ...doc.querySelectorAll(".venz .listupd article"),
    ...doc.querySelectorAll(".venz .bsx"),
  ];

  const results = new Map();

  candidates.forEach((item) => {
    const titleElement =
      item.querySelector(".jdlflm") ||
      item.querySelector("h2") ||
      item.querySelector("h3") ||
      item.querySelector("a");
    const title = normalizeText(titleElement?.textContent);

    const episode =
      normalizeText(item.querySelector(".epz")?.textContent) ||
      normalizeText(item.querySelector(".eps")?.textContent) ||
      normalizeText(item.querySelector(".lastepisode")?.textContent) ||
      normalizeText(item.querySelector(".episode")?.textContent);

    const day =
      normalizeText(item.querySelector(".newnime")?.textContent) ||
      normalizeText(item.querySelector(".rnk")?.textContent) ||
      normalizeText(item.querySelector(".genres")?.textContent);

    const imageElement = item.querySelector("img");
    const thumb =
      imageElement?.getAttribute("data-src") ||
      imageElement?.getAttribute("src") ||
      imageElement?.getAttribute("data-lazy-src");

    if (!title || results.has(title)) {
      return;
    }

    results.set(title, {
      title,
      episode: episode || "Episode baru",
      day: day || "Sub Indo",
      thumb,
    });
  });

  return Array.from(results.values());
};

const fetchScrapePage = async (path) => {
  const response = await fetch(buildProxyUrl(`${SCRAPE_BASE}${path}`));
  if (!response.ok) {
    throw new Error("Gagal memuat halaman.");
  }
  const html = await response.text();
  return new DOMParser().parseFromString(html, "text/html");
};

const fetchScrapeHome = async () => {
  const [ongoingDoc, completeDoc] = await Promise.all([
    fetchScrapePage("/ongoing-anime/"),
    fetchScrapePage("/complete-anime/"),
  ]);

  return {
    ongoing: parseSeriesList(ongoingDoc),
    complete: parseSeriesList(completeDoc),
    source: "Scrape Otakudesu",
  };
};

const applyData = ({ ongoing, complete, source }) => {
  currentData = { ongoing, complete };
  renderList(ongoingGrid, ongoing);
  renderList(completeGrid, complete);
  renderTrending(ongoing);

  const latest = ongoing[0];
  latestEpisode.textContent = latest
    ? `${latest.title} • ${latest.episode || latest.latest_episode || "Episode terbaru"}`
    : "Update terbaru belum tersedia.";

  updateStats({
    ongoing: ongoing.length,
    complete: complete.length,
    episode: latest?.episode || latest?.latest_episode || "--",
  });

  setDataSource(source);
};

const filterItems = (items, query) => {
  if (!query) {
    return items;
  }

  const keyword = query.toLowerCase();
  return items.filter((item) => {
    const title = normalizeText(item.title).toLowerCase();
    const episode = normalizeText(item.episode).toLowerCase();
    const day = normalizeText(item.day || item.genre).toLowerCase();
    return title.includes(keyword) || episode.includes(keyword) || day.includes(keyword);
  });
};

const handleSearch = (event) => {
  event.preventDefault();
  const query = normalizeText(searchInput.value);
  const filteredOngoing = filterItems(currentData.ongoing, query);
  const filteredComplete = filterItems(currentData.complete, query);
  renderList(ongoingGrid, filteredOngoing);
  renderList(completeGrid, filteredComplete);
  renderTrending(filteredOngoing);
};

if (searchForm) {
  searchForm.addEventListener("submit", handleSearch);
}

if (searchInput) {
  searchInput.addEventListener("input", handleSearch);
}

const loadData = async () => {
  try {
    const apiData = await fetchApiHome();
    if (apiData.ongoing.length || apiData.complete.length) {
      applyData(apiData);
      return;
    }
  } catch (error) {
    // lanjut ke fallback berikutnya
  }

  try {
    const scrapeData = await fetchScrapeHome();
    if (scrapeData.ongoing.length || scrapeData.complete.length) {
      applyData(scrapeData);
      return;
    }
  } catch (error) {
    // lanjut ke fallback berikutnya
  }

  applyData({
    ...fallbackData,
    source: "Fallback lokal",
  });
  latestEpisode.textContent = "API Otakudesu sedang sibuk. Menampilkan data demo.";
};

loadData();
