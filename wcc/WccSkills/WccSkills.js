// подключить: <script data-wcc type="module" src="wcc/WccSkills/WccSkills.js"></script>
const myTemplate = ``; // для прод, вставить сюда содержимое файла WccSkills.html
//
export class WccSkills extends BaseComponent {
  constructor() {
    super(); this._refs = {};
  }
  connectedCallback() {
    this.loadTemplate(import.meta.url);
  }
  static get properties() {
    return {
      list: {type: String, attribute: 'list', default: 'HTML,CSS'},
      large: {type: Boolean, attribute: 'large'},
    };
  }

  render() {
    super.render();
    // this._initView();       // <--- Раскомментировать для Шага 2
    // this._initListeners();  // <--- Раскомментировать для Шага 3
  }

  _processInnerTemplates(name, content) {
    if (name === 'innerTemplateName') {
      this._innerTemplate = content;
      this._renderInnerTemplate();
    }
  }
  
  _renderInnerTemplate() {
    const items = this.list.split(',')
    if (!items || !this._innerTemplate) return;
    const container = this.querySelector('.wccSkills');
    if (!container) return;
    this.renderInnerTemplateList(items, this._innerTemplate, container);
  }

  // ============================================================
  // Шаг 2: Кэширование и обновление отображения
  // ============================================================
  
  // _initView() {
  //   this._cacheElements();
  //   this.updateView();
  // }

  // _cacheElements() {
  //   this._refs = {
  //     value: this.querySelector('.counter-value'),
  //     btnInc: this.querySelector('.counter-inc'),
  //   };
  // }

  // updateView() {
  //   const {value} = this._refs;
  //   if (!value) return;
  //   value.textContent = this.counterValue;
  // }

  // propertyChangedCallback(name, oldValue, newValue) {
  //   if (this.html) {
  //     this.updateView();
  //   }
  // }

  // ============================================================
  // Шаг 3: Обработчики событий
  // ============================================================

  // _initListeners() {
  //   this.onRef('btnInc', 'click', (e) => {
  //     this.counterValue++;
  //     this.emit('event-name', {...this.values, component: this, event: e, });
  //   });
  // }
}

BaseComponent.registerWcc(WccSkills, import.meta.url, myTemplate);