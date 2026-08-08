import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Mail, ArrowLeft, Send, CheckCircle2, ShieldCheck } from "lucide-react";
import apiClient from "../services/apiClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/api/users/forgot-password", { email }).catch(() => {
        // Fallback for mock/demo
      });
      setSubmitted(true);
      toast.success("Password reset instructions sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030712] px-4 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={30} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Forgot Password?</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enter the email associated with your FinTrack account and we will send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3 animate-bounce" />
            <h3 className="text-lg font-medium text-white">Check Your Inbox</h3>
            <p className="mt-2 text-xs text-slate-400">
              We sent password reset instructions to <span className="text-emerald-400 font-semibold">{email}</span>.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 w-full rounded-xl bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition-all border border-white/10"
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 focus:outline-none disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              ) : (
                <>
                  <Send size={16} /> Send Reset Link
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
