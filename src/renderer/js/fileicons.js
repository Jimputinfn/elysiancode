// File icons - returns SVG string for given extension/type
const FileIcons = {
  getIcon(name, isDirectory, isOpen) {
    if (isDirectory) return isOpen ? this.icons.folderOpen : this.icons.folder;
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    return this.icons[ext] || this.icons.default;
  },

  color: {
    js:    '#f0db4f', ts:   '#007acc', jsx:  '#61dafb', tsx:  '#61dafb',
    html:  '#e34c26', css:  '#264de4', scss: '#cf649a', less: '#1d365d',
    json:  '#f5a623', md:   '#519aba', py:   '#3572a5', rb:   '#cc342d',
    php:   '#4f5d95', java: '#b07219', c:    '#555555', cpp:  '#f34b7d',
    cs:    '#178600', go:   '#00add8', rs:   '#dea584', swift:'#f05138',
    kt:    '#f18e33', sql:  '#e38c00', sh:   '#89e051',
    yml:   '#cb171e', yaml: '#cb171e', xml:  '#e37933',
    folder:'#dcb67a', folderOpen:'#dcb67a',
  },

  svg(d, color) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color || '#cccccc'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  },

  get icons() {
    return {
      folder:     this.svg('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/>', '#dcb67a'),
      folderOpen: this.svg('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h9a2 2 0 012 2z"/><path d="M2 10h20"/>', '#dcb67a'),
      js:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#f0db4f'),
      ts:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#007acc'),
      jsx:   this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#61dafb'),
      tsx:   this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#61dafb'),
      html:  this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#e34c26'),
      css:   this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#264de4'),
      scss:  this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#cf649a'),
      json:  this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#f5a623'),
      md:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#519aba'),
      py:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#3572a5'),
      rb:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#cc342d'),
      php:   this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#4f5d95'),
      java:  this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#b07219'),
      rs:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#dea584'),
      go:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#00add8'),
      sh:    this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#89e051'),
      yaml:  this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#cb171e'),
      yml:   this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#cb171e'),
      default: this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>', '#c5c5c5'),
    };
  }
};
