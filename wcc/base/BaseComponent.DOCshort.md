# BaseComponent — шпаргалка

Минимальный объём, чтобы быстро вспомнить, что есть в BaseComponent.

---

## 0. Подключение (Setup)

Добавьте в `head` страницы (перед скриптами компонентов):
```html
<script type="module" src="wcc/base/BaseComponent.js"></script>
```

## 1. Базовый паттерн компонента

- Импорт: **не требуется** (класс глобальный).
- Наследуемся:

  - `class MyComp extends BaseComponent {}`
- Свойства:
  - `static get properties() { return { title: { type: String, attribute: 'title', default: '' } }; }`
- Жизненный цикл:
  - `constructor()` — инициализация своего состояния;
  - `connectedCallback() { this.loadTemplate(import.meta.url); }`
  - `render()`:
    - `super.render();`
    - кэшируем элементы (`querySelector`);
    - вешаем события;
    - вызываем `updateView()`.
- Регистрация (обязательно):
  - `BaseComponent.registerWcc(MyComp, import.meta.url);`

---

## 2. Шаблон и стили

- HTML-шаблон:
  - рядом с JS;
  - имя = имени класса (`MyComp.html`).
- **Статический шаблон (New!)**:
  - `static get template() { return \`...\`; }`
  - Если есть, файл не грузится (нет моргания). Экранируйте внутренние переменные как \${this...}.
- `loadTemplate(import.meta.url)`:
  - грузит HTML (или берёт статический);
  - собирает `<style>` в один блок с id `style-ИмяКласса`;
  - вставляет его сразу после `<script>` компонента (или в конец `<head>`);
  - сохраняет сырой HTML в `_rawHtml`;
  - вызывает `forceUpdate()`.

---

## 3. Регистрация и глобальное событие готовности компонентов

- В `<head>`:

  ```html
  <script data-wcc type="module" src="wcc-sections/NavBar/NavBar.js"></script>
  <script data-wcc type="module" src="wcc-sections/HeaderBlock/HeaderBlock.js"></script>
  ```

- Каждый компонент регистрируется так:

  ```js
  export class HeaderBlock extends BaseComponent {
    connectedCallback() {
      this.loadTemplate(import.meta.url);
    }
    render() {
      super.render();
    }
  }

  BaseComponent.registerWcc(HeaderBlock, import.meta.url);
  ```

- После первой отрисовки:
  - убирает `data-wcc` со своего `<script>`;
  - когда скриптов с `data-wcc` не остаётся —
    - BaseComponent диспатчит `window`-событие `wcc:all-components-ready`.

- Пример подписки:

  ```js
  window.addEventListener('wcc:all-components-ready', () => {
    console.log('Все компоненты готовы');
  });
  ```

- Внутри компонента можно определить хук:

  ```js
  export class SomeBlock extends BaseComponent {
    onAllComponentsReady() {
      // вызывается один раз после того, как все компоненты готовы
    }
  }
  ```

  BaseComponent сам следит за событием и вызывает `onAllComponentsReady`
  только после первой отрисовки компонента.

---

## 4. Свойства и атрибуты

- Описываем в `static get properties()`.
- Типы:
  - `String`, `Number`, `Boolean`.
- Синхронизация:
  - свойство ↔ атрибут:
    - если есть `attribute: '...'` — используется оно;
    - иначе — автоматически kebab-case (`myProp` → `my-prop`);
  - при изменении свойства → `propertyChangedCallback(name, oldValue, newValue)`;
  - при изменении атрибута → обновление свойства.

---

## 5. Слоты (рецепт)

1. В шаблоне компонента объявляем слоты:
   - default: `<slot></slot>`;
   - именованный: `<slot name="header"></slot>`.
2. В разметке использования передаём контент внутрь тега:
   - `<my-comp>`
   - `  <div>default</div>`
   - `  <div slot="header">header</div>`
   - `</my-comp>`
3. При первом `render()` BaseComponent:
   - забирает текущих детей компонента;
   - отправляет элементы с `slot="..."` в соответствующие `<slot name="...">`;
   - остальные элементы/текст кладёт в default `<slot>`.
4. Внутри `render()` наследника всё как обычно:
   - `super.render();`
   - кэшируем элементы, вешаем события, обновляем представление.

---

## 6. Условные блоки

- Синтаксис в HTML:

  - `<!-- if(this.isActive) --> ... <!-- endif -->`

- Логика:
  - выражение выполняется в контексте компонента (`this`);
  - `true` → блок оставляем;
  - `false` → вырезаем.
- Место применения:
  - простые включения/выключения фрагментов разметки.

---

## 7. innerTemplate

- В шаблоне:

  ```html
  <!-- innerTemplate:list-item -->
  <div class="user-item">
    <strong>${this.item.name}</strong>
    (<span>${this.item.role}</span>)
  </div>
  <!-- /innerTemplate -->
  ```

- BaseComponent:
  - вырезает фрагмент;
  - кладёт в `this._innerTemplates['list-item']`;
  - после рендера вызывает `_processInnerTemplates(name, content)`.

---

## 8. evaluateString

- Метод:
  - `evaluateString(templateString)`
- Что делает:
  - интерпретирует строку как template literal JS;
  - `${...}` выполняется в контексте компонента (`this`).
- Пример:
  - `this.evaluateString('Привет, ${this.userName}!')`
- Использование:
  - внутри innerTemplate (доступно `this.item`, `this.userName` и т.д.);
  - для генерации динамических текстов без внешних шаблонизаторов.

---

## 9. renderInnerTemplateList

- Сигнатура:

  - `renderInnerTemplateList(items, templateContent, containerOrSelector)`

- Параметры:
  - `items` — массив данных;
  - `templateContent` — строка innerTemplate;
  - `containerOrSelector` — селектор контейнера или сам элемент.

- Как работает:
  - ищет контейнер;
  - очищает его;
  - для каждого `item`:
    - `this.item = item;`
    - `const html = this.evaluateString(templateContent);`
    - `container.insertAdjacentHTML('beforeend', html);`
  - после цикла `delete this.item`.

- Типичный вызов в `_processInnerTemplates`:

  ```js
  _processInnerTemplates(name, content) {
    if (name === 'list-item') {
      this.renderInnerTemplateList(this.items, content, '.list-container');
    }
  }
  ```

---

## 9. Автоисправление путей к ресурсам

- В шаблоне можно писать:
  - `<img src="../img/pic.png">`
- `loadTemplate(import.meta.url)`:
  - сохраняет `this._baseUrl` (URL JS-файла компонента).
- После `render()`:
  - `_resolveImagePaths()`:
    - ищет все `[src]`;
    - для `./` и `../` строит абсолютный URL на основе `this._baseUrl`;
    - обновляет `src` у `<img>` и атрибут `src` у прочих элементов.

---

## 10. include-блоки

- Позволяют один раз подставить значения `this.*` в кусок шаблона.
- Синтаксис:

  ```html
  <!-- include -->
    <wcc-skill-list skill-list="${this.skillList}"></wcc-skill-list>
  <!-- /include -->
  ```

- Поведение:
  - содержимое блока вычисляется как template literal в контексте компонента;
  - результат подставляется на место блока;
  - дальше HTML живёт как обычная разметка, без автообновления.
- Ограничения:
  - include внутри `innerTemplate` не обрабатывается;
  - вложенные include не поддерживаются.

---

## 11. Адаптивность (calculateFluidValue)

- `calculateFluidValue(minWidth, maxWidth, minVal, maxVal)`:
  - Считает промежуточное значение (fluid) по ширине экрана.
  - Полезно для JS-анимаций или сложной адаптивности, которую трудно сделать в CSS.

---

## 12. События (рецепт)

1. В `render()` после `super.render()`:
   - вызываем `_cacheElements()` и `_setupEventListeners()`.
2. В `_cacheElements()` сохраняем ссылки:
   - `this._refs = { btn: this.querySelector('.my-btn') };`
3. В `_setupEventListeners()` используем `onRef` и `emit`:

   ```js
   _setupEventListeners() {
     this.onRef('btn', 'click', (e) => {
       this.emit('my-comp-action', {
         foo: this.foo,
         component: this,
         event: e,
       });
     });
   }
   ```

---

## 13. Быстрый чек-лист при создании компонента

1. Наследуемся от `BaseComponent`.
2. Описываем `static get properties()`.
3. В `connectedCallback` вызываем `this.loadTemplate(import.meta.url)`.
4. После определения класса вызываем `BaseComponent.registerWcc(MyComp, import.meta.url)`.
5. В `render()`:
   - `super.render();`
242→   - кэшируем элементы, вешаем события (`_cacheElements`, `_setupEventListeners`, `onRef`, `emit`);
243→   - вызываем `updateView()`.
244→6. Используем при необходимости:
   - слоты;
   - `<!-- if(...) -->`;
   - `innerTemplate` + `_processInnerTemplates` + `renderInnerTemplateList`;
   - `evaluateString` для текстов;
   - относительные пути `src` в шаблоне (автофикc BaseComponent).
