// ── Terminal ──────────────────────────────────────────────────────────────────

const Terminal = {
  visible: false,
  terminals: new Map(), // termId -> { xterm, fitAddon, cleanup }
  activeTermId: null,
  termCounter: 0,

  async init() {
    document.getElementById('btn-new-terminal').addEventListener('click', () => this.create());
    document.getElementById('btn-kill-terminal').addEventListener('click', () => this.killActive());
    document.getElementById('btn-toggle-terminal').addEventListener('click', () => this.hide());
  },

  async show() {
    if (this.visible) return;
    this.visible = true;
    const panel  = document.getElementById('terminal-panel');
    const handle = document.getElementById('terminal-resizer');
    panel.classList.remove('hidden');
    handle.classList.remove('hidden');
    if (this.terminals.size === 0) await this.create();
    else this.fitAll();
  },

  hide() {
    this.visible = false;
    document.getElementById('terminal-panel').classList.add('hidden');
    document.getElementById('terminal-resizer').classList.add('hidden');
  },

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  },

  async create(cwd) {
    const result = await window.electronAPI.terminal.create(cwd || App.state.openFolder);
    if (result?.error) { showToast(`Terminal error: ${result.error}`); return; }

    const termId = result.termId;
    const xterm = new window.Terminal({
      theme: {
        background:    '#1e1e1e',
        foreground:    '#cccccc',
        cursor:        '#aeafad',
        black:         '#1e1e1e',
        red:           '#f44747',
        green:         '#6a9955',
        yellow:        '#d7ba7d',
        blue:          '#569cd6',
        magenta:       '#c678dd',
        cyan:          '#4ec9b0',
        white:         '#d4d4d4',
        brightBlack:   '#808080',
        brightRed:     '#f44747',
        brightGreen:   '#b5cea8',
        brightYellow:  '#dcdcaa',
        brightBlue:    '#9cdcfe',
        brightMagenta: '#c586c0',
        brightCyan:    '#4fc1ff',
        brightWhite:   '#ffffff',
      },
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowTransparency: false,
    });

    const fitAddon = new window.FitAddon.FitAddon();
    xterm.loadAddon(fitAddon);

    // Create DOM wrapper
    const body = document.getElementById('terminal-body');
    const wrapper = document.createElement('div');
    wrapper.id = `term-wrapper-${termId}`;
    wrapper.style.cssText = 'width:100%;height:100%;display:none;';
    body.appendChild(wrapper);

    xterm.open(wrapper);
    fitAddon.fit();

    // Data flow: from pty → xterm
    const cleanup = window.electronAPI.terminal.onData(termId, (data) => xterm.write(data));
    window.electronAPI.terminal.onExit(termId, () => {
      xterm.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n');
    });

    // Data flow: xterm → pty
    xterm.onData(data => window.electronAPI.terminal.write(termId, data));

    // Resize observer
    const resizeObs = new ResizeObserver(debounce(() => {
      if (this.activeTermId === termId) {
        fitAddon.fit();
        const dims = { cols: xterm.cols, rows: xterm.rows };
        window.electronAPI.terminal.resize(termId, dims.cols, dims.rows);
      }
    }, 50));
    resizeObs.observe(wrapper);

    this.terminals.set(termId, { xterm, fitAddon, wrapper, cleanup, resizeObs });
    this.addTab(termId);
    this.activate(termId);
    await this.show();
  },

  addTab(termId) {
    const tabsEl = document.getElementById('terminal-tabs');
    // remove previous active
    const tab = document.createElement('span');
    tab.className = 'term-tab';
    tab.dataset.termid = termId;
    tab.textContent = `bash`;
    tab.addEventListener('click', () => this.activate(termId));
    tabsEl.appendChild(tab);
  },

  activate(termId) {
    this.activeTermId = termId;
    for (const [id, t] of this.terminals) {
      t.wrapper.style.display = id === termId ? 'block' : 'none';
    }
    document.querySelectorAll('.term-tab').forEach(t => {
      t.classList.toggle('active', parseInt(t.dataset.termid) === termId);
    });
    const t = this.terminals.get(termId);
    if (t) {
      t.fitAddon.fit();
      t.xterm.focus();
    }
  },

  killActive() {
    if (!this.activeTermId) return;
    this.kill(this.activeTermId);
  },

  kill(termId) {
    const t = this.terminals.get(termId);
    if (!t) return;
    t.cleanup?.();
    t.resizeObs?.disconnect();
    t.xterm.dispose();
    t.wrapper.remove();
    this.terminals.delete(termId);
    window.electronAPI.terminal.kill(termId);
    // Remove tab
    document.querySelector(`.term-tab[data-termid="${termId}"]`)?.remove();
    // Activate another
    if (this.terminals.size > 0) {
      this.activate([...this.terminals.keys()][this.terminals.size - 1]);
    } else {
      this.hide();
    }
  },

  fitAll() {
    for (const [id, t] of this.terminals) {
      if (id === this.activeTermId) {
        t.fitAddon.fit();
        window.electronAPI.terminal.resize(id, t.xterm.cols, t.xterm.rows);
      }
    }
  },

  updateCwd(cwd) {
    // no-op for now; new terminals will use App.state.openFolder
  }
};
