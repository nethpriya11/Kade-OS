import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Menu from './pages/Menu';
import Orders from './pages/Orders';

import Procurement from './pages/Procurement';

import Analytics from './pages/Analytics';
import Login from './pages/Login';
import Settings from './pages/Settings';
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
          <Route path="procurement" element={<Procurement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
