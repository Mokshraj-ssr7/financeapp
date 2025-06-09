"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CURRENCIES = [
  { symbol: "$", name: "USD" },
  { symbol: "₹", name: "INR" },
  // Add more currencies as needed
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    const users = JSON.parse(localStorage.getItem("finaceapp_users") || "[]");
    if (isLogin) {
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (!user) {
        setError("Invalid email or password.");
        return;
      }
      localStorage.setItem("finaceapp_current_user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } else {
      if (users.find((u: any) => u.email === email)) {
        setError("User already exists. Please login.");
        return;
      }
      const newUser = { email, password, currency };
      users.push(newUser);
      localStorage.setItem("finaceapp_users", JSON.stringify(users));
      localStorage.setItem("finaceapp_current_user", JSON.stringify(newUser));
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-2 sm:px-4">
      <div className="w-full max-w-sm sm:max-w-md bg-card rounded-2xl shadow-lg p-4 sm:p-8 flex flex-col gap-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          {isLogin ? "Login" : "Sign Up"}
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <select
              className="input bg-background text-foreground border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              required
            >
              {CURRENCIES.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            autoFocus
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button type="submit" className="w-full mt-2">
            {isLogin ? "Login" : "Sign Up"}
          </Button>
        </form>
        <div className="text-center text-muted-foreground text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            className="ml-2 underline hover:text-primary"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
} 