// ── Utility helpers ───────────────────────────────────────────────────────────

const path = {
  basename: (p) => p.replace(/\\/g, '/').split('/').pop(),
  extname:  (p) => { const b = p.replace(/\\/g, '/').split('/').pop(); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
  dirname:  (p) => { const parts = p.replace(/\\/g, '/').split('/'); parts.pop(); return parts.join('/') || '/'; },
  join:     (...parts) => parts.join('/').replace(/\/+/g, '/'),
};

function showToast(msg, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.style.display = 'none'; }, 200);
  }, duration);
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Get Monaco language from file extension
function getLanguageFromExt(ext) {
  const map = {
    'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'html': 'html', 'htm': 'html',
    'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'less',
    'json': 'json', 'jsonc': 'json',
    'md': 'markdown', 'markdown': 'markdown',
    'py': 'python',
    'rb': 'ruby',
    'php': 'php',
    'java': 'java',
    'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'sh': 'shell', 'bash': 'shell', 'zsh': 'shell',
    'ps1': 'powershell',
    'xml': 'xml', 'svg': 'xml', 'xhtml': 'xml',
    'yaml': 'yaml', 'yml': 'yaml',
    'toml': 'ini',
    'ini': 'ini', 'conf': 'ini', 'cfg': 'ini',
    'dockerfile': 'dockerfile',
    'lua': 'lua',
    'r': 'r',
    'dart': 'dart',
    'vue': 'html',
    'graphql': 'graphql', 'gql': 'graphql',
    'txt': 'plaintext',
  };
  return map[ext?.toLowerCase()] || 'plaintext';
}

function getLangDisplayName(lang) {
  const map = {
    javascript: 'JavaScript', typescript: 'TypeScript', html: 'HTML',
    css: 'CSS', scss: 'SCSS', less: 'Less', json: 'JSON',
    markdown: 'Markdown', python: 'Python', ruby: 'Ruby', php: 'PHP',
    java: 'Java', c: 'C', cpp: 'C++', csharp: 'C#', go: 'Go',
    rust: 'Rust', swift: 'Swift', kotlin: 'Kotlin', sql: 'SQL',
    shell: 'Shell Script', powershell: 'PowerShell', xml: 'XML',
    yaml: 'YAML', ini: 'INI', dockerfile: 'Dockerfile', lua: 'Lua',
    r: 'R', dart: 'Dart', graphql: 'GraphQL', plaintext: 'Plain Text',
  };
  return map[lang] || lang;
}
