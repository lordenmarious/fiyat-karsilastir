// Content script for Akakçe Hover Extension v2.2
// Cross-browser compatible (Firefox & Chrome)

(function () {
    'use strict';

    // Cross-browser API
    const api = typeof browser !== 'undefined' ? browser : chrome;

    let currentTitle = "";
    let tooltipContainer = null;
    let lastHoveredItem = null;
    let hoverTimeout = null;
    let akakcePopup = null;

    const SETTINGS = {
        hoverDelay: 600,
        popupWidth: 450,
        popupHeight: 700
    };

    const SITE_CONFIG = {
        'amazon.com.tr': {
            productTitle: '#productTitle',
            listingItem: '.s-result-item[data-asin], .s-result-item.s-asin',
            listingTitle: 'h2 a, .a-link-normal .a-text-normal'
        },
        'trendyol.com': {
            productTitle: 'h1.product-title, h1.pr-new-br, h1[class*="product"]',
            listingItem: '.p-card-wrppr, [data-id]',
            listingTitle: '.prdct-desc-cntnr-name span'
        },
        'hepsiburada.com': {
            productTitle: 'h1',
            listingItem: '[data-test-id="product-card"]',
            listingTitle: 'h3, [data-test-id="product-card-name"]'
        }
    };

    function getCurrentSite() {
        const hostname = window.location.hostname;
        for (const site in SITE_CONFIG) {
            if (hostname.includes(site)) {
                return { config: SITE_CONFIG[site], name: site };
            }
        }
        return { config: SITE_CONFIG['amazon.com.tr'], name: 'amazon.com.tr' };
    }

    const { config, name: siteName } = getCurrentSite();

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    function onReady() {
        setTimeout(() => {
            setupListingHovers();
            checkProduct();
        }, 2000);

        const observer = new MutationObserver(() => {
            setupListingHovers();
            checkProduct();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        if (api && api.runtime) {
            api.runtime.onMessage.addListener((request) => {
                if (request.action === "OPEN_AKAKCE") {
                    triggerAkakceSearch();
                }
            });
        }
    }

    function setupListingHovers() {
        const items = document.querySelectorAll(config.listingItem);

        items.forEach(item => {
            if (item.dataset.akakceInit) return;
            item.dataset.akakceInit = "1";

            item.addEventListener('mouseenter', () => {
                const titleEl = item.querySelector(config.listingTitle);
                if (titleEl && titleEl.innerText) {
                    const title = titleEl.innerText.trim();
                    if (!title) return;

                    clearTimeout(hoverTimeout);
                    hoverTimeout = setTimeout(() => {
                        if (lastHoveredItem === title) return;
                        lastHoveredItem = title;

                        const rect = titleEl.getBoundingClientRect();
                        showTooltip(title, {
                            x: rect.left + window.scrollX,
                            y: rect.bottom + window.scrollY + 8
                        });
                    }, SETTINGS.hoverDelay);
                }
            });

            item.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
            });
        });
    }

    function checkProduct() {
        const titleEl = document.querySelector(config.productTitle);
        if (!titleEl) return;

        const rawTitle = titleEl.innerText.trim();
        if (!rawTitle || rawTitle === currentTitle) return;
        currentTitle = rawTitle;

        const searchQuery = cleanProductTitle(rawTitle);
        showFloatingButton(searchQuery, rawTitle);
    }

    function triggerAkakceSearch() {
        const titleEl = document.querySelector(config.productTitle);
        if (titleEl) {
            const url = `https://www.akakce.com/arama/?q=${encodeURIComponent(cleanProductTitle(titleEl.innerText.trim()))}`;
            openAkakcePopup(url);
        }
    }

    function showFloatingButton(searchQuery, fullTitle) {
        if (!searchQuery) return;

        const searchUrl = `https://www.akakce.com/arama/?q=${encodeURIComponent(searchQuery)}`;

        // Create container
        let container = document.getElementById('akakce-buttons');
        if (!container) {
            container = document.createElement('div');
            container.id = 'akakce-buttons';
            container.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 10000000;
            `;
            document.body.appendChild(container);
        }

        // Search button
        let searchBtn = document.getElementById('akakce-float-btn');
        if (!searchBtn) {
            searchBtn = document.createElement('div');
            searchBtn.id = 'akakce-float-btn';
            searchBtn.className = 'akakce-float-button';
            container.appendChild(searchBtn);
        }
        searchBtn.innerHTML = `
            <div class="akakce-btn-icon">🔍</div>
            <div class="akakce-btn-text">Akakçe'de<br>Karşılaştır</div>
        `;
        searchBtn.onclick = () => openAkakcePopup(searchUrl);

        // Favorite button
        let favBtn = document.getElementById('akakce-fav-btn');
        if (!favBtn) {
            favBtn = document.createElement('div');
            favBtn.id = 'akakce-fav-btn';
            favBtn.className = 'akakce-float-button akakce-fav-button';
            container.appendChild(favBtn);
        }

        // Check if already favorite
        api.runtime.sendMessage({
            action: "IS_FAVORITE",
            title: fullTitle
        }).then((response) => {
            updateFavButton(favBtn, response.isFavorite, fullTitle, searchQuery);
        }).catch(() => {
            updateFavButton(favBtn, false, fullTitle, searchQuery);
        });
    }

    function updateFavButton(btn, isFavorite, fullTitle, searchQuery) {
        if (isFavorite) {
            btn.innerHTML = `
                <div class="akakce-btn-icon">⭐</div>
                <div class="akakce-btn-text">Favoride</div>
            `;
            btn.classList.add('is-favorite');
        } else {
            btn.innerHTML = `
                <div class="akakce-btn-icon">☆</div>
                <div class="akakce-btn-text">Favoriye<br>Ekle</div>
            `;
            btn.classList.remove('is-favorite');
        }

        btn.onclick = () => {
            if (btn.classList.contains('is-favorite')) {
                // Remove from favorites
                api.runtime.sendMessage({
                    action: "IS_FAVORITE",
                    title: fullTitle
                }).then((r) => {
                    api.runtime.sendMessage({
                        action: "REMOVE_FAVORITE",
                        id: r.id
                    }).then(() => {
                        updateFavButton(btn, false, fullTitle, searchQuery);
                    });
                });
            } else {
                // Add to favorites
                api.runtime.sendMessage({
                    action: "ADD_FAVORITE",
                    product: {
                        title: fullTitle,
                        searchQuery: searchQuery,
                        site: siteName,
                        url: window.location.href
                    }
                }).then(() => {
                    updateFavButton(btn, true, fullTitle, searchQuery);
                });
            }
        };
    }

    function showTooltip(query, pos) {
        const searchUrl = `https://www.akakce.com/arama/?q=${encodeURIComponent(cleanProductTitle(query))}`;

        let div = document.getElementById('akakce-tooltip');
        if (!div) {
            div = document.createElement('div');
            div.id = 'akakce-tooltip';
            div.className = 'akakce-tooltip';
            document.body.appendChild(div);
        }

        div.style.left = `${pos.x}px`;
        div.style.top = `${pos.y}px`;
        div.style.display = 'block';

        div.innerHTML = `
            <div class="akakce-tooltip-content">
                <span class="akakce-tooltip-icon">🔍</span>
                <span>Akakçe'de Ara</span>
            </div>
        `;
        div.onclick = () => openAkakcePopup(searchUrl);

        tooltipContainer = div;
    }

    function openAkakcePopup(url) {
        const width = SETTINGS.popupWidth;
        const height = SETTINGS.popupHeight;
        const left = window.screenX + window.outerWidth - width - 50;
        const top = window.screenY + 100;

        if (akakcePopup && !akakcePopup.closed) akakcePopup.close();

        akakcePopup = window.open(url, 'AkakcePopup',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);

        if (akakcePopup) akakcePopup.focus();
    }

    init();
})();
