// подключить: <script data-wcc type="module" src="wcc/WccHashRoute/WccHashRoute.js"></script>
const myTemplate = ``; // для прод, вставить сюда содержимое файла WccHashRoute.html

export class WccHashRoute extends BaseComponent {
  constructor() {
    super();
    this._handleLocationChange = this._handleLocationChange.bind(this);
    this._lastPath = '/';
    this._allComponentsReadyHandler = null;
    // Кэш последнего активного маршрута, чтобы не дёргать onRouteEnter без реальных изменений
    this._lastRouteInfo = null;
    this._pendingSource = null;
    // Кэш скомпилированных regexp для route-шаблонов с '*', чтобы не пересобирать их на каждый routechange
    this._routePatternCache = new Map();
  }

  connectedCallback() {
    super.connectedCallback();

    if (window.location.pathname.endsWith('index.html')) {
      const newPath = window.location.pathname.replace(/index\.html$/, '');
      window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
    }

    this.loadTemplate(import.meta.url);
    this._updateActiveChild();
    window.addEventListener('popstate', this._handleLocationChange);
    window.addEventListener('hashchange', this._handleLocationChange);
    if (!this._allComponentsReadyHandler) {
      this._allComponentsReadyHandler = () => {
        this._updateActiveChild();
      };
    }
    window.addEventListener('wcc:all-components-ready', this._allComponentsReadyHandler);
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
    window.removeEventListener('popstate', this._handleLocationChange);
    window.removeEventListener('hashchange', this._handleLocationChange);
    if (this._allComponentsReadyHandler) {
      window.removeEventListener('wcc:all-components-ready', this._allComponentsReadyHandler);
    }
  }

  _handleLocationChange() {
    this._updateActiveChild();
  }

  _getCurrentPath() {
    const hash = window.location.hash || '';
    let path = '/';

    if (hash.startsWith('#/')) {
      // Hash-режим: '#/users?id=1' -> '/users?id=1'
      path = hash.slice(1);
    } else {
      // Fallback на pathname: полезно для сценариев без hash (или при прямом заходе на страницу)
      path = window.location.pathname || '/';
      path = path.replace(/index\.html$/, '') || '/';
    }

    // Отсекаем query params, чтобы получить чистый путь для роутинга
    let qIdx = path.indexOf('?');
    if (qIdx === -1) {
      qIdx = path.indexOf('&');
    }
    if (qIdx !== -1) {
      path = path.substring(0, qIdx);
    }

    this._lastPath = path || '/';
    return this._lastPath;
  }

  _getQueryParams() {
    const hash = window.location.hash || '';
    // query читаем из hash-части (формат '#/path?x=1'), чтобы pathname/search не влияли на роутинг
    let qIdx = hash.indexOf('?');
    if (qIdx === -1) {
      qIdx = hash.indexOf('&');
    }
    if (qIdx === -1) return {};

    const search = hash.substring(qIdx + 1);
    const params = new URLSearchParams(search);
    const result = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Возвращает объект всех query-параметров
   * @returns {Object}
   */
  getQueryParams() {
    return this._getQueryParams();
  }

  /**
   * Возвращает значение конкретного query-параметра
   * @param {string} name 
   * @returns {string|null}
   */
  getQueryParam(name) {
    const params = this._getQueryParams();
    return params[name] !== undefined ? params[name] : null;
  }

  getRouteState() {
    const path = this._getCurrentPath();
    const queryParams = this._getQueryParams();
    const params = new URLSearchParams();
    Object.keys(queryParams).forEach((key) => {
      const val = queryParams[key];
      if (val !== null && val !== undefined) {
        params.set(key, String(val));
      }
    });
    return {path, params};
  }

  shouldHandleRouteChange(e, component, options) {
    if (!e || !e.detail) return true;
    const detail = e.detail;
    if (component && detail.source === component) return false;

    const requireActive = !(options && options.requireActive === false);
    if (requireActive) {
      const activeElement = detail.activeElement || null;
      // Если событие всплыло не из активного маршрута (и не из его потомка), игнорируем.
      // Это помогает вложенным роутерам/компонентам реагировать только на «свой» routechange.
      if (activeElement && component && activeElement !== component && !activeElement.contains(component)) {
        return false;
      }
    }
    return true;
  }

  setQueryParam(key, value, options) {
    if (!key) return;
    this.setQueryParams({[key]: value}, options);
  }

  /**
   * Обновляет query-параметры в URL.
   * Сливает новые параметры с текущими.
   * Если значение параметра === null, он удаляется.
   * @param {Object} params - объект с параметрами
   */
  setQueryParams(params, options) {
    if (!params) return;

    if (options && options.source) {
      // Прокидываем «кто инициировал изменение URL», чтобы слушатели wcc:routechange могли не реагировать на себя же
      this._pendingSource = options.source;
    }

    const currentPath = this._getCurrentPath(); // Чистый путь без params
    const currentParams = this._getQueryParams();

    // Объединяем текущие и новые
    const newParams = {...currentParams, ...params};

    // Формируем строку
    const searchParams = new URLSearchParams();
    Object.keys(newParams).forEach(key => {
      const val = newParams[key];
      if (val !== null && val !== undefined) {
        searchParams.set(key, val);
      }
    });

    const queryString = searchParams.toString();
    const newHash = queryString ? `#${currentPath}?${queryString}` : `#${currentPath}`;

    if (window.location.hash !== newHash) {
      const mode = options && options.mode ? options.mode : 'push';
      if (mode === 'replace') {
        // replaceState: не добавляет запись в историю, но hashchange не сработает — поэтому обновляем вручную
        window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        this._updateActiveChild();
      } else {
        window.location.hash = newHash;
      }
    }
  }

  /**
   * Полностью заменяет query-параметры.
   * @param {Object} params 
   */
  replaceQueryParams(params, options) {
    if (options && options.source) {
      // Прокидываем «кто инициировал изменение URL», чтобы слушатели wcc:routechange могли не реагировать на себя же
      this._pendingSource = options.source;
    }
    const currentPath = this._getCurrentPath();
    const searchParams = new URLSearchParams();

    if (params) {
      Object.keys(params).forEach(key => {
        const val = params[key];
        if (val !== null && val !== undefined) {
          searchParams.set(key, val);
        }
      });
    }

    const queryString = searchParams.toString();
    const newHash = queryString ? `#${currentPath}?${queryString}` : `#${currentPath}`;

    if (window.location.hash !== newHash) {
      const mode = options && options.mode ? options.mode : 'push';
      if (mode === 'replace') {
        // replaceState: не добавляет запись в историю, но hashchange не сработает — поэтому обновляем вручную
        window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        this._updateActiveChild();
      } else {
        window.location.hash = newHash;
      }
    }
  }

  /**
   * Удаляет все query-параметры
   */
  clearQueryParams(options) {
    if (options && options.source) {
      // Прокидываем «кто инициировал изменение URL», чтобы слушатели wcc:routechange могли не реагировать на себя же
      this._pendingSource = options.source;
    }
    const currentPath = this._getCurrentPath();
    const newHash = `#${currentPath}`;
    if (window.location.hash !== newHash) {
      const mode = options && options.mode ? options.mode : 'push';
      if (mode === 'replace') {
        // replaceState: не добавляет запись в историю, но hashchange не сработает — поэтому обновляем вручную
        window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
        this._updateActiveChild();
      } else {
        window.location.hash = newHash;
      }
    }
  }

  /**
   * Переход на указанный маршрут
   * @param {string} path - путь (например "/users")
   * @param {Object} [queryParams] - параметры (опционально)
   */
  setRoute(path, queryParams) {
    if (!path) path = '/';

    // Если путь не начинается с /, добавляем
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    let queryString = '';
    if (queryParams) {
      const searchParams = new URLSearchParams();
      Object.keys(queryParams).forEach(key => {
        const val = queryParams[key];
        if (val !== null && val !== undefined) {
          searchParams.set(key, val);
        }
      });
      queryString = searchParams.toString();
    }

    const newHash = queryString ? `#${path}?${queryString}` : `#${path}`;

    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
  }

  _getLinkMatchScore(routePath, path) {
    if (!routePath) return -1;
    if (!path) path = '/';
    if (!path.startsWith('/')) path = '/' + path;
    if (!routePath.startsWith('/')) routePath = '/' + routePath;
    if (!path.startsWith(routePath)) return -1;
    return routePath.length;
  }

  _updateActiveLinks(path) {
    const links = Array.from(
      document.querySelectorAll('a[route-link][href^="#/"], a[route-link][href^="/"]')
    );

    if (links.length === 0) {
      return;
    }

    let bestLink = null;
    let bestScore = -1;

    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      let routePath = '';

      if (href.startsWith('#/')) {
        routePath = href.slice(1);
      } else if (href.startsWith('/')) {
        routePath = href;
      } else {
        return;
      }

      if (!routePath) {
        routePath = '/';
      }

      // Отсекаем query params из ссылки для корректного сравнения путей
      let qIdx = routePath.indexOf('?');
      if (qIdx === -1) {
        qIdx = routePath.indexOf('&');
      }
      if (qIdx !== -1) {
        routePath = routePath.substring(0, qIdx);
      }

      const score = this._getLinkMatchScore(routePath, path);
      if (score < 0) {
        return;
      }

      if (score > bestScore) {
        bestScore = score;
        bestLink = link;
      }
    });

    links.forEach((link) => {
      if (link === bestLink && bestScore > 0) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Сопоставляет шаблон маршрута (route) с текущим путём (path).
  // Поддержка символа '*' как «любой непустой/пустой фрагмент до следующего '/'».
  // Возвращает объект { score, starValues }, где:
  // - score: «вес» совпадения (чем больше фиксированных символов, тем точнее маршрут);
  // - starValues: массив значений, извлечённых из групп '*'.
  _matchRoutePattern(route, path) {
    if (!route) return null;

    // Если есть '*', используем логику шаблонов
    if (route.includes('*')) {
      let cached = this._routePatternCache.get(route);
      if (!cached) {
        let regex = '^';
        let staticLength = 0;
        for (let i = 0; i < route.length; i++) {
          const ch = route[i];
          if (ch === '*') {
            regex += '([^/]*)';
          } else {
            if ('\\.[]{}()+-?^$|'.includes(ch)) {
              regex += '\\' + ch;
            } else {
              regex += ch;
            }
            staticLength++;
          }
        }
        regex += '$';
        cached = {re: new RegExp(regex), staticLength};
        this._routePatternCache.set(route, cached);
      }

      const match = cached.re.exec(path);
      if (!match) return null;

      return {
        // Чем больше «статической» части, тем более точный маршрут (например '/users/*' точнее, чем '/*')
        score: cached.staticLength,
        starValues: match.slice(1),
      };
    }

    // Логика для статических маршрутов (без '*')

    // 1. Точное совпадение
    if (route === path) {
      // Большой базовый вес гарантирует, что точное совпадение выигрывает у префиксных матчей
      return {score: 10000 + route.length, starValues: []};
    }

    // 2. Частичное совпадение (префикс)
    // Если путь начинается с маршрута, считаем это совпадением,
    // а остаток пути передаем как параметр.
    let prefixMatch = false;
    let remainder = '';

    if (route === '/') {
      // Корневой маршрут '/' совпадает с любым путем, начинающимся с '/'
      // Но только если путь длиннее 1 символа (иначе это точное совпадение)
      if (path.length > 1 && path.startsWith('/')) {
        prefixMatch = true;
        remainder = path.slice(1);
      }
    } else {
      // Например route='/about', path='/about/test'
      if (path.startsWith(route + '/')) {
        prefixMatch = true;
        remainder = path.slice(route.length + 1);
      }
    }

    if (prefixMatch) {
      return {
        score: route.length, // Вес равен длине совпавшей части
        starValues: [remainder],
      };
    }

    return null;
  }

  _updateActiveChild() {
    // Текущий путь берём из hash или pathname
    const path = this._getCurrentPath();
    const queryParams = this._getQueryParams();

    this._updateActiveLinks(path);

    // Кандидаты — все элементы с атрибутом [route]
    const candidates = Array.from(
      this.querySelectorAll('[route]')
    );

    let bestMatch = null;
    let bestScore = -1;
    let bestStar = null;
    let fallback = null;

    candidates.forEach((child) => {
      const route = child.getAttribute('route');
      if (!route) {
        return;
      }

      if (route === '*') {
        // Запасной вариант — показываем, если ничего не подошло
        fallback = child;
        return;
      }

      // Пытаемся сопоставить шаблон маршрута с текущим путём
      const result = this._matchRoutePattern(route, path);

      if (result) {
        const score = result.score;
        let starValue = '';
        if (Array.isArray(result.starValues) && result.starValues.length > 0) {
          // Склеиваем параметры маршрута (значения '*') через '/'
          starValue = result.starValues.join('/');
        }

        // Выбираем наиболее точный маршрут по score
        if (score > bestScore) {
          bestScore = score;
          bestMatch = child;
          bestStar = starValue;
        }
      }
    });

    // Активный — лучший матч, иначе запасной (*)
    let active = bestMatch || fallback;

    if (candidates.length === 0) return;

    candidates.forEach((child) => {
      if (child === active) {
        // Показываем активный и прокидываем параметры маршрута
        child.removeAttribute('hidden');
        child.style.display = '';
        if (bestStar !== null && bestStar !== undefined) {
          child.setAttribute('route-param', bestStar);
        } else {
          child.removeAttribute('route-param');
        }
      } else {
        // Прячем остальные
        child.setAttribute('hidden', '');
        child.style.display = 'none';
        child.removeAttribute('route-param');
      }
    });

    const params = new URLSearchParams();
    Object.keys(queryParams).forEach((key) => {
      const val = queryParams[key];
      if (val !== null && val !== undefined) {
        params.set(key, String(val));
      }
    });
    const source = this._pendingSource || null;
    this._pendingSource = null;
    this.dispatchEvent(new CustomEvent('wcc:routechange', {
      detail: {path, params, activeElement: active || null, source},
      bubbles: true,
      composed: true
    }));

    // onRouteEnter вызываем только при реальном изменении маршрута
    const routeParam = bestStar || '';
    const hasHook = !!(active && typeof active.onRouteEnter === 'function');

    // Сериализуем параметры для сравнения (чтобы отследить изменения query без сравнения объектов)
    const queryStr = params.toString();

    const prev = this._lastRouteInfo;
    const changed =
      !prev ||
      prev.element !== active ||
      prev.path !== path ||
      prev.routeParam !== routeParam ||
      prev.queryStr !== queryStr ||
      prev.hasHook !== hasHook;

    this._lastRouteInfo = {element: active, path, routeParam, queryStr, hasHook};
    if (hasHook && changed) {
      active.onRouteEnter({path, routeParam, queryParams});
    }
  }
}

BaseComponent.registerWcc(WccHashRoute, import.meta.url, myTemplate);
