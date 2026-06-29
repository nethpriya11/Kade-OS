import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

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
const AuditLog = lazy(() => import('./pages/AuditLog'));

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
            <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
            <Route path="pos" element={<ErrorBoundary><POS /></ErrorBoundary>} />
            <Route path="inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
            <Route path="menu" element={<ErrorBoundary><Menu /></ErrorBoundary>} />
            <Route path="orders" element={<ErrorBoundary><Orders /></ErrorBoundary>} />
            <Route path="analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
            <Route path="pnl" element={<ErrorBoundary><ProfitLoss /></ErrorBoundary>} />
            <Route path="procurement" element={<ErrorBoundary><Procurement /></ErrorBoundary>} />
            <Route path="audit" element={<ErrorBoundary><AuditLog /></ErrorBoundary>} />
            <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
            <Route path="shifts" element={<ErrorBoundary><Shifts /></ErrorBoundary>} />
            <Route path="expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
            <Route path="tables" element={<ErrorBoundary><Tables /></ErrorBoundary>} />
            <Route path="suppliers" element={<ErrorBoundary><Suppliers /></ErrorBoundary>} />
            <Route path="staff" element={<ErrorBoundary><Staff /></ErrorBoundary>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
