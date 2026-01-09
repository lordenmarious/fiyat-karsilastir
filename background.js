// Background script for Fiyat Karşılaştır v2.3
// Cross-browser compatible (Firefox & Chrome)

// Cross-browser API
const api = typeof browser !== 'undefined' ? browser : chrome;

// Load favorites from storage on startup
let favorites = {};

async function loadFavorites() {
    try {
        const result = await api.storage.local.get({ favorites: {} });
        favorites = result.favorites || {};
        console.log("Hover Price: Loaded favorites:", Object.keys(favorites).length);
    } catch (e) {
        console.error("Hover Price: Error loading favorites:", e);
        favorites = {};
    }
}

async function saveFavorites() {
    try {
        await api.storage.local.set({ favorites });
        console.log("Hover Price: Saved favorites:", Object.keys(favorites).length);
    } catch (e) {
        console.error("Hover Price: Error saving favorites:", e);
    }
}

// Initialize
loadFavorites();

// Show onboarding page on first install
api.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // First time installation - show onboarding
        api.storage.local.get({ onboardingSeen: false }).then((result) => {
            if (!result.onboardingSeen) {
                api.tabs.create({ url: api.runtime.getURL('onboarding.html') });
            }
        });
    } else if (details.reason === 'update') {
        // Extension updated - optionally show what's new
        console.log('Fiyat Karşılaştır updated to v2.3');
    }
});

// Handle keyboard shortcut (Alt+A)
api.commands.onCommand.addListener((command) => {
    if (command === "open-comparison") {
        api.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs[0]) {
                api.tabs.sendMessage(tabs[0].id, { action: "OPEN_COMPARISON" });
            }
        });
    }
});

// Handle messages
api.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Using an async self-executing function to handle messages robustly
    (async () => {
        try {
            if (request.action === "ADD_FAVORITE") {
                const id = generateId(request.product.title);
                favorites[id] = {
                    id,
                    title: request.product.title,
                    searchQuery: request.product.searchQuery,
                    site: request.product.site,
                    url: request.product.url,
                    imageUrl: request.product.imageUrl || '',
                    addedAt: Date.now(),
                    lastChecked: null
                };
                await saveFavorites();
                console.log("Hover Price: Favorite added:", id);
                sendResponse({ success: true, id });
            } else if (request.action === "REMOVE_FAVORITE") {
                delete favorites[request.id];
                await saveFavorites();
                console.log("Hover Price: Favorite removed:", request.id);
                sendResponse({ success: true });
            } else if (request.action === "GET_FAVORITES") {
                sendResponse({ favorites });
            } else if (request.action === "IS_FAVORITE") {
                const id = generateId(request.title);
                sendResponse({ isFavorite: !!favorites[id], id });
            } else if (request.action === "PING") {
                sendResponse({ status: "OK" });
            } else {
                sendResponse({ error: "Unknown action" });
            }
        } catch (error) {
            console.error("Hover Price: Message handling error:", error);
            sendResponse({ error: error.message });
        }
    })();

    return true; // Keep the message channel open for the async response
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

console.log("Fiyat Karşılaştır background script loaded v2.3 (cross-browser)");
