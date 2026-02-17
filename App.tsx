import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardClient } from './pages/DashboardClient';
import { DashboardCoach } from './pages/DashboardCoach';
import { CheckIn } from './pages/CheckIn';
import { Plan } from './pages/Plan';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import { Clients } from './pages/Clients';
import { Reviews } from './pages/Reviews';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';
import { Activities } from './pages/Activities';
import { UserRole } from './types';

function App() {
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);

  return (
    <Router>
      <div className="flex min-h-screen bg-background font-sans text-text">
        {/* Navigation Sidebar */}
        <Sidebar role={role} setRole={setRole} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 lg:p-10 pt-20 md:pt-10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Routes>
              {/* Home route switches based on role for demo purposes */}
              <Route 
                path="/" 
                element={role === UserRole.CLIENT ? <DashboardClient /> : <DashboardCoach />} 
              />
              
              {/* Specific Pages */}
              <Route path="/client/:clientId" element={<DashboardClient />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/library" element={<Library />} />
              
              {/* Fallbacks/Placeholders for demo */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                  <span className="font-display text-2xl font-bold mb-2">Próximamente</span>
                  <p>Esta página está en construcción para el MVP.</p>
                </div>
              } />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;