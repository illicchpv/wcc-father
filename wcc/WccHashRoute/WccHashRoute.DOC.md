# WccHashRoute — простой роутер по hash/пути

`WccHashRoute` — light DOM веб-компонент, который показывает только один из своих дочерних элементов в зависимости от текущего URL (hash `#/...` или `pathname`), имитируя простой роутинг без фреймворков.

Компонент:
- слушает изменения адреса (`hashchange`, `popstate`);
- вычисляет текущий путь;
- выбирает подходящего ребёнка по шаблону `route`;
- добавляет активному элементу атрибут `route-param` с параметрами маршрута;
- генерирует событие `route-change`.

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
  <a href="#/">Home</a>
  <a href="#/doc">Doc</a>
  <a href="#/doc-short">Doc short</a>
  <a href="#/doc-short/main">Doc main</a>
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
- по пути: ссылки вида `href="/doc"` + логика `pushState` / настройка сервера (опционально).

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
    - `route="/doc"` — строго `/doc`;
    - `route="/doc-short*"` — `/doc-short` + любой хвост без `/`;
    - `route="/doc-short*/main*"` — две звёздочки, разделённые `/`.
  - Символ `*` соответствует любым символам, кроме `/` (может быть пустой строкой).

- `route="*"` — fallback‑маршрут:
  - показывается, если ни один другой `route` не подошёл.

- `route-param` — атрибут, который `WccHashRoute` ставит активному элементу:
  - содержит значения всех `*`, склеенные через `/`;
  - если звёздочек нет или они пустые — `route-param=""` или атрибут не создаётся.

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
   - если `route` **без `*`**:
     - совпадение только при полном равенстве строк;
     - при успехе возвращается:
       - `score = 10000 + route.length` (приоритет точных совпадений);
   - если `route` содержит `*`:
     - `*` заменяется на группу `([^/]*)` (любой текст без `/`);
     - строится регулярка вида `^/doc-short([^/]*)/main([^/]*)$`;
     - при совпадении:
       - `score = количество фиксированных символов` (чем их больше, тем приоритет выше);
       - `starValues = массив захваченных значений звёздочек`.

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

## 8. Событие `route-change`

После каждого успешного обновления активного ребёнка `WccHashRoute` генерирует событие:

```js
this.emit('route-change', {
  path,
  activeElement: active || null,
});
```

Подписка снаружи:

```js
const router = document.querySelector('wcc-hash-route');
router.addEventListener('route-change', (e) => {
  console.log('current path:', e.detail.path);
  console.log('active element:', e.detail.activeElement);
});
```

Это позволяет:
- логировать навигацию;
- синхронизировать состояние приложения с текущим роутом;
- реагировать на выбор конкретного `route`.

---

## 9. Ограничения и заметки

- Компонент ориентирован на простые SPA‑кейсы:
  - нет вложенных роутов;
  - нет динамического добавления/удаления маршрутов во время работы (возможны, но нужно аккуратно).
- Совместим как с hash‑роутингом, так и с path‑роутингом:
  - hash‑вариант работает из коробки;
  - для path‑варианта нужны:
    - `history.pushState` / `replaceState` для навигации;
    - сервер, возвращающий `index.html` для любых путей.

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

- `/users` → строго список;
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
