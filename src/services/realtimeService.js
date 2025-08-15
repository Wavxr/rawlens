import { supabase } from '../lib/supabaseClient';
import useRentalStore from '../stores/rentalStore';

/**
 * Subscribe to rental updates in real-time.
 * @param {string} targetId - Either the user.id (for users) or null (for admin to listen to all).
 * @param {string} role - 'user' or 'admin'
 * @returns {object} subscription channel
 */
export function subscribeToRentalUpdates(targetId, role = 'user') {
  if (!targetId && role === 'user') {
    console.warn('No target ID provided for user realtime subscription.');
    return null;
  }

  const channel = supabase
    .channel(`rentals_${role}_${targetId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'rentals'
      },
      async (payload) => {
        console.log('[Realtime Update]', payload);

        const { new: newRow, old: oldRow, eventType } = payload;
        const store = useRentalStore.getState();

        // Filtering logic
        if (role === 'user') {
          if (newRow?.user_id !== targetId && oldRow?.user_id !== targetId) {
            return; // Ignore other users' rentals
          }
        }

        // UPDATE or INSERT: merge or replace in store
        if (eventType === 'INSERT') {
          store.addOrUpdateRental(newRow);
        } else if (eventType === 'UPDATE') {
          store.addOrUpdateRental(newRow);
        } else if (eventType === 'DELETE') {
          store.removeRental(oldRow.id);
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
    console.log('[Realtime] Unsubscribed from channel');
  }
}
