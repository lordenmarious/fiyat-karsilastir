// Favorites Popup Script
// Cross-browser compatible

const api = typeof browser !== 'undefined' ? browser : chrome;

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const countEl = document.getElementById('count');

document.addEventListener('DOMContentLoaded', loadFavorites);

function loadFavorites() {
    api.runtime.sendMessage({ action: "GET_FAVORITES" }).then((response) => {
        if (response && response.favorites) {
            renderFavorites(response.favorites);
        }
    }).catch((e) => {
        console.error('Error loading favorites:', e);
    });
}

function renderFavorites(favorites) {
    const items = Object.values(favorites);
    countEl.textContent = items.length;

    if (items.length === 0) {
        emptyEl.style.display = 'block';
        listEl.innerHTML = '';
        return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = items.map(item => `
        <div class="favorite-item" data-id="${item.id}">
            <div class="fav-info" title="${item.title}">
                <div class="fav-title">${item.title}</div>
                <div class="fav-site">${item.site} • ${formatDate(item.addedAt)}</div>
            </div>
            <button class="fav-delete" data-id="${item.id}" title="Sil">🗑️</button>
        </div>
    `).join('');

    // Click to open Akakçe
    listEl.querySelectorAll('.fav-info').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.parentElement.dataset.id;
            const item = favorites[id];
            if (item) {
                api.tabs.create({
                    url: `https://www.akakce.com/arama/?q=${encodeURIComponent(item.searchQuery)}`
                });
            }
        });
    });

    // Delete button
    listEl.querySelectorAll('.fav-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            api.runtime.sendMessage({ action: "REMOVE_FAVORITE", id }).then(() => {
                loadFavorites();
            });
        });
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}
