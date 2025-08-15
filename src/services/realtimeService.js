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

      const { new: newRow, old: oldRow, eventType } = payload;
      const store = useRentalStore.getState();

      // Handle DELETE events first (since they only have oldRow data)
      if (eventType === 'DELETE') {
        if (role === 'user') {
          // Check if this was one of the user's rentals
          if (store.isUserRental(oldRow.id)) {
            store.removeRental(oldRow.id);
          }
        } else {
          store.removeRental(oldRow.id);
        }
        return;
      }

      // Handle INSERT and UPDATE events
      if (role === 'user') {
        // Only process rentals that belong to this user
        if (newRow?.user_id !== targetId) {
          return;
        }
      }

      if (eventType === 'INSERT') {
        store.addOrUpdateRental(newRow);
      } else if (eventType === 'UPDATE') {
        // Preserve existing enriched data like fullCamera
        const existingRental = store.rentals.find(r => r.id === newRow.id);
        const enrichedNewRow = existingRental 
          ? { ...existingRental, ...newRow }
          : newRow;
        store.addOrUpdateRental(enrichedNewRow);
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
