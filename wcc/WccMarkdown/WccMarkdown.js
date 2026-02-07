export class WccMarkdown extends BaseComponent {
  static get properties() {
    return {
      src: {type: String, default: '', attribute: 'src'},
      expanded: {type: Boolean, default: false, attribute: 'expanded'}
    };
  }

  // Singleton promise for loading the library to avoid parallel loads
  static _markedLoadingPromise = null;

  constructor() {
    super();
    this._title = 'Loading...';
    this._content = '';
    this._loadedUrl = null;
    // console.log('[WccMarkdown] Constructor called');
  }

  async connectedCallback() {
    // console.log('[WccMarkdown] connectedCallback', this.src);
    super.connectedCallback();

    // We rely on propertyChangedCallback (triggered by attributes or property setters)
    // to load the content. No need to duplicate logic here.
  }

  propertyChangedCallback(name, oldValue, newValue) {
    // console.log(`[WccMarkdown] Property changed: ${name}`, oldValue, '->', newValue);
    if (name === 'src' && newValue) {
      this.loadMarkdown(newValue);
    }
    if (name === 'expanded') {
      this.forceUpdate();
    }
  }

  async _loadMarkedLib() {
    if (window.marked) return;

    if (!WccMarkdown._markedLoadingPromise) {
      // console.log('[WccMarkdown] Loading marked lib...');
      WccMarkdown._markedLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
        script.onload = () => {
          // console.log('[WccMarkdown] marked lib loaded successfully');
          resolve();
        };
        script.onerror = (e) => {
          console.error('[WccMarkdown] Failed to load marked lib', e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    }
    return WccMarkdown._markedLoadingPromise;
  }

  async loadMarkdown(url) {
    // Avoid reloading the same URL if already loaded/loading
    if (!url || url === this._loadedUrl) return;
    this._loadedUrl = url;

    // console.log('[WccMarkdown] loadMarkdown called for:', url);

    try {
      this._title = 'Loading...';
      this.forceUpdate();

      await this._loadMarkedLib();

      // console.log('[WccMarkdown] Fetching:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url} (status: ${response.status})`);

      const text = await response.text();
      // console.log('[WccMarkdown] Fetched content length:', text.length);

      // Parse markdown
      if (!window.marked) throw new Error('marked lib is missing');

      const html = window.marked.parse(text);
      this._content = html;

      // Extract title (first h1 or h2 text)
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        this._title = h1Match[1].replace(/<[^>]*>/g, '');
      } else {
        this._title = url.split('/').pop();
      }

      // console.log('[WccMarkdown] Parsed successfully. Title:', this._title);
      this.forceUpdate();
    } catch (e) {
      console.error('[WccMarkdown] Error loading documentation:', e);
      this._title = 'Error loading documentation';
      this._content = `<p style="color:red">Error: ${e.message}</p>`;
      this.forceUpdate();
      // Reset loadedUrl so retry is possible if needed
      this._loadedUrl = null;
    }
  }

  toggle() {
    // console.log('[WccMarkdown] toggle called. Current expanded:', this.expanded);
    this.expanded = !this.expanded;
  }

  render() {
    // console.log('[WccMarkdown] render called. HTML present:', !!this.html, 'Expanded:', this.expanded);
    super.render();

    // Inject rendered markdown into the container if it exists
    const container = this.querySelector('.markdown-body');
    if (container) {
      if (this._content) {
        // console.log('[WccMarkdown] Injecting content into .markdown-body');
        container.innerHTML = this._content;
      }
    } else {
      if (this.expanded) {
        console.warn('[WccMarkdown] .markdown-body container NOT found in rendered output, but expanded is true');
      }
    }
  }
}

BaseComponent.registerWcc(WccMarkdown, import.meta.url);
