import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Bike,
  Store,
  Clock,
  Search,
  CheckCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { chatService, ChatThread, ChatMessage } from '../../services/chat.service';
import { useAuthStore } from '../../store/authStore';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const ChatCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';

  const { restaurant } = useAuthStore();
  const restaurantId = restaurant?.id || 'all';

  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'COURIER' | 'CUSTOMER'>('ALL');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch active order threads (poll every 6s)
  const {
    data: threads = [],
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useQuery({
    queryKey: ['chatThreads', restaurantId],
    queryFn: () => chatService.getActiveThreads(restaurantId),
    refetchInterval: 6000,
  });

  // Automatically select first thread if none is selected
  useEffect(() => {
    if (!selectedOrderId && threads.length > 0) {
      setSelectedOrderId(threads[0].orderId);
    } else if (initialOrderId && initialOrderId !== selectedOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [threads, initialOrderId, selectedOrderId]);

  // 2. Fetch messages for active thread (poll every 3s for real-time responsiveness)
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['chatMessages', selectedOrderId],
    queryFn: () => chatService.getMessages(selectedOrderId),
    enabled: !!selectedOrderId,
    refetchInterval: 3000,
  });

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => chatService.sendMessage(selectedOrderId, text, 'STORE'),
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] });
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(inputText.trim());
  };

  const handleSendCanned = (text: string) => {
    if (sendMutation.isPending) return;
    sendMutation.mutate(text);
  };

  // Find active thread object
  const activeThread = threads.find((t) => t.orderId === selectedOrderId);

  // Filter threads
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      t.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.courierName && t.courierName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterRole === 'COURIER') return !!t.courierName;
    return true;
  });

  const cannedReplies = [
    '🍳 Order is freshly prepared and boxed for pickup!',
    '🛵 Courier has departed and is en-route with your order.',
    '🌶️ We added extra sauce and cutlery as requested!',
    '🏢 Please verify your gate/apartment code for delivery.',
    '🙏 Thank you for ordering from us! Enjoy your meal!',
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Live Order Communication Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                {threads.length} Active Channels
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Direct three-way messaging between kitchen staff, delivery couriers, and customers.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchThreads();
            refetchMessages();
          }}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Order Threads List (4 cols) */}
        <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {/* Thread Search & Filters */}
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, guest, or driver..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterRole('ALL')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterRole === 'ALL'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                All ({threads.length})
              </button>
              <button
                onClick={() => setFilterRole('COURIER')}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  filterRole === 'COURIER'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                With Courier
              </button>
            </div>
          </div>

          {/* Threads Scroll List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {isLoadingThreads ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-xs font-semibold">
                Loading order chat channels...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-400 dark:text-slate-500 text-xs">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                No active order chat conversations found.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.orderId === selectedOrderId;
                return (
                  <div
                    key={thread.orderId}
                    onClick={() => {
                      setSelectedOrderId(thread.orderId);
                      setSearchParams({ orderId: thread.orderId });
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-brand-50/60 dark:bg-brand-950/40 border-brand-500 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-gray-900 dark:text-white">
                        #{thread.orderNumber}
                      </span>
                      <Badge variant="info">
                        {thread.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-slate-300 font-semibold mb-1">
                      <User className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                      <span className="truncate">{thread.customerName}</span>
                    </div>

                    {thread.courierName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-1.5">
                        <Bike className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Driver: {thread.courierName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-100 dark:border-slate-800">
                      <span className="truncate max-w-[190px] italic">
                        {thread.lastMessage}
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
                        {thread.lastMessageTime
                          ? new Date(thread.lastMessageTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Transcript & Composer (8 cols) */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
          {activeThread ? (
            <>
              {/* Active Thread Header */}
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-base text-gray-900 dark:text-white">
                      Order #{activeThread.orderNumber}
                    </h2>
                    <Badge variant="success">
                      {activeThread.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-slate-300 mt-1">
                    <span className="flex items-center gap-1 font-semibold">
                      <User className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                      Customer: {activeThread.customerName}
                    </span>
                    {activeThread.courierName && (
                      <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                        <Bike className="w-3.5 h-3.5" />
                        Courier: {activeThread.courierName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeThread.customerPhone && (
                    <a
                      href={`tel:${activeThread.customerPhone}`}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="w-3 h-3 text-emerald-500" />
                      Call Customer
                    </a>
                  )}
                  {activeThread.courierPhone && (
                    <a
                      href={`tel:${activeThread.courierPhone}`}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Phone className="w-3 h-3 text-blue-500" />
                      Call Driver
                    </a>
                  )}
                </div>
              </div>

              {/* Messages Transcript Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-slate-50/40 dark:bg-slate-950/50">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-slate-600" />
                    <p className="text-xs font-bold text-gray-600 dark:text-slate-300">No Messages Yet</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                      Send an update or check-in message using the composer below.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStore = msg.senderRole === 'STORE';
                    const isCourier = msg.senderRole === 'COURIER';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isStore ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500">
                            {msg.senderName}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                              isStore
                                ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                                : isCourier
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                            isStore
                              ? 'bg-brand-500 text-white rounded-br-xs'
                              : isCourier
                              ? 'bg-blue-600 text-white rounded-bl-xs'
                              : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Instant Canned Replies Bar */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900/90 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 flex items-center gap-1 uppercase tracking-wider shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick Reply:
                </span>
                {cannedReplies.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendCanned(reply)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-300 border border-gray-200 dark:border-slate-700 rounded-full text-[11px] font-medium whitespace-nowrap shadow-xs transition-colors shrink-0"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Input Composer Form */}
              <form
                onSubmit={handleSend}
                className="p-3.5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message as Kitchen / Merchant Staff..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button
                  type="submit"
                  disabled={!inputText.trim() || sendMutation.isPending}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-slate-600 mb-3" />
              <p className="font-bold text-gray-600 dark:text-slate-300 text-sm">Select an Order Conversation</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                Choose an active order channel on the left to begin messaging.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
