// подключить: <script data-wcc type="module" src="wcc/WccHashRoute/WccHashRoute.js"></script>
const myTemplate = ``; // для прод, вставить сюда содержимое файла WccHashRoute.html

export class WccHashRoute extends BaseComponent {
  constructor() {
    super();
    this._handleLocationChange = this._handleLocationChange.bind(this);
    this._lastPath = '/';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadTemplate(import.meta.url);
    this._updateActiveChild();
    window.addEventListener('popstate', this._handleLocationChange);
    window.addEventListener('hashchange', this._handleLocationChange);
  }

  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }
    window.removeEventListener('popstate', this._handleLocationChange);
    window.removeEventListener('hashchange', this._handleLocationChange);
  }

  _handleLocationChange() {
    this._updateActiveChild();
  }

  _getCurrentPath() {
    const hash = window.location.hash || '';
    let path = '/';

    if (hash.startsWith('#/')) {
      path = hash.slice(1);
    } else {
      path = window.location.pathname || '/';
      path = path.replace(/index\.html$/, '') || '/';
      if (path === '/' && this._lastPath && this._lastPath !== '/') {
        path = this._lastPath;
      }
    }

    this._lastPath = path || '/';
    return this._lastPath;
  }

  // Сопоставляет шаблон маршрута (route) с текущим путём (path).
  // Поддержка символа '*' как «любой непустой/пустой фрагмент до следующего '/'».
  // Возвращает объект { score, starValues }, где:
  // - score: «вес» совпадения (чем больше фиксированных символов, тем точнее маршрут);
  // - starValues: массив значений, извлечённых из групп '*'.
  _matchRoutePattern(route, path) {
    if (!route) return null;
    if (!route.includes('*')) {
      // Без '*' — проверяем строгое совпадение всего пути
      if (route === path) {
        // Для точных маршрутов даём большой приоритет
        return {score: 10000 + route.length, starValues: []};
      }
      return null;
    }

    let regex = '^';
    let staticLength = 0;
    for (let i = 0; i < route.length; i++) {
      const ch = route[i];
      if (ch === '*') {
        // '*' → группа, которая захватывает любые символы, кроме '/'
        regex += '([^/]*)';
      } else {
        // Экранируем спецсимволы RegExp и считаем фиксированную часть
        if ('\\.[]{}()+-?^$|'.includes(ch)) {
          regex += '\\' + ch;
        } else {
          regex += ch;
        }
        staticLength++;
      }
    }
    regex += '$';

    // Сопоставляем целиком: ^...$
    const re = new RegExp(regex);
    const match = re.exec(path);
    if (!match) return null;

    return {
      // Чем больше фиксированных символов — тем выше приоритет
      score: staticLength,
      // Значения звёздочек: всё, что захвачено '([^/]*)'
      starValues: match.slice(1),
    };
  }

  _updateActiveChild() {
    // Текущий путь берём из hash или pathname
    const path = this._getCurrentPath();
    // Кандидаты — все элементы с атрибутом [route]
    const candidates = Array.from(
      this.querySelectorAll('[route]')
    ).filter((node) => node.nodeType === Node.ELEMENT_NODE);

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

      let score = -1;
      let starValue = null;

      // Пытаемся сопоставить шаблон маршрута с текущим путём
      const result = this._matchRoutePattern(route, path);
      if (result) {
        score = result.score;
        if (Array.isArray(result.starValues) && result.starValues.length > 0) {
          // Склеиваем параметры маршрута (значения '*') через '/'
          starValue = result.starValues.join('/');
        } else {
          starValue = '';
        }
      }

      // Выбираем наиболее точный маршрут по score
      if (score > bestScore) {
        bestScore = score;
        bestMatch = child;
        bestStar = starValue;
      }
    });

    // Активный — лучший матч, иначе запасной (*)
    const active = bestMatch || fallback;

    if (candidates.length === 0) return;
    if (!active) return;
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

    // Сообщаем наружу об изменении маршрута
    this.emit('route-change', {
      path,
      activeElement: active || null,
    });
  }
}

BaseComponent.registerWcc(WccHashRoute, import.meta.url, myTemplate);
