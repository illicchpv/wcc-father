# BaseComponent — базовый класс для Light DOM Web Components

Этот класс расширяет `HTMLElement` и добавляет:
- декларативные свойства;
- загрузку HTML-шаблонов по имени компонента;
- объединение стилей из шаблона;
- обработку слотов (именованных и default);
- условные блоки в HTML-комментариях;
- внутренние шаблоны (`innerTemplate`) для списков;
- вспомогательные методы `evaluateString` и `renderInnerTemplateList`;
- автоматическое исправление относительных путей к ресурсам (`src`).

Док ниже ориентирован на использование из наследников (`class MyComp extends BaseComponent`).

---

## 1. Подключение

`BaseComponent` должен быть подключен на странице один раз перед остальными компонентами. Он регистрирует себя в глобальной области видимости `window.BaseComponent`.

```html
<script type="module" src="wcc/base/BaseComponent.js"></script>
```

либо с github page
```html
<script type="module" src="https://illicchpv.github.io/wcc-father/wcc/base/BaseComponent.js"></script>
```

---

## 2. Регистрация компонента

Для создания нового компонента нужно создать класс, наследующий от `BaseComponent`, и зарегистрировать его.

### Рекомендуемый паттерн (`registerWcc`)

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

Правила:
- имя класса — в PascalCase, например `HeaderBlock`, `NavBar`;
- HTML-тег вычисляется автоматически по имени класса через `BaseComponent.toKebab`:
  - `HeaderBlock` → `header-block`;
  - `NavBar` → `nav-bar`.

`registerWcc`:
- валидирует класс (наследуется от `BaseComponent`, корректное имя);
- строит тег в `kebab-case` и проверяет, что он подходит для custom element;
- один раз вызывает `customElements.define(tag, ctor)` (с защитой от повторной регистрации);
- прокидывает тег и `import.meta.url` в систему отслеживания загрузки.

---

## 3. Общий жизненный цикл наследника

Типичный компонент на базе BaseComponent:

1. Описывает свойства через `static get properties`.
2. В `constructor` инициализирует своё состояние.
3. В `connectedCallback` вызывает `this.loadTemplate(import.meta.url)`.
4. Переопределяет `render()`, если нужно:
   - вызывает `super.render()`;
   - кэширует ссылки на элементы (`querySelector`, `_cacheElements`);
   - навешивает обработчики событий (через `_setupEventListeners`, `onRef`, `emit`);
   - вызывает `updateView()` для заполнения данных.
5. Переопределяет `propertyChangedCallback`, чтобы реагировать на изменения свойств.
6. При необходимости:
   - использует условные блоки `<!-- if(...) -->`;
   - определяет `innerTemplate` для списков и реализует `_processInnerTemplates`;
   - использует `renderInnerTemplateList` и `evaluateString`.

---

## 4. Декларативные свойства (`static get properties`)

BaseComponent позволяет описывать свойства компонента в статическом геттере:

```js
static get properties() {
  return {
    userName: {
      type: String,
      attribute: 'user-name', // Можно указать явно
      default: 'Guest'
    },
    userAge: {
      type: Number,
      // attribute: 'user-age', // Если не указано, будет автоматически: 'user-age' (kebab-case)
      default: 18
    },
    isActive: {
      type: Boolean,
      // attribute: 'is-active', // Будет автоматически: 'is-active'
      default: false
    }
  };
}
```

Что даёт:
- создаются геттеры/сеттеры `this.userName`, `this.userAge`, `this.isActive`;
- значения синхронизируются с атрибутами:
  - если указано поле `attribute` — используется оно;
  - если не указано — используется kebab-case версия имени свойства (например, `userName` → `user-name`);
- при изменении свойства вызывается `propertyChangedCallback(name, oldValue, newValue)`;
- при изменении атрибута вызывается `attributeChangedCallback`, который обновляет свойство.

Типы:
- `Boolean` → наличие/отсутствие атрибута;
- `Number` → парсинг через `Number(...)`;
- `String` → как есть.

---

## 5. Шаблоны и Стили

### 5.1. Загрузка HTML-шаблона (`loadTemplate`)

Шаблон ищется в той же папке, что и JS-файл компонента, по имени класса:
- компонент: `MyComponent.js`;
- шаблон: `MyComponent.html`.

В `connectedCallback` наследник обычно делает:

```js
connectedCallback() {
  this.loadTemplate(import.meta.url);
}
```

Метод:
- проверяет, был ли компонент уже отрендерен;
- проверяет наличие статического шаблона (см. ниже);
- если нет статического, загружает `*.html`;
- прогоняет через `_processTemplate`;
- сохраняет исходный HTML в `this._rawHtml`;
- вызывает `forceUpdate()` для первой отрисовки.

### 5.2. Статический шаблон (Static Template)

Чтобы избежать асинхронного запроса `fetch` (который вызывает моргание интерфейса), можно задать шаблон прямо в файле компонента. 
Рекомендуемый паттерн — объявить переменную `_template` на уровне модуля (вне класса):

```js
const _template = `
  <style> .my-comp { color: red; } </style>
  <div class="my-comp">Content</div>
`;

export class MyComponent extends BaseComponent {
  static get template() {
    return _template;
  }
  // ...
}
```

Если этот геттер возвращает строку, `loadTemplate` использует её, и `fetch` не выполняется.

### 5.3. Обработка стилей (`_processTemplate`)

В шаблоне можно писать теги `<style>`:
- BaseComponent собирает все стили в один блок;
- создаёт `<style id="style-ИмяКласса">`;
- ищет `<script>`, чей `src` совпадает с URL компонента (`import.meta.url`);
- вставляет стили **сразу после** этого скрипта;
- если скрипт не найден, добавляет стили в конец `<head>`.

Эффект: стили компонента подключаются один раз, а шаблон остаётся без лишних `<style>` внутри.

### 5.4. Автоматическое исправление путей (`_resolveImagePaths`)

Проблема: в шаблонах компонента удобно писать относительные пути вроде `../img/...`, но после сборки/публикации структура файлов может измениться.

Решение:
- при `loadTemplate(baseUrl)` сохраняется `this._baseUrl = baseUrl` (обычно `import.meta.url`);
- после `render()` BaseComponent проходит по всем элементам с `src`;
- если `src` начинается с `./` или `../`, он переводится в абсолютный URL относительно `this._baseUrl`;
- для `<img>` обновляется свойство `src`, для остальных элементов — атрибут `src`.

Эффект: относительные пути внутри шаблона компонента остаются рабочими и в dev, и после публикации.

---

## 6. Слоты (default и именованные)

BaseComponent поддерживает:
- стандартный слот без имени: `<slot></slot>`;
- именованные слоты: `<slot name="header"></slot>`.

Механика:
- при **первом** `render()`:
  - создаётся временный DOM с шаблоном (`this.html`);
  - все текущие дочерние узлы компонента переносятся во временный фрагмент;
  - элементы с `slot="name"` попадают в соответствующие `<slot name="name">`;
  - остальные элементы и текст попадают в default `<slot>`;
- при последующих `render()` слоты не трогаются, обновляется только разметка шаблона внутри компонента.

Использование:
- в шаблоне компонента объявляете слоты;
- при использовании компонента передаёте содержимое внутрь тега.

---

## 7. Синтаксис шаблонов

BaseComponent предоставляет несколько расширений стандартного HTML для динамичности.

### 7.1. Условные блоки (`<!-- if(...) -->`)

Синтаксис:
```html
<!-- if(this.isActive) -->
  <div>Пользователь активен</div>
<!-- endif -->
```

Особенности:
- условие пишется как JS-выражение в контексте компонента (`this` доступен);
- если условие `true` → блок остаётся;
- если `false` → блок вырезается.

### 7.2. Блоки include (`<!-- include -->`)

Иногда нужно вставить в шаблон кусок HTML, который зависит от свойств компонента, но не хочется писать JS-код.

Синтаксис:
```html
<!-- include -->
  <wcc-skill-list skill-list="${this.skillList}"></wcc-skill-list>
<!-- /include -->
```

Как работает:
- BaseComponent ищет пары `<!-- include --> ... <!-- /include -->` в основном шаблоне.
- Содержимое блока обрабатывается как template literal в контексте текущего компонента (`${this.propName}`).
- Результат один раз подставляется на место блока.

Ограничения:
- include обрабатывается только в основном шаблоне (не в `innerTemplate`).
- include не реактивен (не пересчитывается при изменении свойств).
- Вложенные include внутри include не поддерживаются (обрабатывается только внешний блок).

Пример использования с JSON-данными:
Это полезно для передачи сложных данных в атрибуты вложенных компонентов.

```html
<!-- include -->
  <wcc-skill-list skill-list="${this.skillList}"></wcc-skill-list>
<!-- /include -->
```

BaseComponent выполняет интерполяцию строк (`${this.skillList}`), и вставляет результат в HTML **до** основного парсинга.

### 7.3. Внутренние шаблоны (`innerTemplate`)

Служат для декларативного описания разметки элементов списка внутри шаблона.

Синтаксис в HTML:
```html
<!-- innerTemplate:list-item -->
<div class="user-item">
  <strong class="item-name">${this.item.name}</strong>
  (<span class="item-role">${this.item.role}</span>)
</div>
<!-- /innerTemplate -->
```

Поведение:
- BaseComponent вырезает такие куски из HTML;
- сохраняет их в `this._innerTemplates[name] = content`;
- после рендеринга основного HTML вызывает `_processInnerTemplates(name, content)` для каждого шаблона.

---

## 8. Работа с событиями

### 8.1. Внутренние события (`emit`, `onRef`)

BaseComponent упрощает генерацию и навешивание событий.

#### `emit(eventName, detail, options?)`
Вызывает `CustomEvent` на экземпляре компонента.
```js
this.emit('header-block-action', { userName: this.userName });
```

#### `onRef(refName, eventType, handler, options?)`
Навешивает обработчик на элемент из `this._refs[refName]`.
```js
_cacheElements() {
  this._refs = { btn: this.querySelector('.btn') };
}

_setupEventListeners() {
  this.onRef('btn', 'click', (e) => { /* ... */ });
}
```

### 8.2. Глобальные события (window/document)

BaseComponent **не предоставляет** автоматической магии для подписки и отписки от глобальных событий (например, `resize`, `scroll`, `popstate`).

**Правила реализации:**
Если вашему компоненту нужно слушать **внешние** события, вы **обязаны** вручную реализовать методы жизненного цикла:

1.  **`connectedCallback()`**: Подписываемся (`addEventListener`).
2.  **`disconnectedCallback()`**: Отписываемся (`removeEventListener`).

```js
export class WccNavLink extends BaseComponent {
  constructor() {
    super();
    // Привязываем контекст
    this._handleLocationChange = this._handleLocationChange.bind(this);
  }

  connectedCallback() {
    this.loadTemplate(import.meta.url);
    window.addEventListener('popstate', this._handleLocationChange);
  }

  disconnectedCallback() {
    // Обязательно отписываемся!
    window.removeEventListener('popstate', this._handleLocationChange);
  }

  _handleLocationChange() { /* ... */ }
}
```

---

## 9. Вспомогательные методы

### `evaluateString(templateString)`
Позволяет интерпретировать обычную строку как template literal JS (с `${this...}`).
```js
const text = this.evaluateString('Привет, ${this.userName}!');
```

### `renderInnerTemplateList(items, templateContent, containerOrSelector)`
Утилитарный метод для типичного сценария «массив данных + innerTemplate → список DOM-элементов».

```js
_processInnerTemplates(name, content) {
  if (name === 'list-item') {
    this.renderInnerTemplateList(this.items, content, '.list-container');
  }
}
```

### `_processInnerTemplates(name, content)`
Хук, который вызывается после основного рендера для каждого innerTemplate. Наследник должен переопределить его для отрисовки списков.

### `calculateFluidValue(minWidth, maxWidth, minVal, maxVal)`
Метод для вычисления "резиновых" (fluid) значений на основе текущей ширины экрана.
```js
const fontSize = this.calculateFluidValue(320, 1200, 16, 24);
```

---

## 10. Глобальная готовность компонентов

BaseComponent помогает понять, когда **все** компоненты на странице загрузили и обработали свои шаблоны.

### Событие `wcc:all-components-ready`
Диспатчится на `window`, когда все скрипты с атрибутом `data-wcc` завершили инициализацию.

```js
window.addEventListener('wcc:all-components-ready', () => {
  console.log('Все компоненты готовы');
});
```

### Хук `onAllComponentsReady`
В компоненте можно определить этот метод, чтобы выполнить действия, когда все остальные компоненты готовы.

```js
onAllComponentsReady() {
  // Безопасно работать с другими компонентами
}
```
Гарантируется вызов ровно один раз на экземпляр, после первой отрисовки.

---

## 11. Интеграция с фреймворками

### Vue
Vue имеет отличную поддержку Web Components.
- Атрибуты с дефисом передаются как атрибуты.
- Свойства (props) можно передавать через `.prop` модификатор.
- События слушаются через `@custom-event`.

### React (версии 18 и ниже)
React имеет ограничения (все передается как строковые атрибуты, нет авто-подписки на CustomEvent).
Рекомендуется использовать **React-Wrapper** (см. пример в разделе 15 исходного дока или файл `useInReact.DOC.md`), который вручную синхронизирует пропсы и вешает слушатели событий.

### React 19+
В React 19 заявлена полная поддержка Custom Elements, Wrapper может не понадобиться.

---

## 12. Оптимизация и Продакшен

### 12.1. Минификация
Скрипт `wcc/base/minify.js` удаляет комментарии и пробелы из `BaseComponent.js`.
Запуск: `node wcc/base/minify.js`.
Подключение: `<script type="module" src="wcc/base/BaseComponent.min.js"></script>`.

### 12.2. Встраивание шаблонов (Inline Templates)
Скрипт `wcc/base/inline-templates.js` переносит содержимое `.html` файлов внутрь `.js` файлов в переменную `myTemplate`.
- Встраивание: `node wcc/base/inline-templates.js`
- Очистка (dev режим): `node wcc/base/inline-templates.js --clear`

#### Требования к структуре и коду
Чтобы скрипт обработал компонент, должны соблюдаться следующие условия:

1. **Структура файлов**:
   - Компонент должен лежать в своей папке.
   - Имя папки, JS-файла и HTML-файла должны совпадать.
   - *Пример:* `components/MyButton/MyButton.js` и `components/MyButton/MyButton.html`.

2. **Код компонента**:
   - Класс должен наследовать `BaseComponent` (проверка на наличие `extends BaseComponent`).
   - В файле должна быть объявлена переменная `myTemplate`.

```js
const myTemplate = ``; // или заполненная строка
```

3. **Игнорируемые папки**:
   - Скрипт пропускает папки: `node_modules`, `scripts`, `css`, `img`, `js` и любые папки, начинающиеся с точки (`.git`, `.vscode`).

Скрипт автоматически экранирует специальные символы (обратные кавычки, `${...}`), чтобы код шаблона оставался строкой и не исполнялся раньше времени.

### 12.3. Управление версиями (Versioning)
Скрипт `wcc/base/update-versions.js` добавляет параметр `?v=YYMMDD` к подключению скриптов для сброса кэша браузера.
- Обновление: `node wcc/base/update-versions.js index.html`
- Очистка: `node wcc/base/update-versions.js index.html --clear`

---

## 13. Диагностика и решение проблем

BaseComponent выводит в консоль предупреждения и ошибки.

### Частые проблемы

| Сообщение | Решение |
| --- | --- |
| `Property "..." type Boolean has default: true...` | Установите `default: false`. Boolean атрибут работает по принципу "есть/нет". |
| `tag already defined, skipping define` | Безопасно (обычно при HMR). |
| `Duplicate script import detected` | Удалите дублирующиеся теги `<script>` в HTML. |
| `Ошибка загрузки шаблона ...` | Проверьте имя и расположение `.html` файла. |
| `registerWcc: custom element tag must contain a dash` | Переименуйте класс в PascalCase (например, `WccButton`), чтобы в теге был дефис (`wcc-button`). |
