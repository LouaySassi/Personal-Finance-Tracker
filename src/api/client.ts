const API_BASE = 'http://localhost:3000/api';

interface MonthlyDataStore {
  [monthKey: string]: any;
}

export const apiClient = {
  // Settings
  async getSettings() {
    const response = await fetch(`${API_BASE}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },

  async saveSettings(settings: any) {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to save settings');
    return response.json();
  },

  // Monthly Data
  async getAllMonths(): Promise<MonthlyDataStore> {
    const response = await fetch(`${API_BASE}/data/months`);
    if (!response.ok) throw new Error('Failed to fetch months');
    return response.json();
  },

  async getMonth(monthKey: string) {
    const response = await fetch(`${API_BASE}/data/months/${monthKey}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch month');
    }
    return response.json();
  },

  async saveMonth(monthKey: string, data: any) {
    const response = await fetch(`${API_BASE}/data/months/${monthKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save month');
    return response.json();
  },

  async saveAllMonths(allMonthsData: MonthlyDataStore) {
    const response = await fetch(`${API_BASE}/data/months`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allMonthsData),
    });
    if (!response.ok) throw new Error('Failed to save all months');
    return response.json();
  },

  async deleteMonth(monthKey: string) {
    const response = await fetch(`${API_BASE}/data/months/${monthKey}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete month');
    return response.json();
  },

  // Health check
  async checkHealth() {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Server not responding');
    return response.json();
  },
};