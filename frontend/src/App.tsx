import { useState, useEffect, useCallback } from 'react';
import { QueueItem, QueueStats, AddTweetInput, AddThreadInput } from './types';
import * as api from './api';
import { LoginPage } from './components/LoginPage';
import { StatsCards } from './components/StatsCards';
import { QueueList } from './components/QueueList';
import { AddTweetForm } from './components/AddTweetForm';
import { AddThreadForm } from './components/AddThreadForm';
import { PostNextPanel } from './components/PostNextPanel';
import { QuickAdd } from './components/QuickAdd';
import { CalendarView } from './components/CalendarView';
import { DateTimePicker } from './components/DateTimePicker';
import { Toast, ToastType } from './components/Toast';
import { LayoutDashboard, PlusSquare, Send, User, LogOut, X, Calendar } from 'lucide-react';

type Tab = 'dashboard' | 'add' | 'post' | 'calendar';
type AddMode = 'tweet' | 'thread';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [addMode, setAddMode] = useState<AddMode>('tweet');
  const [user, setUser] = useState<{ username: string; hasTwitter: boolean } | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTwitterForm, setShowTwitterForm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleItemId, setRescheduleItemId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null);
  const [twitterCreds, setTwitterCreds] = useState({ consumerKey: '', consumerSecret: '', accessToken: '', accessTokenSecret: '' });
  
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const checkAuth = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [queueData, statsData] = await Promise.all([
        api.fetchQueue(),
        api.fetchStats(),
      ]);
      setItems(queueData);
      setStats(statsData);
    } catch (error: any) {
      showToast(error.message || 'Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        loadData();
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [checkAuth, loadData]);

  const handleLogin = async (username: string) => {
    setUser({ username, hasTwitter: false });
    loadData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    setItems([]);
    setStats(null);
  };

  const handleSaveTwitter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.setTwitter(twitterCreds);
      setUser({ ...user!, hasTwitter: true });
      setShowTwitterForm(false);
      setTwitterCreds({ consumerKey: '', consumerSecret: '', accessToken: '', accessTokenSecret: '' });
      showToast('Twitter credentials saved', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to save Twitter credentials', 'error');
    }
  };

  const handleAddTweet = async (data: AddTweetInput) => {
    try {
      await api.addTweet(data);
      showToast('Tweet added to queue', 'success');
      loadData();
      setActiveTab('dashboard');
    } catch (error: any) {
      showToast(error.message || 'Failed to add tweet', 'error');
    }
  };

  const handleQuickAdd = async (text: string) => {
    try {
      await api.addTweet({ type: 'tweet', text });
      showToast('Tweet added to queue', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to add tweet', 'error');
    }
  };

  const handleAddThread = async (data: AddThreadInput) => {
    try {
      await api.addThread(data);
      showToast('Thread added to queue', 'success');
      loadData();
      setActiveTab('dashboard');
    } catch (error: any) {
      showToast(error.message || 'Failed to add thread', 'error');
    }
  };

  const handleSkip = async (id: number) => {
    try {
      await api.skipItem(id);
      showToast('Item skipped', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to skip item', 'error');
    }
  };

  const handleRetry = async (id: number) => {
    try {
      await api.retryItem(id);
      showToast('Item queued for retry', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to retry item', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteItem(id);
      showToast('Item deleted', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete item', 'error');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleItemId) return;
    try {
      await api.scheduleItem(rescheduleItemId, rescheduleDate);
      showToast(rescheduleDate ? 'Item rescheduled' : 'Schedule removed', 'success');
      setShowRescheduleModal(false);
      setRescheduleItemId(null);
      setRescheduleDate(null);
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to reschedule', 'error');
    }
  };

  const handlePostNow = async () => {
    setIsPosting(true);
    try {
      const result = await api.postNext();
      if (result.success) {
        showToast('Successfully posted to X', 'success');
      } else {
        showToast(result.error || 'Failed to post', 'error');
      }
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to post', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDryRun = async () => {
    setIsPosting(true);
    try {
      const result = await api.dryRunNext();
      if (result.success) {
        showToast('Dry run successful', 'success');
      } else {
        showToast(result.error || 'Dry run failed', 'error');
      }
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Dry run failed', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReorder = async (orderedIds: number[]) => {
    try {
      const reordered = await api.reorderItems(orderedIds);
      setItems(reordered);
      showToast('Queue reordered', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to reorder', 'error');
      loadData();
    }
  };

  const handleEdit = async (id: number, text: string, thread?: string[]) => {
    try {
      await api.updateItem(id, text, thread);
      showToast('Item updated', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to update item', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-zinc-100" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const nextPendingItem = items.find(item => item.status === 'pending') || null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900">
                <Send className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">x-poster</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'dashboard' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('add')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'add' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <PlusSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'calendar' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </button>
                <button
                  onClick={() => setActiveTab('post')}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'post' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Post Next</span>
                </button>
              </nav>

              <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.username}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-in fade-in duration-300">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              <QuickAdd onAdd={handleQuickAdd} />
              <StatsCards stats={stats} />
              <QueueList
                items={items}
                onSkip={handleSkip}
                onRetry={handleRetry}
                onDelete={handleDelete}
                onPostNow={handlePostNow}
                onDryRun={handleDryRun}
                onReorder={handleReorder}
                onEdit={handleEdit}
              />
            </div>
          )}

          {activeTab === 'add' && (
            <div className="mx-auto max-w-2xl flex flex-col gap-6">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-900/50 p-1">
                <button
                  onClick={() => setAddMode('tweet')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    addMode === 'tweet' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Tweet
                </button>
                <button
                  onClick={() => setAddMode('thread')}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    addMode === 'thread' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Thread
                </button>
              </div>

              {addMode === 'tweet' ? (
                <AddTweetForm onSubmit={handleAddTweet} />
              ) : (
                <AddThreadForm onSubmit={handleAddThread} />
              )}
            </div>
          )}

          {activeTab === 'post' && (
            <div className="mx-auto max-w-2xl">
              <PostNextPanel
                nextItem={nextPendingItem}
                onPostNow={() => handlePostNow()}
                onDryRun={() => handleDryRun()}
                isPosting={isPosting}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onEdit={() => {
                setActiveTab('add');
              }}
              onDelete={handleDelete}
              onReschedule={async (id) => {
                setRescheduleItemId(id);
                setShowRescheduleModal(true);
              }}
            />
          )}
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Account Settings</h2>
              <button
                onClick={() => {
                  setShowAccountModal(false);
                  setShowTwitterForm(false);
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <User className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">{user.username}</p>
                  <p className="text-sm text-zinc-500">
                    {user.hasTwitter ? 'Twitter connected' : 'Twitter not configured'}
                  </p>
                </div>
              </div>
            </div>

            {!user.hasTwitter && !showTwitterForm && (
              <button
                onClick={() => setShowTwitterForm(true)}
                className="w-full rounded-lg bg-zinc-100 py-2 font-medium text-zinc-900 transition-colors hover:bg-white"
              >
                Connect Twitter
              </button>
            )}

            {showTwitterForm && (
              <form onSubmit={handleSaveTwitter} className="flex flex-col gap-4">
                <p className="text-sm text-zinc-400">
                  Enter your X OAuth credentials. You can find these in your X Developer Portal.
                </p>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Consumer Key</label>
                  <input
                    type="text"
                    value={twitterCreds.consumerKey}
                    onChange={(e) => setTwitterCreds({ ...twitterCreds, consumerKey: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="xxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Consumer Secret</label>
                  <input
                    type="password"
                    value={twitterCreds.consumerSecret}
                    onChange={(e) => setTwitterCreds({ ...twitterCreds, consumerSecret: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="xxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Access Token</label>
                  <input
                    type="text"
                    value={twitterCreds.accessToken}
                    onChange={(e) => setTwitterCreds({ ...twitterCreds, accessToken: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="xxx"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Access Token Secret</label>
                  <input
                    type="password"
                    value={twitterCreds.accessTokenSecret}
                    onChange={(e) => setTwitterCreds({ ...twitterCreds, accessTokenSecret: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="xxx"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTwitterForm(false)}
                    className="flex-1 rounded-lg border border-zinc-700 py-2 font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-zinc-100 py-2 font-medium text-zinc-900 transition-colors hover:bg-white"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {user.hasTwitter && (
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                Twitter credentials are configured for @{user.username}.
              </div>
            )}
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100">Reschedule Post</h2>
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleItemId(null);
                  setRescheduleDate(null);
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-6">
              <DateTimePicker
                value={rescheduleDate}
                onChange={(value) => setRescheduleDate(value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRescheduleModal(false);
                  setRescheduleItemId(null);
                  setRescheduleDate(null);
                }}
                className="flex-1 rounded-lg border border-zinc-700 py-2 font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                className="flex-1 rounded-lg bg-zinc-100 py-2 font-medium text-zinc-900 transition-colors hover:bg-white"
              >
                {rescheduleDate ? 'Reschedule' : 'Remove Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
