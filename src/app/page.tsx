import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-xl w-full flex flex-col items-center gap-8">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-center mb-2">Welcome to Expense Tracker</h1>
        <p className="text-lg text-center text-muted-foreground mb-6">A minimalist, Apple-inspired expense tracker for modern budgeting.</p>
        <Link href="/auth" className="inline-block px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow hover:scale-105 transition-transform">Get Started</Link>
      </div>
      <footer className="w-full mt-12 py-6 flex flex-col items-center justify-center text-xs text-muted-foreground border-t border-border bg-background/80 backdrop-blur-sm">
        <span>Created by <span className="font-semibold">mokshrajsinh</span> ©2025</span>
      </footer>
    </div>
  );
}
