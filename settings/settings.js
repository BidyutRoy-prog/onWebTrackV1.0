// Save theme setting
export function saveThemeSetting(isLightMode) {
    chrome.storage.local.set({ theme: isLightMode ? 'light' : 'dark' });
}

// Load theme setting
export function loadThemeSetting(callback) {
    chrome.storage.local.get('theme', (result) => {
        callback(result.theme);
    });
}
