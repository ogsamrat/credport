import './globals.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { DocsPage } from './components/DocsPage.js';
import './styles.css';

// Minimal path-based routing. Vercel serves index.html for every non-API path
// (see vercel.json), so the SPA picks the page from the current pathname.
const path = window.location.pathname.replace(/\/+$/, '');
const isDocs = path === '/docs';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isDocs ? <DocsPage /> : <App />}</React.StrictMode>,
);
