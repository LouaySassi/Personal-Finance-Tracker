import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, BarChart3Icon } from 'lucide-react';

export function Navigation() {
  return (
    <nav className="bg-dark-card border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="Tracky Logo" 
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold text-text-primary">
                Tracky
              </h1>
            </div>
            <div className="flex gap-4">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sage text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-card-hover'
                  }`
                }
              >
                <HomeIcon className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sage text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-card-hover'
                  }`
                }
              >
                <BarChart3Icon className="w-5 h-5" />
                <span className="font-medium">Analytics</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}