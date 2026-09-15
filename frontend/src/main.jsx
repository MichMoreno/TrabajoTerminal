import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' 
import 'bootstrap/dist/css/bootstrap.min.css'  // Bootstrap
import './styles/global.css'  // Estilos
import './styles/home.css';
import './styles/config.css';
import { AuthProvider} from './context/AuthProvider';
import { SidebarProvider } from './context/SidebarProvider'
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)