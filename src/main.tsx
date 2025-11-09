import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './index.css';

// Désactivation complète des logs en production
if (import.meta.env.PROD) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.info = () => {};
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
