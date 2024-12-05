import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminInterface from './components/AdminInterface';
import PlayerDisplay from './components/PlayerDisplay';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminInterface />} />
        <Route path="/" element={<PlayerDisplay />} />
      </Routes>
    </Router>
  );
}

export default App;