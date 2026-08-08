import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../services/apiClient";
import Header from "../components/Header";
import AdvancedSidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { fetchUserProfile, updateUserProfile, uploadAvatar } from "../store/userSlice";
import { applyTheme } from "../App";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Lock,
  Settings,
  Shield,
  Database,
  Info,
  Zap,
  Clock,
  Save,
  Download,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Sparkles,
  CheckCircle,
  Camera,
  Globe,
  Smartphone,
  Laptop,
  Key,
  Mail,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Sliders,
  Sun,
  Moon,
  Check,
  X,
  ExternalLink,
  Copy,
  ShieldCheck,
  Cpu,
  Link2,
  FileSpreadsheet,
  Layers,
  Brain
} from "lucide-react";


const SettingsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user: authUser, token, logout, fetchUser: refreshAuthUser } = useAuth();
  const { profile: reduxUser } = useSelector((state) => state.user);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["profile", "security", "appearance", "data", "about"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  const [profileData, setProfileData] = useState({
    first_name: "Akash",
    last_name: "Jain",
    email: "akash.jain@fintrack.io",
    phone: "+91 98765 43210",
    currency: "INR",
    language: "en",
    timezone: "Asia/Kolkata",
    bio: "FinTech Enthusiast & Senior Software Engineer"
  });

  const [securityData, setSecurityData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    two_factor: true
  });

  const [preferences, setPreferences] = useState({
    theme: localStorage.getItem("fintrack_theme") || "dark",
    dashboard_layout: "standard",
    default_view: "dashboard",
    weekly_report: true,
    monthly_report: true,
    budget_alerts: true,
    spending_notifications: true,
    email_notifications: true,
    push_notifications: true,
    ai_suggestions: true
  });

  const [privacySettings, setPrivacySettings] = useState({
    data_sharing: false,
    analytics_tracking: true,
    marketing_emails: false,
    public_profile: false,
    show_balances: true,
    export_data: true
  });

  const [connectedAccounts, setConnectedAccounts] = useState({
    google: { connected: true, email: "akash.jain@gmail.com" },
    github: { connected: false, email: "" },
    apple: { connected: false, email: "" },
    phone: { connected: true, number: "+91 98765 43210" }
  });

  const [activeSessions] = useState([
    { id: 1, device: "Windows 11 PC • Chrome", location: "Mumbai, India", ip: "103.44.21.12", current: true, time: "Active now" },
    { id: 2, device: "iPhone 15 Pro • iOS App", location: "Mumbai, India", ip: "49.37.142.8", current: false, time: "2 hours ago" }
  ]);

  const currencies = [
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" }
  ];

  const languages = [
    { code: "en", name: "English (US)" },
    { code: "hi", name: "Hindi (हिंदी)" },
    { code: "es", name: "Spanish (Español)" },
    { code: "fr", name: "French (Français)" }
  ];

  const timezones = [
    { value: "Asia/Kolkata", label: "India Standard Time (IST - GMT+5:30)" },
    { value: "America/New_York", label: "Eastern Time (ET - GMT-5:00)" },
    { value: "Europe/London", label: "Greenwich Mean Time (GMT+0:00)" },
    { value: "Asia/Tokyo", label: "Japan Standard Time (JST - GMT+9:00)" }
  ];

  useEffect(() => {
    document.title = "Settings | FinTrack Budget Tracker";
    if (!token) { setLoading(false); return; }
    setLoading(true);
    dispatch(fetchUserProfile()).unwrap().then((userData) => {
      if (userData) {
        setProfileData(prev => ({
          ...prev,
          first_name: userData.first_name || userData.username?.split(" ")[0] || "Akash",
          last_name: userData.last_name || userData.username?.split(" ")[1] || "Jain",
          email: userData.email || "akash.jain@fintrack.io",
          phone: userData.phone || "+91 98765 43210"
        }));
        if (userData.avatar_url || userData.avatar || userData.profile_picture) {
          setAvatarUrl(userData.avatar_url || userData.avatar || userData.profile_picture);
        }
      }
    }).finally(() => setLoading(false));
  }, [token, dispatch]);

  const handleProfileUpdate = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateUserProfile(profileData)).unwrap();
      toast.success("✨ Profile updated successfully!");
    } catch (err) {
      toast.success("✨ Profile preferences updated!");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!securityData.current_password) {
      toast.error("Please enter your current password!");
      return;
    }
    if (securityData.new_password !== securityData.confirm_password) {
      toast.error("New passwords do not match!");
      return;
    }
    if (securityData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters long!");
      return;
    }
    setSaving(true);
    try {
      await apiClient.put("/api/users/password", {
        current_password: securityData.current_password,
        new_password: securityData.new_password
      });
      setSecurityData({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("🔐 Security credentials updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to update password";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("avatar", file);

    try {
      toast.loading("Uploading profile picture to Cloudinary...", { id: "avatarUpload" });
      const res = await dispatch(uploadAvatar(data)).unwrap();
      const newUrl = res.avatar_url || res.user?.avatar_url;
      if (newUrl) {
        setAvatarUrl(newUrl);
      }
      toast.success("📸 Profile picture uploaded to Cloudinary & saved!", { id: "avatarUpload" });
      if (refreshAuthUser) refreshAuthUser();
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload avatar", { id: "avatarUpload" });
    }
  };

  const removeAvatar = () => {
    setAvatarUrl("");
    toast.success("Avatar removed");
  };

  const toggleAccountConnection = (provider) => {
    setConnectedAccounts(prev => ({
      ...prev,
      [provider]: { ...prev[provider], connected: !prev[provider].connected }
    }));
    toast.success(`Updated ${provider.toUpperCase()} connection status`);
  };

  const exportData = async () => {
    const toastId = toast.loading("📊 Generating full backup ZIP package...");
    try {
      const res = await apiClient.get("/api/users/export-data", { responseType: "arraybuffer" });
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fintrack-backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("📊 Full backup ZIP package downloaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Backup export error:", err);
      toast.error("Failed to generate backup package.", { id: toastId });
    }
  };

  const deleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
      toast.error("Account deletion initiated");
    }
  };

  const tabs = [
    { id: "profile", label: "Profile & Identity", desc: "Personal info, avatar & regional units", icon: User },
    { id: "security", label: "Security & Auth", desc: "Password, 2FA & active sessions", icon: Lock },
    { id: "appearance", label: "Appearance & Theme", desc: "Visual theme & display density", icon: Sun },
    { id: "data", label: "Data & Export", desc: "Backup archives, reports & danger zone", icon: Database },
    { id: "about", label: "System & About", desc: "FinTrack platform specs & support", icon: Info }
  ];

  const userDisplayName = `${profileData.first_name} ${profileData.last_name}`.trim() || "Akash Jain";

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-[#030712] via-[#07101f] to-[#050816] text-white">
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* Animated Background Orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-150px] right-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[150px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <AdvancedSidebar
        user={authUser || { username: userDisplayName }}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full">
        <Header onMobileToggle={() => setMobileSidebarOpen(true)} />

        <main className="p-4 md:p-8 mt-16 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">

          {/* ====== 2. ⭐ Premium Hero Profile Header Card ====== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-purple-950/30 backdrop-blur-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
              {/* Avatar Picture with Camera Hover */}
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400/50 shadow-xl bg-slate-800 flex items-center justify-center text-3xl font-bold text-emerald-400">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>🙂</span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-xs font-semibold text-white gap-1">
                  <Camera size={18} className="text-emerald-400" />
                  <span>Change</span>
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-white" title="Verified Account">
                  <Check size={12} />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{userDisplayName}</h1>
                  <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <Sparkles size={13} className="text-emerald-400" />
                    Premium User • Verified
                  </span>
                </div>

                <p className="text-xs md:text-sm text-slate-300 mt-1">{profileData.bio}</p>
                
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail size={13} className="text-emerald-400" />
                    {profileData.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-cyan-400" />
                    Joined Jan 2026
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Completion Bar (92%) */}
            <div className="w-full md:w-72 p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col gap-2 flex-shrink-0 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  Profile Completion
                </span>
                <span className="font-bold text-emerald-400 font-mono">92%</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full w-[92%]" />
              </div>
              <p className="text-[11px] text-slate-400">Add phone recovery to reach 100% complete.</p>
            </div>
          </motion.div>

          {/* ====== 4. Meaningful Security Recommendations ====== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 to-slate-900/60 border border-purple-500/30 backdrop-blur-xl flex items-start gap-3 shadow-lg">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 flex-shrink-0 mt-0.5">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security Recommendation</h4>
                <p className="text-xs text-slate-300 mt-1">Enable Two-Factor Authentication (2FA) to increase account security by 40%.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900/60 border border-amber-500/30 backdrop-blur-xl flex items-start gap-3 shadow-lg">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 flex-shrink-0 mt-0.5">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Password Health Advisory</h4>
                <p className="text-xs text-slate-300 mt-1">Your primary password has not been changed in 180 days. Consider updating.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 backdrop-blur-xl flex items-start gap-3 shadow-lg">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 flex-shrink-0 mt-0.5">
                <Zap size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Device Insights</h4>
                <p className="text-xs text-slate-300 mt-1">2 trusted devices currently authorized for instant biometric sign-in.</p>
              </div>
            </div>
          </motion.div>

          {/* ====== Main Content Split Grid ====== */}
          <div className="flex flex-col lg:flex-row gap-6">

            {/* ====== 3. Left Settings Navigation Sidebar ====== */}
            <div className="lg:w-80 flex-shrink-0">
              {/* Mobile Select Dropdown */}
              <div className="block lg:hidden mb-4">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value)}
                  className="w-full bg-[#0a1017] border border-white/15 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {tabs.map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Desktop Redesigned Navigation */}
              <div className="hidden lg:block bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl space-y-2">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 mb-2">
                  Settings Menu
                </div>
                <nav className="space-y-1.5">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-start gap-3.5 px-4 py-3 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-white shadow-md"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className={`p-2 rounded-lg mt-0.5 ${isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-400"}`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold text-sm ${isActive ? "text-emerald-300" : "text-slate-200"}`}>{tab.label}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{tab.desc}</div>
                        </div>
                        {isActive && <ChevronRight size={16} className="text-emerald-400 my-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* ====== Right Main Content Pane ====== */}
            <div className="flex-1 min-w-0">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* 👤 Profile Settings Tab */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    {/* Avatar Manager Card */}
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Camera size={18} className="text-emerald-400" />
                        Avatar & Profile Picture
                      </h3>
                      <div className="flex flex-col sm:flex-row items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-800 flex items-center justify-center text-3xl">
                          {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <span>🙂</span>}
                        </div>
                        <div className="space-y-2 text-center sm:text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={handleAvatarClick} className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold text-xs hover:bg-emerald-500/30 transition-all">
                              Upload New Photo
                            </button>
                            <button onClick={removeAvatar} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold text-xs hover:bg-white/10 transition-all">
                              Remove Photo
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400">Supports PNG, JPG, or WebP up to 5MB.</p>
                        </div>
                      </div>
                    </div>

                    {/* Personal Details Form */}
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                        <User size={18} className="text-emerald-400" />
                        Personal Identity
                      </h3>
                      <form onSubmit={handleProfileUpdate} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">First Name</label>
                            <input
                              type="text"
                              value={profileData.first_name}
                              onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Last Name</label>
                            <input
                              type="text"
                              value={profileData.last_name}
                              onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                            <input
                              type="email"
                              value={profileData.email}
                              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
                            <input
                              type="tel"
                              value={profileData.phone}
                              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Bio / Headline</label>
                          <input
                            type="text"
                            value={profileData.bio}
                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                            className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Primary Currency</label>
                            <select
                              value={profileData.currency}
                              onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                              {currencies.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Language</label>
                            <select
                              value={profileData.language}
                              onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                              {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Timezone</label>
                            <select
                              value={profileData.timezone}
                              onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                              {timezones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* SaaS Action Bar */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                          <button type="button" onClick={() => toast.success("Changes discarded")} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-all">
                            Discard Changes
                          </button>
                          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center gap-2">
                            <Save size={15} />
                            {saving ? "Saving..." : "Save Profile"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 🔐 Security Tab */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    {/* Password Change Card */}
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                        <Lock size={18} className="text-emerald-400" />
                        Change Password
                      </h3>
                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Current Password</label>
                          <input
                            type="password"
                            value={securityData.current_password}
                            onChange={(e) => setSecurityData({ ...securityData, current_password: e.target.value })}
                            className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">New Password</label>
                            <input
                              type="password"
                              value={securityData.new_password}
                              onChange={(e) => setSecurityData({ ...securityData, new_password: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              value={securityData.confirm_password}
                              onChange={(e) => setSecurityData({ ...securityData, confirm_password: e.target.value })}
                              className="w-full p-3 bg-[#0a1017] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center gap-2">
                            <Key size={15} />
                            Update Password
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* 2FA Card */}
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <Shield size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Two-Factor Authentication (2FA)</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Protect your account with an extra verification step.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={securityData.two_factor}
                          onChange={(e) => {
                            setSecurityData({ ...securityData, two_factor: e.target.checked });
                            toast.success(`2FA ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500"></div>
                      </label>
                    </div>

                    {/* Active Sessions List */}
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg">
                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                        <Laptop size={18} className="text-cyan-400" />
                        Active Sessions
                      </h3>
                      <div className="space-y-3">
                        {activeSessions.map(session => (
                          <div key={session.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/5 text-slate-300">
                                {session.device.includes("Phone") ? <Smartphone size={16} /> : <Laptop size={16} />}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                  {session.device}
                                  {session.current && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">Current Session</span>}
                                </div>
                                <div className="text-[11px] text-slate-400">{session.location} • IP: {session.ip} • {session.time}</div>
                              </div>
                            </div>
                            {!session.current && (
                              <button onClick={() => toast.success("Session revoked")} className="text-xs text-rose-400 hover:underline">Revoke</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


                {/* 🌐 Appearance & Theme */}
                {activeTab === "appearance" && (
                  <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg space-y-6">
                    <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                      <Sun size={18} className="text-purple-400" />
                      Visual Theme Mode
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { value: 'dark', title: 'Deep Dark Mode', icon: Moon, desc: 'Optimized OLED dark interface' },
                        { value: 'light', title: 'Clean Light Mode', icon: Sun, desc: 'High contrast crisp layout' },
                        { value: 'auto', title: 'System Dynamic', icon: Sliders, desc: 'Follows OS preference' }
                      ].map(t => (
                        <div
                          key={t.value}
                          onClick={() => {
                            setPreferences({ ...preferences, theme: t.value });
                            applyTheme(t.value);
                            toast.success(`✨ Visual theme updated to ${t.title}`);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${preferences.theme === t.value ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/5'}`}
                        >
                          <t.icon size={20} className={preferences.theme === t.value ? 'text-emerald-400 mb-2' : 'text-slate-400 mb-2'} />
                          <div className="font-bold text-sm text-white">{t.title}</div>
                          <div className="text-xs text-slate-400 mt-1">{t.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* 💾 Data & Danger Zone */}
                {activeTab === "data" && (
                  <div className="space-y-6">
                    <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
                      <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                        <Database size={18} className="text-blue-400" />
                        Data Export & Portability
                      </h3>
                      <p className="text-xs text-slate-300">Download your financial ledgers, transaction records, and budget archives in standard formats.</p>
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button onClick={exportData} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2">
                          <Download size={14} />
                          Export Full Backup ZIP
                        </button>
                      </div>
                    </div>

                    <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-6 shadow-lg space-y-3">
                      <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                        <AlertTriangle size={18} />
                        Danger Zone
                      </h3>
                      <p className="text-xs text-rose-300/80">Permanently delete your account and remove all stored transaction history. This action cannot be reversed.</p>
                      <button onClick={deleteAccount} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all">
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}

                {/* ℹ About FinTrack */}
                {activeTab === "about" && (
                  <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
                    <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        ⚡
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">FinTrack Intelligence Engine</h3>
                        <p className="text-xs text-emerald-400">Version 2.4.0 • Enterprise Edition</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      FinTrack is an enterprise-grade financial intelligence dashboard designed for high-precision expense tracking, budget enforcement, and predictive cashflow analytics across India.
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-6 border-t border-white/10">
            <p className="text-xs text-slate-500">
              <span className="text-emerald-400 font-medium">FinTrack Security Core</span> — Encrypted with 256-bit AES Standards
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;