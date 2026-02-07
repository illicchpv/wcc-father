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
│   │   └── minify.js
│   ├── WccContent/
│   │   ├── WccContent.html
│   │   └── WccContent.js
│   └── WccMain/
│       ├── WccMain.html
│       └── WccMain.js
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

