import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './components/AdminPage';
import EmployeePage from './components/EmployeePage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <h1 className="nav-title">Schedule Manager</h1>
            <div className="nav-links">
              <Link to="/admin" className="nav-link">Admin</Link>
              <Link to="/employee" className="nav-link">Employee</Link>
            </div>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/employee" element={<EmployeePage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      <h2>Welcome to Schedule Manager</h2>
      <div className="home-cards">
        <Link to="/admin" className="home-card">
          <h3>Admin Portal</h3>
          <p>Create timeblocks, manage shifts, and generate schedules</p>
        </Link>
        <Link to="/employee" className="home-card">
          <h3>Employee Portal</h3>
          <p>Submit your availability and shift preferences</p>
        </Link>
      </div>
    </div>
  );
}

export default App;