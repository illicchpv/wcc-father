
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

