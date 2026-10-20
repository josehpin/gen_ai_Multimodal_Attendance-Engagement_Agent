import React from 'react';
import { 
  LayoutDashboard, 
  UserCheck, 
  Activity, 
  Sparkles, 
  Layers, 
  Settings, 
  ShieldCheck,
  BrainCircuit,
  HelpCircle
} from 'lucide-react';

export type NavPage = 'overview' | 'attendance' | 'engagement' | 'ai-assistant' | 'sessions' | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems: { id: NavPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'attendance', label: 'Attendance Tracking', icon: <UserCheck className="w-5 h-5" /> },
    { id: 'engagement', label: 'Engagement Analytics', icon: <Activity className="w-5 h-5" /> },
    { id: 'ai-assistant', label: 'AI Teaching Assistant', icon: <Sparkles className="w-5 h-5" />, badge: 'AI' },
    { id: 'sessions', label: 'Classroom Sessions', icon: <Layers className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings & Models', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 
        flex flex-col transition-transform duration-200 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              Classroom<span className="text-blue-600">Sense</span>
            </div>
            <div className="text-[11px] font-medium text-slate-600">Multimodal Agent</div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 group text-left
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-600'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Privacy Notice Box in Sidebar */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Privacy Compliant</span>
            </div>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Strictly anonymous participant IDs. Zero facial recognition or biometric database storage.
            </p>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 px-1">
            <span>Version 1.0.0</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Engine
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
