"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Papa from "papaparse";
import jsPDF from "jspdf";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "@/lib/constants";
import { motion } from "framer-motion";

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

const CustomTooltip = ({ active, payload, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (typeof data.value !== 'number' || !isFinite(data.value)) {
      return null;
    }
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
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

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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
  const [modules, setModules] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
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
  const [editMod, setEditMod] = useState<any>(null);
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Add state for search and filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);

  // Add state for current user
  const [currentUser, setCurrentUser] = useState<any>(null);
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
      const parsedUser = JSON.parse(user);
      setCurrentUser(parsedUser);
      const selectedCurrency = CURRENCIES.find(c => c.name === parsedUser.currency);
      if (selectedCurrency) setCurrencySymbol(selectedCurrency.symbol);
      // Select a random tip on login/dashboard load
      setRandomTip(MONEY_TIPS[Math.floor(Math.random() * MONEY_TIPS.length)]);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 0;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  // Step 2: module details
  const handleModuleChange = (idx: number, field: string, value: any) => {
    setModules(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!planName || !totalBalance || numModules < 1) {
      setError("Please fill all fields.");
      return;
    }
    setModules(
      Array.from({ length: numModules }, (_, i) => ({
        type: MODULE_TYPES[0],
        name: "",
        percentage: 0,
        color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      }))
    );
    setStep(2);
    setError("");
  };

  const handleStep2 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const totalPercent = modules.reduce((sum, m) => sum + Number(m.percentage), 0);
    if (totalPercent !== 100) {
      setError("Total percentage must be 100%.");
      return;
    }
    // Save plan to localStorage
    const plan = {
      planName,
      totalBalance: Number(totalBalance),
      modules: modules.map(m => ({
        ...m,
        balance: (Number(totalBalance) * Number(m.percentage)) / 100,
        logs: [],
      })),
    };
    const storedPlans = JSON.parse(localStorage.getItem("finaceapp_plans") || "[]");
    const updatedPlans = [...storedPlans, plan];
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    setOpen(false);
    setStep(1);
    setPlanName("");
    setTotalBalance("");
    setNumModules(1);
    setModules([]);
    setError("");
    window.location.reload();
  };

  const openTxnModal = (type: 'expense' | 'income', planIdx: number, modIdx: number) => {
    setTxnType(type);
    setTxnPlanIdx(planIdx);
    setTxnModIdx(modIdx);
    setTxnTitle("");
    setTxnAmount("");
    setTxnDate("");
    setTxnDesc("");
    setTxnError("");
    setTxnOpen(true);
  };

  const handleTxnSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!txnTitle || !txnAmount || !txnDate) {
      setTxnError("Please fill in all required fields.");
      return;
    }
    if (txnPlanIdx === null || txnModIdx === null) return;

    const updatedPlans = [...plans];
    const currentPlan = { ...updatedPlans[txnPlanIdx] };
    const updatedModules = [...currentPlan.modules];
    const currentMod = { ...updatedModules[txnModIdx] };

    const amt = Number(txnAmount);

    if (txnType === "expense" && amt > currentMod.balance) {
      setTxnError("Insufficient balance in module.");
      return;
    }

    // Add log
    currentMod.logs = currentMod.logs ? [...currentMod.logs] : [];
    currentMod.logs.unshift({
      type: txnType,
      title: txnTitle,
      amount: amt,
      date: txnDate,
      description: txnDesc,
    });

    // Update balances
    if (txnType === "expense") {
      currentMod.balance -= amt;
      currentPlan.totalBalance -= amt;
    } else {
      currentMod.balance += amt;
      currentPlan.totalBalance += amt;
    }

    console.log("Updated module balance:", currentMod.balance);
    console.log("Updated plan total balance:", currentPlan.totalBalance);

    updatedModules[txnModIdx] = currentMod;
    currentPlan.modules = updatedModules;
    updatedPlans[txnPlanIdx] = currentPlan;

    setPlans(updatedPlans);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    setTxnOpen(false);
  };

  // Plan actions
  const handleDeletePlan = (idx: number) => {
    const updated = plans.filter((_: any, i: number) => i !== idx);
    setPlans(updated);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updated));
  };
  const handleExportCSV = (plan: any) => {
    const csv = Papa.unparse(plan.modules.flatMap((mod: any) => mod.logs.map((log: any) => ({
      plan: plan.planName,
      module: mod.name,
      type: log.type,
      title: log.title,
      amount: log.amount,
      date: log.date,
      description: log.description,
    }))));
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.planName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleExportPDF = (plan: any) => {
    const doc = new jsPDF();
    doc.text(`Plan: ${plan.planName}`, 10, 10);
    let y = 20;
    plan.modules.forEach((mod: any) => {
      doc.text(`Module: ${mod.name} (${mod.type})`, 10, y);
      y += 6;
      mod.logs.forEach((log: any) => {
        doc.text(`${log.date} - ${log.type} - ${log.title} - $${log.amount} - ${log.description || ""}`, 12, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = 10; }
      });
      y += 4;
    });
    doc.save(`${plan.planName}.pdf`);
  };
  const handleReset = () => {
    setPlans([]);
    localStorage.removeItem("finaceapp_plans");
  };

  const openEditMod = (planIdx: number, modIdx: number) => {
    setEditPlanIdx(planIdx);
    setEditModIdx(modIdx);
    setEditMod({ ...plans[planIdx].modules[modIdx] });
    setEditError("");
    setEditModOpen(true);
  };
  const handleEditModSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editMod.name || editMod.percentage < 0 || editMod.percentage > 100) {
      setEditError("Invalid module data.");
      return;
    }
    if (editPlanIdx === null || editModIdx === null) return;
    const updatedPlans = [...plans];
    updatedPlans[editPlanIdx].modules[editModIdx] = { ...editMod };
    // Recalculate balances
    const total = updatedPlans[editPlanIdx].totalBalance;
    updatedPlans[editPlanIdx].modules.forEach((m: any) => {
      m.balance = (total * m.percentage) / 100;
    });
    setPlans(updatedPlans);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    setEditModOpen(false);
  };
  const handleDeleteMod = (planIdx: number, modIdx: number) => {
    const updatedPlans = [...plans];
    updatedPlans[planIdx].modules.splice(modIdx, 1);
    setPlans(updatedPlans);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
  };

  const openGoalModal = (planIdx: number, modIdx: number, currentGoal: number) => {
    setGoalPlanIdx(planIdx);
    setGoalModIdx(modIdx);
    setGoalValue(currentGoal || 0);
    setGoalError("");
    setGoalOpen(true);
  };
  const handleGoalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (goalPlanIdx === null || goalModIdx === null) return;
    if (goalValue < 0 || goalValue > 100) {
      setGoalError("Goal must be between 0 and 100.");
      return;
    }
    const updatedPlans = [...plans];
    updatedPlans[goalPlanIdx].modules[goalModIdx].goal = goalValue;
    setPlans(updatedPlans);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    setGoalOpen(false);
  };

  const openEmModal = (planIdx: number, modIdx: number, current: number) => {
    setEmPlanIdx(planIdx);
    setEmModIdx(modIdx);
    setEmValue(current || 0);
    setEmError("");
    setEmOpen(true);
  };
  const handleEmSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (emPlanIdx === null || emModIdx === null) return;
    if (emValue < 0) {
      setEmError("Threshold must be positive.");
      return;
    }
    const updatedPlans = [...plans];
    updatedPlans[emPlanIdx].modules[emModIdx].emThreshold = emValue;
    setPlans(updatedPlans);
    localStorage.setItem("finaceapp_plans", JSON.stringify(updatedPlans));
    setEmOpen(false);
  };

  // Function to get trend data
  const getTrendData = useCallback(() => {
    const today = new Date();
    let startDate = new Date();

    switch (trendPeriod) {
      case "7days":
        startDate.setDate(today.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(today.getDate() - 30);
        break;
      case "6months":
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "12months":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    const dataMap: { [key: string]: { date: string, expense: number, income: number } } = {};

    plans.forEach(plan => {
      plan.modules.forEach((mod: any) => {
        if (mod.logs) {
          mod.logs.forEach((log: any) => {
            const logDate = new Date(log.date);
            if (logDate >= startDate) {
              const dateKey = log.date; // YYYY-MM-DD
              if (!dataMap[dateKey]) {
                dataMap[dateKey] = { date: dateKey, expense: 0, income: 0 };
              }
              if (log.type === "expense") {
                dataMap[dateKey].expense += log.amount;
              } else if (log.type === "income") {
                dataMap[dateKey].income += log.amount;
              }
            }
          });
        }
      });
    });

    const sortedDates = Object.keys(dataMap).sort();
    return sortedDates.map(date => dataMap[date]);
  }, [plans, trendPeriod]);

  const trendData = useMemo(() => getTrendData(), [getTrendData]);

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
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="date" fontSize={12} tick={{ fill: 'var(--foreground)' }} />
                <YAxis fontSize={12} tick={{ fill: 'var(--foreground)' }} />
                <Tooltip contentStyle={{ background: 'var(--background)', borderColor: 'var(--border)', borderRadius: 'var(--radius)' }} itemStyle={{ color: 'var(--foreground)' }} formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="expense" stroke="#FF6B6B" name="Expenses" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="income" stroke="#6BFFB6" name="Income" strokeWidth={2} dot={false} />
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
              onChange={e => setFilterType(e.target.value || null)}
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
              selected={selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined}
              onSelect={date => setSelectedDate(date ? date.toISOString().slice(0, 10) : null)}
              modifiers={{
                dot: (date: Date) => {
                  return plans.some(plan =>
                    plan.modules.some((mod: { logs?: { date: string }[] }) =>
                      mod.logs?.some((log: { date: string }) =>
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
                <h3 className="text-lg font-semibold mb-2">Transactions on {selectedDate}</h3>
                <div className="space-y-2">
                  {plans.flatMap(plan => plan.modules.flatMap((mod: any) => (mod.logs || []).filter((log: any) =>
                    (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
                    (!filterType || log.type === filterType) &&
                    log.date === selectedDate
                  ).map((log: any, i: number) => ({ ...log, plan: plan.planName, module: mod.name, color: mod.color, currencySymbol: currencySymbol }))))
                    .map((log: any, i: number) => (
                      <div key={i} className="p-2 rounded border flex items-center gap-2" style={{ borderColor: log.color }}>
                        <div className="w-3 h-3 rounded-full" style={{ background: log.color }} />
                        <span className="font-semibold">{log.title}</span>
                        <span className="text-xs text-muted-foreground">({log.type})</span>
                        <span className="ml-auto text-sm">{log.currencySymbol}{log.amount}</span>
                        <span className="text-xs ml-2">{log.plan} / {log.module}</span>
                        {log.description && <span className="text-xs text-muted-foreground ml-2">{log.description}</span>}
                      </div>
                    ))}
                  {plans.flatMap(plan => plan.modules.flatMap((mod: any) => (mod.logs || []).filter((log: any) =>
                    (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
                    (!filterType || log.type === filterType) &&
                    log.date === selectedDate
                  ))).length === 0 && (
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
                <h2 className="text-2xl font-bold mb-1">{plan.planName}</h2>
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
              {plan.modules.map((mod: any, mi: number) => (
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
                  {mod.logs && mod.logs.filter((log: any) =>
                    (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
                    (!filterType || log.type === filterType)
                  ).length > 0 && (
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
                          {(mod.logs as any[]).filter((log: any) =>
                            (!search || log.title.toLowerCase().includes(search.toLowerCase()) || (log.description && log.description.toLowerCase().includes(search.toLowerCase()))) &&
                            (!filterType || log.type === filterType)
                          ).map((log: any, li: number) => (
                            <TableRow key={li}>
                              <TableCell>{log.type}</TableCell>
                              <TableCell>{log.title}</TableCell>
                              <TableCell>{currencySymbol}{log.amount}</TableCell>
                              <TableCell>{log.date}</TableCell>
                              <TableCell>{log.description}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {/* Charts Section */}
                  {mod.logs && mod.logs.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Line Chart: Spending/Income Over Time */}
                      <div className="h-48 bg-muted rounded-xl flex flex-col items-center justify-center p-2">
                        <div className="text-xs text-muted-foreground mb-1">Spending/Income Over Time</div>
                        <ResponsiveContainer width="100%" height="90%">
                          <LineChart data={mod.logs.slice().reverse()}>
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
                              data={(() => {
                                const safeTotalBalance = Number(plan.totalBalance) || 0;
                                const safeModulePercentage = Number(mod.percentage) || 0;
                                const safeModuleBalance = Number(mod.balance) || 0;

                                const totalModuleBudget = safeTotalBalance * (safeModulePercentage / 100);

                                if (totalModuleBudget === 0) {
                                  return [];
                                }

                                let usedValue = 0;
                                let availableValue = 0;
                                let overspentValue = 0;

                                if (safeModuleBalance < 0) { // Overspent scenario
                                  usedValue = totalModuleBudget;
                                  overspentValue = Math.abs(safeModuleBalance);
                                  availableValue = 0;
                                } else if (safeModuleBalance < totalModuleBudget) { // Partially used
                                  usedValue = totalModuleBudget - safeModuleBalance;
                                  availableValue = safeModuleBalance;
                                  overspentValue = 0;
                                } else { // Fully available or no spending yet
                                  usedValue = 0;
                                  availableValue = totalModuleBudget;
                                  overspentValue = 0;
                                }

                                const data = [];
                                if (usedValue > 0) data.push({ name: 'Used', value: usedValue });
                                if (availableValue > 0) data.push({ name: 'Available', value: availableValue });
                                if (overspentValue > 0) data.push({ name: 'Overspent', value: overspentValue });

                                return data;
                              })()}
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
                              {(() => {
                                const data = [];
                                const safeTotalBalance = Number(plan.totalBalance) || 0;
                                const safeModulePercentage = Number(mod.percentage) || 0;
                                const safeModuleBalance = Number(mod.balance) || 0;
                                const totalModuleBudget = safeTotalBalance * (safeModulePercentage / 100);

                                let usedValue = 0;
                                let availableValue = 0;
                                let overspentValue = 0;

                                if (safeModuleBalance < 0) {
                                  usedValue = totalModuleBudget;
                                  overspentValue = Math.abs(safeModuleBalance);
                                } else if (safeModuleBalance < totalModuleBudget) {
                                  usedValue = totalModuleBudget - safeModuleBalance;
                                  availableValue = safeModuleBalance;
                                } else {
                                  usedValue = 0;
                                  availableValue = totalModuleBudget;
                                }

                                if (usedValue > 0) data.push(<Cell key="used" fill={mod.color} />);
                                if (availableValue > 0) data.push(<Cell key="avail" fill="#00E676" />);
                                if (overspentValue > 0) data.push(<Cell key="overspent" fill="#D32F2F" />);
                                return data;
                              })()}
                            </Pie>
                            <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </div>
                  )}
                  {mod.type === 'saving' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span>Goal:</span>
                        <span className="font-semibold">{mod.goal || 0}%</span>
                        <Button size="sm" variant="outline" onClick={() => openGoalModal(pi, mi, mod.goal)}>Set Goal</Button>
                      </div>
                      <div className="w-full bg-muted rounded h-2 mt-1">
                        <div
                          className="bg-primary rounded h-2"
                          style={{ width: `${Math.min(100, Math.round((mod.balance / (plan.totalBalance * (mod.goal || 1) / 100)) * 100))}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Actual: {Math.round((mod.balance / plan.totalBalance) * 100)}% of plan
                      </div>
                    </div>
                  )}
                  {mod.type === 'emergency' && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span>Alert Threshold:</span>
                        <span className="font-semibold">{currencySymbol}{mod.emThreshold || 0}</span>
                        <Button size="sm" variant="outline" onClick={() => openEmModal(pi, mi, mod.emThreshold)}>Set Alert</Button>
                      </div>
                      {mod.balance < (mod.emThreshold || 0) && (
                        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          🚨 Emergency fund below threshold!
                        </div>
                      )}
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
    </div>
  );
} 