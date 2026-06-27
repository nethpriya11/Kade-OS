import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Menu = lazy(() => import('./pages/Menu'));
const Orders = lazy(() => import('./pages/Orders'));
const Procurement = lazy(() => import('./pages/Procurement'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Login = lazy(() => import('./pages/Login'));
const Settings = lazy(() => import('./pages/Settings'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Tables = lazy(() => import('./pages/Tables'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const ProfitLoss = lazy(() => import('./pages/ProfitLoss'));
const Staff = lazy(() => import('./pages/Staff'));

import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from 'sonner';
import SyncManager from './components/SyncManager';
import Calculator from './components/Calculator';
import RealtimeManager from './components/RealtimeManager';

function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors theme="dark" />
      <SyncManager />
      <RealtimeManager />
      <Calculator />
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-text-muted">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="menu" element={<Menu />} />
            <Route path="orders" element={<Orders />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="pnl" element={<ProfitLoss />} />
            <Route path="procurement" element={<Procurement />} />
            <Route path="settings" element={<Settings />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="tables" element={<Tables />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="staff" element={<Staff />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
