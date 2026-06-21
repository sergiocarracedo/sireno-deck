import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { DeckPage } from './pages/DeckPage';
import { App } from './App';

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <DeckPage /> },
        { path: 'decks/:deckId', element: <DeckPage /> },
      ],
    },
  ]);
}

export function AppRouter() {
  return <RouterProvider router={createAppRouter()} />;
}