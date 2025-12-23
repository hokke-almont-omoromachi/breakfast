import React, { useRef } from 'react';
import './App.css';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

import BreakfastCheckin from './pages/breakfastCheckin';
import Guest from './pages/guest';
import Home from './pages/home';
import Full from './pages/fullSeat';
import Login from './pages/login';
import Setting from './pages/setting';
import ProtectedRoute from './ProtectedRoute';

// 👉 context
import { BreakfastContext } from './context/BreakfastContext';

// 👉 firebase & logic import nếu cần
// import { db } from './firebaseConfig';
// import { collection, deleteDoc, getDocs } from 'firebase/firestore';

function App() {
  // ======================
  // REF
  // ======================
  const fileInputRef = useRef(null);

  // ======================
  // FILE HANDLER
  // ======================
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'xlsx' || fileType === 'xls') {
      console.log('Read Excel file', file);
      // readExcelFile(file);
    } else if (fileType === 'csv') {
      console.log('Read CSV file', file);
      // readCSVFile(file);
    } else {
      alert('ファイル .xlsx, .xls, .csv をアップロードして下さい。');
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // ======================
  // REFRESH HANDLER
  // ======================
  const handleRefresh = async () => {
    const ok = window.confirm('データを取消しますか？');
    if (!ok) return;

    try {
      console.log('Clear all breakfast data');
      // await deleteCollectionData(...)
      if (fileInputRef.current) fileInputRef.current.value = null;
      alert('データが取消されました!');
    } catch (e) {
      console.error(e);
      alert('データ更新エラー');
    }
  };

  return (
    <BreakfastContext.Provider
      value={{
        handleFileChange,
        handleRefresh,
        fileInputRef,
      }}
    >
      <div className="App">
        <header className="App-header">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />

            <Route path="/login" element={<Login />} />

            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            <Route
              path="/restaurant"
              element={
                <ProtectedRoute>
                  <BreakfastCheckin />
                </ProtectedRoute>
              }
            />

            <Route
              path="/guest"
              element={
                <ProtectedRoute>
                  <Guest />
                </ProtectedRoute>
              }
            />

            <Route
              path="/setting"
              element={
                <ProtectedRoute>
                  <Setting />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fullSeat"
              element={
                <ProtectedRoute>
                  <Full />
                </ProtectedRoute>
              }
            />
          </Routes>
        </header>
      </div>
    </BreakfastContext.Provider>
  );
}

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}
