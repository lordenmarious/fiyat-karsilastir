// Content script for Hover Price Extension v2.2
// Cross-browser compatible (Firefox & Chrome)

(function () {
    'use strict';

    // Cross-browser API
    const api = typeof browser !== 'undefined' ? browser : chrome;

    let currentTitle = "";
    let tooltipContainer = null;
    let lastHoveredItem = null; // Keeps track of the title
    let lastHoveredDOMElement = null; // Keeps track of the DOM element
    let hoverTimeout = null;
    let externalPopup = null;

    const SETTINGS = {
        hoverDelay: 600,
        popupWidth: 450,
        popupHeight: 700
    };

    const SITE_CONFIG = {
        'amazon.com.tr': {
            productTitle: '#productTitle',
            productImage: '#landingImage, #imgBlkFront',
            listingItem: '.s-result-item[data-asin], .a-carousel-card, .deal-tile, .bxc-grid__column .a-card-ui',
            listingTitle: 'h2 a, .a-link-normal .a-text-normal, .deal-title, .a-truncate-cut',
            isListingPage: () => {
                const path = window.location.pathname;
                const search = window.location.search;
                // Arama sayfaları (/s?k=...), deal sayfaları, bestseller, new releases
                if (path === '/s' || path.startsWith('/s/') || search.includes('k=')) return true;
                if (path.includes('/deals') || path.includes('/bestsellers') || path.includes('/new-releases')) return true;
                // Ürün sayfası /dp/ veya /gp/product/ içerir
                if (path.includes('/dp/') || path.includes('/gp/product/')) return false;
                return false;
            }
        },
        'trendyol.com': {
            productTitle: 'h1.product-title, h1.pr-new-br, h1[class*="product"]',
            productImage: '.product-image, .product-container img, .gallery-container img',
            listingItem: '.p-card-wrppr, [data-id], .widget-product',
            listingTitle: '.prdct-desc-cntnr-name span, .product-name',
            isListingPage: () => {
                const path = window.location.pathname;
                // Ürün sayfası: /marka/urun-adi-p-12345 formatında
                if (path.match(/-p-\d+$/)) return false;
                // Diğer her şey listeleme
                return true;
            }
        },
        'hepsiburada.com': {
            productTitle: 'h1',
            productImage: 'img[data-img-name="product-image"], .product-image-wrapper img, img[data-test-id="main-product-image"]',
            listingItem: '[data-test-id="product-card"], .productListContent-item',
            listingTitle: 'h3, [data-test-id="product-card-name"]',
            isListingPage: () => {
                const path = window.location.pathname;
                // Arama sayfası /ara?q=...
                if (path.startsWith('/ara')) return true;
                // Kategori sayfaları
                if (path.includes('/kategori/') || path.includes('/butik/')) return true;
                // Ürün sayfası: /-p- içeren URL'ler
                if (path.includes('-p-')) return false;
                return false;
            }
        },
        'itopya.com': {
            productTitle: '#product-details h1, .product-details-title',
            productImage: '.swiper-slide-active img, #product-details img',
            listingItem: '.product-block, .product-item, .slider-item',
            listingTitle: '.title, .product-name',
            isListingPage: () => {
                const path = window.location.pathname;
                // Arama sayfası
                if (path.includes('/arama') || path.includes('/search')) return true;
                // Kategori sayfaları
                if (path.includes('/kategori/') || path.includes('/urunler/')) return true;
                // Ürün sayfası genellikle /urun/ içerir veya product-details elementi vardır
                if (document.querySelector('#product-details')) return false;
                return true;
            }
        },
        'vatanbilgisayar.com': {
            productTitle: 'h1.product-list__product-name',
            productImage: '.swiper-slide-active img, .wrapper-main-slider__image',
            listingItem: '.product-list, .swiper-slide .product-list',
            listingTitle: '.product-list__product-name, h3',
            isListingPage: () => {
                const path = window.location.pathname;
                // Arama ve kategori sayfaları
                if (path.includes('/arama/') || path.includes('/kategori/')) return true;
                // Ürün sayfası genellikle product-id ile biter veya ürün detayları içerir
                if (document.querySelector('.product-list__content')) return false;
                return true;
            }
        },
        'teknosa.com': {
            productTitle: 'h1.pdp-title',
            productImage: '#pdp-gallery .swiper-slide-active img',
            listingItem: '.product-item, .pds, .owl-item .product-item',
            listingTitle: '.prd-title-m',
            isListingPage: () => {
                const path = window.location.pathname;
                // Arama ve kategori sayfaları
                if (path.includes('/arama') || path.includes('/kategori/')) return true;
                // Ürün sayfası: pdp-title elementi varsa detay sayfasıdır
                if (document.querySelector('h1.pdp-title')) return false;
                return true;
            }
        },
        'incehesap.com': {
            productTitle: 'h1',
            productImage: 'img.zoomImageThumb, .swiper-slide-active img',
            listingItem: 'a.product, a.h-full.block.relative[href*="-fiyati-"]',
            listingTitle: 'p.font-semibold',
            useTitleAttribute: true,
            isListingPage: () => {
                const path = window.location.pathname;
                // Gaming gecesi, kampanya sayfaları, kategori sayfaları
                if (path.includes('gaming-geceleri') || path.includes('kampanya') || path.includes('kategori')) {
                    return true;
                }
                // URL içinde "-fiyati-" yoksa liste sayfasıdır
                if (!path.includes('-fiyati-')) {
                    return true;
                }
                return false;
            }
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
        // Debug log to verify injection
        console.log('[Fiyat Karşılaştır] Content script started for:', siteName);

        // Initial check with extended retry
        checkProductWithRetry(0);

        // Setup event delegation
        setupDelegatedListeners();

        // Mutation observer for SPA changes (Debounced)
        let observerTimeout;
        const observer = new MutationObserver(() => {
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                checkProduct();
            }, 500); // 500ms debounce
        });
        observer.observe(document.body, { childList: true, subtree: true });

        if (api && api.runtime) {
            api.runtime.onMessage.addListener((request) => {
                if (request.action === "OPEN_COMPARISON") {
                    triggerSearch();
                }
            });
        }
    }

    function setupDelegatedListeners() {
        // Event delegation using mouseover (enters) and mouseout (leaves)
        // This avoids querySelectorAll and attaching thousands of listeners
        // Optimization: Reduces memory usage and CPU overhead during DOM mutations (infinite scroll)

        document.body.addEventListener('mouseover', (e) => {
            // Optimization: If we are already hovering the current item, ignore.
            // This avoids expensive closest() calls when moving mouse *within* the same card.
            if (lastHoveredDOMElement && lastHoveredDOMElement.contains(e.target)) return;

            const item = e.target.closest(config.listingItem);
            if (!item) return;

            // Handle enter
            if (item !== lastHoveredDOMElement) {
                if (lastHoveredDOMElement) {
                    handleMouseLeave(lastHoveredDOMElement);
                }
                lastHoveredDOMElement = item;
                handleMouseEnter(item);
            }
        });

        document.body.addEventListener('mouseout', (e) => {
            // Optimization: If we aren't tracking an item, we don't care about mouseout.
            if (!lastHoveredDOMElement) return;

            // Optimization: Check if we are still inside the tracked item.
            // e.target is the element we left. If it's not part of the tracked item, ignore.
            if (!lastHoveredDOMElement.contains(e.target)) return;

            // Optimization: Check if we moved to something that is STILL inside the tracked item.
            // e.relatedTarget is where the mouse went.
            if (lastHoveredDOMElement.contains(e.relatedTarget)) return;

            // If we are here, we genuinely left the tracked item.
            handleMouseLeave(lastHoveredDOMElement);
            lastHoveredDOMElement = null;
        });
    }

    function handleMouseEnter(item) {
        let title = '';

        // Önce title attribute'u kontrol et (kategori sayfaları için)
        if (config.useTitleAttribute && item.hasAttribute('title')) {
            title = item.getAttribute('title').trim();
        }

        // Fallback: Gaming Gecesi için nested p tag veya listingTitle seçicisi
        if (!title) {
            const titleEl = item.querySelector(config.listingTitle);
            if (titleEl && titleEl.innerText) {
                title = titleEl.innerText.trim();
            }
        }

        if (!title) return;

        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            if (lastHoveredItem === title) return;
            lastHoveredItem = title;

            // Find the best element for positioning (image or title)
            let targetEl = item.querySelector('img');
            if (!targetEl) {
                targetEl = item.querySelector(config.listingTitle);
            }
            if (!targetEl) {
                targetEl = item;
            }

            const rect = targetEl.getBoundingClientRect();
            showTooltip(title, {
                x: rect.left,
                y: rect.bottom + 8
            });
        }, SETTINGS.hoverDelay);
    }

    function handleMouseLeave(item) {
        clearTimeout(hoverTimeout);
    }

    function checkProductWithRetry(attempt) {
        if (attempt > 5) return; // Stop after 5 attempts (approx 2.5 sec)

        const titleEl = document.querySelector(config.productTitle);
        if (titleEl && titleEl.innerText.trim().length > 0) {
            checkProduct();
        } else {
            setTimeout(() => checkProductWithRetry(attempt + 1), 500);
        }
    }

    function checkProduct() {
        // Listeleme sayfalarında floating button gösterme
        if (config.isListingPage && config.isListingPage()) {
            console.log('[Fiyat Karşılaştır] Listing page detected, skipping floating button');
            return;
        }

        const titleEl = document.querySelector(config.productTitle);
        if (!titleEl) return;

        const rawTitle = titleEl.innerText.trim();
        if (!rawTitle || rawTitle === currentTitle) return;
        currentTitle = rawTitle;

        const searchQuery = cleanProductTitle(rawTitle);
        showFloatingButton(searchQuery, rawTitle);
    }

    function triggerSearch() {
        const titleEl = document.querySelector(config.productTitle);
        if (titleEl) {
            const rawTitle = titleEl.innerText.trim();
            const query = cleanProductTitle(rawTitle);
            // Kategori filtreli URL oluştur
            const url = buildAkakceUrl(rawTitle, query);
            openPopup(url);
        }
    }

    function showFloatingButton(searchQuery, fullTitle) {
        if (!searchQuery) return;

        // Cleanup old elements if they exist
        const oldContainer = document.getElementById('hp-buttons');
        if (oldContainer) oldContainer.remove();

        // Kategori filtreli URL oluştur
        const searchUrl = buildAkakceUrl(fullTitle, searchQuery);

        // Create container
        let container = document.getElementById('hp-buttons');
        if (!container) {
            container = document.createElement('div');
            container.id = 'hp-buttons';
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
        let searchBtn = document.getElementById('hp-float-btn');
        if (!searchBtn) {
            searchBtn = document.createElement('div');
            searchBtn.id = 'hp-float-btn';
            searchBtn.className = 'hp-float-button';
            container.appendChild(searchBtn);
        }
        searchBtn.innerHTML = `
            <div class="hp-btn-icon">🔍</div>
            <div class="hp-btn-text">Fiyat<br>Karşılaştır</div>
        `;
        searchBtn.onclick = () => openPopup(searchUrl);

        // Favorite button
        let favBtn = document.getElementById('hp-fav-btn');
        if (!favBtn) {
            favBtn = document.createElement('div');
            favBtn.id = 'hp-fav-btn';
            favBtn.className = 'hp-float-button hp-fav-button';
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
                <div class="hp-btn-icon">⭐</div>
                <div class="hp-btn-text">Favoride</div>
            `;
            btn.classList.add('is-favorite');
        } else {
            btn.innerHTML = `
                <div class="hp-btn-icon">☆</div>
                <div class="hp-btn-text">Favoriye<br>Ekle</div>
            `;
            btn.classList.remove('is-favorite');
        }

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

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
                const imgEl = document.querySelector(config.productImage);
                const imageUrl = imgEl ? imgEl.src : '';

                api.runtime.sendMessage({
                    action: "ADD_FAVORITE",
                    product: {
                        title: fullTitle,
                        searchQuery: searchQuery,
                        site: siteName,
                        url: window.location.href,
                        imageUrl: imageUrl
                    }
                }).then(() => {
                    updateFavButton(btn, true, fullTitle, searchQuery);
                });
            }
        };
    }

    function showTooltip(query, pos) {
        // Cleanup old tooltip if it exists
        const oldTooltip = document.getElementById('akakce-tooltip');
        if (oldTooltip) oldTooltip.remove();

        // Kategori filtreli URL oluştur
        const searchUrl = buildAkakceUrl(query, cleanProductTitle(query));

        let div = document.getElementById('hp-tooltip');
        if (!div) {
            div = document.createElement('div');
            div.id = 'hp-tooltip';
            div.className = 'hp-tooltip';
            document.body.appendChild(div);
        }

        div.style.left = `${pos.x}px`;
        div.style.top = `${pos.y}px`;
        div.style.display = 'block';

        div.innerHTML = `
            <div class="hp-tooltip-content">
                <span class="hp-tooltip-icon">🔍</span>
                <span>Fiyat Karşılaştır</span>
            </div>
        `;
        div.onclick = () => openPopup(searchUrl);

        tooltipContainer = div;
    }

    function openPopup(url) {
        const width = 420; // Stable mobile-friendly width
        const height = 750;
        const left = window.screenX + window.outerWidth - width - 50;
        const top = window.screenY + 50;

        // If popup is already open, update its URL instead of closing/reopening
        if (externalPopup && !externalPopup.closed) {
            externalPopup.location.href = url;
            externalPopup.focus();
            return;
        }

        externalPopup = window.open(url, 'PriceComparisonPopup',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);

        if (externalPopup) externalPopup.focus();
    }

    init();
})();
