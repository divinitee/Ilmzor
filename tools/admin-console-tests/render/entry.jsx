import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Console from '@/pages/Console';
import { scenario, calls } from '@/api/base44Client';
window.__mount = (el) => { const root = createRoot(el); root.render(<MemoryRouter><Console /></MemoryRouter>); return root; };
window.__scenario = scenario;
window.__calls = calls;
