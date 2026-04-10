import { useState, useEffect, useCallback } from 'react';
import { QueueItem, QueueStats, AddTweetInput, AddThreadInput } from './types';
import * as api from './api';
import { StatsCards } from './components/StatsCards';
import { QueueList } from './components/QueueList';
import { AddTweetForm } from './components/AddTweetForm';
import { AddThreadForm } from './components/AddThreadForm';
import { PostNextPanel } from './components/PostNextPanel';
import { Toast, ToastType } from './components/Toast';
import { LayoutDashboard, PlusSquare, Send } from 'lucide-react';

type Tab = 'dashboard' | 'add' | 'post';
type AddMode = 'tweet' | 'thread';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [addMode, setAddMode] = useState<AddMode>('tweet');
  
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

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
    loadData();
  }, [loadData]);

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
                onClick={() => setActiveTab('post')}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'post' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Post Next</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-zinc-100" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-8">
                <StatsCards stats={stats} />
                <QueueList
                  items={items}
                  onSkip={handleSkip}
                  onRetry={handleRetry}
                  onDelete={handleDelete}
                  onPostNow={handlePostNow}
                  onDryRun={handleDryRun}
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
          </div>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
