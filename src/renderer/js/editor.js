// ── Monaco Editor ─────────────────────────────────────────────────────────────

const Editor = {
  instance: null,
  models: new Map(), // path -> monaco model

  async init() {
    return new Promise((resolve) => {
      // Check if Monaco is already loaded
      if (window.monaco) {
        this.setupMonaco();
        resolve();
        return;
      }

      // Load Monaco from CDN using script tags
      const loaderScript = document.createElement('script');
      loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.js';
      loaderScript.onload = () => {
        // Configure Monaco loader
        require.config({
          paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
        });
        
        // Load Monaco editor
        require(['vs/editor/editor.main'], () => {
          this.setupMonaco();
          resolve();
        });
      };
      document.head.appendChild(loaderScript);
    });
  },

  setupMonaco() {
        this.instance = monaco.editor.create(document.getElementById('editor-container'), {
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          formatOnPaste: false,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          quickSuggestions: true,
          parameterHints: { enabled: true },
          padding: { top: 8 },
          overviewRulerLanes: 3,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: false,
          },
          renderLineHighlight: 'all',
          colorDecorators: true,
        });

        // Track cursor position → status bar
        this.instance.onDidChangeCursorPosition((e) => {
          const pos = e.position;
          document.getElementById('status-pos').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
        });

        // Track content changes → mark dirty
        this.instance.onDidChangeModelContent(debounce(() => {
          const tab = Tabs.getActive();
          if (!tab) return;
          const newContent = this.instance.getValue();
          Tabs.updateContent(tab.id, newContent);
          if (!tab.dirty) Tabs.markDirty(tab.id);
        }, 100));

        // Key bindings
        this.instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          Tabs.save();
        });
        this.instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
          Tabs.saveAs();
        });
        this.instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW, () => {
          Tabs.close(Tabs.activeId);
        });
        this.instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
          Terminal.toggle();
        });
  },

  setContent(content, language, filePath) {
    if (!this.instance) return;

    // Reuse or create model
    let model;
    if (filePath && this.models.has(filePath)) {
      model = this.models.get(filePath);
      // Sync content if changed externally
      if (model.getValue() !== content) {
        model.setValue(content);
      }
      monaco.editor.setModelLanguage(model, language);
    } else {
      if (model) model.dispose();
      const uri = filePath ? monaco.Uri.file(filePath) : monaco.Uri.parse(`untitled:///${Date.now()}`);
      // Check if model for this URI already exists
      const existingModel = monaco.editor.getModel(uri);
      if (existingModel) {
        model = existingModel;
        if (model.getValue() !== content) model.setValue(content);
        monaco.editor.setModelLanguage(model, language);
      } else {
        model = monaco.editor.createModel(content, language, uri);
      }
      if (filePath) this.models.set(filePath, model);
    }
    this.instance.setModel(model);
    this.instance.focus();
  },

  updateLanguage(language) {
    if (!this.instance) return;
    const model = this.instance.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
    document.getElementById('status-lang').textContent = getLangDisplayName(language);
  },

  clear() {
    if (!this.instance) return;
    const blankModel = monaco.editor.createModel('', 'plaintext');
    this.instance.setModel(blankModel);
  },

  focus() {
    this.instance?.focus();
  },

  getValue() {
    return this.instance?.getValue() || '';
  },

  format() {
    this.instance?.getAction('editor.action.formatDocument')?.run();
  },

  find() {
    this.instance?.getAction('actions.find')?.run();
  },

  replace() {
    this.instance?.getAction('editor.action.startFindReplaceAction')?.run();
  },

  toggleWordWrap() {
    if (!this.instance) return;
    const current = this.instance.getOption(monaco.editor.EditorOption.wordWrap);
    this.instance.updateOptions({ wordWrap: current === 'off' ? 'on' : 'off' });
  },

  increaseFontSize() {
    if (!this.instance) return;
    const cur = this.instance.getOption(monaco.editor.EditorOption.fontSize);
    this.instance.updateOptions({ fontSize: Math.min(cur + 1, 32) });
  },

  decreaseFontSize() {
    if (!this.instance) return;
    const cur = this.instance.getOption(monaco.editor.EditorOption.fontSize);
    this.instance.updateOptions({ fontSize: Math.max(cur - 1, 8) });
  },

  resetFontSize() {
    this.instance?.updateOptions({ fontSize: 14 });
  }
};
