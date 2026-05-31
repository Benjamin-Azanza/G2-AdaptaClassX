import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './app/App.tsx'

// Prevent automatic browser translation (like Google/Safari Translate) from translating
// Material Symbols Outlined icons, which breaks the ligatures and displays text (FOUT) on mobile.
if (typeof window !== 'undefined') {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('.material-symbols-outlined').forEach((el) => {
      if (!el.classList.contains('notranslate')) {
        el.classList.add('notranslate');
      }
      if (el.getAttribute('translate') !== 'no') {
        el.setAttribute('translate', 'no');
      }
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
