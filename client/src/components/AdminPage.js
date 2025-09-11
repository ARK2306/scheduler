import React, { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import config from '../config';
import './AdminPage.css';

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [currentView, setCurrentView] = useState('create'); // 'create', 'responses', 'generate'
  const [timeblocks, setTimeblocks] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTime, setSelectedTime] = useState('5:00 AM');
  const [shiftType, setShiftType] = useState('both');
  const [duration, setDuration] = useState(0.5);
  const [peopleNeeded, setPeopleNeeded] = useState(1);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);
  const [employeeResponses, setEmployeeResponses] = useState([]);
  const [shiftsPerEmployee, setShiftsPerEmployee] = useState({});
  const [finalSchedule, setFinalSchedule] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlots = [
    '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
    '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
    '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
    '11:00 PM', '11:30 PM'
  ];

  const addTimeblock = () => {
    const newTimeblock = {
      id: Date.now(),
      day: selectedDay,
      time: selectedTime,
      duration: duration,
      shiftType: shiftType,
      peopleNeeded: peopleNeeded,
      title: `${shiftType === 'grad' ? 'Grad Only' : shiftType === 'undergrad' ? 'Undergrad Only' : 'Both'} - ${duration === 0.5 ? '30min' : duration % 1 === 0 ? duration + 'h' : duration + 'h'} (${peopleNeeded} ${peopleNeeded === 1 ? 'person' : 'people'})`
    };

    setTimeblocks([...timeblocks, newTimeblock]);
  };

  const removeTimeblock = (id) => {
    setTimeblocks(timeblocks.filter(block => block.id !== id));
  };

  const handleLogin = (token) => {
    setAuthToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentScheduleId(null);
    setTimeblocks([]);
    setEmployeeResponses([]);
    setFinalSchedule(null);
  };

  const deleteSchedule = async () => {
    if (!currentScheduleId) return;
    
    const confirmDelete = window.confirm('Are you sure you want to delete the current schedule? This will remove all timeblocks and employee responses.');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/delete-schedule/${currentScheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        // Clear all local state
        setCurrentScheduleId(null);
        setTimeblocks([]);
        setEmployeeResponses([]);
        setFinalSchedule(null);
        setCurrentView('create');
        alert('Schedule deleted successfully!');
      } else {
        alert('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const saveScheduleTemplate = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/create-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ timeblocks })
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentScheduleId(result.scheduleId);
        setCurrentView('responses');
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save schedule template');
    }
  };

  const loadEmployeeResponses = async (scheduleId = currentScheduleId) => {
    if (!scheduleId || !authToken) return;

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/employee-responses/${scheduleId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setEmployeeResponses(result.responses);
        
        // Initialize shifts per employee
        const initialShifts = {};
        result.responses.forEach(resp => {
          initialShifts[resp.employeeName] = 3; // default
        });
        setShiftsPerEmployee(initialShifts);
      }
    } catch (error) {
      console.error('Failed to load employee responses:', error);
    }
  };

  const generateFinalSchedule = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/generate-final-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          scheduleId: currentScheduleId, 
          shiftsPerEmployee 
        })
      });

      if (response.ok) {
        const result = await response.json();
        setFinalSchedule(result);
        setCurrentView('generate');
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      alert('Failed to generate final schedule');
    }
  };

  useEffect(() => {
    // Check for stored auth token
    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) {
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    // Load admin dashboard state when authenticated
    if (isAuthenticated && authToken) {
      loadAdminDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authToken]);

  useEffect(() => {
    if (currentView === 'responses' && currentScheduleId) {
      loadEmployeeResponses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, currentScheduleId]);

  const loadAdminDashboard = async () => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const dashboard = await response.json();
        
        if (dashboard.hasCurrentSchedule && dashboard.currentTemplate) {
          setCurrentScheduleId(dashboard.currentScheduleId);
          setTimeblocks(dashboard.currentTemplate.timeblocks || []);
          
          // If there are responses, load them
          if (dashboard.responseCount > 0) {
            await loadEmployeeResponses(dashboard.currentScheduleId);
          }
        } else {
          // Clear state when there's no current schedule
          setCurrentScheduleId(null);
          setTimeblocks([]);
          setEmployeeResponses([]);
          setFinalSchedule(null);
        }
      }
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    }
  };

  const renderCreateView = () => (
    <>
      <div className="admin-header">
        <div className="deployment-link">
          <h3>🌐 Live Application: <a href="https://scheduler-bak7smwus-aryan-reddy-kalluris-projects.vercel.app" target="_blank" rel="noopener noreferrer">https://scheduler-bak7smwus-aryan-reddy-kalluris-projects.vercel.app</a></h3>
        </div>
        <h2>Admin Portal - Create Weekly Schedule</h2>
        <p>Add timeblocks to create the weekly schedule template</p>
        {currentScheduleId && (
          <>
            <div className="current-schedule-info">
              ✅ Current Schedule ID: {currentScheduleId}
              <button className="delete-schedule-btn" onClick={deleteSchedule}>
                🗑️ Delete Schedule
              </button>
            </div>
            <div className="employee-link-display">
              <h3>👥 Link for Employees:</h3>
              <div className="employee-link-container">
                <input 
                  type="text" 
                  value={`${window.location.origin}/employee?schedule=${currentScheduleId}`}
                  readOnly
                  className="employee-link-input"
                  onClick={(e) => e.target.select()}
                />
                <button 
                  className="copy-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/employee?schedule=${currentScheduleId}`);
                    alert('Link copied to clipboard!');
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="admin-content">
        <div className="timeblock-creator">
          <h3>Add Timeblock</h3>
          <div className="creator-form">
            <div className="form-group">
              <label>Day:</label>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Time:</label>
              <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Duration:</label>
              <select 
                value={duration} 
                onChange={(e) => setDuration(parseFloat(e.target.value))}
              >
                <option value={0.5}>30 minutes</option>
                <option value={1}>1 hour</option>
                <option value={1.5}>1.5 hours</option>
                <option value={2}>2 hours</option>
                <option value={2.5}>2.5 hours</option>
                <option value={3}>3 hours</option>
                <option value={3.5}>3.5 hours</option>
                <option value={4}>4 hours</option>
                <option value={4.5}>4.5 hours</option>
                <option value={5}>5 hours</option>
                <option value={5.5}>5.5 hours</option>
                <option value={6}>6 hours</option>
              </select>
            </div>

            <div className="form-group">
              <label>Shift Type:</label>
              <select value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
                <option value="both">Both Grad & Undergrad</option>
                <option value="grad">Graduate Students Only</option>
                <option value="undergrad">Undergraduate Students Only</option>
              </select>
            </div>

            <div className="form-group">
              <label>People Needed:</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={peopleNeeded}
                onChange={(e) => setPeopleNeeded(parseInt(e.target.value))}
              />
            </div>

            <button className="add-btn" onClick={addTimeblock}>
              Add Timeblock
            </button>
          </div>
        </div>

        <div className="schedule-preview">
          <h3>Schedule Preview</h3>
          <div className="weekly-calendar">
            {daysOfWeek.map(day => (
              <div key={day} className="day-column">
                <h4>{day}</h4>
                <div className="day-timeblocks">
                  {timeblocks
                    .filter(block => block.day === day)
                    .map(block => (
                      <div 
                        key={block.id} 
                        className={`timeblock ${block.shiftType}`}
                        onClick={() => removeTimeblock(block.id)}
                      >
                        <div className="timeblock-time">{block.time}</div>
                        <div className="timeblock-info">{block.title}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-actions">
          <button 
            className="save-template-btn"
            onClick={saveScheduleTemplate}
            disabled={timeblocks.length === 0}
          >
            Save Schedule Template & Generate Employee Link
          </button>
          <p className="timeblock-count">Total Timeblocks: {timeblocks.length}</p>
        </div>
      </div>
    </>
  );

  const renderResponsesView = () => (
    <>
      <div className="admin-header">
        <h2>Employee Responses</h2>
        <p>Review employee preferences and set shift assignments</p>
      </div>

      <div className="responses-content">
        <div className="response-summary">
          <h3>Response Summary</h3>
          <p>Total Responses: {employeeResponses.length}</p>
          <button onClick={() => loadEmployeeResponses()} className="refresh-btn">
            Refresh Responses
          </button>
        </div>

        <div className="employee-list">
          <h3>Employee Shift Assignments</h3>
          {employeeResponses.map(response => (
            <div key={response.id} className="employee-item">
              <div className="employee-info">
                <span className="name">{response.employeeName}</span>
                <span className="type">{response.studentType}</span>
                <span className="submitted">Submitted: {new Date(response.submittedAt).toLocaleString()}</span>
              </div>
              <div className="shift-assignment">
                <label>Shifts per week:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={shiftsPerEmployee[response.employeeName] || 0}
                  onChange={(e) => setShiftsPerEmployee(prev => ({
                    ...prev,
                    [response.employeeName]: parseInt(e.target.value)
                  }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="generate-section">
          <button 
            className="generate-final-btn"
            onClick={generateFinalSchedule}
            disabled={employeeResponses.length === 0}
          >
            Generate Final Schedule
          </button>
        </div>
      </div>
    </>
  );

  const renderGenerateView = () => (
    <>
      <div className="admin-header">
        <h2>Final Schedule</h2>
        <p>Generated schedule with assignments</p>
      </div>

      {finalSchedule && (
        <div className="final-schedule">
          <div className="schedule-summary">
            <h3>Schedule Summary</h3>
            <p>Total Timeblocks: {finalSchedule.summary.totalTimeblocks}</p>
            <p>Assigned: {finalSchedule.summary.assignedTimeblocks}</p>
            <p>Fill Rate: {finalSchedule.summary.overallFulfillmentRate}</p>
          </div>

          <div className="weekly-schedule-grid">
            {daysOfWeek.map(day => (
              <div key={day} className="day-column">
                <h4>{day}</h4>
                <div className="day-assignments">
                  {finalSchedule.schedule.timeblocks
                    .filter(block => block.day === day)
                    .map(block => {
                      const scheduleBlock = finalSchedule.schedule.schedule[block.id];
                      const assignedEmployees = scheduleBlock.assignedEmployees || [];
                      const remainingSlots = scheduleBlock.remainingSlots || 0;
                      
                      return (
                        <div key={block.id} className="assignment-block">
                          <div className="time">{block.time}</div>
                          <div className="assignment">
                            {assignedEmployees.length > 0 ? (
                              <div>
                                {assignedEmployees.map((employee, index) => (
                                  <div key={index} className="assigned-employee">{employee}</div>
                                ))}
                                {remainingSlots > 0 && (
                                  <div className="unassigned-slots">
                                    +{remainingSlots} more needed
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="unassigned">Unassigned ({block.peopleNeeded || 1} needed)</div>
                            )}
                          </div>
                          <div className="shift-type">{block.title}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          <div className="employee-assignments">
            <h3>Employee Assignment Summary</h3>
            {Object.entries(finalSchedule.summary.employeeSummary).map(([employee, summary]) => (
              <div key={employee} className="employee-summary">
                <span className="emp-name">{employee}</span>
                <span className="emp-stats">
                  {summary.assigned}/{summary.requested} shifts ({summary.fulfillmentRate})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-nav">
        <div className="nav-buttons">
          <button 
            className={`nav-btn ${currentView === 'create' ? 'active' : ''}`}
            onClick={() => setCurrentView('create')}
          >
            Create Schedule
          </button>
          <button 
            className={`nav-btn ${currentView === 'responses' ? 'active' : ''}`}
            onClick={() => setCurrentView('responses')}
            disabled={!currentScheduleId}
          >
            View Responses ({employeeResponses.length})
          </button>
          <button 
            className={`nav-btn ${currentView === 'generate' ? 'active' : ''}`}
            onClick={() => setCurrentView('generate')}
            disabled={!finalSchedule}
          >
            Final Schedule
          </button>
        </div>
        
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {currentView === 'create' && renderCreateView()}
      {currentView === 'responses' && renderResponsesView()}
      {currentView === 'generate' && renderGenerateView()}
    </div>
  );
}

export default AdminPage;