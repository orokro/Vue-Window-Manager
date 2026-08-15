import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// StrictMode is on deliberately: it double-mounts every component in development,
// which is exactly the condition that breaks a naive port of a stateful manager like
// this one. If the layout ever duplicates itself, this is what caught it.
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
