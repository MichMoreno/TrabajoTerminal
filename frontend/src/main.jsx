import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'  // Bootstrap
import './styles/global.css'  // Estilos
import './styles/home.css'
import './styles/config.css'
import './styles/misvideos.css'
import './styles/publicar.css'
import './styles/chats.css'
import './styles/repositorio.css'
import { AuthProvider} from './context/AuthProvider'
import { SocketProvider } from './context/SocketProvider'
import { SidebarProvider } from './context/SidebarProvider'
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <AuthProvider>
      <SocketProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
      </SocketProvider>
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)