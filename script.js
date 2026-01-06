const apiKey = "7b1eb9dd";
const baseUrl = "https://www.omdbapi.com/";
const placeholderImg = "https://via.placeholder.com/300x450?text=No+Image";


const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsEl = document.getElementById("results");
const genreGrid = document.getElementById("genre-grid");
const watchlistBadge = document.getElementById("watchlist-badge");
const watchlistCount = document.getElementById("watchlist-count");
const watchlistPanel = document.getElementById("watchlist-panel");
const watchlistItems = document.getElementById("watchlist-items");
const watchlistEmpty = document.getElementById("watchlist-empty");
const closeWatchlistBtn = document.getElementById("close-watchlist");
const relatedList = document.getElementById("related-list");
const relatedStatus = document.getElementById("related-status");

const modal = document.getElementById("modal");
const closeBtn = modal.querySelector(".close-btn");
const modalPoster = document.getElementById("modal-poster");
const modalTitle = document.getElementById("modal-title");
const modalGenre = document.getElementById("modal-genre");
const modalPlot = document.getElementById("modal-plot");
const modalRating = document.getElementById("modal-rating");
const modalWatchlistBtn = document.getElementById("modal-watchlist-btn");
const homeLogo = document.getElementById("home-logo");

let currentMovies = [];
let lastSearchResults = [];
let watchlist = [];
let currentModalMovie = null;
let lastQuery = "";
const detailsCache = new Map();


document.querySelectorAll(".genre-card").forEach((card) => {
  const poster = card.dataset.poster;
  if (poster) card.style.backgroundImage = `url(${poster})`;
});


const setStatus = (msg) => {
  resultsEl.innerHTML = `<div class="status">${msg}</div>`;
};

const isInWatchlist = (id) => watchlist.some((m) => m.imdbID === id);


const renderMovies = (movies) => {
  if (!movies.length) {
    setStatus("No movies found.");
    return;
  }

  resultsEl.innerHTML = movies
    .map(
      (movie) => `
    <article class="card">
      <div class="poster-wrapper">
        <img src="${
          movie.Poster !== "N/A" ? movie.Poster : placeholderImg
        }" alt="${movie.Title}">
      </div>
      <div class="card-body">
        <h3 class="title">${movie.Title}</h3>
        <p class="meta">${movie.Year}</p>
        <div class="actions">
          <button data-imdbid="${movie.imdbID}">View Details</button>
          <button class="watchlist-btn ${
            isInWatchlist(movie.imdbID) ? "added" : ""
          }"
            data-watchlist="${movie.imdbID}">★</button>
        </div>
      </div>
    </article>
  `
    )
    .join("");
};



const renderWatchlist = () => {
  watchlistCount.textContent = watchlist.length;

  if (!watchlist.length) {
    watchlistItems.innerHTML = "";
    watchlistEmpty.classList.remove("hidden");
    return;
  }

  watchlistEmpty.classList.add("hidden");
  watchlistItems.innerHTML = watchlist
    .map(
      (movie) => `
    <div class="watchlist-item">
      <img src="${movie.Poster !== "N/A" ? movie.Poster : placeholderImg}">
      <div class="info">
        <p class="title">${movie.Title}</p>
        <p class="meta">${movie.Year}</p>
      </div>
      <button class="watchlist-remove" data-remove-id="${
        movie.imdbID
      }">×</button>
    </div>
  `
    )
    .join("");
};

const loadWatchlist = () => {
  try {
    watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
  } catch {
    watchlist = [];
  }
  renderWatchlist();
};

const saveWatchlist = () => {
  localStorage.setItem("watchlist", JSON.stringify(watchlist));
  renderWatchlist();
  renderMovies(currentMovies);
};



// api integration
const fetchMovies = async (query) => {
  try {
    setStatus("Searching...");
    lastQuery = query;

    const res = await fetch(
      `${baseUrl}?apikey=${apiKey}&s=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    if (data.Response === "False") {
      setStatus(data.Error || "Movie not found");
      currentMovies = [];
      return;
    }

    currentMovies = data.Search || [];
    lastSearchResults = currentMovies;
    renderMovies(currentMovies);
  } catch {
    setStatus("Network error");
  }
};

const fetchDetails = async (id) => {
  if (detailsCache.has(id)) return detailsCache.get(id);

  const res = await fetch(`${baseUrl}?apikey=${apiKey}&i=${id}&plot=full`);
  const data = await res.json();

  if (data.Response === "True") {
    detailsCache.set(id, data);
    return data;
  }
  return null;
};


const openModal = (movie) => {
  modalPoster.src = movie.Poster !== "N/A" ? movie.Poster : placeholderImg;
  modalTitle.textContent = `${movie.Title} (${movie.Year})`;
  modalGenre.textContent = movie.Genre;
  modalPlot.textContent = movie.Plot;
  modalRating.textContent = `IMDb Rating: ${movie.imdbRating}`;
  currentModalMovie = movie;

  const inList = isInWatchlist(movie.imdbID);
  modalWatchlistBtn.classList.toggle("added", inList);
  modalWatchlistBtn.textContent = inList
    ? "Remove from Watchlist"
    : "Add to Watchlist";

  modal.classList.remove("hidden");
  fetchRelatedMovies(movie);
};

const closeModal = () => modal.classList.add("hidden");


// recommended movie
const fetchRelatedMovies = async (movie) => {
  relatedStatus.textContent = "Finding related picks...";
  relatedList.innerHTML = "";

  const genre = movie.Genre?.split(",")[0];
  if (!genre) return;

  const res = await fetch(`${baseUrl}?apikey=${apiKey}&s=${genre}`);
  const data = await res.json();

  if (data.Response === "False") {
    relatedStatus.textContent = "No related picks found.";
    return;
  }

  relatedStatus.textContent = "";
  relatedList.innerHTML = data.Search.filter((m) => m.imdbID !== movie.imdbID)
    .slice(0, 6)
    .map(
      (m) => `
      <div class="related-card" data-imdbid="${m.imdbID}">
        <img src="${m.Poster !== "N/A" ? m.Poster : placeholderImg}">
        <div class="info">
          <p class="title">${m.Title}</p>
          <p class="meta">${m.Year}</p>
        </div>
      </div>
    `
    )
    .join("");
};



searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (searchInput.value.trim()) fetchMovies(searchInput.value.trim());
});

resultsEl.addEventListener("click", async (e) => {
  const detailsBtn = e.target.closest("[data-imdbid]");
  const watchBtn = e.target.closest("[data-watchlist]");

  if (detailsBtn) {
    const movie = await fetchDetails(detailsBtn.dataset.imdbid);
    if (movie) openModal(movie);
  }

  if (watchBtn) {
    const id = watchBtn.dataset.watchlist;
    const movie = currentMovies.find((m) => m.imdbID === id);
    if (!movie) return;

    isInWatchlist(id)
      ? (watchlist = watchlist.filter((m) => m.imdbID !== id))
      : watchlist.push(movie);

    saveWatchlist();
  }
});

relatedList.addEventListener("click", async (e) => {
  const card = e.target.closest(".related-card");
  if (!card) return;
  const movie = await fetchDetails(card.dataset.imdbid);
  if (movie) openModal(movie);
});

modalWatchlistBtn.addEventListener("click", () => {
  if (!currentModalMovie) return;
  const id = currentModalMovie.imdbID;

  isInWatchlist(id)
    ? (watchlist = watchlist.filter((m) => m.imdbID !== id))
    : watchlist.push(currentModalMovie);

  saveWatchlist();
  modalWatchlistBtn.textContent = isInWatchlist(id)
    ? "Remove from Watchlist"
    : "Add to Watchlist";
});

closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => e.target === modal && closeModal());

watchlistBadge.addEventListener("click", () =>
  watchlistPanel.classList.toggle("hidden")
);

closeWatchlistBtn.addEventListener("click", () =>
  watchlistPanel.classList.add("hidden")
);

watchlistItems.addEventListener("click", (e) => {
  const btn = e.target.closest(".watchlist-remove");
  if (!btn) return;
  watchlist = watchlist.filter((m) => m.imdbID !== btn.dataset.removeId);
  saveWatchlist();
});




genreGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".genre-card");
  if (!card) return;

  document
    .querySelectorAll(".genre-card")
    .forEach((c) => c.classList.remove("active"));

  card.classList.add("active");
  searchInput.value = card.dataset.genre;
  fetchMovies(card.dataset.genre);
  resultsEl.scrollIntoView({ behavior: "smooth" });
});




if (homeLogo) {
  homeLogo.addEventListener("click", () => {
    closeModal();
    searchInput.value = "";
    lastQuery = "";
    currentMovies = [];
    lastSearchResults = [];

    setStatus("Search for movies to begin.");
    watchlistPanel.classList.add("hidden");

    document
      .querySelectorAll(".genre-card")
      .forEach((card) => card.classList.remove("active"));

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

loadWatchlist();
setStatus("Search for movies to begin.");
