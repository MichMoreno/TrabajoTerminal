import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSidebar } from '../../hooks/useSidebar';

const AppLayout = ({ children }) => {
  const { isOpen } = useSidebar();

  return (
    <div className={`app-layout ${isOpen ? 'app-layout-sidebar-open' : ''}`}>
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;