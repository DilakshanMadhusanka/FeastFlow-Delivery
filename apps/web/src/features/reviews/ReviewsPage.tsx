import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  MessageSquare,
  CornerDownRight,
  Send,
  Store,
  CheckCircle2,
  Clock,
  ThumbsUp,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reviewService } from '../../services/review.service';
import { ReviewItem } from '../../types';
import { UserRole } from '@food-delivery/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Navbar } from '../../components/layout/Navbar';

export const ReviewsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { restaurant, restaurants, setRestaurant, user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes('ADMIN' as any)
  );

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() =>
    isAdmin ? 'ALL' : restaurant?.id || 'ALL'
  );
  const isViewingAll = selectedBranchId === 'ALL';
  const queryRestaurantId = isViewingAll ? 'all' : selectedBranchId;

  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Fetch reviews for current scope
  const {
    data: reviewsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['reviews', queryRestaurantId],
    queryFn: () => reviewService.getRestaurantReviews(queryRestaurantId, { limit: 100 }),
    staleTime: 30 * 1000,
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      reviewService.replyToReview(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowReplyModal(false);
      setSelectedReview(null);
      setReplyText('');
    },
  });

  const reviews = reviewsData?.items || [];
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : '5.0';

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: reviews.filter((r) => r.rating === s).length,
    percentage:
      totalReviews > 0
        ? Math.round((reviews.filter((r) => r.rating === s).length / totalReviews) * 100)
        : 0,
  }));

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;
    replyMutation.mutate({
      reviewId: selectedReview.id,
      reply: replyText.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <Navbar
        title="Customer Ratings & Reviews"
        onRefresh={refetch}
        isRefreshing={isRefetching}
      />

      {/* Scope Switcher */}
      {(isAdmin || restaurants.length > 1) && (
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
            <Store className="w-4 h-4 text-brand-500" />
            <span>Store Scope:</span>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setSelectedBranchId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  isViewingAll
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/60'
                }`}
              >
                <span>🌐 All Restaurants</span>
              </button>
            )}
            {restaurants.map((r) => {
              const isSelected = !isViewingAll && selectedBranchId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedBranchId(r.id);
                    setRestaurant(r);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/20'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/60'
                  }`}
                >
                  <span>{r.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {r.city}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Score and Star Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rating Score Hero Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
              Customer Satisfaction Score
            </h3>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-5xl font-black text-gray-900">{avgRating}</span>
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="w-5 h-5 fill-amber-400 stroke-amber-400"
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Based on {totalReviews} verified customer reviews
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-600">
            <span className="flex items-center gap-1.5">
              <ThumbsUp className="w-4 h-4" /> 98% Positive Feedback
            </span>
            <span className="text-gray-400 font-normal">All-time</span>
          </div>
        </div>

        {/* Star Distribution Bars */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2 space-y-2.5 flex flex-col justify-center">
          {starCounts.map((sc) => (
            <div key={sc.stars} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 w-12 font-bold text-gray-700 shrink-0">
                <span>{sc.stars}</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
              </div>
              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${sc.percentage}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-500 font-semibold">{sc.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
            Feedback & Reviews ({totalReviews})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-semibold">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-16 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No customer reviews yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Reviews will appear here as customers rate their completed deliveries in the mobile app.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm">
                      {review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-gray-900 block leading-tight">
                        {review.user?.name || 'Customer'}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-semibold text-gray-400">
                          Order #{review.order?.orderNumber}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-[11px] font-semibold text-gray-500">
                          {review.restaurant?.name} ({review.restaurant?.city})
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-[11px] text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                    <span className="text-xs font-black text-amber-800">{review.rating}.0</span>
                  </div>
                </div>

                {/* Comment Text */}
                {review.comment && (
                  <p className="text-xs text-gray-700 leading-relaxed font-medium bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                    "{review.comment}"
                  </p>
                )}

                {/* Merchant Response Section */}
                {review.reply ? (
                  <div className="ml-6 pl-4 border-l-2 border-brand-400 bg-brand-50/40 p-3.5 rounded-r-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 mb-1">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Response from Restaurant Manager:</span>
                      {review.repliedAt && (
                        <span className="text-[10px] text-brand-500 font-normal">
                          • {new Date(review.repliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 italic">"{review.reply}"</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedReview(review);
                        setReplyText('');
                        setShowReplyModal(true);
                      }}
                      className="text-xs font-bold"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Reply to Customer
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <Modal
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          title={`Reply to ${selectedReview.user?.name || 'Customer'}`}
          maxWidth="sm"
        >
          <form onSubmit={handleReplySubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <span className="font-bold text-gray-600 block mb-1">
                Customer's Review ({selectedReview.rating}★):
              </span>
              <p className="italic text-gray-700">"{selectedReview.comment || 'No written text'}"</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Your Public Response*
              </label>
              <textarea
                required
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank you so much for ordering with us! We are thrilled you enjoyed the food..."
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="secondary" onClick={() => setShowReplyModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={replyMutation.isPending}>
                <Send className="w-3.5 h-3.5 mr-1" /> Post Response
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
