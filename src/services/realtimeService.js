import { supabase } from '../lib/supabaseClient';
import useRentalStore from '../stores/rentalStore';
import useUserStore from '../stores/userStore';
import { getRentalById } from './rentalService';
import { getUserById } from './userService';

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



// ====================================================
// --- NEW FOR USERS ---
// ====================================================

/**
 * Subscribe to user updates in real-time.
 * @param {string|null} targetId - The user.id (for self) or null (for admin all-users view).
 * @param {string} role - 'user' or 'admin'
 */
export function subscribeToUserUpdates(targetId, role = 'user') {
  if (!targetId && role === 'user') {
    return null;
  }

  const channel = supabase
    .channel(`users_${role}_${targetId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'users'
      },
      async (payload) => {
        const { eventType } = payload;
        const userId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

        // For user role, only listen to their own changes
        if (role === 'user' && userId !== targetId) return;

        const { addOrUpdateUser, removeUser } = useUserStore.getState();

        switch (eventType) {
          case 'INSERT':
          case 'UPDATE': {
            const user = await getUserById(userId);
            if (user) addOrUpdateUser(user);
            break;
          }
          case 'DELETE':
            removeUser(userId);
            break;
          default:
            break;
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a user updates channel.
 */
export function unsubscribeFromUserUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}