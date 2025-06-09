export interface User {
  email: string;
  password: string;
  currency: string;
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  description?: string;
  type: 'expense' | 'income';
  currencySymbol?: string;
}

export interface CalendarTransaction extends Transaction {
  plan: string;
  module: string;
  color: string;
  currencySymbol: string;
}

export interface Module {
  id: string;
  type: string;
  name: string;
  percentage: number;
  color: string;
  balance: number;
  transactions: Transaction[];
  savingGoal?: number;
  emergencyThreshold?: number;
}

export interface Plan {
  id: string;
  name: string;
  totalBalance: number;
  modules: Module[];
}

export interface TrendDataPoint {
  date: string;
  totalExpenses: number;
  totalIncome: number;
} 
