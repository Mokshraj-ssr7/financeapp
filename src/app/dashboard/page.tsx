"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Papa from "papaparse";
import jsPDF from "jspdf";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "@/lib/constants";
import { motion } from "framer-motion";
import { User, Plan, Module, Transaction, TrendDataPoint, CalendarTransaction } from "@/lib/types";
import { Input } from "@/components/ui/input";

const MODULE_TYPES = [
  "expense",
  "income",
  "saving",
  "emergency",
  "custom",
];
const COLOR_PALETTE = [
  "#FFB6C1",
  "#B6E0FF",
  "#B6FFD9",
  "#FFF7B6",
  "#FFB6F9",
  "#B6FFB6",
  "#FFD6B6",
  "#B6B6FF",
];

const MONEY_TIPS = [
  "Save at least 10-15% of your income for retirement.",
  "Create a budget and stick to it to track your spending.",
  "Build an emergency fund covering 3-6 months of living expenses.",
  "Pay off high-interest debt first, like credit card balances.",
  "Invest regularly, even small amounts, to benefit from compounding.",
  "Review your bank statements regularly for unauthorized transactions.",
  "Automate your savings to make it consistent and effortless.",
  "Negotiate bills, such as internet or insurance, to save money.",
  "Cook at home more often to reduce dining out expenses.",
  "Set financial goals, whether short-term or long-term.",
  "Track your net worth to see your financial progress over time.",
  "Avoid impulse purchases by waiting 24 hours before buying.",
  "Consider refinancing high-interest loans like mortgages or student loans.",
  "Shop for groceries with a list to avoid unnecessary spending.",
  "Utilize cashback credit cards responsibly for rewards.",
  "Always compare prices before making a significant purchase.",
  "Learn about different investment options like stocks, bonds, and mutual funds.",
  "Teach your children about money management from a young age.",
  "Diversify your investments to minimize risk.",
  "Contribute to a 401(k) or IRA, especially if your employer offers a match.",
  "Cut down on unnecessary subscriptions you don't use frequently.",
  "Sell unused items to declutter and earn extra cash.",
  "Pack your lunch instead of buying it every day.",
  "Use public transport or carpool to save on fuel and parking.",
  "Review your insurance policies annually to ensure adequate coverage and rates.",
  "Avoid payday loans; they come with extremely high interest rates.",
  "Start a side hustle to supplement your main income.",
  "Buy used items when possible, especially for cars or furniture.",
  "Cancel gym memberships you rarely use.",
  "Take advantage of employer benefits like health savings accounts (HSAs).",
  "Read financial books or follow reputable finance blogs.",
  "Learn to differentiate between needs and wants.",
  "Create a debt repayment plan with specific targets.",
  "Consider consolidating high-interest debts into a lower-interest loan.",
  "Live below your means and avoid lifestyle inflation.",
  "Understand your credit score and how to improve it.",
  "Avoid carrying a credit card balance by paying it in full each month.",
  "Make extra payments on your mortgage to save on interest over time.",
  "Look for free or low-cost entertainment options.",
  "Batch errands to save on gas and time.",
  "Review your cell phone plan to ensure you're not overpaying.",
  "DIY small home repairs instead of hiring professionals.",
  "Use energy-efficient appliances to reduce utility bills.",
  "Plan your meals to reduce food waste and save money.",
  "Learn to mend clothes instead of buying new ones.",
  "Always ask for discounts or look for coupons.",
  "Invest in financial education to make informed decisions.",
  "Consider a staycation instead of an expensive vacation.",
  "Set a budget for gifts and stick to it.",
  "Review your investment portfolio regularly."
];

interface ChartPayload {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: ChartPayload;
    value: number;
  }[];
  currencySymbol: string;
}

const CustomTooltip = ({ active, payload, currencySymbol }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (typeof data.value !== 'number' || !isFinite(data.value)) {
      return null;
    }
    const total = payload.reduce((sum: number, entry: { value: number }) => sum + entry.value, 0);
    const percentage = total > 0 ? (data.value / total) * 100 : 0;

    return (
      <div className="bg-card p-2 rounded-lg border border-border shadow-sm text-foreground text-xs">
        <p className="font-semibold">{`${data.name}: ${currencySymbol}${data.value.toFixed(2)}`}</p>
        {total > 0 && <p className="text-muted-foreground">{`Percentage: ${percentage.toFixed(0)}%`}</p>}
      </div>
    );
  }
  return null;
};

interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: CustomizedLabelProps) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  // Avoid rendering label if percentage is too small or 0
  if (percent * 100 < 5 && percent * 100 !== 0) {
    return null;
  }
  if (percent === 0) {
    return null;
  }

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function DashboardPage() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [planName, setPlanName] = useState("");
  const [totalBalance, setTotalBalance] = useState("");
  const [numModules, setNumModules] = useState(1);
  const [modules, setModules] = useState<Module[]>([]);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [collab, setCollab] = useState(false);

  // State for header blur effect
  const [scrolled, setScrolled] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState("30days"); // New state for trend period
  const [randomTip, setRandomTip] = useState(""); // New state for random tip

  // Add state for transaction modal
  const [txnOpen, setTxnOpen] = useState(false);
  const [txnType, setTxnType] = useState<'expense' | 'income'>("expense");
  const [txnPlanIdx, setTxnPlanIdx] = useState<number | null>(null);
  const [txnModIdx, setTxnModIdx] = useState<number | null>(null);
  const [txnTitle, setTxnTitle] = useState("");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [txnDesc, setTxnDesc] = useState("");
  const [txnError, setTxnError] = useState("");

  // Add state for editing modules
  const [editModOpen, setEditModOpen] = useState(false);
  const [editPlanIdx, setEditPlanIdx] = useState<number | null>(null);
  const [editModIdx, setEditModIdx] = useState<number | null>(null);
  const [editMod, setEditMod] = useState<Module | null>(null);
  const [editError, setEditError] = useState("");

  // Add state for saving goal modal
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalPlanIdx, setGoalPlanIdx] = useState<number | null>(null);
  const [goalModIdx, setGoalModIdx] = useState<number | null>(null);
  const [goalValue, setGoalValue] = useState(0);
  const [goalError, setGoalError] = useState("");

  // Add state for emergency threshold modal
  const [emOpen, setEmOpen] = useState(false);
  const [emPlanIdx, setEmPlanIdx] = useState<number | null>(null);
  const [emModIdx, setEmModIdx] = useState<number | null>(null);
  const [emValue, setEmValue] = useState(0);
  const [emError, setEmError] = useState("");

  // Add state for calendar view
  const [calendarView, setCalendarView] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Add state for search and filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"expense" | "income" | null>(null);

  // Add state for current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const router = useRouter();

  // Fetch plans from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("finaceapp_plans");
    if (stored) setPlans(JSON.parse(stored));
  }, [open]);

  useEffect(() => {
    const user = localStorage.getItem("finaceapp_current_user");
    if (user) {
      const parsedUser: User = JSON.parse(user);
      setCurrentUser(parsedUser);
      const selectedCurrency = CURRENCIES.find(c => c.name === parsedUser.currency);
      if (selectedCurrency) {
        setCurrencySymbol(selectedCurrency.symbol);
      }
    } else {
      router.push("/");
    }
  }, [router]);

  // Handle header scroll blur effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Money tip effect
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * MONEY_TIPS.length);
      setRandomTip(MONEY_TIPS[randomIndex]);
    }, 15000); // Change tip every 15 seconds

    // Set initial tip
    const initialRandomIndex = Math.floor(Math.random() * MONEY_TIPS.length);
    setRandomTip(MONEY_TIPS[initialRandomIndex]);

    return () => clearInterval(interval);
  }, []);

  const handleModuleChange = (idx: number, field: 'type' | 'name' | 'percentage' | 'color', value: string | number) => {
    setModules(prev => {
      const newModules = [...prev];
      const updatedModule = { ...newModules[idx] };

      if (field === 'percentage') {
        updatedModule[field] = value as number;
      } else { // 'type', 'name', 'color'
        updatedModule[field] = value as string;
      }
      newModules[idx] = updatedModule;
      return newModules;
    });
  };

  const handleStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!planName || parseFloat(totalBalance) <= 0) {
      setError("Please enter a valid plan name and a total balance greater than 0.");
      return;
    }
    setModules(Array.from({ length: numModules }, (_, i) => ({
      type: "expense",
      name: `Module ${i + 1}`,
      percentage: numModules === 1 ? 100 : 0,
      color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      id: `new-module-${Date.now()}-${i}`,
      balance: 0,
      transactions: [],
    })));
    setStep(2);
    setError("");
  };

  const handleStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (modules.length === 0) {
      setError("Please add at least one module.");
      return;
    }
    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      name: planName,
      totalBalance: parseFloat(totalBalance),
      modules: modules.map((module: Module, i) => {
        const newModule: Module = {
          id: `module-${Date.now()}-${i}`,
          type: module.type,
          name: module.name,
          percentage: parseFloat(module.percentage.toString()), // Ensure percentage is number
          color: module.color || COLOR_PALETTE[i % COLOR_PALETTE.length],
          balance: (parseFloat(totalBalance) * parseFloat(module.percentage.toString())) / 100, // Ensure percentage is number
          transactions: [],
          savingGoal: module.type === "saving" ? 0 : undefined,
          emergencyThreshold: module.type === "emergency" ? 0 : undefined,
        };
        return newModule;
      }),
    };

    setPlans(prev => [...prev, newPlan]);
    localStorage.setItem("finaceapp_plans", JSON.stringify([...plans, newPlan]));
    setOpen(false);
    setStep(1);
    setPlanName("");
    setTotalBalance("");
    setNumModules(1);
    setModules([]);
    setError("");
  };

  const openTxnModal = (type: 'expense' | 'income', planIdx: number, modIdx: number) => {
    setTxnType(type);
    setTxnPlanIdx(planIdx);
    setTxnModIdx(modIdx);
    setTxnOpen(true);
    setTxnTitle("");
    setTxnAmount(""); // Set to empty string for input
    setTxnDate(new Date().toISOString().slice(0, 10)); // Set current date as default string
    setTxnDesc("");
    setTxnError("");
  };

  const handleTxnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!txnTitle || !txnAmount || !txnDate) {
      setTxnError("Please fill in all transaction fields.");
      return;
    }

    const updatedPlans = [...plans];
    if (txnPlanIdx !== null && txnModIdx !== null) {
      const currentMod = updatedPlans[txnPlanIdx].modules[txnModIdx];
      const amount = parseFloat(txnAmount);

      const newTransaction: Transaction = {
        id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: txnType,
        title: txnTitle,
        amount,
        date: txnDate,
        description: txnDesc,
        currencySymbol: currencySymbol,
      };

      currentMod.transactions = currentMod.transactions ? [...currentMod.transactions] : [];
      currentMod.transactions.unshift(newTransaction);

      if (txnType === "expense") {
        currentMod.balance -= amount;
        updatedPlans[txnPlanIdx].totalBalance -= amount; // Deduct from overall plan balance
      } else {
        // Distribute income across all modules based on their percentage
        updatedPlans[txnPlanIdx].modules.forEach((module: Module) => {
          const distributedAmount = amount * (module.percentage / 100);
          module.balance += distributedAmount;
        });
        updatedPlans[txnPlanIdx].totalBalance += amount; // Add to overall plan balance
      }

      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));

      setTxnOpen(false);
      setTxnTitle("");
      setTxnAmount("");
      setTxnDate("");
      setTxnDesc("");
      setTxnError("");
    }
  };

  const handleDeletePlan = (idx: number) => {
    if (window.confirm("Are you sure you want to delete this plan? This action cannot be undone.")) {
      const updatedPlans = plans.filter((_, i) => i !== idx);
      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    }
  };

  const handleExportCSV = (plan: Plan) => {
    const csv = Papa.unparse(plan.modules.flatMap((mod: Module) => mod.transactions.map((log: Transaction) => ({
      plan: plan.name,
      module: mod.name,
      type: log.type,
      title: log.title,
      amount: log.amount,
      date: log.date,
      description: log.description || "",
    }))));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${plan.name}-data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = (plan: Plan) => {
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(18);
    doc.text(`Financial Plan: ${plan.name}`, 10, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Balance: ${currencySymbol}${plan.totalBalance.toFixed(2)}`, 10, y);
    y += 10;

    plan.modules.forEach((mod: Module) => {
      y += 5;
      doc.setFontSize(14);
      doc.text(`Module: ${mod.name} (${mod.type})`, 10, y);
      y += 6;
      mod.transactions.forEach((log: Transaction) => {
        doc.text(`${log.date} - ${log.type} - ${log.title} - ${currencySymbol}${log.amount.toFixed(2)} - ${log.description || ""}`, 12, y);
        y += 6;
        if (y > 280) { // Check if content goes beyond page height
          doc.addPage();
          y = 10; // Reset y for new page
        }
      });
    });

    doc.save(`${plan.name}-report.pdf`);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all data? This will delete all plans and transactions.")) {
      localStorage.removeItem("finaceapp_plans");
      localStorage.removeItem("finaceapp_current_user");
      setPlans([]);
      router.push("/");
    }
  };

  const openEditMod = (planIdx: number, modIdx: number) => {
    const modToEdit = plans[planIdx].modules[modIdx];
    setEditPlanIdx(planIdx);
    setEditModIdx(modIdx);
    setEditMod(modToEdit);
    setEditModOpen(true);
    setEditError("");
  };

  const handleEditModSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editMod) return;
    if (!editMod.name || editMod.percentage === undefined) {
      setEditError("Please fill in all module fields.");
      return;
    }
    const updatedPlans = [...plans];
    if (editPlanIdx !== null && editModIdx !== null) {
      const currentPlan = updatedPlans[editPlanIdx];
      const originalModule = currentPlan.modules[editModIdx];

      // Calculate the difference in percentage
      const percentageDiff = editMod.percentage - originalModule.percentage;

      // Update the module properties
      currentPlan.modules[editModIdx] = {
        ...originalModule,
        name: editMod.name,
        percentage: editMod.percentage,
        color: editMod.color,
      };

      // Adjust total balance based on percentage change
      // This logic assumes balance is directly proportional to percentage of totalBalance
      // If the balance is derived from transactions, this might need adjustment
      const totalBalanceChange = (currentPlan.totalBalance * percentageDiff) / 100;
      currentPlan.modules[editModIdx].balance += totalBalanceChange;

      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));

      setEditModOpen(false);
      setEditMod(null);
      setEditError("");
    }
  };

  const handleDeleteMod = (planIdx: number, modIdx: number) => {
    if (window.confirm("Are you sure you want to delete this module? All associated transactions will also be deleted.")) {
      const updatedPlans = [...plans];
      const plan = updatedPlans[planIdx];
      const moduleToDelete = plan.modules[modIdx];

      // Deduct module balance from total plan balance before deleting
      plan.totalBalance -= moduleToDelete.balance;

      plan.modules = plan.modules.filter((_, i) => i !== modIdx);
      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    }
  };

  const openGoalModal = (planIdx: number, modIdx: number, currentGoal: number) => {
    setGoalPlanIdx(planIdx);
    setGoalModIdx(modIdx);
    setGoalValue(currentGoal);
    setGoalOpen(true);
    setGoalError("");
  };

  const handleGoalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (goalValue <= 0) {
      setGoalError("Please enter a valid goal amount.");
      return;
    }
    const updatedPlans = [...plans];
    if (goalPlanIdx !== null && goalModIdx !== null) {
      updatedPlans[goalPlanIdx].modules[goalModIdx].savingGoal = goalValue;
      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
      setGoalOpen(false);
      setGoalValue(0);
      setGoalError("");
    }
  };

  const openEmModal = (planIdx: number, modIdx: number, current: number) => {
    setEmPlanIdx(planIdx);
    setEmModIdx(modIdx);
    setEmValue(current);
    setEmOpen(true);
    setEmError("");
  };

  const handleEmSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (emValue <= 0) {
      setEmError("Please enter a valid threshold amount.");
      return;
    }
    const updatedPlans = [...plans];
    if (emPlanIdx !== null && emModIdx !== null) {
      updatedPlans[emPlanIdx].modules[emModIdx].emergencyThreshold = emValue;
      setPlans(updatedPlans);
      localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
      setEmOpen(false);
      setEmValue(0);
      setEmError("");
    }
  };

  // Function to calculate overall trend data
  const getOverallTrendData = (plans: Plan[], period: string): TrendDataPoint[] => {
    const data: { [key: string]: { expenses: number; income: number } } = {};
    const today = new Date();
    let daysToConsider = 0;
    switch (period) {
      case "7days":
        daysToConsider = 7;
        break;
      case "30days":
        daysToConsider = 30;
        break;
      case "90days":
        daysToConsider = 90;
        break;
      default:
        daysToConsider = 30;
    }

    for (let i = 0; i < daysToConsider; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().slice(0, 10);
      data[dateString] = { expenses: 0, income: 0 };
    }

    plans.forEach(plan => {
      plan.modules.forEach(mod => {
        mod.transactions.forEach((txn: Transaction) => {
          if (data[txn.date]) {
            if (txn.type === "expense") {
              data[txn.date].expenses += txn.amount;
            } else if (txn.type === "income") {
              data[txn.date].income += txn.amount;
            }
          }
        });
      });
    });

    const sortedDates = Object.keys(data).sort();
    return sortedDates.map(date => ({
      date,
      totalExpenses: data[date].expenses,
      totalIncome: data[date].income,
    }));
  };

  const getModuleChartData = (module: Module) => {
    const expenseTransactions = module.transactions.filter(t => t.type === 'expense');

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Data for Pie Chart (Allocation vs. Usage)

    // Ensure labels are numbers and greater than 0
    const pieData = [
      { name: 'Used', value: totalExpenses, color: '#FF6B6B' },
      { name: 'Remaining', value: Math.max(0, module.balance), color: '#6BFF6B' },
    ].filter(entry => entry.value > 0); // Only include segments with positive values

    // Data for Line Chart (Spending/Income Over Time)
    const dailyData: { [key: string]: { expenses: number; income: number } } = {};
    module.transactions.forEach(txn => {
      if (!dailyData[txn.date]) {
        dailyData[txn.date] = { expenses: 0, income: 0 };
      }
      if (txn.type === 'expense') {
        dailyData[txn.date].expenses += txn.amount;
      }
    });

    const lineChartData = Object.keys(dailyData).sort().map(date => ({
      date,
      expenses: dailyData[date].expenses,
    }));

    return { pieData, lineChartData };
  };

  const getFilteredTransactions = (plan: Plan, mod: Module) => {
    return mod.transactions.filter((log: Transaction) =>
      (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
      (!filterType || log.type === filterType)
    );
  };

  const filteredCalendarTransactions = useMemo((): CalendarTransaction[] => {
    if (!selectedDate) return [];

    return plans.flatMap((plan: Plan) =>
      plan.modules.flatMap((mod: Module) =>
        (mod.transactions || []).filter((log: Transaction) =>
          (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
          (!filterType || log.type === filterType) &&
          log.date === selectedDate.toISOString().slice(0, 10)
        ).map((log: Transaction, i: number): CalendarTransaction => ({
          ...log,
          plan: plan.name,
          module: mod.name,
          color: mod.color,
          currencySymbol: currencySymbol,
        }))
      )
    );
  }, [plans, selectedDate, search, filterType, currencySymbol]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground px-1 sm:px-2 md:px-4 pt-16">
      {/* Fixed Header */}
      <header className={`fixed top-0 left-0 right-0 z-40 w-full p-4 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-sm shadow-sm border-b border-border' : 'bg-transparent'}`}>
        <h1 className="text-xl sm:text-2xl font-bold">My Money Planner</h1>
        <div className="flex items-center gap-4">
          {currentUser && (
            <span className="truncate max-w-[120px] sm:max-w-[180px] text-xs text-muted-foreground">
              Account: <span className="ml-1 font-semibold">{currentUser.email}</span>
            </span>
          )}
          <button
            className="px-3 py-1 rounded-lg bg-destructive text-primary-foreground hover:bg-destructive/90 transition text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 active:scale-95"
            onClick={() => {
              localStorage.removeItem("finaceapp_current_user");
              router.push("/auth");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl w-full flex flex-col items-center gap-8 mt-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-center mb-2">Welcome Back!</h1>
        <p className="text-lg text-center text-muted-foreground mb-6">Manage your plans and track your expenses with a clean, Apple-inspired dashboard.</p>
        <div className="w-full flex justify-center">
          <Button className="px-10 py-6 text-xl rounded-2xl shadow-lg" onClick={() => setOpen(true)}>
            Create Plan
          </Button>
        </div>

        {/* Random Money Tip */}
        {randomTip && (
          <div className="w-full max-w-3xl p-4 bg-card rounded-2xl shadow-lg text-center text-sm font-medium text-muted-foreground animate-fade-in">
            💡 {randomTip}
          </div>
        )}

        {/* Overall Spending Trends */}
        <div className="w-full max-w-3xl mt-8 mb-8 flex flex-col gap-4 bg-card p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold mb-2">Overall Spending Trends</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="trendPeriod" className="text-sm">Show:</Label>
            <select
              id="trendPeriod"
              className="input px-2 py-1 text-sm"
              value={trendPeriod}
              onChange={e => setTrendPeriod(e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getOverallTrendData(plans, trendPeriod)} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="date" fontSize={12} tick={{ fill: 'var(--foreground)' }} />
                <YAxis fontSize={12} tick={{ fill: 'var(--foreground)' }} />
                <Tooltip contentStyle={{ background: 'var(--background)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }} itemStyle={{ color: 'var(--foreground)' }} formatter={(value: number, name: string) => [`${currencySymbol}${value.toFixed(2)}`, name === "totalIncome" ? "Income" : "Expenses"]} />
                <Line type="monotone" dataKey="totalExpenses" stroke="#FF6B6B" name="Expenses" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalIncome" stroke="#6BFF6B" name="Income" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-lg w-full p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle>{step === 1 ? "Create Plan" : "Add Modules"}</DialogTitle>
          </DialogHeader>
          {step === 1 && (
            <form onSubmit={handleStep1} className="flex flex-col gap-4">
              <input
                className="input"
                placeholder="e.g. June Budget"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                type="number"
                placeholder="Enter amount only"
                value={totalBalance}
                onChange={e => setTotalBalance(e.target.value)}
                min={0}
              />
              <input
                className="input"
                type="number"
                placeholder="e.g. 4 (Number of Modules)"
                value={numModules}
                onChange={e => setNumModules(Number(e.target.value))}
                min={1}
                max={8}
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button type="submit" className="w-full mt-2">Next</Button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleStep2} className="p-4 border rounded-lg bg-card flex flex-col gap-4">
              {modules.map((mod, idx) => (
                <Card key={idx} className="p-2 sm:p-4 flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <select
                      className="input bg-background text-foreground border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      value={mod.type}
                      onChange={e => handleModuleChange(idx, "type", e.target.value)}
                    >
                      {MODULE_TYPES.map(type => (
                        <option key={type} value={type} className="bg-background text-foreground">{type}</option>
                      ))}
                    </select>
                    <input
                      className="input flex-1"
                      placeholder="Module Name"
                      value={mod.name}
                      onChange={e => handleModuleChange(idx, "name", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      className="input w-24"
                      type="number"
                      placeholder="e.g. 45.6 (%)"
                      value={mod.percentage}
                      onChange={e => handleModuleChange(idx, "percentage", e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      min={0}
                      max={100}
                      step={0.1}
                    />
                    <input
                      className="input w-16"
                      type="color"
                      value={mod.color}
                      onChange={e => handleModuleChange(idx, "color", e.target.value)}
                    />
                  </div>
                </Card>
              ))}
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button type="submit" className="w-full mt-2">Create Plan</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Plans and Modules Section */}
      <div className="w-full max-w-3xl mt-6 md:mt-8 grid gap-4 md:gap-8">
        {plans.length === 0 && (
          <div className="text-center text-muted-foreground">No plans yet. Create your first plan!</div>
        )}
        <div className="w-full flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2">
            <input
              className="input px-3 py-2 text-sm"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="input px-2 py-2 text-sm"
              value={filterType || ""}
              onChange={e => setFilterType(e.target.value as "expense" | "income" | null)}
            >
              <option value="">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <Button size="sm" variant={calendarView ? "default" : "outline"} onClick={() => setCalendarView(v => !v)}>
              {calendarView ? "Hide Calendar" : "Show Calendar"}
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">Collaborative Mode</span>
          <Switch checked={collab} onCheckedChange={setCollab} />
          {collab && <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-semibold">Shared Plan</span>}
        </div>
        <div className="w-full flex justify-end mb-4">
          <Button variant="destructive" size="sm" onClick={handleReset}>Reset All Data</Button>
        </div>
        {calendarView && (
          <div className="w-full max-w-3xl mx-auto mb-8 px-1 sm:px-0">
            <Calendar
              mode="single"
              selected={selectedDate ? new Date(selectedDate.toISOString().slice(0, 10)) : undefined}
              onSelect={date => setSelectedDate(date ? date : null)}
              modifiers={{
                dot: (date: Date) => {
                  return plans.some(plan =>
                    plan.modules.some((mod: { transactions?: { date: string }[] }) =>
                      mod.transactions?.some((log: { date: string }) =>
                        log.date === date.toISOString().slice(0, 10)
                      )
                    )
                  );
                },
              }}
              modifiersClassNames={{ dot: "bg-primary rounded-full w-2 h-2 mx-auto" }}
            />

            {selectedDate && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Transactions on {selectedDate.toLocaleDateString()}</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {filteredCalendarTransactions.length > 0 ? (
                    filteredCalendarTransactions.map((log: CalendarTransaction, i: number) => (
                      <Card key={i} className="p-3 shadow-sm flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: log.type === 'expense' ? '#FF6B6B' : '#6BFF6B' }}></div>
                          <div>
                            <p className="font-medium">{log.title}</p>
                            <p className="text-muted-foreground text-xs">{log.description}</p>
                          </div>
                        </div>
                        <p className="font-semibold">{log.type === "expense" ? "-" : "+"}{log.currencySymbol}{log.amount.toFixed(2)}</p>
                      </Card>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm">No transactions for this day.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {plans.map((plan, pi) => (
          <Card key={pi} className="p-6 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
                <div className="text-muted-foreground text-sm">Total Balance: {currencySymbol}{plan.totalBalance.toLocaleString()}</div>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExportCSV(plan)}>Export CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPDF(plan)}>Export PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeletePlan(pi)} className="text-red-500">Delete Plan</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {plan.modules.map((mod: Module, mi: number) => (
                <Card key={mi} className="p-3 sm:p-4 flex flex-col gap-2 border-2 overflow-x-auto" style={{ borderColor: mod.color }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ background: mod.color }} />
                    <span className="font-semibold text-lg">{mod.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{mod.type}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{currencySymbol}{mod.balance.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mb-2">{mod.percentage}% of plan</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openTxnModal('expense', pi, mi)}>Add Expense</Button>
                    <Button size="sm" variant="outline" onClick={() => openTxnModal('income', pi, mi)}>Add Income</Button>
                    <div className="flex gap-2 ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditMod(pi, mi)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteMod(pi, mi)} className="text-red-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {/* Transaction Table */}
                  {mod.transactions && mod.transactions.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <Table className="min-w-[500px] md:min-w-0">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mod.transactions.filter((log: Transaction) =>
                            (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
                            (!filterType || log.type === filterType)
                          ).map((log: Transaction, i: number) => (
                            <TableRow key={i} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{log.title}</TableCell>
                              <TableCell>{log.type === "expense" ? "-" : "+"}{currencySymbol}{log.amount.toFixed(2)}</TableCell>
                              <TableCell>{log.date}</TableCell>
                              <TableCell className="hidden sm:table-cell">{log.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No transactions logged yet.</p>
                  )}
                  {/* Charts Section */}
                  {mod.transactions && mod.transactions.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Line Chart: Spending/Income Over Time */}
                      <div className="h-48 bg-muted rounded-xl flex flex-col items-center justify-center p-2">
                        <div className="text-xs text-muted-foreground mb-1">Spending/Income Over Time</div>
                        <ResponsiveContainer width="100%" height="90%">
                          <LineChart data={mod.transactions.slice().reverse()}>
                            <XAxis dataKey="date" fontSize={10} tick={{ fill: 'var(--foreground)' }} />
                            <YAxis fontSize={10} tick={{ fill: 'var(--foreground)' }} />
                            <Tooltip contentStyle={{ background: 'var(--background)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }} itemStyle={{ color: 'var(--foreground)' }} />
                            <Line type="monotone" dataKey="amount" stroke={mod.color} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Pie Chart: Allocation vs. Usage */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-48 bg-muted rounded-xl flex flex-col items-center justify-center p-2"
                      >
                        <div className="text-xs text-muted-foreground mb-1">Allocation vs. Usage</div>
                        <ResponsiveContainer width="100%" height="90%">
                          <PieChart key={`${mod.balance}-${plan.totalBalance}`}>
                            <Pie
                              data={getModuleChartData(mod).pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={35}
                              innerRadius={20}
                              paddingAngle={3}
                              labelLine={false}
                              label={renderCustomizedLabel}
                            >
                              {getModuleChartData(mod).pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </div>
                  )}
                  {/* Saving Goal / Emergency Fund Section */}
                  {mod.type === "saving" && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                      <h4 className="text-lg font-semibold mb-2">Saving Goal</h4>
                      {mod.savingGoal !== undefined && mod.savingGoal > 0 ? (
                        <>
                          <p className="text-muted-foreground">Goal: {currencySymbol}{mod.savingGoal.toFixed(2)}</p>
                          <p className="text-muted-foreground">Progress: {currencySymbol}{mod.balance.toFixed(2)} / {currencySymbol}{mod.savingGoal.toFixed(2)} ({(mod.balance / mod.savingGoal * 100).toFixed(0)}%)</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">No saving goal set.</p>
                      )}
                      <Button
                        onClick={() => openGoalModal(pi, mi, mod.savingGoal || 0)}
                        className="mt-2 text-xs"
                      >
                        {mod.savingGoal !== undefined && mod.savingGoal > 0 ? "Edit Saving Goal" : "Set Saving Goal"}
                      </Button>
                    </div>
                  )}
                  {mod.type === "emergency" && (
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                      <h4 className="text-lg font-semibold mb-2">Emergency Fund</h4>
                      {mod.emergencyThreshold !== undefined && mod.emergencyThreshold > 0 ? (
                        <>
                          <p className="text-muted-foreground">Threshold: {currencySymbol}{mod.emergencyThreshold.toFixed(2)}</p>
                          {mod.balance < mod.emergencyThreshold && (
                            <p className="text-red-500 font-bold">Alert: Balance is below emergency threshold!</p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">No emergency threshold set.</p>
                      )}
                      <Button
                        onClick={() => openEmModal(pi, mi, mod.emergencyThreshold || 0)}
                        className="mt-2 text-xs"
                      >
                        {mod.emergencyThreshold !== undefined && mod.emergencyThreshold > 0 ? "Edit Threshold" : "Set Threshold"}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {/* Transaction Modal */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{txnType === 'expense' ? 'Add Expense' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleTxnSubmit}>
            <Label>Title</Label>
            <input className="input" value={txnTitle} onChange={e => setTxnTitle(e.target.value)} required />
            <Label>Amount</Label>
            <input className="input" type="number" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} required min={1} />
            <Label>Date</Label>
            <input className="input" type="date" value={txnDate} onChange={e => setTxnDate(e.target.value)} required />
            <Label>Description</Label>
            <Textarea className="input" value={txnDesc} onChange={e => setTxnDesc(e.target.value)} />
            {txnError && <div className="text-red-500 text-sm">{txnError}</div>}
            <Button type="submit" className="w-full mt-2">Add {txnType === 'expense' ? 'Expense' : 'Income'}</Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Module Modal */}
      <Dialog open={editModOpen} onOpenChange={setEditModOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
          </DialogHeader>
          {editMod && (
            <form className="flex flex-col gap-4" onSubmit={handleEditModSubmit}>
              <Label>Name</Label>
              <input className="input" value={editMod.name} onChange={e => setEditMod({ ...editMod, name: e.target.value })} required />
              <Label>Type</Label>
              <select className="input" value={editMod.type} onChange={e => setEditMod({ ...editMod, type: e.target.value })}>
                {MODULE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Label>Percentage</Label>
              <input className="input" type="number" value={editMod.percentage} onChange={e => setEditMod({ ...editMod, percentage: Number(e.target.value) })} min={0} max={100} required />
              <Label>Color</Label>
              <input className="input w-16" type="color" value={editMod.color} onChange={e => setEditMod({ ...editMod, color: e.target.value })} />
              {editError && <div className="text-red-500 text-sm">{editError}</div>}
              <Button type="submit" className="w-full mt-2">Save</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Saving Goal Modal */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Saving Goal (%)</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleGoalSubmit}>
            <Label>Goal Percentage</Label>
            <input className="input" type="number" value={goalValue} onChange={e => setGoalValue(Number(e.target.value))} min={0} max={100} required />
            {goalError && <div className="text-red-500 text-sm">{goalError}</div>}
            <Button type="submit" className="w-full mt-2">Save Goal</Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Emergency Threshold Modal */}
      <Dialog open={emOpen} onOpenChange={setEmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Set Emergency Alert Threshold</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={handleEmSubmit}>
            <Label>Threshold Amount</Label>
            <input className="input" type="number" value={emValue} onChange={e => setEmValue(Number(e.target.value))} min={0} required />
            {emError && <div className="text-red-500 text-sm">{emError}</div>}
            <Button type="submit" className="w-full mt-2">Save Threshold</Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Overall Calendar View */}
      <Dialog open={calendarView} onOpenChange={setCalendarView}>
        <DialogContent className="sm:max-w-[600px] p-6">
          <DialogHeader>
            <DialogTitle>Transaction Calendar</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={date => setSelectedDate(date || null)}
                modifiers={{
                  dot: (date: Date) => {
                    return plans.some(plan => plan.modules.some((mod: Module) =>
                      mod.transactions.some((log: Transaction) => new Date(log.date).toDateString() === date.toDateString())
                    ));
                  },
                }}
                modifiersStyles={{
                  dot: {
                    color: 'var(--primary)',
                    content: '.',
                    fontSize: '2rem',
                    lineHeight: '0.5',
                    position: 'absolute',
                    bottom: '5px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  },
                }}
                className="rounded-md border shadow"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="input px-2 py-2 text-sm"
                  value={filterType || ""}
                  onChange={e => setFilterType(e.target.value as "expense" | "income" | null)}
                >
                  <option value="">All Types</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              {selectedDate && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Transactions on {selectedDate.toLocaleDateString()}</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {filteredCalendarTransactions.length > 0 ? (
                      filteredCalendarTransactions.map((log: CalendarTransaction, i: number) => (
                        <Card key={i} className="p-3 shadow-sm flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: log.type === 'expense' ? '#FF6B6B' : '#6BFF6B' }}></div>
                            <div>
                              <p className="font-medium">{log.title}</p>
                              <p className="text-muted-foreground text-xs">{log.description}</p>
                            </div>
                          </div>
                          <p className="font-semibold">{log.type === "expense" ? "-" : "+"}{log.currencySymbol}{log.amount.toFixed(2)}</p>
                        </Card>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm">No transactions for this day.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
