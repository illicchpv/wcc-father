// подключить: <script data-wcc type="module" src="wcc/WccMain/WccMain.js"></script>
// 
const myTemplate = `
<p>Hello World!</p>
`;

export class WccMain extends BaseComponent {
  constructor() {
    super(); this._refs = {};
  }
  connectedCallback() {
    this.loadTemplate(import.meta.url);
  }
  static get properties() {
    return {
      // counterValue: {type: Number, attribute: 'counter-value', default: 0},
    };
  }

  render() {
    super.render();
    // this._initView();       // <--- Раскомментировать для Шага 2
    // this._initListeners();  // <--- Раскомментировать для Шага 3
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

BaseComponent.registerWcc(WccMain, import.meta.url);