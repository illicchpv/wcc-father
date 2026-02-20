# WccMarkdown — аккордеон для Markdown-документации

`WccMarkdown` — light DOM веб-компонент для загрузки и отображения Markdown-файлов в виде аккордеона:
- заголовок с именем документа;
- содержимое в стиле GitHub Markdown;
- ленивое раскрытие по клику;
- привязка к `location.hash` для прямых ссылок.

Компонент:
- загружает Markdown по `src` (через `fetch`);
- парсит его через библиотеку `marked` (грузится один раз на всю страницу);
- отображает заголовок из первого `<h1>`/`<h2>` или имени файла;
- управляет состоянием `expanded` и URL‑хешем (`#id`);
- реагирует на изменения `hash` (авто‑раскрытие по якорю).

---

## 1. Подключение

В `index.html`:

```html
<script data-wcc type="module" src="wcc/base/BaseComponent.js"></script>
<script data-wcc type="module" src="wcc/WccMarkdown/WccMarkdown.js"></script>
```

После этого можно использовать тег:

```html
<wcc-markdown src="path/to/file.md"></wcc-markdown>
```

---

## 2. Базовое использование

Пример встраивания документации по `BaseComponent`:

```html
<wcc-markdown
  id="base-doc"
  src="wcc/base/BaseComponent.DOC.md"
></wcc-markdown>
```

Поведение:
- по умолчанию аккордеон закрыт (`expanded = false`);
- по клику на шапку компонент открывается, подгружает Markdown и рендерит его;
- заголовок (`this._title`) берётся из первого `<h1>`/`<h2>` внутри Markdown;
- если заголовка нет — используется имя файла (`BaseComponent.DOC.md`).

---

## 3. Шаблон и внешний вид

HTML‑шаблон (`WccMarkdown.html`):

```html
<style>
  wcc-markdown {
    display: block;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    margin: 16px 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background-color: #fff;
  }

  .header {
    padding: 12px 16px;
    background-color: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    border-radius: 6px 6px 0 0;
  }

  wcc-markdown:not([expanded]) .header {
    border-bottom: none;
    border-radius: 6px;
  }

  .header:hover {
    background-color: #f0f3f6;
  }

  .title {
    font-weight: 600;
    font-size: 16px;
    margin: 0;
    color: #24292e;
  }

  .icon {
    color: #586069;
    transition: transform 0.2s ease;
    font-size: 12px;
  }

  wcc-markdown[expanded] .icon {
    transform: rotate(180deg);
  }

  .markdown-body {
    padding: 24px;
    font-size: 14px;
    line-height: 1.5;
    color: #24292e;
    overflow-x: auto;
  }
</style>

<div class="header" onclick="this.closest('wcc-markdown').toggle()">
  <h3 class="title"><!-- include -->${this._title}<!-- /include --></h3>
  <span class="icon">▼</span>
</div>

<!-- if(this.expanded) -->
<div class="markdown-body"></div>
<!-- endif -->
```

Особенности:
- заголовок и стрелка живут в `.header`;
- содержимое рендерится внутрь `.markdown-body`, но только если `expanded == true` (через условный блок `<!-- if(this.expanded) -->`);
- стили копируют базовый GitHub‑подобный вид (заголовки, списки, код, таблицы и т.д.).

---

## 4. Свойства и атрибуты

`WccMarkdown` наследуется от `BaseComponent` и объявляет свойства:

```js
static get properties() {
  return {
    src: {type: String, default: ''},
    expanded: {type: Boolean, default: false}
  };
}
```

### 4.1. `src` (string)

- Путь к Markdown‑файлу (относительный или абсолютный URL).
- При изменении:
  - вызывается `loadMarkdown(newValue)`;
  - предыдущий контент может быть перезаписан.
- Есть защита от повторной загрузки одного и того же URL:
  - `_loadedUrl` хранит последний успешно/в процессе загружаемый URL;
  - если `url === _loadedUrl`, повторный вызов игнорируется.

### 4.2. `expanded` (boolean / атрибут)

- Управляет раскрытием/скрытием аккордеона:
  - `expanded = true` → контент показывается;
  - `expanded = false` → контент скрыт.
- При изменении:
  - если `expanded` стал `true` и у компонента есть `id`:
    - `window.location.hash` устанавливается в `#id`;
  - если `expanded` стал `false` и текущий `hash` равен `#id`:
    - вызывается `history.replaceState(...)` для удаления `#id` из URL, сохраняя `pathname` и `search`;
  - вызывается `this.forceUpdate()` для перерендера шаблона.

### 4.3. `id` (HTML‑атрибут, не свойство BaseComponent)

- Используется для привязки к `location.hash`.
- Если:
  - URL содержит `#id` компонента;
  - при подключении или при событии `hashchange` — компонент раскрывается автоматически.

---

## 5. Поведение с `location.hash`

Компонент реализует двустороннюю связь с URL‑хешем:

1. При подключении (`connectedCallback`):
   - вызывает `_checkHash()`;
   - подписывается на `window.addEventListener('hashchange', ...)`.

2. Метод `_checkHash()`:
   - берёт текущий `window.location.hash` (без `#`);
   - если он совпадает с `this.id`:
     - если `expanded == false`, раскрывает компонент (`expanded = true`);
     - после короткой задержки делает `scrollIntoView` к началу компонента (плавная прокрутка);
   - если не совпадает и компонент был раскрыт:
     - сворачивает его (`expanded = false`).

3. Изменение `expanded` изнутри:
   - при открытии:
     - выставляет `hash = #id`, если `id` задан;
   - при закрытии:
     - очищает `hash`, если он равен `#id`, через `history.replaceState`.

Итого:
- клик по аккордеону меняет URL‑хеш;
- прямой переход по URL с `#id` раскрывает нужный блок с документацией и скроллит к нему;
- смена хеша (назад/вперёд в истории) корректно раскрывает/скрывает компонент.

---

## 6. Загрузка и парсинг Markdown

Основная логика в `loadMarkdown(url)`:

1. Проверка:
   - если `url` пустой или совпадает с `_loadedUrl` → выход;
   - сохраняется `_loadedUrl = url`.

2. Начало загрузки:
   - `_title = 'Loading...'`;
   - `forceUpdate()` для обновления заголовка.

3. Загрузка библиотеки `marked`:
   - вызывается `_loadMarkedLib()`:
     - если `window.marked` уже есть — сразу возвращает;
     - иначе создаёт `<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js">`;
     - хранит промис в статическом поле `WccMarkdown._markedLoadingPromise` (singleton);
     - все параллельные вызовы ждут один и тот же промис.

4. Загрузка файла:
   - `fetch(url)`;
   - если `response.ok === false` → исключение с текстом и статусом;
   - `const text = await response.text();`.

5. Парсинг Markdown:
   - проверка наличия `window.marked`;
   - `const html = window.marked.parse(text);`;
   - сохраняется `this._content = html`.

6. Определение заголовка:
   - ищется первое совпадение `<h1>` в сгенерированном HTML;
   - если нет — пробуется `<h2>`;
   - если найдён текст — очищаются теги и он становится `_title`;
   - иначе `_title = имя файла из url` (`url.split('/').pop()`).

7. Финальный `forceUpdate()`:
   - обновляет заголовок аккордеона;
   - при раскрытом состоянии — перерисовывает тело.

### 6.1. Обработка ошибок

При любой ошибке (загрузка `marked`, `fetch`, парсинг):

- в консоль пишется ошибка с префиксом `[WccMarkdown]`;
- `_title = 'Error loading documentation'`;
- `_content` содержит HTML с сообщением `Error: ...` красным цветом;
- вызывается `forceUpdate()` для отображения ошибки в UI;
- `_loadedUrl` сбрасывается в `null`, чтобы следующая попытка загрузки была возможна.

---

## 7. Рендеринг и `toggle()`

### 7.1. Метод `toggle()`

```js
toggle() {
  this.expanded = !this.expanded;
}
```

- вызывается из шаблона по клику на `.header`;
- всё остальное поведение (hash, перерисовка) завязано на `propertyChangedCallback` для `expanded`.

### 7.2. Метод `render()`

- вызывает `super.render()`, чтобы BaseComponent:
  - применил шаблон;
  - обработал `include`/`if(...)` и т.д.;
- затем:
  - находит контейнер `const container = this.querySelector('.markdown-body');`;
  - если контейнер есть и `_content` не пустой:
    - вставляет HTML: `container.innerHTML = this._content;`;
  - если контейнера нет, но `expanded == true`:
    - выводит предупреждение в консоль.

Важно:
- тело Markdown рендерится только при `expanded == true` (благодаря условному блоку в шаблоне);
- при повторном раскрытии уже загруженного документа повторной загрузки не происходит (если не менялся `src`).

---

## 8. Типичные сценарии использования

### 8.1. Секция документации с несколькими блоками

```html
<section>
  <h2>Документация</h2>

  <wcc-markdown
    id="base-doc"
    src="wcc/base/BaseComponent.DOC.md"
  ></wcc-markdown>

  <wcc-markdown
    id="hash-route-doc"
    src="wcc/WccHashRoute/WccHashRoute.DOC.md"
  ></wcc-markdown>
</section>
```

- каждый блок имеет свой `id`;
- прямой переход на `#/hash-route-doc` раскрывает конкретную секцию.

### 8.2. Принудительное раскрытие/сворачивание из кода

```js
const doc = document.querySelector('wcc-markdown#base-doc');
doc.expanded = true;  // раскрыть и проскроллить (если hash совпадает)
doc.expanded = false; // свернуть и убрать hash (если он был #base-doc)
```

### 8.3. Повторная загрузка после ошибки

Если при первой попытке загрузки произошла ошибка:
- `_loadedUrl` сбрасывается;
- можно ещё раз установить `src` в тот же URL, чтобы перезапустить загрузку:

```js
const doc = document.querySelector('wcc-markdown#base-doc');
doc.src = doc.src; // триггерит повторный loadMarkdown
```

