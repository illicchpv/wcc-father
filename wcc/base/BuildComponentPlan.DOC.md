# План построения WCC компонента

## 1. Шаг 1: Создание файлов и базовое подключение
**Цель:** Создать пустой компонент и убедиться, что он загружается на странице.

1.  **Создание структуры:**
    - Создать папку компонента: `wcc/[ComponentName]`.
    - Создать JS файл: `[ComponentName].js` (используя сниппет `wcc=class`).
    - Создать HTML файл: `[ComponentName].html` (используя сниппет `wcc=html`).

2.  **Подключение в проект:**
    - В `index.html` добавить скрипт модуля:
      ```html
      <script data-wcc type="module" src="wcc/[ComponentName]/[ComponentName].js"></script>
      ```
    - Добавить тег компонента на страницу:
      ```html
      <[tag-name]></[tag-name]>
      ```

3.  **Проверка:**
    - Открыть страницу в браузере.
    - Убедиться, что выводится заглушка (имя компонента) из HTML файла.

---

## 2. Шаг 2: Статика и Параметризация (Static & Props)
**Цель:** Настроить внешний вид (HTML/CSS) и определить входные данные (Properties), отобразив их начальные значения.

1.  **Определение свойств (JS):**
    - В `[ComponentName].js`: Раскомментировать `static get properties`.
    - Определить необходимые свойства (type, attribute, default).

2.  **Верстка (HTML):**
    - В `[ComponentName].html`: Написать HTML-разметку и CSS стили.
    - Использовать конструкцию `<!-- include -->` для вывода начальных значений свойств в HTML (если поддерживается BaseComponent):
      ```html
      <!-- include -->${this.propertyName}<!-- /include -->
      ```
    - *Примечание:* Если `<!-- include -->` не используется, просто оставить статические заглушки.

3.  **Использование (index.html):**
    - Добавить атрибуты к тегу компонента для проверки:
      ```html
      <[tag-name] property-name="value"></[tag-name]>
      ```

4.  **Проверка:**
    - Компонент отображается с версткой.
    - Если используется `include`, видно значение из атрибута.

---

## 3. Шаг 3: Динамика отображения (View Logic)
**Цель:** Научить компонент обновлять свой DOM при изменении свойств извне (реактивность).

1.  **Настройка обновлений (JS):**
    - Раскомментировать вызов `this._initView()` в методе `render()`.
    - Раскомментировать методы блока "Шаг 2": `_initView`, `_cacheElements`, `updateView`, `propertyChangedCallback`.

2.  **Связывание с DOM (JS & HTML):**
    - В `_cacheElements()`: Прописать селекторы к элементам, которые нужно обновлять.
    - Убедиться, что классы в HTML соответствуют селекторам в JS.
    - В `updateView()`: Прописать логику обновления DOM (текст, классы, атрибуты) на основе `this.propertyName`.

3.  **Внешнее управление (index.html):**
    - Добавить элементы управления (кнопки) вне компонента для изменения его атрибутов/свойств:
      ```html
      <button onclick="document.querySelector('[tag-name]').propertyName++">Change Prop</button>
      ```

4.  **Проверка:**
    - При клике на внешние кнопки компонент мгновенно обновляет свое содержимое.

---

## 4. Шаг 4: Интерактивность (Event Logic)
**Цель:** Научить компонент реагировать на внутренние события (клики) и сообщать о них наружу.

1.  **Внутренние слушатели (JS):**
    - Раскомментировать вызов `this._initListeners()` в методе `render()`.
    - Раскомментировать метод `_initListeners`.
    - Добавить подписку на события элементов (через `this.onRef` или `this.addEventListener`).

2.  **Генерация событий (JS):**
    - В обработчиках вызывать изменение состояния (`this.prop++`).
    - Отправлять пользовательские события наружу:
      ```javascript
      this.emit('event-name', { detail: ... });
      ```

3.  **Обработка событий (index.html):**
    - Подписаться на события компонента:
      ```javascript
      document.querySelector('[tag-name]').addEventListener('event-name', (e) => {
          console.log('Event received:', e.detail);
      });
      ```

4.  **Проверка:**
    - Внутренние кнопки компонента работают и обновляют вид.
    - В консоли появляются сообщения о событиях.

---

## Пример реализации компонента списка (WccSkillList)

Этот пример демонстрирует продвинутую технику рендеринга списков с использованием внутреннего шаблона (Inner Template) и хелпера `renderInnerTemplateList`.

### Особенности:
1.  **Inner Template**: Шаблон элемента списка находится прямо в HTML компонента внутри комментариев `<!-- innerTemplate:name -->...<!-- /innerTemplate -->`.
2.  **BaseComponent Helper**: Используется `renderInnerTemplateList` для эффективного рендеринга массива данных.

### 1. HTML (WccSkillList.html)
Используем специальный синтаксис для выделения шаблона элемента списка.

```html
<style>
  .skill-list {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
</style>

<!-- Контейнер для списка -->
<ul class="skill-list">
  <!-- Сюда будут вставляться элементы -->
</ul>

<!-- Определение шаблона элемента списка (не отображается при рендере, вырезается парсером) -->
<!-- innerTemplate:skill -->
<li>
  <a href="#!">
    <!-- Используем тернарный оператор для проброса свойства isSmall -->
    <wcc-skill ${this.isSmall ? 'is-small' : ''}>${this.item}</wcc-skill>
  </a>
</li>
<!-- /innerTemplate -->
```

### 2. JavaScript (WccSkillList.js)
Реализуем логику извлечения шаблона и рендеринга.

```javascript
export class WccSkillList extends BaseComponent {
  constructor() {
    super();
    this._refs = {};
  }
  
  connectedCallback() {
    this.loadTemplate(import.meta.url);
  }
  
  static get properties() {
    return {
      skillList: {
        type: String,     // Ожидаем строку через запятую: "HTML, CSS, JS"
        attribute: 'skill-list',
        default: null
      },
      isSmall: {
        type: Boolean,
        attribute: 'is-small',
      }
    };
  }

  render() {
    super.render();
    this._initView(); // Сразу запускаем view logic
  }

  _initView() {
    this._cacheElements();
    this.updateView();
  }

  _cacheElements() {
    this._refs = {
      skillListEl: this.querySelector('.skill-list'), // Находим контейнер
    };
  }

  updateView() {
    this._renderSkills();
  }

  propertyChangedCallback(name, oldValue, newValue) {
    if (this.html) {
      this.updateView();
    }
  }

  // Хук BaseComponent: вызывается, когда найден innerTemplate в HTML
  _processInnerTemplates(name, content) {
    if (name === 'skill') {
      this._skillTemplate = content; // Сохраняем шаблон для использования в _renderSkills
      this._renderSkills();          // Пробуем отрендерить (если данные уже есть)
    }
  }

  _renderSkills() {
    const refs = this._refs || {};
    const skillListEl = refs.skillListEl;
    const template = this._skillTemplate;

    // Ждем, пока будет готов и контейнер, и шаблон
    if (!skillListEl || !template) return;

    const value = this.skillList;
    if (!value) {
      skillListEl.innerHTML = '';
      return;
    }

    // Преобразуем строку "HTML, CSS" в массив ['HTML', 'CSS']
    const items = value.split(',').map(s => s.trim());
    
    // Используем хелпер BaseComponent для рендеринга
    // items - массив данных
    // template - строка шаблона (с ${this.item})
    // skillListEl - куда вставлять
    this.renderInnerTemplateList(items, template, skillListEl);
  }
}

BaseComponent.registerWcc(WccSkillList, import.meta.url);
```

---

## Пример использования Fluid Values (Адаптивность)

Этот пример показывает, как реализовать сложную адаптивную логику, где размер элемента меняется с разной скоростью в разных диапазонах ширины экрана, используя встроенный хелпер `calculateFluidValue`.

### Сценарий
Необходимо, чтобы размер шрифта заголовка (`.title`) изменялся следующим образом:
1.  **Мобильные (320px - 800px):** Размер плавно растет от **24px** до **32px**.
2.  **Десктоп (800px - 1200px):** Размер плавно растет от **32px** до **48px**.
3.  **Более 1200px:** Фиксируется на **48px**.

### Реализация

Мы используем JS для расчета формул `clamp()` для каждого диапазона и CSS Media Queries для применения нужной формулы в нужный момент.

#### 1. JavaScript (расчет переменных)

В методе `render` (или `updateView`) рассчитываем значения для двух диапазонов и сохраняем их в CSS-переменные компонента.

```javascript
render() {
  super.render();
  
  // Рассчитываем формулу для первого диапазона (320px -> 800px)
  // Значение будет меняться от 24px до 32px
  const fluidSmall = this.calculateFluidValue(320, 800, 24, 32);
  
  // Рассчитываем формулу для второго диапазона (800px -> 1200px)
  // Значение будет меняться от 32px до 48px
  const fluidLarge = this.calculateFluidValue(800, 1200, 32, 48);
  
  // Устанавливаем CSS переменные
  this.style.setProperty('--title-size-sm', fluidSmall);
  this.style.setProperty('--title-size-lg', fluidLarge);
}
```

#### 2. CSS (применение переменных)

В стилях компонента используем Media Query для переключения между переменными.

```css
.title {
  /* По умолчанию (для экранов < 800px) используем "маленький" диапазон */
  font-size: var(--title-size-sm);
}

@media (min-width: 800px) {
  .title {
    /* Для экранов >= 800px переключаемся на "большой" диапазон */
    font-size: var(--title-size-lg);
  }
}

@media (min-width: 1200px) {
  .title {
    /* (Опционально) Фиксируем максимальный размер, если clamp не справляется или нужна жесткая фиксация */
    font-size: 48px; 
  }
}
```

Таким образом, мы получаем точный контроль над поведением элемента в разных диапазонах ширины экрана, избегая резких скачков.

---

## Интеграция с фреймворками (React, Vue, и др.)

Ваши WCC-компоненты построены на стандарте **Web Components**, что обеспечивает их совместимость с большинством современных фреймворков.

### React (версии 19+) и Vue
Эти фреймворки нативно поддерживают Custom Elements. Вы можете использовать компоненты как обычные HTML-теги:
```jsx
// React 19+ / Vue
<wcc-skill-list skill-list="HTML, CSS" is-small onSkill-click={handleSkillClick} />
```

### React (до версии 19)
Старые версии React передают все пропсы как строковые атрибуты и имеют свою систему синтетических событий.
Для корректной работы со сложными свойствами (объекты, массивы) и кастомными событиями (например, `skill-click`), рекомендуется создавать **компоненты-обертки (wrappers)**.

**Пример простой обертки (React < 19):**

```jsx
import React, { useEffect, useRef } from 'react';

export const WccSkillListReact = ({ skillList, isSmall, onSkillClick }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Подписка на кастомные события
    const handler = (e) => onSkillClick && onSkillClick(e.detail);
    el.addEventListener('skill-click', handler);

    return () => el.removeEventListener('skill-click', handler);
  }, [onSkillClick]);

  return (
    <wcc-skill-list 
      ref={ref} 
      skill-list={skillList} 
      is-small={isSmall ? '' : undefined} // Булевы атрибуты
    />
  );
};
```
