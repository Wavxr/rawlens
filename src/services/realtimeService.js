import { supabase } from '../lib/supabaseClient';
import useRentalStore from '../stores/rentalStore';
import { getRentalById } from './rentalService';

/**
 * Subscribe to rental updates in real-time.
 * @param {string} targetId - Either the user.id (for users) or null (for admin to listen to all).
 * @param {string} role - 'user' or 'admin'
 * @returns {object} subscription channel
 */
export function subscribeToRentalUpdates(targetId, role = 'user') {
  if (!targetId && role === 'user') {
    return null;
  }

  const channel = supabase
  .channel(`rentals_${role}_${targetId || 'all'}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'rentals'
    },
    async (payload) => {
      console.log('[Realtime Update]', payload);

      const { eventType } = payload;
      const rentalId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

      // For user role, ensure the update belongs to them.
      if (role === 'user' && eventType !== 'DELETE') {
        const userId = payload.new.user_id;
        if (userId !== targetId) {
          return; // Not for this user
        }
      }

      const { addOrUpdateRental, removeRental } = useRentalStore.getState();

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Fetch the full rental details to ensure data consistency
          const { data, error } = await getRentalById(rentalId);
          const fullRental = data;
          if (error) {
            console.error(`[Realtime] Failed to fetch details for rental ${rentalId}:`, error);
            return;
          }
          if (fullRental) {
            console.log('[Realtime] Fetched full rental details:', fullRental);
            addOrUpdateRental(fullRental);
          }
          break;
        }
        case 'DELETE':
          removeRental(rentalId);
          break;
        default:
          break;
      }
    }
  )
  .subscribe((status) => {
    console.log(`[Realtime] Subscription status for ${role}:`, status);
  });

return channel;
}

/**
 * Unsubscribe from a rental updates channel.
 * @param {object} channel - The channel returned from subscribeToRentalUpdates
 */
export function unsubscribeFromRentalUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
