import AppRoutes from './routes';
import { ErrorBoundary, ErrorFallback } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary Fallback={ErrorFallback}>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;