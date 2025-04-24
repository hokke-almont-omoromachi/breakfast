import React from 'react';
import './App.css';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BreakfastCheckin from './pages/breakfastCheckin';
import Guest from './pages/guest';
import Home from './pages/home';
import Full from './pages/fullSeat';
import Login from './pages/login';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Routes>
          {/* CHỈNH Ở ĐÂY: chuyển mặc định về /login */}
          <Route path="/" element={<Navigate to="/login" />} />

          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/restaurant" element={<ProtectedRoute><BreakfastCheckin /></ProtectedRoute>} />
          <Route path="/guest" element={<ProtectedRoute><Guest /></ProtectedRoute>} />
          <Route path="/fullSeat" element={<ProtectedRoute><Full /></ProtectedRoute>} />
        </Routes>
      </header>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
