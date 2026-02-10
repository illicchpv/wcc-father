# WCC - Web Components

[github](https://github.com/illicchpv/wcc-father)
[github page](https://illicchpv.github.io/wcc-father/)

- .vscode\wcc.code-snippets - сниппеты для VSCode
- wcc\base\BaseComponent.DOC.md - документация к BaseComponent
- wcc\base\BaseComponent.DOCshort.md - краткая документация к BaseComponent
- wcc\base\BuildComponentPlan.DOC.md - план построения компонента и др.

## Файловая структура

```text
wcc-github/
├── .vscode/
│   └── wcc.code-snippets
├── css/
│   ├── media.css
│   ├── normalize.css
│   └── style.css
├── img/
│   └── logo.svg
├── js/
│   └── main.js
├── wcc/
│   ├── base/
│   │   ├── BaseComponent.DOC.md
│   │   ├── BaseComponent.DOCshort.md
│   │   ├── BaseComponent.js
│   │   ├── BuildComponentPlan.DOC.md
│   │   ├── inline-templates.js
│   │   ├── minify.js
│   │   └── update-versions.js
│   ├── WccContent/
│   │   ├── WccContent.html
│   │   └── WccContent.js
│   ├── WccMain/
│   │   ├── WccMain.html
│   │   └── WccMain.js
│   └── WccMarkdown/
│       ├── WccMarkdown.html
│       └── WccMarkdown.js
├── index.html
└── README.md
```

### доки шпоры и примеры
- [BaseComponent.DOC.md     ](https://illicchpv.github.io/wcc-father/#doc)
- [BaseComponent.DOCshort.md](https://illicchpv.github.io/wcc-father/#doc-short)
- [BuildComponentPlan.DOC.md](https://illicchpv.github.io/wcc-father/#plan)
- [BaseComponent.work.md    ](https://illicchpv.github.io/wcc-father/#work)



## Инструкция по началу работы

1. Создайте и перейдите в директорию проекта:
   
   ```sh
   mkdir my-wcc-project
   cd my-wcc-project
   ```
   
2. Клонируйте репозиторий:
   
   ```sh
   git clone https://github.com/illicchpv/wcc-father .
   ```
   
3. удалите папку .git:
   
   ```sh
   rm -rf .git
   ```
   
4. Откройте проект в VS Code:
   
   ```sh
   code .
   ```
   
5. Запустите локальный сервер:
   - Установите расширение **Live Server** для VS Code (если не установлено).
   - Нажмите кнопку **Go Live** в правом нижнем углу окна VS Code или кликните правой кнопкой мыши по `index.html` и выберите **Open with Live Server**.


[youtube Плейлист](https://www.youtube.com/playlist?list=PLgSBhu7P8DwiHskT_A5j7outvl2du9-5L)

[rutube Плейлист](https://rutube.ru/plst/1413456)
```
про web Components:
https://rutube.ru/video/8727da0c6510d3998e8173e7d56728b1/ web Components 1 (введение)
https://rutube.ru/video/24a9efb9e411ba4c14d73c5488b8a4ad/  web components 2 - особенности стилизации. слоты.
https://rutube.ru/video/3fb752febc50cb8eedd24e3557b3072a/  web components 3 - render, attribute, connectedCallback,  XSS уязвимость.

про wcc Light DOM web components:
https://rutube.ru/video/3feff9c990d7866e376e83fb7f48095f/  Light DOM web components - 1 (бездомные веб компоненты)
https://rutube.ru/video/c1ee9b33f7aa2419734717d62d848acd/  Light DOM web components - 2 (начинаем верстку)
https://rutube.ru/video/db6e90b3e5a8dfa9caa8822d4ac823ae/  Light DOM web components - 3 (верстка main секции)
https://rutube.ru/video/6879457df87cda22291ec11978afc3fc/  Light DOM web components - 4 (проблемы LiveServer, исправления, верстка WccSkills)
https://rutube.ru/video/f3f8a6d9d4cb6cb1dc7bbbbe868d58ab/  Light DOM web components - 5 (верстка секции portfolio)
https://rutube.ru/video/db21aa0a6990ab2d79bd78fa862c2265/  Light DOM web components - 6 (исправления и улучшения секции portfolio, секция WccMySkills)
https://rutube.ru/video/0f3180030b8eedd837980b80bbb899a0/  Light DOM web components - 7 (вёрстка секций WccDeveloper и WccFooter)
https://rutube.ru/video/2317ddf611441d0315d9ba469d80008a/  Light DOM web components - 8 (доделываем WccInput, события, вёрстка секций WccFeedback)
https://rutube.ru/video/7ac4eaab8456757526b58f93ad3d2b5f/  Light DOM web components - 9 ( секция WccDecor, относительные расположения секций, адаптив)
https://rutube.ru/video/135ebec783120d3240adc314a6d0f84f/  Light DOM web components - 10 (исправления, улучшения, github-pages публикация)
```