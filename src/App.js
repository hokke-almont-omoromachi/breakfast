import React from 'react';
import './App.css';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import BreakfastCheckin from './pages/breakfastCheckin';
import Guest from './pages/guest';
import Home from './pages/home';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <Routes>
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
