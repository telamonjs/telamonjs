// Pre-hydration paint of the compact sidebar preference: the store hydrates
// from localStorage only after React hydrates, so the server-rendered 256px
// column jumped to 64px on load. SIDEBAR_PREFERENCE_SCRIPT (rendered inline
// before the sidebar) marks <html> while the HTML is parsed, CSS sizes the
// column from that mark, and the sidebar store keeps the mark in sync.
export const SIDEBAR_STORAGE_KEY = 'telamonjs-sidebar-state'
export const SIDEBAR_COMPACT_ATTR = 'data-telamonjs-sidebar'
export const SIDEBAR_PREFERENCE_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('${SIDEBAR_STORAGE_KEY}')||'null');if(s&&s.state&&s.state.sidebarState==='compact')document.documentElement.setAttribute('${SIDEBAR_COMPACT_ATTR}','compact')}catch(e){}`
