import React from 'react';
import ReactDOM from 'react-dom/client';
import { EmployeePortalPage } from './modules/employeePortal/EmployeePortalPage';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EmployeePortalPage />
  </React.StrictMode>,
);
