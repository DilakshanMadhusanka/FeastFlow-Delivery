import React, { useState } from 'react';
import {
  Sparkles,
  X,
  ChefHat,
  MessageSquare,
  TrendingUp,
  Copy,
  Check,
  Send,
  Calendar,
  CloudRain,
  Flame,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { aiService, MenuCopyResult, ReviewReplyResult, DemandForecastResult } from '../../services/ai.service';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';

export const AICopilotDrawer: React.FC = () => {
  const { restaurant } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'COPY' | 'REVIEW' | 'FORECAST'>('COPY');

  // Copywriter State
  const [itemName, setItemName] = useState('Smash Avocado Truffle Burger');
  const [ingredients, setIngredients] = useState('Grass-fed Angus patty, aged gouda, black truffle mayo, brioche');
  const [cuisineType, setCuisineType] = useState('Gourmet American');
  const [copyResult, setCopyResult] = useState<MenuCopyResult | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [hasCopiedText, setHasCopiedText] = useState(false);

  // Review Responder State
  const [reviewName, setReviewName] = useState('Jessica Reynolds');
  const [reviewRating, setReviewRating] = useState<number>(4);
  const [reviewComment, setReviewComment] = useState('The wood-fired pizza was super flavorful and hot! Delivery driver was quick too.');
  const [reviewResult, setReviewResult] = useState<ReviewReplyResult | null>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [hasCopiedReview, setHasCopiedReview] = useState(false);

  // Demand Forecast State
  const [forecastResult, setForecastResult] = useState<DemandForecastResult | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  // 1. Generate Menu Copy
  const handleGenerateCopy = async () => {
    if (!itemName.trim()) return;
    setIsGeneratingCopy(true);
    setCopyResult(null);
    try {
      const ingList = ingredients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await aiService.generateMenuCopy({
        itemName,
        ingredients: ingList,
        cuisineType,
      });
      setCopyResult(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate menu copy');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // 2. Generate Review Reply
  const handleGenerateReviewReply = async () => {
    setIsGeneratingReview(true);
    setReviewResult(null);
    try {
      const res = await aiService.generateReviewReply({
        customerName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        restaurantName: restaurant?.name || 'FeastFlow Bistro',
      });
      setReviewResult(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate review reply');
    } finally {
      setIsGeneratingReview(false);
    }
  };

  // 3. Load Demand Forecast
  const handleLoadForecast = async () => {
    setIsForecasting(true);
    try {
      const res = await aiService.getDemandForecast(restaurant?.id);
      setForecastResult(res);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate forecast');
    } finally {
      setIsForecasting(false);
    }
  };

  const copyToClipboard = (text: string, isReview = false) => {
    navigator.clipboard.writeText(text);
    if (isReview) {
      setHasCopiedReview(true);
      setTimeout(() => setHasCopiedReview(false), 2000);
    } else {
      setHasCopiedText(true);
      setTimeout(() => setHasCopiedText(false), 2000);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          if (activeTab === 'FORECAST' && !forecastResult) {
            handleLoadForecast();
          }
        }}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-brand-600 via-rose-600 to-amber-500 hover:from-brand-500 hover:to-amber-400 text-white font-extrabold px-4 py-3 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center gap-2.5 transition-all hover:scale-105 group"
      >
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white animate-spin-slow" />
        </div>
        <span className="text-xs tracking-tight">FeastFlow AI Copilot</span>
        <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[10px] uppercase font-black tracking-wider">
          v2
        </span>
      </button>

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full border-l border-gray-200 dark:border-slate-800 z-10">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="font-black text-base tracking-tight text-white flex items-center gap-2">
                    FeastFlow AI Copilot
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      LIVE
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Menu copywriter, review reply generator & demand rush predictor.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex items-center border-b border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-950/60 p-1.5 gap-1 text-xs font-bold text-gray-600 dark:text-slate-400">
              <button
                onClick={() => setActiveTab('COPY')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'COPY'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-xs'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                Menu Copy
              </button>
              <button
                onClick={() => setActiveTab('REVIEW')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'REVIEW'
                    ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Review Reply
              </button>
              <button
                onClick={() => {
                  setActiveTab('FORECAST');
                  if (!forecastResult) handleLoadForecast();
                }}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'FORECAST'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Rush Forecast
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* TAB 1: MENU COPYWRITER */}
              {activeTab === 'COPY' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Dish / Food Item Name
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g. Truffle Mac & Cheese"
                      className="w-full text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Key Ingredients (Comma Separated)
                    </label>
                    <input
                      type="text"
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="e.g. aged cheddar, black truffles, cavatappi, panko"
                      className="w-full text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Cuisine Style
                    </label>
                    <input
                      type="text"
                      value={cuisineType}
                      onChange={(e) => setCuisineType(e.target.value)}
                      placeholder="e.g. Contemporary Italian / Bistro Comfort"
                      className="w-full text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateCopy}
                    disabled={isGeneratingCopy || !itemName.trim()}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    {isGeneratingCopy ? 'Polishing Menu Copy...' : 'Generate Appetizing Description'}
                  </Button>

                  {/* AI Generated Output Card */}
                  {copyResult && (
                    <div className="bg-gradient-to-br from-brand-50/70 via-white to-amber-50/50 dark:from-brand-950/40 dark:via-slate-900 dark:to-amber-950/30 border border-brand-200 dark:border-brand-900/50 rounded-2xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          AI Suggested Title
                        </span>
                        <button
                          onClick={() => copyToClipboard(copyResult.title)}
                          className="text-[11px] text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 font-semibold"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Title
                        </button>
                      </div>
                      <p className="font-black text-sm text-gray-900 dark:text-white">{copyResult.title}</p>

                      <div className="pt-2 border-t border-brand-100/60 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-400">
                            Sensory Menu Description
                          </span>
                          <button
                            onClick={() => copyToClipboard(copyResult.description)}
                            className="text-[11px] text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 font-semibold"
                          >
                            {hasCopiedText ? (
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {hasCopiedText ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-slate-300 leading-relaxed italic bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700">
                          "{copyResult.description}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-brand-100/60 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {copyResult.dietaryTags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 text-[10px] font-bold"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-brand-600 dark:text-brand-400 block">
                            ${copyResult.suggestedPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-400">
                            ~{copyResult.estimatedCalories} kcal
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REVIEW RESPONDER */}
              {activeTab === 'REVIEW' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Customer Guest Name
                    </label>
                    <input
                      type="text"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="e.g. David Miller"
                      className="w-full text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Rating (1 to 5 Stars)
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={`w-9 h-9 rounded-xl font-black text-xs transition-all ${
                            reviewRating >= star
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-400'
                          }`}
                        >
                          ★ {star}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Customer Feedback / Comment
                    </label>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Paste customer review here..."
                      className="w-full text-xs font-medium bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateReviewReply}
                    disabled={isGeneratingReview}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-200" />
                    {isGeneratingReview ? 'Composing Reply...' : 'Generate Brand-Tailored Reply'}
                  </Button>

                  {reviewResult && (
                    <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl p-4 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                          Suggested Tone: {reviewResult.tone.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(reviewResult.reply, true)}
                          className="text-[11px] text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 flex items-center gap-1 font-bold"
                        >
                          {hasCopiedReview ? (
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {hasCopiedReview ? 'Copied to Clipboard!' : 'Copy Reply'}
                        </button>
                      </div>

                      <p className="text-xs text-gray-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40">
                        "{reviewResult.reply}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DEMAND RUSH FORECASTER */}
              {activeTab === 'FORECAST' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-gray-900 dark:text-white">
                        Dinner Rush & Volume Predictor
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-slate-400">
                        Calculated from historical ordering trends and weather models.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLoadForecast}
                      disabled={isForecasting}
                      className="text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isForecasting ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {isForecasting && !forecastResult ? (
                    <div className="text-center py-12 text-gray-400 dark:text-slate-500 text-xs font-semibold">
                      Running demand forecast neural model...
                    </div>
                  ) : forecastResult ? (
                    <div className="space-y-4">
                      {/* Metric highlights */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl">
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            Peak Surge Window
                          </span>
                          <span className="text-sm font-black text-rose-800 dark:text-rose-300 flex items-center gap-1 mt-0.5">
                            <Flame className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                            {forecastResult.predictedRushPeak}
                          </span>
                        </div>

                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                            Estimated Orders Today
                          </span>
                          <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mt-0.5">
                            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            ~{forecastResult.estimatedDailyOrders} orders (+
                            {forecastResult.projectedVolumeSurgePercentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Weather Spike Factor */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-300 font-medium">
                        <CloudRain className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span>{forecastResult.weatherFactor}</span>
                      </div>

                      {/* Staffing and Prep Recommendations */}
                      <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                        <span className="text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                          AI Kitchen Prep & Staffing Action Checklist:
                        </span>
                        {forecastResult.staffingRecommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>

                      {/* Hourly Volume Mini Bar Graph */}
                      <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                        <span className="text-[11px] font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
                          Hourly Order Volume Curve
                        </span>
                        <div className="flex items-end justify-between gap-1 h-24 pt-2">
                          {forecastResult.hourlyBreakdown.map((h, i) => {
                            const maxVal = 40;
                            const heightPct = Math.min(100, (h.predictedOrders / maxVal) * 100);
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-600 dark:text-slate-400">
                                  {h.predictedOrders}
                                </span>
                                <div
                                  className="w-full bg-brand-500 rounded-t-sm transition-all"
                                  style={{ height: `${heightPct}%` }}
                                />
                                <span className="text-[8px] text-gray-400 dark:text-slate-500 font-mono">
                                  {h.hour.split(':')[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
