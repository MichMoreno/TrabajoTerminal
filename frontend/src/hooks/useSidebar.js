import { useContext } from 'react';
import { SidebarContext } from '../context/SidebarContext';

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  }
  return context;
};