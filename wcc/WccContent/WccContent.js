// подключить: <script data-wcc type="module" src="wcc/WccContent/WccContent.js"></script>
const myTemplate = ``; // для прод, вставить сюда содержимое файла WccContent.html
//
export class WccContent extends BaseComponent {
}

BaseComponent.registerWcc(WccContent, import.meta.url, myTemplate);