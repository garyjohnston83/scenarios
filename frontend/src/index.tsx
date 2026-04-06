import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.scss';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FluentProvider>
      </Provider>
    </ErrorBoundary>
  );
}
