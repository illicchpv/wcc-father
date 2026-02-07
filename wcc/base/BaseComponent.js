const _template = null;

export class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.html = null;
    this._hasRendered = false;
    this._initProperties();
    this._allComponentsReadyHandled = false;
    BaseComponent._registerInstance(this);
  }

  connectedCallback() {
    const registry = BaseComponent._registry;
    if (registry && registry.tags) {
      const tag = this.tagName.toLowerCase();
      const url = registry.tags[tag];
      if (url && !this._hasRendered) {
        this.loadTemplate(url);
      }
    }
  }

  static toKebab(name) {
    if (typeof name !== 'string' || !name) return '';
    const normalized = name.trim();
    const result = normalized
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    return result;
  }

  /**
   * Определяет наблюдаемые атрибуты на основе конфигурации properties.
   */
  static get observedAttributes() {
    const props = this.properties || {};
    return Object.keys(props).map(name => {
      const config = props[name];
      return config.attribute || BaseComponent.toKebab(name);
    });
  }

  /**
   * Конфигурация свойств компонента.
   * Переопределите этот геттер в дочернем классе.
   * @returns {Object}
   */
  static get properties() {
    return {};
  }

  /**
   * Возвращает объект со всеми текущими значениями свойств,
   * объявленных в static get properties().
   */
  get values() {
    const props = this.constructor.properties || {};
    const result = {};
    for (const key in props) {
      result[key] = this[key];
    }
    return result;
  }

  /**
   * Инициализация свойств на основе статической конфигурации properties.
   */
  _initProperties() {
    const props = this.constructor.properties || {};

    Object.keys(props).forEach(name => {
      const config = props[name];
      const attributeName = config.attribute || BaseComponent.toKebab(name);

      // Валидация: Boolean свойство не должно иметь default: true,
      // так как булевы атрибуты работают по принципу наличия (есть = true).
      // Если по умолчанию true, компонент сам выставит атрибут, и убрать его через HTML нельзя.
      if (config.type === Boolean && config.default === true) {
        console.warn(`[BaseComponent] Property "${name}" type Boolean has default: true. It is forbidden because it makes "false" state impossible in HTML. Resetting to false.`);
        config.default = false;
      }

      // Инициализируем внутреннее значение
      const internalName = `_${name}`;

      // Определение начального значения
      // Приоритет: значение на экземпляре (поле класса) -> дефолтное из конфига -> null
      let initialValue = config.default;
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        initialValue = this[name];
        // Удаляем свойство, чтобы оно не перекрывало будущие геттеры/сеттеры
        delete this[name];
      }

      this[internalName] = initialValue !== undefined ? initialValue : null;

      // Если в прототипе (классе) уже есть геттер/сеттер, мы его не переопределяем,
      // но предполагаем, что пользователь сам обработает логику.
      // Однако, для полной автоматизации, мы определяем свои аксессоры на экземпляре.
      // Чтобы позволить пользователю переопределять, проверим наличие в прототипе:
      // const hasPrototypeGetter = ... 
      // В данном простом варианте мы всегда создаем аксессоры на экземпляре, 
      // если пользователь запросил это через properties.

      Object.defineProperty(this, name, {
        get() {
          return this[internalName];
        },
        set(value) {
          const oldValue = this[internalName];
          this[internalName] = value;

          // Отражение свойства в атрибут
          if (attributeName) {
            if (value === null || value === undefined || value === false) {
              this.removeAttribute(attributeName);
            } else {
              const attrValue = config.type === Boolean ? '' : String(value);
              if (this.getAttribute(attributeName) !== attrValue) {
                this.setAttribute(attributeName, attrValue);
              }
            }
          }

          if (oldValue !== value) {
            this.propertyChangedCallback(name, oldValue, value);
          }
        },
        configurable: true,
        enumerable: true
      });

      // Применяем начальное значение через сеттер, чтобы синхронизировать атрибуты
      if (this[internalName] !== null && this[internalName] !== undefined) {
        // Вызываем сеттер, но аккуратно, чтобы не триггерить лишние колбэки если не надо
        // Но нам надо синхронизировать атрибут
        const val = this[internalName];
        // Сброс для триггера сеттера (немного хак, но надежно)
        // this[name] = val; 
        // Проще вручную выставить атрибут если его нет
        if (attributeName && !this.hasAttribute(attributeName)) {
          if (val !== null && val !== undefined && val !== false) {
            const attrValue = config.type === Boolean ? '' : String(val);
            this.setAttribute(attributeName, attrValue);
          }
        }
      }
    });
  }

  /**
   * Обработчик изменений атрибутов.
   * Автоматически синхронизирует атрибуты со свойствами.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    const props = this.constructor.properties || {};

    for (const propName in props) {
      const config = props[propName];
      const attributeName = config.attribute || BaseComponent.toKebab(propName);
      if (attributeName === name) {
        let value = newValue;

        // Приведение типов
        if (config.type === Boolean) {
          value = newValue !== null;
        } else if (config.type === Number) {
          value = Number(newValue);
        }

        // Устанавливаем свойство (вызовет сеттер)
        // Проверяем, отличается ли значение, чтобы избежать рекурсии, 
        // хотя сеттер сам проверит getAttribute
        if (this[propName] !== value) {
          this[propName] = value;
        }
        break;
      }
    }
  }

  /**
   * Хук, вызываемый при изменении свойства через сеттер.
   * @param {string} name 
   * @param {any} oldValue 
   * @param {any} newValue 
   */
  propertyChangedCallback(name, oldValue, newValue) { }

  /**
   * Статический шаблон компонента.
   * Если определен, компонент не будет пытаться загрузить HTML файл.
   * Это предотвращает моргание интерфейса (нет асинхронного запроса).
   * !Экранируйте внутренние переменные как \${this...}
   * @returns {string|null}
   */
  static get template() {
    return this.myTemplate || _template;
  }

  /**
   * Загружает HTML шаблон с именем, совпадающим с именем класса компонента.
   * Шаблон ищется в той же директории, где находится файл компонента.
   * 
   * @param {string} baseUrl - URL текущего модуля (передайте import.meta.url из наследника)
   */
  async loadTemplate(baseUrl) {
    // Сохраняем baseUrl для последующего разрешения путей
    this._baseUrl = baseUrl;

    BaseComponent._noteUsage(baseUrl);

    // Откладываем загрузку шаблона до полной готовности DOM.
    // Если документ еще парсится (loading), ждем DOMContentLoaded, чтобы гарантировать,
    // что все дети (включая текстовые узлы и вложенные компоненты) распаршены и доступны.
    // Если документ уже готов (interactive/complete), используем setTimeout(0) для
    // обработки случаев динамического создания элементов.
    if (this._hasRendered) return;

    if (document.readyState === 'loading') {
      await new Promise(resolve => window.addEventListener('DOMContentLoaded', resolve, {once: true}));
    }
    // Если документ уже готов, убираем искусственную задержку setTimeout(0),
    // чтобы компонент рендерился синхронно (насколько возможно) и не мерцал.

    if (this._hasRendered) return;

    // 1. Проверяем кэш (загруженный или статический)
    if (this.constructor._cachedHtml) {
      this._rawHtml = this.constructor._cachedHtml;
      this.forceUpdate();
      return;
    }

    // 2. Проверяем статический шаблон (синхронно)
    const staticTemplate = this.constructor.template;
    if (staticTemplate) {
      this._rawHtml = this._processTemplate(staticTemplate);
      this.constructor._cachedHtml = this._rawHtml;
      this.forceUpdate();
      return;
    }

    // 3. Загружаем файл (один запрос на класс)
    if (!this.constructor._fetchPromise) {
      const templateName = `${this.constructor.name}.html`;
      const url = new URL(templateName, baseUrl).href;

      this.constructor._fetchPromise = (async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const text = await response.text();

        // Очистка от инъекций Live Server (скрипты ломают слоты и SVG)
        // Сначала чистим регуляркой, чтобы не сломать парсер
        let cleanText = text
          .replace(/<!--\s*Code injected by live-server\s*-->/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "");

        // Удаляем обертку body если она есть (использовалась для защиты от инъекций)
        cleanText = cleanText.replace(/<\/?body>/gi, "");

        try {
          // Дополнительная зачистка через DOM (на случай если что-то пропустили)
          const temp = document.createElement('template');
          temp.innerHTML = cleanText;

          const scripts = temp.content.querySelectorAll('script');
          if (scripts.length > 0) {
            scripts.forEach(s => s.remove());
            cleanText = temp.innerHTML;
          }
        } catch (e) {
          console.warn('[BaseComponent] Sanitization failed', e);
        }

        const processed = this._processTemplate(cleanText || ' ');
        // Сразу сохраняем в кэш, чтобы другие экземпляры получили его мгновенно
        this.constructor._cachedHtml = processed;
        return processed;
      })();
    }

    try {
      this._rawHtml = await this.constructor._fetchPromise;

      // Повторная проверка, так как пока мы ждали загрузку, 
      // компонент мог быть уже отрисован другим вызовом (например, при перемещении в DOM)
      if (this._hasRendered) return;

      this.forceUpdate();
    } catch (error) {
      console.error(`Ошибка загрузки шаблона ${this.constructor.name}:`, error);
      this.constructor._fetchPromise = null;
    }
  }

  /**
   * Принудительно обновляет отображение, заново обрабатывая условия в шаблоне.
   */
  forceUpdate() {
    if (this._rawHtml) {
      let processedHtml = this._processConditionals(this._rawHtml);

      const {html, templates} = this._extractInnerTemplates(processedHtml);
      this._innerTemplates = templates;

      const htmlWithIncludes = this._processIncludes(html);

      this.html = htmlWithIncludes;
      this.render();

      if (Object.keys(this._innerTemplates).length > 0) {
        Object.entries(this._innerTemplates).forEach(([name, content]) => {
          this._processInnerTemplates(name, content);
        });
      }

      this._markComponentLoaded();
    }
  }

  /**
   * Регистрирует компонент в системе BaseComponent.
   * Позволяет отследить использование компонента на странице.
   * Если компонент не используется, он автоматически помечается как загруженный.
   * 
   * @param {string} tagName - Имя тега компонента (например, 'wcc-skill')
   * @param {string} url - URL скрипта (import.meta.url)
   */
  static register(tagName, url) {
    const registry = BaseComponent._ensureRegistry();

    // Сохраняем связь тега с URL для автоматической загрузки шаблона
    if (!registry.tags) {
      registry.tags = {};
    }
    registry.tags[tagName.toLowerCase()] = url;

    if (!registry.scripts[url]) {
      registry.scripts[url] = {used: false};
    }

    if (!registry.scheduled) {
      registry.scheduled = true;

      const run = () => {
        const current = BaseComponent._ensureRegistry();
        Object.keys(current.scripts).forEach(key => {
          const info = current.scripts[key];
          if (!info.used) {
            BaseComponent.markLoaded(key);
          }
        });
      };

      if (document.readyState === 'complete') {
        setTimeout(run, 0);
      } else {
        window.addEventListener('load', run, {once: true});
      }
    }
  }

  static _registerInstance(instance) {
    if (!BaseComponent._instances) {
      BaseComponent._instances = new Set();
    }
    BaseComponent._instances.add(instance);
  }

  static _maybeInvokeAllComponentsReady(instance) {
    if (!BaseComponent._allComponentsReady) return;
    if (!instance || instance._allComponentsReadyHandled) return;
    if (!instance._hasRendered) return;
    if (typeof instance.onAllComponentsReady === 'function') {
      instance._allComponentsReadyHandled = true;
      try {
        instance.onAllComponentsReady();
      } catch (e) {
        console.error('[BaseComponent] onAllComponentsReady error', e);
      }
    }
  }

  static _notifyAllComponentsReady() {
    if (!BaseComponent._instances) return;
    BaseComponent._instances.forEach(instance => {
      BaseComponent._maybeInvokeAllComponentsReady(instance);
    });
  }

  static registerWcc(ctor, url, template = null) {
    if (typeof ctor !== 'function') {
      console.error('[BaseComponent] registerWcc: ctor is not a function', ctor);
      return;
    }

    if (template) {
      ctor.myTemplate = template;
    }

    if (!(ctor.prototype instanceof BaseComponent)) {
      console.error('[BaseComponent] registerWcc: ctor does not extend BaseComponent', ctor.name);
      return;
    }

    const className = ctor.name;
    if (typeof className !== 'string' || !className) {
      console.error('[BaseComponent] registerWcc: ctor.name is empty', ctor);
      return;
    }

    if (!/^[A-Z][A-Za-z0-9]*$/.test(className)) {
      console.error('[BaseComponent] registerWcc: invalid class name, expected PascalCase', className);
      return;
    }

    const tag = BaseComponent.toKebab(className);

    if (!tag) {
      console.error('[BaseComponent] registerWcc: failed to build tag from class name', className);
      return;
    }

    if (!tag.includes('-')) {
      console.error('[BaseComponent] registerWcc: custom element tag must contain a dash', {className, tag});
      return;
    }

    if (tag !== tag.toLowerCase() || !/^[a-z0-9-]+$/.test(tag)) {
      console.error('[BaseComponent] registerWcc: tag must be lowercase and alphanumeric with dashes only', {className, tag});
      return;
    }

    if (typeof url !== 'string' || !url) {
      console.error('[BaseComponent] registerWcc: url must be a non-empty string', {className, tag});
      return;
    }

    // Сначала регистрируем URL в реестре, чтобы connectedCallback (который сработает при define)
    // уже мог найти URL шаблона.
    BaseComponent.register(tag, url);

    const existing = customElements.get(tag);
    if (existing && existing !== ctor) {
      console.error('[BaseComponent] registerWcc: tag already registered with different constructor', {className, tag});
      return;
    }

    if (!existing) {
      try {
        customElements.define(tag, ctor);
      } catch (e) {
        console.error('[BaseComponent] registerWcc: failed to define custom element', {className, tag, error: e});
        return;
      }
    } else {
      console.warn('[BaseComponent] registerWcc: tag already defined, skipping define', {className, tag});
    }
  }

  /**
   * Помечает скрипт как загруженный (удаляет data-wcc).
   * Проверяет, остались ли еще незагруженные скрипты.
   * @param {string} url 
   */
  static markLoaded(url) {
    if (!url || !document.head) return;

    const scripts = Array.from(document.head.querySelectorAll('script[data-wcc][src]'));
    // Ищем все скрипты с этим URL, чтобы обработать дубликаты
    const matchingScripts = scripts.filter(script => script.src === url);

    if (matchingScripts.length > 0) {
      matchingScripts.forEach(script => script.removeAttribute('data-wcc'));

      if (matchingScripts.length > 1) {
        console.warn(`[BaseComponent] Duplicate script import detected for ${url}. Cleaned up automatically.`);
      }
    }

    const remaining = document.head.querySelectorAll('script[data-wcc][src]').length;

    if (remaining === 0) {
      if (!window.__wccAllComponentsReadyDispatched) {
        window.__wccAllComponentsReadyDispatched = true;
        const event = new CustomEvent('wcc:all-components-ready');
        setTimeout(() => {
          try {
            if (typeof location !== 'undefined' && location.hostname && location.hostname.includes('local')) {
              const allTags = Array.from(document.querySelectorAll('*')).map(e => e.tagName.toLowerCase());
              const uniqueTags = Array.from(new Set(allTags));
              uniqueTags
                .filter(t => t.includes('-') && !customElements.get(t))
                .forEach(t => console.warn(`Незарегистрированный компонент: ${t}`));
            }
          } catch (e) {
            console.error('[BaseComponent] error while checking unregistered components', e);
          }
          BaseComponent._allComponentsReady = true;
          BaseComponent._notifyAllComponentsReady();
          window.dispatchEvent(event);
        }, 10);
      }
    }
  }

  static _ensureRegistry() {
    if (!BaseComponent._registry) {
      BaseComponent._registry = {scripts: {}, scheduled: false};
    }
    return BaseComponent._registry;
  }

  static _noteUsage(url) {
    const registry = BaseComponent._ensureRegistry();
    if (registry.scripts[url]) {
      registry.scripts[url].used = true;
    }
  }

  _markComponentLoaded() {
    BaseComponent.markLoaded(this._baseUrl);
    BaseComponent._maybeInvokeAllComponentsReady(this);
  }

  /**
   * Извлекает внутренние шаблоны <!-- innerTemplate:name -->...<!-- /innerTemplate -->
   * @param {string} html 
   * @returns {{html: string, templates: Object}}
   */
  _extractInnerTemplates(html) {
    const templates = {};
    // Ищем <!-- innerTemplate:name -->content<!-- /innerTemplate -->
    // ([\w-]+) - захватывает имя шаблона (буквы, цифры, дефис)
    // ([\s\S]*?) - лениво захватывает контент
    const regex = /<!--\s*innerTemplate:([\w-]+)\s*-->([\s\S]*?)<!--\s*\/innerTemplate\s*-->/g;

    const cleanHtml = html.replace(regex, (match, name, content) => {
      templates[name] = content;
      return ''; // Удаляем шаблон из основного HTML
    });

    return {html: cleanHtml, templates};
  }

  /**
   * Обработчик внутренних шаблонов.
   * Переопределите этот метод в компоненте для рендеринга списков/коллекций.
   * @param {string} name - Имя шаблона
   * @param {string} content - HTML содержимое шаблона
   */
  _processInnerTemplates(name, content) {
    // По умолчанию ничего не делает.
    // В наследнике:
    // if (name === 'my-item') { ... }
  }

  /**
   * Обрабатывает условные конструкции <!-- if(...) --> ... <!-- endif -->
   * @param {string} html 
   * @returns {string} HTML с обработанными условиями
   */
  _processConditionals(html) {
    // Регулярное выражение для поиска блоков if
    // Ищем <!-- if(condition) --> content <!-- endif -->
    // [\s\S]*? - ленивый поиск любого символа, включая переносы строк
    const regex = /<!--\s*if\((.*?)\)\s*-->([\s\S]*?)<!--\s*endif\s*-->/g;

    return html.replace(regex, (match, condition, content) => {
      try {
        // Создаем функцию для проверки условия в контексте компонента
        // Используем new Function вместо eval для чуть большей изоляции (хотя всё равно доступ к this)
        const checkCondition = new Function('return ' + condition);

        // Вызываем функцию с привязкой к текущему экземпляру (this)
        if (checkCondition.call(this)) {
          return content;
        } else {
          return '';
        }
      } catch (e) {
        console.error(`Ошибка при вычислении условия "${condition}":`, e);
        return match; // В случае ошибки возвращаем как было
      }
    });
  }

  _processIncludes(html) {
    const regex = /<!--\s*include\s*-->([\s\S]*?)<!--\s*\/include\s*-->/g;
    return html.replace(regex, (match, content) => {
      try {
        return this.evaluateString(content);
      } catch (e) {
        console.error('Ошибка при обработке include блока:', e);
        return match;
      }
    });
  }

  /**
   * Вычисляет строку как шаблонную литералу в контексте компонента.
   * Позволяет использовать выражения типа "Привет, ${this.userName}"
   * @param {string} templateString 
   * @returns {string}
   */
  evaluateString(templateString) {
    try {
      return new Function('return `' + templateString + '`').call(this);
    } catch (e) {
      console.error('Ошибка при вычислении шаблонной строки:', e);
      return templateString;
    }
  }

  renderInnerTemplateList(items, templateContent, containerOrSelector) {
    const container = typeof containerOrSelector === 'string'
      ? this.querySelector(containerOrSelector)
      : containerOrSelector;

    let err = null;
    if (!Array.isArray(items)) err = console.warn('renderInnerTemplateList -- items not Array!');
    if (!templateContent) err = console.warn('renderInnerTemplateList -- empty templateContent!');
    if (!container) err = console.warn('renderInnerTemplateList -- container not found!');
    if (err !== null) return;

    container.innerHTML = '';

    items.forEach(item => {
      this.item = item;
      const itemHtml = this.evaluateString(templateContent);
      container.insertAdjacentHTML('beforeend', itemHtml);
    });

    delete this.item;
  }

  /**
   * Вычисляет промежуточное значение (fluid) на основе текущей ширины экрана.
   * Линейная интерполяция: V = vMin + (W - wMin) * (vMax - vMin) / (wMax - wMin)
   * @param {number} minWidth 
   * @param {number} maxWidth 
   * @param {number} minVal 
   * @param {number} maxVal 
   * @returns {number} Текущее значение
   */
  calculateFluidValue(minWidth, maxWidth, minVal, maxVal) {
    const w = window.innerWidth;
    return minVal + (w - minWidth) * (maxVal - minVal) / (maxWidth - minWidth);
  }

  emit(eventName, detail, options = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: options.bubbles !== undefined ? options.bubbles : true,
      composed: options.composed !== undefined ? options.composed : true
    });
    this.dispatchEvent(event);
  }

  onRef(refName, eventType, handler, options) {
    if (!refName) {
      console.warn('onRef -- refName not set!');
      return;
    }
    let target = null;
    if (typeof refName === 'object') {
      target = refName;
    } else {
      if (!this._refs) return;
      target = this._refs[refName];
    }
    if (!target) return;
    target.addEventListener(eventType, handler, options);
  }

  /**
   * Обрабатывает шаблон: объединяет все стили в один блок и выносит в head.
   * @param {string} htmlContent 
   * @returns {string} HTML без стилей
   */
  _processTemplate(htmlContent) {
    // Используем regex для извлечения стилей, чтобы не парсить HTML через innerHTML раньше времени
    // (это ломает интерполяцию в атрибутах типа <tag ${...}>)
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let mergedCss = '';

    const htmlWithoutStyles = htmlContent.replace(styleRegex, (match, cssContent) => {
      mergedCss += cssContent + '\n';
      return '';
    });

    if (mergedCss.trim()) {
      const styleId = `style-${this.constructor.name}`;

      // Если такого стиля еще нет в head, собираем все и добавляем
      if (!document.getElementById(styleId)) {
        const newStyle = document.createElement('style');
        newStyle.id = styleId;
        newStyle.textContent = mergedCss;

        let inserted = false;
        // Пытаемся найти скрипт, который подключил этот компонент
        if (this._baseUrl) {
          // Ищем скрипт с src, совпадающим с baseUrl
          // Используем Array.from, так как querySelectorAll возвращает NodeList
          const scripts = Array.from(document.querySelectorAll('script'));
          const myScript = scripts.find(script => script.src === this._baseUrl);

          if (myScript && myScript.parentNode) {
            myScript.parentNode.insertBefore(newStyle, myScript.nextSibling);
            inserted = true;
          }
        }

        // Если не нашли скрипт или нет baseUrl, добавляем просто в head
        if (!inserted) {
          document.head.appendChild(newStyle);
        }
      }
    }

    return htmlWithoutStyles;
  }

  render() {
    if (this.html) {
      const templateDiv = document.createElement('div');
      templateDiv.innerHTML = this.html;

      if (!this._hasRendered) {
        let savedDefaultNodes = null;
        const hasDefaultSlot = !!templateDiv.querySelector('slot:not([name])');
        if (hasDefaultSlot) {
          savedDefaultNodes = Array.from(this.childNodes).map(node => node.cloneNode(true));
        }

        const fragment = document.createDocumentFragment();
        while (this.firstChild) {
          fragment.appendChild(this.firstChild);
        }

        if (fragment.hasChildNodes()) {
          // Получаем все слоты из шаблона
          const slots = Array.from(templateDiv.querySelectorAll('slot'));
          const namedSlots = new Map();
          let defaultSlot = null;

          slots.forEach(slot => {
            const name = slot.getAttribute('name');
            if (name) {
              namedSlots.set(name, slot);
            } else {
              defaultSlot = slot;
            }
          });

          // Распределяем узлы по слотам
          const nodes = Array.from(fragment.childNodes);
          const defaultSlotNodes = [];

          nodes.forEach(node => {
            let targetSlot = null;

            if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('slot')) {
              const slotName = node.getAttribute('slot');
              targetSlot = namedSlots.get(slotName);
            } else {
              targetSlot = defaultSlot;
            }

            if (targetSlot) {
              // Если это дефолтный слот, собираем узлы отдельно
              if (targetSlot === defaultSlot) {
                defaultSlotNodes.push(node);
              } else {
                // Именованные слоты очищаем перед первым добавлением (если еще не чистили)
                if (!targetSlot._cleared) {
                  targetSlot.innerHTML = '';
                  targetSlot._cleared = true;
                }
                targetSlot.appendChild(node);
              }
            }
            // Если слота нет, узел остается в fragment и удаляется (как и должно быть в Shadow DOM)
          });

          // Обработка дефолтного слота
          if (defaultSlot) {
            const hasContent = defaultSlotNodes.some(node =>
              node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
            );

            if (hasContent) {
              defaultSlot.innerHTML = '';
              defaultSlotNodes.forEach(node => defaultSlot.appendChild(node));
            } else if (savedDefaultNodes && savedDefaultNodes.length > 0) {
              // Если контента нет, но были сохранены исходные узлы (резервная копия)
              defaultSlot.innerHTML = '';
              savedDefaultNodes.forEach(node => defaultSlot.appendChild(node));
            }
          }
        }
      }

      this.innerHTML = '';
      while (templateDiv.firstChild) {
        this.appendChild(templateDiv.firstChild);
      }
      this._resolveImagePaths();
      this._hasRendered = true;
    }
  }

  /**
   * Разрешает относительные пути к изображениям и ресурсам
   */
  _resolveImagePaths() {
    if (!this._baseUrl) return;

    // Находим все элементы с атрибутом src
    const elements = this.querySelectorAll('[src]');

    elements.forEach(el => {
      const src = el.getAttribute('src');
      if (src && (src.startsWith('./') || src.startsWith('../'))) {
        try {
          // Вычисляем абсолютный путь относительно JS файла компонента
          const absoluteSrc = new URL(src, this._baseUrl).href;

          // Для img обновляем свойство src (и атрибут)
          if (el.tagName === 'IMG') {
            el.src = absoluteSrc;
          }
          // Для остальных (custom elements) обновляем атрибут
          else {
            el.setAttribute('src', absoluteSrc);
          }
        } catch (e) {
          console.warn('Failed to resolve path:', src, e);
        }
      }
    });
  }
}

// Делаем класс доступным глобально, чтобы наследникам не нужно было его импортировать
window.BaseComponent = BaseComponent;
