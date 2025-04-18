import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BreakfastCheckin from './pages/breakfastCheckin'; // Đảm bảo đường dẫn đúng
import Guest from './pages/guest'; // Đảm bảo đường dẫn đúng
import Home from './pages/home'; // Đảm bảo đường dẫn đúng

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Routes>
          {/* Route mặc định điều hướng về /home khi người dùng truy cập vào / */}
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<Home />} />
          <Route path="/restaurant" element={<BreakfastCheckin />} />
          <Route path="/guest" element={<Guest />} />
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
