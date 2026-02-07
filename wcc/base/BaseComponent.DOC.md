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

## 0. Подключение

`BaseComponent` должен быть подключен на странице один раз перед остальными компонентами. Он регистрирует себя в глобальной области видимости `window.BaseComponent`.

```html
<script type="module" src="wcc/_wcc/BaseComponent.js"></script>
```

## 1. Декларативные свойства (`static get properties`)


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

## 2. Загрузка HTML-шаблона (`loadTemplate`)

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
- проверяет, был ли компонент уже отрендерен (чтобы избежать повторного рендера при перемещении в DOM);
- проверяет наличие статического шаблона (см. ниже);
- если нет статического, загружает `*.html`;
- прогоняет через `_processTemplate` (см. ниже);
- сохраняет исходный HTML в `this._rawHtml`;
- вызывает `forceUpdate()` для первой отрисовки.

### Статический шаблон (Static Template)

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
Экранируйте внутренние переменные как \${this...}

---

## 3. Обработка стилей (`_processTemplate`)

В шаблоне можно писать теги `<style>`:
- BaseComponent собирает все стили в один блок;
- создаёт `<style id="style-ИмяКласса">`;
- ищет `<script>`, чей `src` совпадает с URL компонента (`import.meta.url`);
- вставляет стили **сразу после** этого скрипта;
- если скрипт не найден, добавляет стили в конец `<head>`.

Эффект:
- стили компонента подключаются один раз;
- шаблон остаётся без лишних `<style>` внутри.

---

## 4. Регистрация компонентов и глобальное событие готовности

BaseComponent помогает понять, когда **все** компоненты на странице загрузили и обработали свои шаблоны.

Ожидания:
- все подключения компонентов находятся в `<head>`;
- каждый `<script>` имеет атрибут `data-wcc` и `type="module"`:

```html
<script data-wcc type="module" src="components/NavBar/NavBar.js"></script>
<script data-wcc type="module" src="components/HeaderBlock/HeaderBlock.js"></script>
```

### 4.1. Новый паттерн регистрации (`registerWcc`)

Рекомендуемый способ регистрации компонента:

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
- прокидывает тег и `import.meta.url` в `BaseComponent.register`.

### 4.2. Глобальное событие готовности компонентов

Как это работает:
- когда компонент завершил первую отрисовку (`forceUpdate()`), BaseComponent:
  - находит свой `<script data-wcc src="...">` по совпадению `src` с `import.meta.url`;
  - удаляет у него атрибут `data-wcc`;
- **Новое**: если компонент подключен, но не используется на странице (нет тега в HTML и не используется внутри других компонентов), BaseComponent автоматически помечает его как загруженный (после `DOMContentLoaded`), чтобы не блокировать событие готовности.
- после этого считает, сколько в `<head>` осталось `<script data-wcc>[src]`.
- когда таких скриптов не остаётся:
  - один раз диспатчится событие `wcc:all-components-ready` на `window`.

Подписка в основном JS:

```js
window.addEventListener('wcc:all-components-ready', () => {
  console.log('Все компоненты на базе BaseComponent готовы');
  // здесь безопасно работать с их DOM и API
});
```

### 4.3. Хук `onAllComponentsReady` в компонентах

Иногда компоненту нужно выполнить действия, когда **все остальные** компоненты уже отрендерены
и готовы к взаимодействию (например, найти другие элементы и связать их).

Для этого в наследнике можно определить метод:

```js
export class HeaderBlock extends BaseComponent {
  connectedCallback() {
    this.loadTemplate(import.meta.url);
  }

  render() {
    super.render();
  }

  onAllComponentsReady() {
    // Здесь можно безопасно работать с другими компонентами
    // Например, найти соседний компонент и вызвать его публичный метод
  }
}
```

Гарантии:
- метод вызывается **после первой отрисовки** компонента;
- вызывается **ровно один раз на экземпляр**;
- срабатывает как для компонентов, которые были на странице **до**
  события `wcc:all-components-ready`, так и для добавленных **после** него.

Вам не нужно самостоятельно подписываться на `window.addEventListener('wcc:all-components-ready', ...)` —
BaseComponent сделает это за вас и вызовет `onAllComponentsReady`, когда всё будет готово.

---

## 5. Слоты (default и именованные)

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

## 6. Условные блоки в HTML (`_processConditionals`)

Поддерживается синтаксис:

```html
<!-- if(this.isActive) -->
  <div>Пользователь активен</div>
<!-- endif -->
```

Особенности:
- условие пишется как JS-выражение в контексте компонента (`this` доступен);
- если условие `true` → блок остаётся;
- если `false` → блок вырезается.

Назначение:
- простая логика отображения прямо в HTML-шаблоне;
- удобно для включения/выключения отдельных секций.

---

## 7. Внутренние шаблоны (`innerTemplate`)

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
- после рендеринга основного HTML вызывает:
  - `_processInnerTemplates(name, content)` для каждого шаблона.

Наследник может переопределить `_processInnerTemplates`, либо использовать вспомогательные методы (см. следующий раздел).

Ограничения:
- пока внутренние шаблоны нельзя вкладывать друг в друга;
- имя шаблона — `([\w-]+)`, то есть буквы/цифры/дефис.

---

## 8. `evaluateString` — шаблонные строки из обычного string

Метод:

```js
evaluateString(templateString)
```

Позволяет интерпретировать обычную строку как template literal JS:
- строка может содержать `${...}`;
- выражения внутри выполняются в контексте компонента (`this`).

Пример:

```js
const text = this.evaluateString('Привет, ${this.userName}! Тебе ${this.userAge} лет.');
```

Назначение:
- использовать шаблонные выражения внутри HTML-шаблонов (`innerTemplate`);
- генерировать текст на основе текущих свойств компонента.

Важно:
- метод использует `new Function`, поэтому строки должны быть из доверенного источника (ваш шаблон, а не пользовательский ввод).

---

## 9. `renderInnerTemplateList` — рендер списков из innerTemplate

Утилитарный метод для типичного сценария «массив данных + innerTemplate → список DOM-элементов».

Сигнатура:

```js
renderInnerTemplateList(items, templateContent, containerOrSelector)
```

Параметры:
- `items` — массив объектов (например, пользователей);
- `templateContent` — строка из `innerTemplate`;
- `containerOrSelector`:
  - либо CSS-селектор контейнера внутри компонента (`'.list-container'`);
  - либо сам DOM-элемент.

Механика:
- по селектору/элементу ищется контейнер;
- контейнер очищается (`innerHTML = ''`);
- для каждого `item`:
  - временно устанавливается `this.item = item`;
  - вызывается `evaluateString(templateContent)`;
  - полученный HTML вставляется через `insertAdjacentHTML('beforeend', ...)`;
- после цикла `this.item` удаляется.

Это позволяет писать innerTemplate так:

```html
<!-- innerTemplate:list-item -->
<div class="user-item">
  <strong>${this.item.name}</strong>
  (<span>${this.item.role}</span>)
</div>
<!-- /innerTemplate -->
```

А в компоненте просто вызывать:

```js
_processInnerTemplates(name, content) {
  if (name === 'list-item') {
    this.renderInnerTemplateList(this.items, content, '.list-container');
  }
}
}

customElements.define('my-comp', MyComp);
// Обязательная регистрация для отслеживания использования
BaseComponent.register('my-comp', import.meta.url);
```

---

## 10. Обработка внутренних шаблонов: `_processInnerTemplates`

Хук, который вызывается после основного рендера, для каждого innerTemplate:

```js
_processInnerTemplates(name, content) {
  // по умолчанию — ничего
}
```

Типичный сценарий:
- перебрать `this._innerTemplates` (BaseComponent делает это автоматически в `forceUpdate`);
- для нужных `name` вызвать `renderInnerTemplateList` или свою логику.

---

## 10. Автоматическое исправление путей (`_resolveImagePaths`)

Проблема:
- в шаблонах компонента удобно писать относительные пути вроде `../img/...`;
- после сборки/публикации структура файлов может измениться, и такие пути ломаются.

Решение:
- при `loadTemplate(baseUrl)` сохраняется `this._baseUrl = baseUrl` (обычно `import.meta.url`);
- после `render()` BaseComponent проходит по всем элементам с `src`;
- если `src` начинается с `./` или `../`, он переводится в абсолютный URL относительно `this._baseUrl`;
- для `<img>` обновляется свойство `src`, для остальных элементов — атрибут `src`.

Эффект:
- относительные пути внутри шаблона компонента остаются рабочими и в dev, и после публикации.

---

## 11. Адаптивные значения (`calculateFluidValue`)

Метод для вычисления "резиновых" (fluid) значений на основе текущей ширины экрана. Использует формулу линейной интерполяции.

Сигнатура:

```js
calculateFluidValue(minWidth, maxWidth, minVal, maxVal)
```

Параметры:
- `minWidth`, `maxWidth` — диапазон ширины экрана (в пикселях);
- `minVal`, `maxVal` — соответствующие значения свойства (например, font-size).

Возвращает:
- Число (текущее значение).

Пример использования в компоненте (для адаптивной типографики или отступов):

```js
_updateResponsiveStyles() {
  const width = window.innerWidth;
  // Например, шрифт меняется от 16px до 24px при ширине экрана от 320px до 1200px
  const fontSize = this.calculateFluidValue(320, 1200, 16, 24);
  
  // Можно ограничить (clamp)
  const clampedSize = Math.max(16, Math.min(24, fontSize));
  
  this.style.setProperty('--main-font-size', `${clampedSize}px`);
}

connectedCallback() {
  super.connectedCallback(); // если есть
  this.loadTemplate(import.meta.url);
  
  window.addEventListener('resize', () => this._updateResponsiveStyles());
  this._updateResponsiveStyles();
}
```

---

## 15. Общий жизненный цикл наследника

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

## 13. Блоки include

Иногда нужно вставить в шаблон кусок HTML, который зависит от свойств компонента (`this.*`), но не хочется ради этого писать JS-код в `render()`. Для этого есть блоки `include`.

Синтаксис:

```html
<!-- include -->
  <wcc-skill-list skill-list="${this.skillList}"></wcc-skill-list>
<!-- /include -->
```

Как работает:

- BaseComponent ищет пары `<!-- include --> ... <!-- /include -->` в основном шаблоне (после извлечения `innerTemplate`).
- Содержимое блока обрабатывается как template literal в контексте текущего компонента:
  - доступны `this.propName` и любые выражения вида `${this.propName}`.
- Результат один раз подставляется на место блока, и дальше этот HTML живёт как обычная разметка.

Ограничения:

- include обрабатывается только в основном шаблоне:
  - блоки внутри `innerTemplate` не интерпретируются как include;
  - вложенные include внутри include не поддерживаются (обрабатывается только внешний блок).
- include не реактивен:
  - при последующих изменениях свойств блок сам по себе не пересчитывается;
  - для динамического обновления по-прежнему используйте `propertyChangedCallback` и `updateView`.

Пример использования с дочерним компонентом:

```html
<!-- include -->
  <wcc-skill-list skill-list="${this.skillList}"></wcc-skill-list>
<!-- /include -->
```

Как работает:
- BaseComponent находит блоки `<!-- include -->`;
- выполняет интерполяцию строк внутри (`${this.skillList}`);
- вставляет результат в HTML **до** основного парсинга и рендеринга.

Это полезно для передачи сложных данных (JSON-строк) в атрибуты вложенных компонентов.

---

## 14. События: `emit` и `onRef`

BaseComponent упрощает генерацию и навешивание событий.

### `emit(eventName, detail, options?)`

- Вызывает `CustomEvent` на экземпляре компонента:
  - `eventName` — имя события;
  - `detail` — произвольный объект с данными;
  - `options` (необязательный):
    - `bubbles` (по умолчанию `true`);
    - `composed` (по умолчанию `true`).

Пример:

```js
this.emit('header-block-action', {
  userName: this.userName,
  userAge: this.userAge,
  isMale: this.isMale,
  component: this
});
```

### `onRef(refName, eventType, handler, options?)`

- Навешивает обработчик на элемент из `this._refs[refName]`:
  - если `this._refs` или сам элемент отсутствуют — ничего не делает;
  - иначе вызывает `addEventListener(eventType, handler, options)`.

Типичный рецепт:

```js
_cacheElements() {
  this._refs = {
    btn: this.querySelector('.header-block__btn')
  };
}

_setupEventListeners() {
  this.onRef('btn', 'click', (e) => {
    this.emit('header-block-action', {
      userName: this.userName,
      userAge: this.userAge,
      isMale: this.isMale,
      component: this,
      event: e,
    });
  });
}
```

Так наследник описывает только бизнес-логику (какое событие и какие данные), не заботясь о `CustomEvent`, `bubbles/composed` и проверке наличия элемента.

Так BaseComponent берёт на себя инфраструктуру (шаблоны, стили, свойства, слоты, условные блоки, списки), а наследник концентрируется на бизнес-логике и данных.

---

## 15. Интеграция с фреймворками (React, Vue, и др.)

### Vue
Vue (особенно версии 3) имеет отличную поддержку Web Components.
- Атрибуты с дефисом (kebab-case) передаются как атрибуты.
- Свойства (props) можно передавать через `.prop` модификатор (например, `:user-data.prop="data"`), если компонент ожидает сложный объект, а не строку.
- События слушаются стандартно через `@custom-event`.

### React (версии 18 и ниже)
React до версии 19 имеет известные ограничения при работе с Custom Elements:
1. Он передает все данные как атрибуты (строки), а не свойства. Это ломает передачу сложных объектов (массивов, объектов).
2. Он не умеет автоматически вешать слушатели на кастомные события (CustomEvent).

Для решения этих проблем рекомендуется создавать **React-обертку (Wrapper)**.

#### Пример универсального Wrapper для React

```jsx
// WccWrapper.jsx
import React, { useRef, useEffect } from 'react';

/**
 * Универсальная обертка для Web Components в React.
 * Позволяет:
 * 1. Передавать сложные данные (массивы, объекты) через свойства (ref).
 * 2. Слушать кастомные события (addEventListener).
 * 
 * @param {string} component - Имя тега веб-компонента (например, 'wcc-input')
 * @param {object} props - Свойства, которые нужно передать
 * @param {object} events - Объект с колбэками событий { 'change': handleChange }
 * @param {object} rest - Остальные пропсы (className, style и т.д.)
 */
const WccWrapper = ({ component: TagName, props = {}, events = {}, ...rest }) => {
  const ref = useRef(null);

  // Синхронизация свойств (Props)
  useEffect(() => {
    if (ref.current) {
      Object.entries(props).forEach(([key, value]) => {
        // Устанавливаем свойство напрямую в DOM-элемент
        ref.current[key] = value;
      });
    }
  }, [props]); // Обновляем при изменении пропсов

  // Подписка на события (Events)
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Массив для хранения отписок
    const cleanupFns = [];

    Object.entries(events).forEach(([eventName, callback]) => {
      // Обертка для сохранения контекста React (если нужно)
      const handler = (e) => callback(e);
      element.addEventListener(eventName, handler);
      cleanupFns.push(() => element.removeEventListener(eventName, handler));
    });

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [events]); // Обновляем слушатели, если изменился объект events

  // Рендерим сам веб-компонент
  // children передаются внутрь слота
  return <TagName ref={ref} {...rest} />;
};

export default WccWrapper;
```

#### Использование в React компоненте

```jsx
import WccWrapper from './WccWrapper';

function App() {
  const handleInput = (e) => {
    console.log('Input changed:', e.detail);
  };

  const skillList = [
    { name: 'HTML', level: 'Expert' },
    { name: 'CSS', level: 'Advanced' }
  ];

  return (
    <div>
      <h1>Web Components in React</h1>
      
      {/* Простой пример */}
      <WccWrapper 
        component="wcc-input" 
        props={{ label: 'Username', value: 'JohnDoe' }}
        events={{ 'input': handleInput }}
      />

      {/* Передача сложного объекта (массива) */}
      <WccWrapper
        component="wcc-skill-list"
        props={{ items: skillList }} // items - это сеттер в веб-компоненте
      />
    </div>
  );
}
```

### React 19+
В React 19 заявлена полная поддержка Custom Elements, поэтому Wrapper может не понадобиться, и можно будет писать просто `<wcc-input items={list} onchange={handler} />`.

---

## 16. Диагностика и решение проблем

BaseComponent выводит в консоль предупреждения и ошибки, чтобы помочь обнаружить проблемы с конфигурацией компонентов.

### Предупреждения (Warnings)

| Сообщение | Причина | Решение |
| --- | --- | --- |
| `Property "..." type Boolean has default: true...` | Boolean свойство имеет `default: true`. Это запрещено, так как Boolean атрибут работает по принципу "есть/нет". Если он есть по умолчанию, его нельзя "выключить" через HTML (отсутствие атрибута = false). | Установите `default: false` для Boolean свойств. Инвертируйте логику имени (например, вместо `isVisible` используйте `isHidden`), если нужно значение true по умолчанию. |
| `tag already defined, skipping define` | Попытка зарегистрировать компонент с тегом, который уже существует. | Обычно это безопасно (например, при Hot Module Replacement). Убедитесь, что вы не пытаетесь зарегистрировать два разных класса под одним тегом. |
| `Duplicate script import detected for ...` | Один и тот же скрипт подключен на странице несколько раз. | Проверьте HTML и удалите дублирующиеся теги `<script>`. BaseComponent автоматически игнорирует дубликаты. |
| `Незарегистрированный компонент: ...` | (Только localhost) На странице найден тег с дефисом, который не был зарегистрирован как Custom Element. | Возможно, вы забыли подключить скрипт компонента или вызвать `BaseComponent.registerWcc`. Или это опечатка в HTML. |

### Ошибки (Errors)

| Сообщение | Причина | Решение |
| --- | --- | --- |
| `Ошибка загрузки шаблона ...` | Не удалось загрузить файл `.html`. | Проверьте, что файл шаблона лежит в той же папке, что и `.js`, и имеет то же имя (например, `MyComp.html` для `MyComp.js`). |
| `registerWcc: ...` (ошибки валидации) | Некорректные аргументы при регистрации компонента. | Проверьте вызов `registerWcc(Class, import.meta.url)`. Имя класса должно быть в PascalCase (MyComponent), URL должен быть передан. |
| `registerWcc: custom element tag must contain a dash` | Имя класса состоит из одного слова (например, `Button`). | Спецификация Custom Elements требует дефис в имени тега. Переименуйте класс в `WccButton` или `AppButton`. |
| `onAllComponentsReady error` | Исключение внутри вашего метода `onAllComponentsReady`. | Проверьте код метода `onAllComponentsReady` в указанном компоненте. |

---

## 17. Минификация (Minification)

Для использования в продакшене (production) рекомендуется использовать минифицированную версию библиотеки, чтобы уменьшить размер загружаемых файлов.

В папке `wcc/_wcc/` находится скрипт `minify.js`, который генерирует оптимизированную версию `BaseComponent.min.js`.

### Как создать минифицированную версию

Запустите скрипт через Node.js из корня проекта:

```bash
node wcc/_wcc/minify.js
```

Скрипт:
1. Читает исходный `BaseComponent.js`.
2. Удаляет все комментарии (однострочные и многострочные).
3. Удаляет лишние пробелы и переносы строк.
4. Сохраняет результат в `BaseComponent.min.js`.

### Использование

В HTML файле для продакшена подключайте минифицированную версию:

```html
<script type="module" src="wcc/_wcc/BaseComponent.min.js"></script>
```

Это обеспечит быструю загрузку базового функционала для ваших веб-компонентов.

## 18. Встраивание шаблонов (Inline Templates)

Для подготовки компонентов к продакшену (production) можно использовать скрипт `inline-templates.js`, который переносит содержимое HTML-файлов прямо в JS-файлы компонентов.

Это позволяет:
- Уменьшить количество HTTP-запросов (не нужно отдельно загружать `.html` файлы).
- Избежать задержек при первом рендеринге ("моргания").
- Упростить распространение компонентов (один JS файл вместо пары JS+HTML).

### Расположение скрипта

Скрипт находится в папке базы: `wcc/base/inline-templates.js`.

### Использование

1. **Встраивание шаблонов (Inline)**
   Эта команда рекурсивно найдет все компоненты в проекте, прочитает их `.html` файлы и вставит содержимое в переменную `myTemplate` внутри `.js` файлов.

   ```bash
   node wcc/base/inline-templates.js
   ```

   *Пример результата в JS:*
   ```js
   const myTemplate = `<style>...</style><div>Content</div>`; 
   // ...
   BaseComponent.registerWcc(MyComp, import.meta.url, myTemplate);
   ```

2. **Очистка шаблонов (Clear)**
   Эта команда вернет компоненты в режим разработки (development), очистив переменную `myTemplate`. Компоненты снова будут загружать свои шаблоны из внешних `.html` файлов.

   ```bash
   node wcc/base/inline-templates.js --clear
   ```

   *Пример результата в JS:*
   ```js
   const myTemplate = ``; 
   // ...
   ```

### Требования к структуре и коду

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
