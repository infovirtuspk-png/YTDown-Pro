class I18nManager {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.rtlLangs = ['ar', 'ur'];
    }

    async init(lang = 'en') {
        this.currentLang = lang;
        await this.loadLocale(lang);
        this.applyTranslations();
    }

    async loadLocale(lang) {
        try {
            const resp = await fetch(`../locales/${lang}.json`);
            if (resp.ok) {
                this.translations = await resp.json();
            } else {
                // Fallback to English
                const fallback = await fetch(`../locales/en.json`);
                this.translations = await fallback.json();
            }
        } catch (err) {
            console.warn('Failed loading locale:', lang, err);
        }
    }

    t(key, defaultText = '') {
        return this.translations[key] || defaultText || key;
    }

    applyTranslations() {
        const isRtl = this.rtlLangs.includes(this.currentLang);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (key && this.translations[key]) {
                if (el.tagName === 'INPUT' && el.type === 'text') {
                    el.placeholder = this.translations[key];
                } else {
                    el.textContent = this.translations[key];
                }
            }
        });
    }

    async setLanguage(lang) {
        await this.init(lang);
    }
}

window.i18n = new I18nManager();
