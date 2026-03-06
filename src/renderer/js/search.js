// ── Search Panel ──────────────────────────────────────────────────────────────

const Search = {
  results: [],

  init() {
    const input = document.getElementById('search-input');
    const replaceInput = document.getElementById('replace-input');
    input.addEventListener('input', debounce(() => this.search(input.value), 300));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search(input.value);
    });
  },

  async search(query) {
    const resultsEl = document.getElementById('search-results');
    if (!query.trim() || !FileTree.rootPath) {
      resultsEl.innerHTML = '';
      return;
    }
    resultsEl.innerHTML = '<div class="muted">Searching...</div>';
    const matches = [];
    await this.searchDir(FileTree.rootPath, query, matches, 0);
    this.renderResults(matches, query);
  },

  async searchDir(dirPath, query, matches, depth) {
    if (depth > 10) return;
    const entries = await window.electronAPI.fs.readDir(dirPath);
    if (!entries || entries.error) return;
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.isDirectory) {
        await this.searchDir(entry.path, query, matches, depth + 1);
      } else {
        try {
          const result = await window.electronAPI.fs.readFile(entry.path);
          if (result.error) continue;
          const lines = result.content.split('\n');
          const fileMatches = [];
          lines.forEach((line, i) => {
            const idx = line.toLowerCase().indexOf(query.toLowerCase());
            if (idx !== -1) {
              fileMatches.push({ line: i + 1, col: idx + 1, text: line.trim(), idx, query });
            }
          });
          if (fileMatches.length) matches.push({ path: entry.path, name: entry.name, matches: fileMatches });
        } catch {}
      }
    }
  },

  renderResults(matches, query) {
    const el = document.getElementById('search-results');
    if (!matches.length) {
      el.innerHTML = `<div class="muted">No results for "${escapeHtml(query)}"</div>`;
      return;
    }
    const total = matches.reduce((a, m) => a + m.matches.length, 0);
    let html = `<div class="muted">${total} result${total !== 1 ? 's' : ''} in ${matches.length} file${matches.length !== 1 ? 's' : ''}</div>`;
    for (const file of matches) {
      html += `<div class="search-result-item search-result-file" data-path="${escapeHtml(file.path)}">${escapeHtml(file.name)}</div>`;
      for (const m of file.matches.slice(0, 5)) {
        const before = escapeHtml(m.text.slice(0, m.idx));
        const match  = escapeHtml(m.text.slice(m.idx, m.idx + query.length));
        const after  = escapeHtml(m.text.slice(m.idx + query.length, m.idx + query.length + 60));
        html += `<div class="search-result-item search-result-line" data-path="${escapeHtml(file.path)}" data-line="${m.line}" data-col="${m.col}">${m.line}: ${before}<mark>${match}</mark>${after}</div>`;
      }
      if (file.matches.length > 5) {
        html += `<div class="muted" style="padding-left:20px">+${file.matches.length - 5} more</div>`;
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const p = item.dataset.path;
        const line = parseInt(item.dataset.line);
        Tabs.openFile(p).then(() => {
          if (line && Editor.instance) {
            Editor.instance.revealLineInCenter(line);
            Editor.instance.setPosition({ lineNumber: line, column: parseInt(item.dataset.col) || 1 });
            Editor.focus();
          }
        });
      });
    });
  }
};
