/* Shared utility functions */

// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Cleans the product title to improve Akakçe search results.
 */
function cleanProductTitle(title) {
    if (!title) return "";

    let cleaned = title.trim();

    // Remove content in round parentheses and square brackets
    cleaned = cleaned.replace(/\s*\(.*?\)/g, '');
    cleaned = cleaned.replace(/\s*\[.*?\]/g, '');

    // Remove trademark symbols
    cleaned = cleaned.replace(/[\u2122\u00AE\u00A9]/g, ' ');

    // Remove common Amazon seller fluff
    cleaned = cleaned.replace(/Yeni /gi, ' ');
    cleaned = cleaned.replace(/Amazon\.com\.tr/gi, ' ');

    // Keep alphanumeric, spaces and Turkish characters
    // Turkish chars: öçşığü ÖÇŞİĞÜ
    cleaned = cleaned.replace(/[^\w\s\u00C0-\u017FöçşığüÖÇŞİĞÜ]/gi, ' ');

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Limit words initially, but we might want to be less aggressive 
    // and let the retry mechanism handle details.
    const words = cleaned.split(' ');
    if (words.length > 8) {
        cleaned = words.slice(0, 8).join(' ');
    }

    return cleaned;
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
