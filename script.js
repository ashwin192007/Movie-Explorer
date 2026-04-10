document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://ghibliapi.vercel.app/films';

    let allMovies = [];
    let favoriteIds = new Set(JSON.parse(localStorage.getItem('ghibli_favorites') || '[]'));

    const elements = {
        movieGrid: document.getElementById('movie-grid'),
        loadingState: document.getElementById('loading-state'),
        errorState: document.getElementById('error-state'),
        noResults: document.getElementById('no-results'),
        searchInput: document.getElementById('search-input'),
        directorFilter: document.getElementById('filter-director'),
        sortSelect: document.getElementById('sort-select'),
        themeToggle: document.getElementById('theme-toggle')
    };

    const init = async () => {
        initTheme();
        await fetchMovies();
        setupEventListeners();
    };

    const fetchMovies = async () => {
        try {
            showLoading(true);
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('API failed to load');

            allMovies = await response.json();

            populateDirectorFilter();
            renderMovies(allMovies);
        } catch (error) {
            console.error('Error fetching movies:', error);
            showError();
        } finally {
            showLoading(false);
        }
    };

    const populateDirectorFilter = () => {
        const directors = [...new Set(allMovies.map(movie => movie.director))].sort();

        const optionsHtml = directors
            .map(dir => `<option value="${dir}">${dir}</option>`)
            .join('');

        elements.directorFilter.innerHTML += optionsHtml;
    };

    const updateDisplay = () => {
        const searchTerm = elements.searchInput.value.toLowerCase().trim();
        const selectedDirector = elements.directorFilter.value;
        const sortValue = elements.sortSelect.value;

        let displayMovies = allMovies.filter(movie => {
            const matchesSearch = movie.title.toLowerCase().includes(searchTerm) ||
                movie.description.toLowerCase().includes(searchTerm);

            const matchesDirector = selectedDirector === 'all' || movie.director === selectedDirector;

            return matchesSearch && matchesDirector;
        });

        if (sortValue !== 'default') {
            displayMovies = displayMovies.sort((a, b) => {
                switch (sortValue) {
                    case 'year-asc':
                        return parseInt(a.release_date) - parseInt(b.release_date);
                    case 'year-desc':
                        return parseInt(b.release_date) - parseInt(a.release_date);
                    case 'time-asc':
                        return parseInt(a.running_time) - parseInt(b.running_time);
                    case 'time-desc':
                        return parseInt(b.running_time) - parseInt(a.running_time);
                    default:
                        return 0;
                }
            });
        }

        renderMovies(displayMovies);
    };

    const renderMovies = (movies) => {
        if (movies.length === 0) {
            elements.movieGrid.classList.add('hidden');
            elements.noResults.classList.remove('hidden');
            elements.movieGrid.innerHTML = '';
            return;
        }

        elements.noResults.classList.add('hidden');
        elements.movieGrid.classList.remove('hidden');

        const html = movies.map((movie, index) => {
            const isFav = favoriteIds.has(movie.id);
            const delay = (index % 12) * 0.05;

            return `
                <article class="movie-card" style="animation-delay: ${delay}s">
                    <div class="movie-header">
                        <img src="${movie.image}" alt="${movie.title} Banner" class="movie-banner" loading="lazy" onerror="this.src='https://via.placeholder.com/600x400/1e293b/FFFFFF?text=No+Image'">
                        <span class="movie-year">${movie.release_date}</span>
                        <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${movie.id}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
                            <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
                        </button>
                    </div>
                    <div class="movie-content">
                        <h2 class="movie-title">${movie.title}</h2>
                        <div class="movie-director">${movie.director}</div>
                        <p class="movie-desc">${movie.description}</p>
                        <div class="movie-meta">
                            <div class="meta-item">
                                <i class="fa-regular fa-clock"></i>
                                <span>${movie.running_time} min</span>
                            </div>
                            <div class="meta-item" style="color: #f59e0b;">
                                <i class="fa-solid fa-star"></i>
                                <span>${movie.rt_score} Score</span>
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        elements.movieGrid.innerHTML = html;
    };

    const setupEventListeners = () => {
        elements.searchInput.addEventListener('input', updateDisplay);
        elements.directorFilter.addEventListener('change', updateDisplay);
        elements.sortSelect.addEventListener('change', updateDisplay);

        elements.movieGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.favorite-btn');
            if (!btn) return;

            const movieId = btn.dataset.id;

            if (favoriteIds.has(movieId)) {
                favoriteIds.delete(movieId);
                btn.classList.remove('active');
                btn.querySelector('i').classList.replace('fa-solid', 'fa-regular');
                btn.setAttribute('aria-label', 'Add to favorites');
            } else {
                favoriteIds.add(movieId);
                btn.classList.add('active');
                btn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
                btn.setAttribute('aria-label', 'Remove from favorites');
            }

            localStorage.setItem('ghibli_favorites', JSON.stringify([...favoriteIds]));
        });

        elements.themeToggle.addEventListener('click', () => {
            const isDark = document.body.dataset.theme === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.body.dataset.theme = newTheme;

            const icon = elements.themeToggle.querySelector('i');
            if (newTheme === 'dark') {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }

            localStorage.setItem('ghibli_theme', newTheme);
        });
    };

    const showLoading = (show) => {
        if (show) {
            elements.loadingState.classList.remove('hidden');
            elements.movieGrid.classList.add('hidden');
            elements.errorState.classList.add('hidden');
        } else {
            elements.loadingState.classList.add('hidden');
        }
    };

    const showError = () => {
        elements.errorState.classList.remove('hidden');
        elements.movieGrid.classList.add('hidden');
    };

    const initTheme = () => {
        const savedTheme = localStorage.getItem('ghibli_theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.dataset.theme = 'dark';
            elements.themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
    };

    init();
});