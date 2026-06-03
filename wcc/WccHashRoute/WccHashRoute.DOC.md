# WccHashRoute — простой роутер по hash/пути

`WccHashRoute` — light DOM веб-компонент, который показывает только один из своих дочерних элементов в зависимости от текущего URL (hash `#/...` или `pathname`), имитируя простой роутинг без фреймворков.

Компонент:
- слушает изменения адреса (`hashchange`, `popstate`);
- вычисляет текущий путь и параметры запроса (query params);
- выбирает подходящего ребёнка по шаблону `route` (игнорируя query params);
- добавляет активному элементу атрибут `route-param` (значения `*` или остаток префикса);
- генерирует событие `wcc:routechange` с передачей пути, query params и активного элемента;
- предоставляет API для программной навигации (`setRoute`) и работы с query (`setQueryParams` и др.).

---

## 1. Подключение

В `index.html`:

```html
<script data-wcc type="module" src="wcc/base/BaseComponent.js"></script>
<script data-wcc type="module" src="wcc/WccHashRoute/WccHashRoute.js"></script>
```

После этого можно использовать тег:

```html
<wcc-hash-route>...</wcc-hash-route>
```

---

## 2. Базовое использование

```html
<nav>
  <!-- только ссылки с атрибутом route-link участвуют в подсветке active -->
  <a route-link href="#/">Home</a>
  <a route-link href="#/doc">Doc</a>
  <a route-link href="#/doc-short">Doc short</a>
  <a route-link href="#/doc-short/main">Doc main</a>
</nav>

<wcc-hash-route>
  <div route="/">
    <p>Маршрут / — заглушка.</p>
  </div>

  <div route="/doc">
    <wcc-markdown id="doc" src="wcc/base/BaseComponent.DOC.md"></wcc-markdown>
  </div>

  <div route="/doc-short*">
    <wcc-markdown id="doc-short" src="wcc/base/BaseComponent.DOCshort.md"></wcc-markdown>
  </div>

  <div route="/doc-short/main">
    <p>Маршрут /doc-short/main</p>
  </div>

  <div route="/doc-short*/main*">
    <p>Маршрут /doc-short*/main*</p>
  </div>

  <div route="*">
    <p>Неизвестный маршрут, показываем запасной вариант.</p>
  </div>
</wcc-hash-route>
```

Навигация:
- по hash: ссылки вида `href="#/doc"`;
- по пути: ссылки вида `href="/doc"` (это будет обычная навигация браузера, если отдельно не реализовать `pushState`).

---

## 3. Шаблон `WccHashRoute`

HTML шаблон (light DOM) выглядит так:

```html
<style>
  .wccHashRoute {
    display: block;
  }
</style>
<div class="wccHashRoute">
  <slot></slot>
</div>
```

Все дочерние элементы (`<div route="...">`) живут в light DOM внутри `slot`.

---

## 4. Атрибуты и дочерние элементы

Сам `WccHashRoute`:
- не имеет собственных публичных атрибутов;
- полностью управляется текущим URL.

У дочерних элементов внутри:

- `route` — строковый шаблон маршрута.
  - Примеры:
    - `route="/"` — строго корень;
    - `route="/doc"` — точное совпадение с `/doc` и префиксное с `/doc/...`;
    - `route="/doc-short*"` — `/doc-short` + любой хвост без `/`;
    - `route="/doc-short*/main*"` — две звёздочки, разделённые `/`.
  - Символ `*` соответствует любым символам, кроме `/` (может быть пустой строкой).

- `route="*"` — fallback‑маршрут:
  - показывается, если ни один другой `route` не подошёл.

- `route-param` — атрибут, который `WccHashRoute` ставит активному элементу:
  - содержит значения всех `*`, склеенные через `/`;
  - для статических маршрутов (без `*`) атрибут удаляется;
  - для префиксного совпадения статического маршрута атрибут содержит остаток пути;
  - если `*` совпали с пустой строкой, атрибут будет `route-param=""`.

- `onRouteEnter({path, routeParam, queryParams})` — необязательный метод на дочернем элементе:
  - если активный элемент реализует этот метод, `WccHashRoute` вызовет его
    при смене активного маршрута или изменении query-параметров;
  - маршрут считается изменившимся, если поменялись:
    - активный элемент;
    - `path`;
    - `routeParam`;
    - `queryParams` (даже если путь остался тем же);
    - факт наличия/отсутствия самого метода;
  - это удобно для подгрузки данных и управления состоянием:
    `onRouteEnter({path, routeParam, queryParams}) { /* fetch + render */ }`.

- Ссылки навигации:
  - в подсветке активной ссылки участвуют только те `<a>`, у которых есть
    атрибут `route-link`;
  - роутер находит все такие ссылки с `href`, начинающимся с `#/` или `/`,
    вычисляет для каждой «вес» совпадения с текущим путём и добавляет класс
    `active` только лучшему совпадению.

---

## 5. Как определяется текущий путь

Метод `_getCurrentPath()` работает так:

1. Берётся `window.location.hash`:
   - если он начинается с `#/` → путь = всё после `#`;
   - пример: `#/doc-short/main` → `/doc-short/main`.
2. Иначе используется `window.location.pathname`:
   - отрезается `index.html` в конце (если есть);
   - если путь пустой, используется `'/'`.

Итого:
- при навигации по hash (`#/...`) роутинг управляется только хешем;
- без hash — можно использовать «чистые» пути (при наличии `pushState` и настроенного сервера).

---

## 6. Правила сопоставления маршрутов

`WccHashRoute` проходит по всем дочерним элементам с атрибутом `route` и для каждого:

1. Если `route === '*'` — запоминает как fallback.
2. Иначе вызывает `_matchRoutePattern(route, path)`:
   - если `route` **без `*`**, есть два варианта совпадения:
     - точное совпадение: `route === path`
       - `score = 10000 + route.length` (точное совпадение всегда выше любых префиксов/шаблонов);
       - `route-param` не выставляется;
     - префиксное совпадение:
       - для `route === '/'`: совпадает с любым путём вида `'/...'` (кроме `'/'`), а в `route-param` кладётся путь без ведущего `/`;
       - для остальных: если `path` начинается с `route + '/'`, то совпадение считается успешным, а в `route-param` кладётся остаток пути после `route + '/'`.
       - `score = route.length` (чем длиннее префикс, тем выше приоритет);
   - если `route` содержит `*`:
     - `*` заменяется на группу `([^/]*)` (любой текст без `/`);
     - строится регулярка вида `^/doc-short([^/]*)/main([^/]*)$`;
     - при совпадении:
       - `score = количество фиксированных символов` (чем их больше, тем приоритет выше);
       - `starValues = массив захваченных значений звёздочек` (они склеиваются через `/` в `route-param`).

3. Среди всех совпавших маршрутов выбирается:
   - маршрут с максимальным `score`;
   - при равном `score` выигрывает тот, который был найден раньше.

4. Если ни один маршрут не совпал:
   - выбирается fallback `route="*"` (если есть);
   - иначе ничего не показывается.

---

## 7. Поведение при переключении маршрута

При каждом изменении URL (`hashchange`, `popstate`, первый `connectedCallback`):

1. Вычисляется текущий путь.
2. Выбирается активный ребёнок (см. правила выше).
3. Для всех детей с `route`:
   - активный:
     - `hidden` удаляется;
     - `style.display = ''`;
     - если есть `starValues`, выставляется `route-param="..."`;
   - остальные:
     - `hidden` добавляется;
     - `style.display = 'none'`;
     - `route-param` удаляется.


---

## 8. Событие `wcc:routechange`

После каждого успешного обновления активного ребёнка `WccHashRoute` генерирует событие:

```js
this.dispatchEvent(new CustomEvent('wcc:routechange', {
  detail: {
    path,
    activeElement: active || null,
    params: new URLSearchParams(/* текущие query params */),
    source: null
  },
  bubbles: true,
  composed: true
}));
```

Подписка снаружи:

```js
const router = document.querySelector('wcc-hash-route');
router.addEventListener('wcc:routechange', (e) => {
  console.log('current path:', e.detail.path);
  console.log('query params:', e.detail.params.toString());
  console.log('tb_tab:', e.detail.params.get('tb_tab'));
  console.log('active element:', e.detail.activeElement);
});
```

Это позволяет:
- логировать навигацию;
- синхронизировать состояние приложения с текущим роутом;
- реагировать на выбор конкретного `route`.

### 8.1. Поле `source` (кто инициировал изменение)

Методы, которые меняют query (`setQueryParams`, `replaceQueryParams`, `clearQueryParams`, `setQueryParam`), принимают `options.source`.

Если указать `source`, то в следующем событии `wcc:routechange` поле `detail.source` будет равно этому значению. Это удобно, чтобы слушатели могли игнорировать «свои» изменения.

Дополнительно есть хелпер:

```js
router.addEventListener('wcc:routechange', (e) => {
  if (!router.shouldHandleRouteChange(e, someComponent)) return;
  // обработка
});
```

---

## 9. Ограничения и заметки

- Компонент ориентирован на простые SPA‑кейсы:
  - нет полноценной вложенной маршрутизации как в больших роутерах (но есть префиксные совпадения);
  - нет динамического добавления/удаления маршрутов во время работы (возможны, но нужно аккуратно).
- Совместим как с hash‑роутингом, так и с path‑роутингом:
  - hash‑вариант работает из коробки;
  - path‑вариант поддерживается в части чтения `window.location.pathname`, если hash не начинается с `#/`;
  - сам роутер не перехватывает клики по ссылкам `href="/..."` и не делает `pushState` — это нужно реализовать отдельно (и настроить сервер, чтобы отдавал `index.html` для любых путей).

---

## 10. FAQ / рецепты маршрутов

### 10.1. Все пользователи и один конкретный пользователь

```html
<wcc-hash-route>
  <div route="/users">
    <p>Список всех пользователей</p>
  </div>

  <div route="/user*">
    <p>Страница конкретного пользователя</p>
  </div>
</wcc-hash-route>
```

- `/users` → список;
- `/users/42` → тоже попадёт в `route="/users"` (префиксное совпадение), `route-param="42"`;
- `/user42`, `/user_abc` → попадают в `route="/user*"`;
- в `route-param` придёт хвост после `/user` (например, `42`).

### 10.2. Детали пользователя: `/user42/details`

```html
<wcc-hash-route>
  <div route="/user*/details">
    <p>Детальная страница пользователя</p>
  </div>

  <div route="/user*">
    <p>Общая страница пользователя</p>
  </div>

  <div route="*">
    <p>404 / fallback</p>
  </div>
</wcc-hash-route>
```

- `/user42/details`:
  - подходит под `/user*/details`;
  - `route-param` = значение `*` после `/user` (например, `42`);
- `/user42`:
  - не подходит под `/user*/details`;
  - подходит под `/user*`.

Важно: более специфичный маршрут (`/user*/details`) должен давать больший `score`, что обеспечивает приоритет при совпадении.

### 10.3. Категория + товар: `/catalog/shoes/123`

```html
<wcc-hash-route>
  <div route="/catalog*">
    <p>Любая страница каталога</p>
  </div>

  <div route="/catalog*/item*">
    <p>Конкретный товар</p>
  </div>
</wcc-hash-route>
```

Примеры:
- `/catalog` → попадает в `/catalog*`;
- `/catalog/shoes` → тоже `/catalog*`;
- `/catalog/shoes/item123`:
  - подходит под оба шаблона, но:
    - у `/catalog*/item*` больше фиксированных символов → выше `score` → он победит.

В `route-param` активного маршрута `/catalog*/item*` будут две части, склеенные через `/`:
- первая `*` → категория (`shoes`);
- вторая `*` → идентификатор (`item123`);
- `route-param="shoes/item123"`.

### 10.4. Простой 404 для всего неизвестного

```html
<wcc-hash-route>
  <div route="/">
    <p>Главная</p>
  </div>

  <div route="/about">
    <p>О проекте</p>
  </div>

  <div route="*">
    <p>404 — страница не найдена</p>
  </div>
</wcc-hash-route>
```

- Любой путь, не совпавший с `/` или `/about`, попадёт в `route="*"`.
- `/about/team` попадёт в `route="/about"` (префиксное совпадение), `route-param="team"`.

### 10.5. Параметры маршрута через `route-param`

Если нужно вытащить параметры внутри дочернего компонента:

```html
<wcc-hash-route>
  <div route="/user*/details*">
    <user-details></user-details>
  </div>
</wcc-hash-route>
```

- URL: `#/user42/details/edit`:
  - первая `*` = `42`;
  - вторая `*` = `/edit` (без `/`, т.е. `edit`);
  - `route-param="42/edit"`.

Внутри `user-details` можно прочитать:

```js
const host = this.closest('[route]');
const params = host?.getAttribute('route-param') || '';
// params = "42/edit"
```

Дальше — самостоятельно распарсить строку по `/` и использовать значения.

### 10.6. Префиксное совпадение для статических маршрутов

Статический маршрут без `*` может совпадать не только точно, но и как префикс:
- `route="/doc"` совпадает с `path="/doc/intro"` (но не с `"/docintro"`);
- `route="/"` совпадает с любым путём вида `"/..."` (кроме точного `"/"`).

Пример:

```html
<wcc-hash-route>
  <div route="/doc">
    <doc-page></doc-page>
  </div>

  <div route="*">
    <p>404</p>
  </div>
</wcc-hash-route>
```

Пути и `route-param`:
- `#/doc` → точное совпадение, `route-param` не выставляется;
- `#/doc/intro` → префиксное совпадение, `route-param="intro"`;
- `#/doc/intro/chapter-1` → `route-param="intro/chapter-1"`;
- `#/anything` (если нет других совпадений) → сработает `route="/"`, `route-param="anything"`.

Использование в компоненте через `onRouteEnter`:

```js
onRouteEnter({ routeParam }) {
  const tail = routeParam || '';
  // tail: "" | "intro" | "intro/chapter-1"
}
```

---

## 11. Программная навигация и query API

Для перехода на другой маршрут из JavaScript можно использовать два способа:

### 11.1. Через `window.location.hash` (стандартный способ)

```javascript
// Переход на страницу пользователей
window.location.hash = '#/users';

// С параметрами (нужно самому собирать строку)
window.location.hash = '#/users?sort=desc';
```

### 11.2. Через метод `setRoute` (удобный способ)

Роутер предоставляет метод `setRoute(path, queryParams)`, который сам формирует корректный hash.

```javascript
const router = document.querySelector('wcc-hash-route');

// Просто переход
router.setRoute('/users');

// Переход с параметрами
router.setRoute('/users', { sort: 'desc', page: 1 });
// URL станет #/users?sort=desc&page=1
```

### 11.3. Чтение текущего состояния

```js
const router = document.querySelector('wcc-hash-route');

router.getQueryParams();       // { sort: "desc", page: "1" }
router.getQueryParam('page');  // "1" или null
router.getRouteState();        // { path: "/users", params: URLSearchParams }
```

### 11.4. Обновление query без смены пути

```js
router.setQueryParam('page', 2);
router.setQueryParams({ page: 2, sort: 'asc' });
router.setQueryParams({ page: null }); // удаление параметра

router.replaceQueryParams({ page: 1 }); // полностью заменить query
router.clearQueryParams();              // удалить все query
```

`options` (опционально):
- `mode: 'push' | 'replace'` — как менять историю (`replace` не создаёт запись в history);
- `source: any` — попадёт в `e.detail.source` следующего `wcc:routechange`.
