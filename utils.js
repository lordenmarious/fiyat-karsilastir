/* Shared utility functions */

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Hibrit Normalleştirme Sistemi
 */
const Normalizer = {
    // 1. Her platforma özel gürültü kelimeleri
    platformNoises: {
        "amazon": [/amazon\.com\.tr/gi, /yeni/gi, /fırsat/gi],
        "hepsiburada": [/hepsiburada/gi, /süper fiyat/gi, /yarın kapında/gi],
        "trendyol": [/trendyol/gi, /tıkla gelsin/gi, /satıcı:\s?[\w\s]+/gi],
        "n11": [/n11/gi, /ücretsiz kargo/gi, /n11\.com/gi],
        "itopya": [/hazır sistem/gi, /stokta/gi, /oem/gi],
        "vatan": [/web'e özel/gi, /vatan bilgisayar/gi]
    },

    // 2. Ana temizleme fonksiyonu
    clean: function (title, host) {
        if (!title) return "";
        let cleaned = title.toLowerCase();

        // Platformu belirle
        const hostStr = host || "";
        const platformKey = Object.keys(this.platformNoises).find(key => hostStr.includes(key));

        // A. Platforma özel temizlik
        if (platformKey) {
            this.platformNoises[platformKey].forEach(pattern => {
                cleaned = cleaned.replace(pattern, ' ');
            });
        }

        // B. Bağlantı Tipi ve Birim Koruma (usbc, typec, 350ml, 8gb)
        cleaned = cleaned.replace(/usb[- ]?c/gi, 'usbc');
        cleaned = cleaned.replace(/type[- ]?c/gi, 'typec');
        cleaned = cleaned.replace(/(\d+)\s*(gb|tb|ml|mg|lt|mm|mah|hz|dpi|''|")/g, '$1$2');

        // C. Sembol ve gereksiz karakter temizliği (Model kodları için Tire (-) korunur)
        cleaned = cleaned.replace(/[^\w\s\u00C0-\u017FöçşığüÖÇŞİĞÜ-]/gi, ' ');

        // D. Akıllı Kelime Seçimi
        let words = cleaned.split(/\s+/).filter(w => {
            if (w.length > 1) return true;
            if (/\d/.test(w)) return true;
            return false;
        });

        // E. Model Kodu (Jackpot) Ayıklama ve Önceliklendirme
        // En az 6 karakterli, hem harf hem rakam içeren kelimeleri (örn: 82XM00PVTX) öncelikli say.
        const modelCodeIndex = words.findIndex(w => w.length >= 6 && /[a-z]/i.test(w) && /\d/.test(w));
        let prioritizedWords = [...words];

        if (modelCodeIndex > -1) {
            const modelCode = prioritizedWords.splice(modelCodeIndex, 1)[0];
            prioritizedWords.unshift(modelCode); // Model kodunu en başa al
        }

        // İlk 5 kelime + içinde rakam olan tüm yan detayları al
        const core = prioritizedWords.slice(0, 5);
        const details = prioritizedWords.slice(5).filter(w => /\d/.test(w));

        return [...core, ...details].slice(0, 10).join(' ').trim();
    }
};

/**
 * Cleans the product title to improve price search results.
 * Bridge function for compatibility.
 */
function cleanProductTitle(title) {
    const host = (typeof window !== 'undefined' && window.location) ? window.location.hostname : "";
    return Normalizer.clean(title, host);
}

/**
 * Debounce function to limit rate of function execution.
 */
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
