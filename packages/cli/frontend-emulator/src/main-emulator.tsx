import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EmulatorShell } from './emulator/EmulatorShell';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EmulatorShell />
  </StrictMode>,
);