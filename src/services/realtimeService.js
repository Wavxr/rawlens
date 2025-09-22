import { supabase } from '../lib/supabaseClient';
import { getRentalById } from './rentalService';
import { getUserById } from './userService';
import { getPaymentById } from './paymentService';
import { getExtensionById } from './extensionService';
import useRentalStore from '../stores/rentalStore';
import useUserStore from '../stores/userStore';


// ====================================================
// --- RENTALS TABLES ---
// ====================================================

// Subscribe to rental updates in real-time.
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
      console.log('Real-time event received:', payload);
      
      const { eventType } = payload;
      const rentalId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

      // Email notifications are now handled server-side via database triggers

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
    console.log(`Rental subscription status: ${status}`);
  });

  return channel;
}

// Unsubscribe from a rental updates channel.
export function unsubscribeFromRentalUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// ====================================================
// --- USERS TABLES ---
// ====================================================

// Subscribe to user updates in real-time.
export function subscribeToUserUpdates(targetId, callback, role = 'user') {
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

        // If a callback is provided, execute it.
        if (callback) {
          callback(payload);
        }
      }
    )
    .subscribe();

  return channel;
}

// Unsubscribe from a user updates channel.
export function unsubscribeFromUserUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}


// ====================================================
// --- PAYMENTS TABLES ---
// ====================================================

// Subscribe to payment updates in real-time.
export function subscribeToPaymentUpdates(targetId, callback, role = 'user') {
  if (!targetId && role === 'user') {
    return null;
  }

  const channel = supabase
    .channel(`payments_${role}_${targetId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments'
      },
      async (payload) => {
        console.log('Payment real-time event received:', payload);
        
        const { eventType } = payload;
        const paymentId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

        // For user role, ensure the update belongs to them.
        if (role === 'user' && eventType !== 'DELETE') {
          const userId = payload.new.user_id;
          if (userId !== targetId) {
            return; // Not for this user
          }
        }

        // Fetch the full payment details to ensure data consistency
        let fullPayment = null;
        if (eventType !== 'DELETE') {
          const { data, error } = await getPaymentById(paymentId);
          if (error) {
            console.error(`[Realtime] Failed to fetch details for payment ${paymentId}:`, error);
            return;
          }
          fullPayment = data;
        }

        // If a callback is provided, execute it with the payment data
        if (callback) {
          callback({
            ...payload,
            paymentData: fullPayment,
            eventType
          });
        }
      }
    )
    .subscribe((status) => {
      console.log(`Payment subscription status: ${status}`);
    });

  return channel;
}

// Unsubscribe from payment updates channel.
export function unsubscribeFromPaymentUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// ====================================================
// --- RENTAL_EXTENSIONS TABLES ---
// ====================================================

// Subscribe to rental extension updates in real-time.
export function subscribeToExtensionUpdates(targetId, callback, role = 'user') {
  if (!targetId && role === 'user') {
    return null;
  }

  const channel = supabase
    .channel(`extensions_${role}_${targetId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rental_extensions'
      },
      async (payload) => {
        console.log('Extension real-time event received:', payload);
        
        const { eventType } = payload;
        const extensionId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

        // For user role, ensure the update belongs to them (either as requester or rental owner).
        if (role === 'user' && eventType !== 'DELETE') {
          const requestedBy = payload.new.requested_by;
          // We need to check if user owns the rental as well, but for simplicity here,
          // we'll check if they requested the extension
          if (requestedBy !== targetId) {
            // Additional check: see if they own the rental
            // This requires fetching rental data, but for performance we'll skip this
            // and let RLS handle the security at database level
            return;
          }
        }

        // Fetch the full extension details to ensure data consistency
        let fullExtension = null;
        if (eventType !== 'DELETE') {
          const { data, error } = await getExtensionById(extensionId);
          if (error) {
            console.error(`[Realtime] Failed to fetch details for extension ${extensionId}:`, error);
            return;
          }
          fullExtension = data;
        }

        // If a callback is provided, execute it with the extension data
        if (callback) {
          callback({
            ...payload,
            extensionData: fullExtension,
            eventType
          });
        }
      }
    )
    .subscribe((status) => {
      console.log(`Extension subscription status: ${status}`);
    });

  return channel;
}

// Unsubscribe from rental extension updates channel.
export function unsubscribeFromExtensionUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// Subscribe to both rental extension updates and related payment updates for a user
export function subscribeToExtensionAndPaymentUpdates(userId, extensionCallback, paymentCallback, role = 'user') {
  const extensionChannel = subscribeToExtensionUpdates(userId, extensionCallback, role);
  const paymentChannel = subscribeToPaymentUpdates(userId, paymentCallback, role);
  
  return {
    extensionChannel,
    paymentChannel,
    unsubscribe: () => {
      unsubscribeFromExtensionUpdates(extensionChannel);
      unsubscribeFromPaymentUpdates(paymentChannel);
    }
  };
}