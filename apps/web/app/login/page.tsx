"use client";

import { FormEvent, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("client@fitflow.local");
  const [password, setPassword] = useState("client123");
  const [role, setRole] = useState<"CLIENT" | "TRAINER" | "ADMIN">("CLIENT");
  const [result, setResult] = useState<LoginResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (mode === "signup") {
        await axios.post(
          "http://localhost:3001/api/v1/auth/register",
          { email, password, role },
        );
      }

      const res = await axios.post<LoginResponse>(
        "http://localhost:3001/api/v1/auth/login",
        { email, password },
      );
      setResult(res.data);

      if (typeof window !== "undefined") {
        localStorage.setItem("fitflow_token", res.data.accessToken);
        localStorage.setItem("fitflow_role", res.data.user.role);
        localStorage.setItem("fitflow_userId", res.data.user.id);
      }

      if (res.data.user.role === "ADMIN" || res.data.user.role === "TRAINER") {
        router.push("/admin");
      } else {
        router.push("/client");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md space-y-6">
      <h2 className="text-xl font-semibold">
        {mode === "login" ? "Login" : "Sign up"}
      </h2>
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-full px-3 py-1 ${
            mode === "login" ? "bg-accent-blue text-slate-900" : "bg-surface"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-3 py-1 ${
            mode === "signup" ? "bg-accent-blue text-slate-900" : "bg-surface"
          }`}
        >
          Sign up
        </button>
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg bg-surface p-4 text-sm"
      >
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Email</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-slate-100 focus:border-accent-blue focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-slate-300">Password</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-slate-100 focus:border-accent-blue focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>
        {mode === "signup" && (
          <div className="space-y-1">
            <label className="block text-xs text-slate-300">Role</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-xs text-slate-100 focus:border-accent-blue focus:outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="CLIENT">Client</option>
              <option value="TRAINER">Trainer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-accent-blue px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-accent-emerald disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && (
          <div className="mt-2 text-xs text-red-400">{error}</div>
        )}
      </form>

      {result && (
        <section className="space-y-2 rounded-lg bg-surface p-4 text-xs">
          <h3 className="font-semibold text-slate-200">Login Result</h3>
          <div className="text-slate-300">
            <div>
              User: <span className="font-mono">{result.user.email}</span> ({
                result.user.role
              })
            </div>
          </div>
          <div className="mt-2 space-y-1 break-all font-mono text-[10px] text-slate-400">
            <div>
              <span className="font-semibold text-slate-300">Access token:</span>{" "}
              {result.accessToken}
            </div>
            <div>
              <span className="font-semibold text-slate-300">Refresh token:</span>{" "}
              {result.refreshToken}
            </div>
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400">
        Demo accounts:
        <br />- admin@fitflow.local / admin123
        <br />- trainer@fitflow.local / trainer123
        <br />- client@fitflow.local / client123
      </p>
    </main>
  );
}
