import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Navigation } from './components/Navigation';
import { PaydayPrompt } from './components/PaydayPrompt';
import { FinancialData, MonthlyBillItem, Goal, Expense, Transaction, GlobalSettings } from './types';
import { apiClient } from './api/client';

const getEmptyMonthData = (defaultSalary: number): FinancialData => ({
  monthlySalary: defaultSalary,
  extraFunds: 0,
  monthlyBills: [{
    id: `bill-gas-${Date.now()}`,
    name: 'Gas Money',
    budget: 300,
    spent: 0,
    isPaid: false
  }, {
    id: `bill-car-${Date.now()}`,
    name: 'Car Payment Money',
    budget: 500,
    spent: 0,
    isPaid: false,
    linkedGoalId: 'goal-1'
  }, {
    id: `bill-school-${Date.now()}`,
    name: 'School Tuition Money',
    budget: 300,
    spent: 0,
    isPaid: false,
    linkedGoalId: 'goal-2'
  }],
  expenses: [],
  totalSavings: 0,
  goals: [{
    id: 'goal-1',
    name: 'Car Payment',
    totalAmount: 15000,
    currentAmount: 0,
    monthlyPayment: 500
  }, {
    id: 'goal-2',
    name: 'School',
    totalAmount: 3000,
    currentAmount: 0,
    monthlyPayment: 300
  }],
  transactions: []
});

interface MonthlyDataStore {
  [monthKey: string]: FinancialData;
}

export function App() {
  const [currentMonthKey, setCurrentMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [allMonthsData, setAllMonthsData] = useState<MonthlyDataStore>({});
  const [settings, setSettings] = useState<GlobalSettings>({
    defaultSalary: 1300
  });
  const [isPaydayPromptOpen, setIsPaydayPromptOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentData = allMonthsData[currentMonthKey] || getEmptyMonthData(settings.defaultSalary);

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiClient.getSettings();
        setSettings(data);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Save settings to API
  useEffect(() => {
    const saveSettings = async () => {
      try {
        await apiClient.saveSettings(settings);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };
    
    if (!isLoading) {
      saveSettings();
    }
  }, [settings, isLoading]);

  // Load all months data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await apiClient.getAllMonths();
        if (Object.keys(data).length > 0) {
          setAllMonthsData(data);
        } else {
          setAllMonthsData({
            [currentMonthKey]: getEmptyMonthData(settings.defaultSalary)
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setAllMonthsData({
          [currentMonthKey]: getEmptyMonthData(settings.defaultSalary)
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save all months data to API (debounced)
  useEffect(() => {
    if (isLoading || Object.keys(allMonthsData).length === 0) return;

    const timeoutId = setTimeout(async () => {
      try {
        await apiClient.saveAllMonths(allMonthsData);
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [allMonthsData, isLoading]);

  // Check for payday prompt
  useEffect(() => {
    const checkPaydayPrompt = () => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      if (currentMonthKey !== currentMonthYear) {
        return;
      }
      
      if (currentDay >= 25) {
        const lastConfirmed = currentData.lastPaydayConfirmed;
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        if (!lastConfirmed || !lastConfirmed.startsWith(currentYearMonth)) {
          setIsPaydayPromptOpen(true);
        }
      }
    };
    
    const timer = setTimeout(checkPaydayPrompt, 500);
    return () => clearTimeout(timer);
  }, [currentMonthKey, currentData.lastPaydayConfirmed]);

  const updateCurrentMonth = (updater: (prev: FinancialData) => FinancialData) => {
    setAllMonthsData(prev => ({
      ...prev,
      [currentMonthKey]: updater(prev[currentMonthKey] || getEmptyMonthData(settings.defaultSalary))
    }));
  };

  const calculateRemainingFunds = () => {
    if (!currentData.monthlySalary) return 0;
    const totalBillsSpent = currentData.monthlyBills.reduce((sum, b) => sum + b.spent, 0);
    const totalExpenses = currentData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const manualSavingsThisMonth = currentData.transactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);
    return currentData.monthlySalary + currentData.extraFunds - totalBillsSpent - totalExpenses - manualSavingsThisMonth;
  };

  const handlePaydayYes = () => {
    const remaining = calculateRemainingFunds();
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    
    if (remaining > 0) {
      const savingsTransaction: Transaction = {
        id: `trans-${Date.now()}-${Math.random()}`,
        date: new Date().toISOString(),
        type: 'savings',
        category: 'Auto-Save from Previous Month',
        amount: remaining,
        note: 'Automatic savings from leftover funds',
        itemId: 'savings'
      };
      
      updateCurrentMonth(prev => ({
        ...prev,
        totalSavings: prev.totalSavings + remaining,
        transactions: [...prev.transactions, savingsTransaction],
        lastPaydayConfirmed: todayKey
      }));
    } else {
      updateCurrentMonth(prev => ({
        ...prev,
        lastPaydayConfirmed: todayKey
      }));
    }
    
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!allMonthsData[nextMonthKey]) {
      const newMonthData: FinancialData = {
        ...getEmptyMonthData(settings.defaultSalary),
        totalSavings: currentData.totalSavings + (remaining > 0 ? remaining : 0),
        goals: currentData.goals.map(g => ({ ...g }))
      };
      
      setAllMonthsData(prev => ({
        ...prev,
        [nextMonthKey]: newMonthData
      }));
    }
    
    setCurrentMonthKey(nextMonthKey);
    setIsPaydayPromptOpen(false);
  };

  const handlePaydayNo = () => {
    setIsPaydayPromptOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💰</div>
          <div className="text-xl text-text-primary">Loading Finance Tracker...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard
                currentMonthKey={currentMonthKey}
                setCurrentMonthKey={setCurrentMonthKey}
                allMonthsData={allMonthsData}
                setAllMonthsData={setAllMonthsData}
                settings={settings}
                setSettings={setSettings}
                currentData={currentData}
                updateCurrentMonth={updateCurrentMonth}
              />
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <Analytics 
                allMonthsData={allMonthsData} 
                settings={settings} 
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PaydayPrompt
          isOpen={isPaydayPromptOpen}
          onYes={handlePaydayYes}
          onNo={handlePaydayNo}
          remainingAmount={calculateRemainingFunds()}
        />
      </div>
    </BrowserRouter>
  );
}