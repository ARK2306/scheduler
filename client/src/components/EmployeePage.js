import React, { useState, useEffect } from 'react';
import config from '../config';
import './EmployeePage.css';

function EmployeePage() {
  const [employeeName, setEmployeeName] = useState('');
  const [studentType, setStudentType] = useState('');
  const [scheduleTemplate, setScheduleTemplate] = useState(undefined);
  const [preferences, setPreferences] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Load schedule template from URL parameter or latest template
    loadScheduleTemplate();
  }, []);

  const loadScheduleTemplate = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const scheduleId = urlParams.get('schedule');
      
      const endpoint = scheduleId 
        ? `${config.API_BASE_URL}/api/schedule-template/${scheduleId}`
        : `${config.API_BASE_URL}/api/schedule-template/latest`;
        
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          if (result.success && result.template) {
            setScheduleTemplate(result.template);
            
            // Initialize preferences
            const initialPreferences = {};
            result.template.timeblocks.forEach(block => {
              initialPreferences[block.id] = 'willing';
            });
            setPreferences(initialPreferences);
          } else {
            // Handle case where no template is available
            console.log('No schedule template found:', result.message);
            setScheduleTemplate(null);
          }
        } else {
          console.error('API returned non-JSON response');
          setScheduleTemplate(null);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to load schedule template:', response.status, errorText);
        setScheduleTemplate(null);
      }
    } catch (error) {
      console.error('Failed to load schedule template:', error);
      setScheduleTemplate(null);
    }
  };

  const updatePreference = (blockId, preference) => {
    setPreferences(prev => ({
      ...prev,
      [blockId]: preference
    }));
  };

  const submitPreferences = async () => {
    if (!employeeName.trim() || !studentType) {
      alert('Please enter your name and select your student type');
      return;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/employee/submit-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeName: employeeName.trim(),
          studentType,
          scheduleId: scheduleTemplate.id,
          preferences
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert('Failed to submit preferences');
      }
    } catch (error) {
      console.error('Failed to submit preferences:', error);
      alert('Failed to submit preferences');
    }
  };

  const getPreferenceColor = (preference) => {
    switch (preference) {
      case 'willing': return '#28a745';
      case 'prefer-not': return '#ffc107';
      case 'cannot': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPreferenceText = (preference) => {
    switch (preference) {
      case 'willing': return 'Willing to work';
      case 'prefer-not': return 'Can work but prefer not to';
      case 'cannot': return 'Cannot work';
      default: return 'No preference';
    }
  };

  const isEligibleForShift = (block) => {
    if (block.shiftType === 'both') return true;
    if (block.shiftType === 'grad' && studentType === 'graduate') return true;
    if (block.shiftType === 'undergrad' && studentType === 'undergraduate') return true;
    return false;
  };

  if (isSubmitted) {
    return (
      <div className="employee-page">
        <div className="success-message">
          <h2>✅ Preferences Submitted Successfully!</h2>
          <p>Thank you, {employeeName}! Your shift preferences have been recorded.</p>
          <p>You will be notified once the final schedule is created.</p>
        </div>
      </div>
    );
  }

  if (scheduleTemplate === null) {
    return (
      <div className="employee-page">
        <div className="employee-header">
          <h2>Employee Portal - Submit Your Availability</h2>
          <div className="no-schedule-message">
            <h3>No Schedule Available</h3>
            <p>There is currently no schedule template available. Please check back later or contact your administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  if (scheduleTemplate === undefined) {
    return (
      <div className="employee-page">
        <div className="loading-message">
          <h2>Loading Schedule...</h2>
          <p>Please wait while we load the available shifts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-page">
      <div className="employee-header">
        <h2>Employee Portal - Submit Your Availability</h2>
        <p>Please enter your information and select your preferences for each shift</p>
      </div>

      <div className="employee-form">
        <div className="personal-info">
          <h3>Personal Information</h3>
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="form-group">
            <label>Student Type:</label>
            <select value={studentType} onChange={(e) => setStudentType(e.target.value)}>
              <option value="">Select your status</option>
              <option value="undergraduate">Undergraduate Student</option>
              <option value="graduate">Graduate Student</option>
            </select>
          </div>
        </div>

        <div className="preference-legend">
          <h3>Preference Legend</h3>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-color willing"></span>
              <span>Willing to work</span>
            </div>
            <div className="legend-item">
              <span className="legend-color prefer-not"></span>
              <span>Can work but prefer not to</span>
            </div>
            <div className="legend-item">
              <span className="legend-color cannot"></span>
              <span>Cannot work</span>
            </div>
          </div>
        </div>

        <div className="shifts-section">
          <h3>Available Shifts</h3>
          <div className="shifts-grid">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <div key={day} className="day-section">
                <h4>{day}</h4>
                <div className="day-shifts">
                  {scheduleTemplate.timeblocks
                    .filter(block => block.day === day)
                    .map(block => (
                      <div key={block.id} className="shift-item">
                        <div className="shift-info">
                          <div className="shift-time">{block.time}</div>
                          <div className="shift-details">
                            {block.title} ({block.duration}h)
                          </div>
                          {!isEligibleForShift(block) && (
                            <div className="not-eligible">Not eligible for this shift</div>
                          )}
                        </div>
                        
                        {isEligibleForShift(block) && (
                          <div className="preference-buttons">
                            {['willing', 'prefer-not', 'cannot'].map(pref => (
                              <button
                                key={pref}
                                className={`pref-btn ${preferences[block.id] === pref ? 'active' : ''}`}
                                style={{
                                  backgroundColor: preferences[block.id] === pref ? getPreferenceColor(pref) : '#f8f9fa',
                                  color: preferences[block.id] === pref ? 'white' : '#333'
                                }}
                                onClick={() => updatePreference(block.id, pref)}
                                title={getPreferenceText(pref)}
                              >
                                {pref === 'willing' ? '✓' : 
                                 pref === 'prefer-not' ? '~' : '✗'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="submit-section">
          <button 
            className="submit-btn"
            onClick={submitPreferences}
            disabled={!employeeName.trim() || !studentType}
          >
            Submit Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmployeePage;