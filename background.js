// Background script for Akakçe Hover Extension v2.2
// Cross-browser compatible (Firefox & Chrome)

// Cross-browser API
const api = typeof browser !== 'undefined' ? browser : chrome;

// Load favorites from storage on startup
let favorites = {};

async function loadFavorites() {
    try {
        const result = await api.storage.local.get({ favorites: {} });
        favorites = result.favorites || {};
        console.log("Akakce: Loaded favorites:", Object.keys(favorites).length);
    } catch (e) {
        console.error("Akakce: Error loading favorites:", e);
        favorites = {};
    }
}

async function saveFavorites() {
    try {
        await api.storage.local.set({ favorites });
        console.log("Akakce: Saved favorites:", Object.keys(favorites).length);
    } catch (e) {
        console.error("Akakce: Error saving favorites:", e);
    }
}

// Initialize
loadFavorites();

// Handle keyboard shortcut (Alt+A)
api.commands.onCommand.addListener((command) => {
    if (command === "open-akakce") {
        api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs[0]) {
                api.tabs.sendMessage(tabs[0].id, { action: "OPEN_AKAKCE" });
            }
        });
    }
});

// Handle messages
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ADD_FAVORITE") {
        const id = generateId(request.product.title);
        favorites[id] = {
            id,
            title: request.product.title,
            searchQuery: request.product.searchQuery,
            site: request.product.site,
            url: request.product.url,
            addedAt: Date.now(),
            lastChecked: null
        };
        saveFavorites();
        console.log("Akakce: Favorite added:", id);
        sendResponse({ success: true, id });
        return true;
    }

    if (request.action === "REMOVE_FAVORITE") {
        delete favorites[request.id];
        saveFavorites();
        console.log("Akakce: Favorite removed:", request.id);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "GET_FAVORITES") {
        sendResponse({ favorites });
        return true;
    }

    if (request.action === "IS_FAVORITE") {
        const id = generateId(request.title);
        sendResponse({ isFavorite: !!favorites[id], id });
        return true;
    }

    if (request.action === "PING") {
        sendResponse({ status: "OK" });
        return true;
    }

    return false;
});

function generateId(title) {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
        const char = title.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'fav_' + Math.abs(hash).toString(36);
}

console.log("Akakce Hover background script loaded v2.2 (cross-browser)");
