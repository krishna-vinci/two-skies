import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App'
import { LangProvider } from './lib/i18n'
import { PlacesProvider } from './lib/placesStore'
import { persister, queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60_000 }}
    >
      <LangProvider>
        <PlacesProvider>
          <App />
        </PlacesProvider>
      </LangProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
