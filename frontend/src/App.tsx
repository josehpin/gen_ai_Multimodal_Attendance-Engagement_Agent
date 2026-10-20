import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavPage } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Attendance } from './pages/Attendance';
import { Engagement } from './pages/Engagement';
import { AIAssistant } from './pages/AIAssistant';
import { Sessions } from './pages/Sessions';
import { Settings } from './pages/Settings';
import { CreateSessionModal } from './components/CreateSessionModal';
import { UploadVideoModal } from './components/UploadVideoModal';
import { Session, DashboardData } from './types';
import { api } from './services/api';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetSession, setUploadTargetSession] = useState<Session | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [dash, sessList] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getSessions().catch(() => []),
      ]);

      if (dash) setDashboardData(dash);
      if (sessList) {
        setSessions(sessList);
        // Default selected session to first completed session or first session
        setSelectedSession((prev) => {
          if (prev) {
            const updated = sessList.find(s => s.id === prev.id);
            return updated || sessList[0] || null;
          }
          const completed = sessList.find(s => s.status === 'COMPLETED');
          return completed || sessList[0] || null;
        });
      }
    } catch (err) {
      console.error('Failed to load initial data', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Polling for processing sessions
  useEffect(() => {
    const hasProcessing = sessions.some(s => s.status === 'PROCESSING');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadAllData();
    }, 2500);

    return () => clearInterval(interval);
  }, [sessions, loadAllData]);

  const handleRunDemo = async () => {
    setIsDemoLoading(true);
    try {
      const res = await api.createDemoSession();
      if (res.success) {
        showNotification(
          `Demo Classroom processed successfully! Detected ${res.participants_detected} attendees with ${res.ai_source} recommendations.`
        );
        await loadAllData();
        // Automatically find and select the new demo session
        const updatedList = await api.getSessions();
        const demoSession = updatedList.find(s => s.id === res.session_id);
        if (demoSession) {
          setSelectedSession(demoSession);
          setCurrentPage('attendance');
        }
      }
    } catch (err: any) {
      console.error('Demo generation failed', err);
      showNotification(
        err?.response?.data?.error || 'Failed to run demo analysis. Check backend logs.',
        'error'
      );
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleSessionCreated = async (newSessionId: string) => {
    showNotification('Session created successfully.');
    await loadAllData();
    const updatedList = await api.getSessions();
    const created = updatedList.find(s => s.id === newSessionId);
    if (created) {
      setSelectedSession(created);
      setUploadTargetSession(created);
      setIsUploadModalOpen(true);
    }
  };

  const handleOpenUploadModal = (session: Session) => {
    setUploadTargetSession(session);
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = async () => {
    showNotification('Video uploaded. OpenCV computer vision pipeline initiated.');
    await loadAllData();
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          currentPage={currentPage}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onRunDemo={handleRunDemo}
          isDemoLoading={isDemoLoading}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="mx-6 mt-4">
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in fade-in duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentPage === 'overview' && (
            <Overview
              data={dashboardData}
              isLoading={isLoadingDashboard}
              onNavigate={setCurrentPage}
              onSelectSession={setSelectedSession}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onRunDemo={handleRunDemo}
            />
          )}

          {currentPage === 'attendance' && (
            <Attendance
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={setSelectedSession}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {currentPage === 'engagement' && (
            <Engagement
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={setSelectedSession}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {currentPage === 'ai-assistant' && (
            <AIAssistant
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={setSelectedSession}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}

          {currentPage === 'sessions' && (
            <Sessions
              sessions={sessions}
              onSelectSession={setSelectedSession}
              onNavigate={setCurrentPage}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onOpenUploadModal={handleOpenUploadModal}
              onRunDemo={handleRunDemo}
              onRefresh={loadAllData}
              isDemoLoading={isDemoLoading}
            />
          )}

          {currentPage === 'settings' && <Settings />}
        </main>
      </div>

      {/* Modals */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSessionCreated={handleSessionCreated}
      />

      {uploadTargetSession && (
        <UploadVideoModal
          isOpen={isUploadModalOpen}
          sessionId={uploadTargetSession.id}
          sessionTitle={uploadTargetSession.title}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}

export default App;
