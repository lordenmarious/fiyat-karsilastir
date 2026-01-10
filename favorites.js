/**
 * Favorites Management Script
 * Version 2.2 - Full Page Dashboard
 */

const api = typeof browser !== 'undefined' ? browser : chrome;

// State
let currentView = 'list';
let currentSort = 'date-desc';
let searchQuery = '';
let favoritesData = {};

// Elements
const container = document.getElementById('favorites-container');
const emptyState = document.getElementById('empty-state');
const countText = document.getElementById('count-text');
const listViewBtn = document.getElementById('list-view-btn');
const gridViewBtn = document.getElementById('grid-view-btn');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');

// Debounce utility
function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadFavorites();

    // Sort change handler
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        api.storage.local.set({ favoritesSort: currentSort });
        renderFavorites(favoritesData);
    });

    // Search handlers
    const debouncedSearch = debounce(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        renderFavorites(favoritesData);
    }, 200);

    searchInput.addEventListener('input', debouncedSearch);

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFavorites(favoritesData);
        searchInput.focus();
    });

    // Theme toggle handlers
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        api.storage.local.set({ theme: theme });
    }

    // Load saved theme or use system preference
    api.storage.local.get({ theme: null }).then(result => {
        if (result.theme) {
            setTheme(result.theme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }).catch(() => {
        // Fallback for non-extension context
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // View Switching
    listViewBtn.addEventListener('click', () => setView('list'));
    gridViewBtn.addEventListener('click', () => setView('grid'));

    function setView(view) {
        currentView = view;
        container.className = `${view}-container`;

        const isList = view === 'list';
        listViewBtn.classList.toggle('active', isList);
        gridViewBtn.classList.toggle('active', !isList);

        listViewBtn.setAttribute('aria-pressed', isList);
        gridViewBtn.setAttribute('aria-pressed', !isList);

        api.storage.local.set({ favoritesView: view });
        renderFavorites(favoritesData);
    }

    function loadSettings() {
        api.storage.local.get({ favoritesView: 'list', favoritesSort: 'date-desc' }).then(result => {
            if (result.favoritesView) {
                setView(result.favoritesView);
            }
            if (result.favoritesSort) {
                currentSort = result.favoritesSort;
                sortSelect.value = currentSort;
            }
        });
    }

    function loadFavorites() {
        api.runtime.sendMessage({ action: "GET_FAVORITES" }).then((response) => {
            if (response && response.favorites) {
                favoritesData = response.favorites;
                renderFavorites(favoritesData);
            }
        }).catch(err => {
            console.error('Favorites loading failed:', err);
        });
    }

    function renderFavorites(favorites) {
        let items = sortItems(Object.values(favorites));
        const totalCount = items.length;

        // Apply search filter
        if (searchQuery) {
            items = items.filter(item => {
                const title = (item.title || '').toLowerCase();
                const site = (item.site || '').toLowerCase();
                return title.includes(searchQuery) || site.includes(searchQuery);
            });
        }

        // Update count text
        if (searchQuery) {
            countText.textContent = `${items.length} / ${totalCount} ürün eşleşiyor`;
        } else {
            countText.textContent = `${totalCount} adet kayıtlı ürün bulundu`;
        }

        // No favorites at all
        if (totalCount === 0) {
            emptyState.style.display = 'block';
            container.style.display = 'none';
            return;
        }

        // Has favorites but no search results
        if (items.length === 0 && searchQuery) {
            emptyState.style.display = 'none';
            container.style.display = currentView === 'list' ? 'flex' : 'grid';
            container.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>"<strong>${searchQuery}</strong>" için sonuç bulunamadı</p>
            </div>
        `;
            return;
        }

        emptyState.style.display = 'none';
        container.style.display = currentView === 'list' ? 'flex' : 'grid';

        container.innerHTML = items.map(item => `
        <div class="favorite-card" data-id="${item.id}">
            <button class="delete-btn" data-id="${item.id}" title="Listeden Kaldır" aria-label="${item.title} favorilerden kaldır">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
            <div class="card-icon">
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" onerror="this.onerror=null; this.parentElement.innerHTML='${getSiteEmoji(item.site)}';">` : getSiteEmoji(item.site)}
            </div>
            <div class="card-content">
                <div class="card-title" title="${item.title}">${item.title}</div>
                <div class="card-meta">
                    <span class="site-tag">${item.site}</span>
                    <span class="dot">•</span>
                    <span class="date-tag">${formatDate(item.addedAt)}</span>
                </div>
                <div class="card-actions">
                    <a href="https://www.akakce.com/arama/?q=${encodeURIComponent(item.searchQuery)}" target="_blank" class="action-btn btn-compare">Fiyat Karşılaştır</a>
                    <a href="${item.url}" target="_blank" class="action-btn btn-store">Ürün Sayfası</a>
                </div>
            </div>
        </div>
    `).join('');

        // Attach Delete Events
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (confirm('Bu ürünü favorilerinizden kaldırmak istediğinize emin misiniz?')) {
                    api.runtime.sendMessage({ action: "REMOVE_FAVORITE", id }).then(() => {
                        loadFavorites();
                    });
                }
            });
        });
    }

    function getSiteEmoji(site) {
        if (!site) return '📦';
        const s = site.toLowerCase();
        if (s.includes('amazon')) return '🅰️';
        if (s.includes('trendyol')) return '🟠';
        if (s.includes('hepsiburada')) return '🛍️';
        return '📦';
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Bilinmiyor';
        const date = new Date(timestamp);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function sortItems(items) {
        switch (currentSort) {
            case 'date-desc':
                return items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
            case 'date-asc':
                return items.sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
            case 'name-asc':
                return items.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
            case 'name-desc':
                return items.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'tr'));
            case 'site':
                return items.sort((a, b) => {
                    const siteCompare = (a.site || '').localeCompare(b.site || '', 'tr');
                    if (siteCompare !== 0) return siteCompare;
                    return (b.addedAt || 0) - (a.addedAt || 0); // Same site: sort by date
                });
            default:
                return items;
        }
    }
});
