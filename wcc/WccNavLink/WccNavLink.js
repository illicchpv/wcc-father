// подключить: <script data-wcc type="module" src="wcc/WccNavLink/WccNavLink.js"></script>
const myTemplate = ``; // для прод, вставить сюда содержимое файла WccNavLink.html
//
export class WccNavLink extends BaseComponent {
  constructor() {
    super();
    this._refs = {};
    this._handleLocationChange = this._handleLocationChange.bind(this);
  }

  connectedCallback() {
    this.loadTemplate(import.meta.url);
    window.addEventListener('popstate', this._handleLocationChange);
    window.addEventListener('hashchange', this._handleLocationChange);
  }

  disconnectedCallback() {
    window.removeEventListener('popstate', this._handleLocationChange);
    window.removeEventListener('hashchange', this._handleLocationChange);
  }

  static get properties() {
    return {
      href: {type: String, attribute: 'href', default: '#'},
    };
  }

  render() {
    super.render();
    this._initView();       // <--- Раскомментировать для Шага 2
    // this._initListeners();  // <--- Раскомментировать для Шага 3
  }

  // ============================================================
  // Шаг 2: Кэширование и обновление отображения
  // ============================================================

  _initView() {
    this._cacheElements();
    this.updateView();
  }

  _cacheElements() {
    this._refs = {
      link: this.querySelector('.wccNavLink'),
    };
  }

  _handleLocationChange() {
    if (this._hasRendered) {
      this.updateView();
    }
  }

  _isMatch(currentUrl, targetHref) {
    if (!targetHref) return false;
    try {
      const targetUrl = new URL(targetHref, window.location.href);

      // 1. Нормализация Pathname
      // /index.html и / считаем одним и тем же
      const normalizePath = (path) => path.replace(/\/index\.html$/, '/');
      const currentPath = normalizePath(currentUrl.pathname);
      const targetPath = normalizePath(targetUrl.pathname);

      if (currentPath !== targetPath) {
        return false;
      }

      // 2. Нормализация Hash
      const normalizeHash = (hash) => {
        // Удаляем последние "!"
        let h = hash.replace(/!+$/, '');
        // Считаем "#" равным пустой строке
        if (h === '#') return '';
        return h;
      };

      const currentHash = normalizeHash(currentUrl.hash);
      const targetHash = normalizeHash(targetUrl.hash);

      return currentHash === targetHash;
    } catch (e) {
      // console.warn('[WccNavLink] Error parsing URL', e);
      return false;
    }
  }

  updateView() {
    const {link} = this._refs;
    if (!link) return;

    try {
      const currentUrl = new URL(window.location.href);

      // 1. Проверяем основной href
      let isActive = this._isMatch(currentUrl, link.href);

      if (isActive) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    } catch (e) {
      console.warn('[WccNavLink] Error in updateView', e);
    }
  }

  propertyChangedCallback(name, oldValue, newValue) {
    if (this._hasRendered) {
      // Если изменился href, нужно обновить ссылку и перепроверить active
      if (name === 'href') {
        const {link} = this._refs;
        if (link) {
          link.setAttribute('href', newValue);
        }
        this.updateView();
      }
    }
  }
}

BaseComponent.registerWcc(WccNavLink, import.meta.url, myTemplate);
