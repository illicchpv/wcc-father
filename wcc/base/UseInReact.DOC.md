# Интеграция WCC компонентов в React проект

Для интеграции компонентов WCC (Web Components) в React-проект необходимо учитывать их архитектуру: они написаны на Vanilla JS, используют базовый класс `BaseComponent` и динамически загружают свои HTML-шаблоны.

## 1. Подготовка файлов (папка `public`)

Так как компоненты используют `fetch` для загрузки своих `.html` шаблонов относительно JS-файла, их лучше всего разместить как статические ресурсы. Сборщики (Webpack/Vite) могут нарушить относительные пути при импорте внутри JS, поэтому используем папку `public`.

1. Скопируйте всю папку `wcc` из этого проекта в папку `public` вашего React-проекта.
   * Структура должна получиться такой: `public/wcc/base/...`, `public/wcc/WccMarkdown/...` и т.д.

## 2. Подключение скриптов

В React-проектах, использующих Vite (или Webpack), нельзя просто подключить скрипты из папки `public` через статический тег `<script type="module" src="...">`, так как сборщик попытается обработать их и выдаст ошибку.

Рекомендуемый способ — динамически загрузить `BaseComponent`, а затем использовать его встроенный метод `loadWccComponent` для загрузки остальных компонентов.

Вставьте этот код в `public/index.html` (внутри `<head>`):

```html
<script>
  (function() {
    // 1. Создаем скрипт для BaseComponent
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/wcc/base/BaseComponent.js';
    
    // 2. Ждем загрузки BaseComponent
    s.onload = () => {
      // 3. Теперь BaseComponent доступен глобально
      // Используем его метод для правильной загрузки компонентов (с атрибутом data-wcc)
      if (window.BaseComponent) {
        BaseComponent.loadWccComponent('/wcc/WccNavLink/WccNavLink.js');
        // Загрузите другие компоненты здесь:
        // BaseComponent.loadWccComponent('/wcc/OtherComponent.js');
      }
    };

    document.head.appendChild(s);
  })();
</script>
```

Этот подход имеет несколько преимуществ:
1.  **Обход сборщика:** Vite не пытается трансформировать эти файлы.
2.  **Порядок загрузки:** Гарантируется, что `BaseComponent` загрузится раньше наследников.
3.  **Чистота:** Используется специализированный метод `loadWccComponent`, который автоматически добавляет необходимый атрибут `data-wcc`.

## 3. Использование в React (JSX)

После подключения скриптов, компоненты становятся доступны как обычные HTML-теги. React позволяет использовать кастомные элементы (Custom Elements) напрямую.

Пример компонента React:

```jsx
import React, { useState } from 'react';

const MyDocumentation = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <h1>Документация</h1>
      
      {/* 
        Используем веб-компонент напрямую.
        Атрибуты передаются как строки.
        Булевы атрибуты (expanded) передаются как есть (React корректно их обрабатывает).
      */}
      <wcc-markdown 
        id="my-doc"
        src="wcc/base/BaseComponent.DOC.md"
        expanded={isExpanded}
      ></wcc-markdown>

      <button onClick={() => setIsExpanded(!isExpanded)}>
        Переключить (через React State)
      </button>
    </div>
  );
};

export default MyDocumentation;
```

## 4. Важные нюансы для React

### Атрибуты vs Свойства
* React передает данные в веб-компоненты через **атрибуты** (attributes).
* Для строк (`src`) и булевых значений (`expanded`) это работает отлично, так как `BaseComponent` настроен на отслеживание изменений атрибутов (`observedAttributes`).
* Если нужно передать сложные данные (объекты, массивы), используйте `ref` и устанавливайте свойства напрямую:
    ```jsx
    const ref = useRef(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.someComplexProp = { id: 1 };
      }
    }, []);
    return <wcc-component ref={ref} />;
    ```

### События (Events)
* В React 18 и ниже стандартные события веб-компонентов (CustomEvent) могут не перехватываться через `onEventName`.
* Если компонент генерирует кастомные события, лучше вешать обработчики через `ref`:
    ```jsx
    useEffect(() => {
      const el = ref.current;
      const handler = (e) => console.log(e.detail);
      el.addEventListener('my-event', handler);
      return () => el.removeEventListener('my-event', handler);
    }, []);
    ```
    * *Для `WccMarkdown` это не требуется, так как он в основном только отображает контент.*

### TypeScript
Если вы используете TypeScript, он может выдать ошибку на неизвестный тег `<wcc-markdown>`. Нужно добавить декларацию:

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wcc-markdown': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        expanded?: boolean;
      };
    }
  }
}
```

## 5. Решение проблем интеграции (Troubleshooting)

В процессе настройки Vite + React могут возникнуть специфические ошибки. Ниже описаны решения, примененные в этом проекте.

### 5.1. Ошибка "The result must not have attributes" в React
**Симптом:**
`Uncaught NotSupportedError: Failed to execute 'createElement' on 'Document': The result must not have attributes`

**Причина:**
React (особенно при использовании `createRoot`) создает DOM-элементы через `document.createElement()`. Спецификация DOM требует, чтобы элементы, созданные таким образом, были "чистыми" (без атрибутов).
Ранее `BaseComponent` в своем `constructor` сразу инициализировал атрибуты на основе дефолтных свойств (например, `href="#"`). Это нарушало контракт `createElement`, так как элемент возвращался с уже установленными атрибутами, чего React не ожидает.

**Решение:**
Логика инициализации атрибутов была перенесена из `constructor` в `connectedCallback`.
*   В конструкторе создается только JS-объект.
*   Атрибуты выставляются (`setAttribute`) только когда элемент уже вставлен в DOM (метод `_reflectDefaultsToAttributes`), что безопасно для React.

### 5.2. Ошибка Vite "Failed to load url ... This file is in /public"
**Симптом:**
`[vite] Pre-transform error: Failed to load url /wcc/... This file is in /public and will be copied as-is...`

**Причина:**
Если подключать скрипты из `public` через обычный `<script type="module" src="...">` в `index.html`, Vite пытается обработать их как часть графа зависимостей сборки. Но файлы в `public` предназначены для копирования "как есть" и не должны трансформироваться плагинами Vite.

**Решение:**
Использовать динамическую инъекцию скриптов в `index.html`, чтобы скрыть их от бандлера Vite на этапе сборки:

```html
<script>
  (function() {
    const loadScript = (src, isWcc = false) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = src;
      if (isWcc) s.setAttribute('data-wcc', '');
      document.head.appendChild(s);
    };

    loadScript('/wcc/base/BaseComponent.js');
    loadScript('/wcc/WccNavLink/WccNavLink.js', true);
  })();
</script>
```

Это позволяет браузеру загружать модули нативно, сохраняя корректную работу `import.meta.url` (нужен для загрузки шаблонов), и не ломает сборку Vite.
