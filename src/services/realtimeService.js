// src/services/realtimeService.js

import { supabase } from '../lib/supabaseClient';
import { getRentalById } from './rentalService';
import { getUserById } from './userService';
import { getPaymentById } from './paymentService';
import { getExtensionById } from './extensionService';
import useRentalStore from '../stores/rentalStore';
import useUserStore from '../stores/userStore';
import usePaymentStore from '../stores/paymentStore';
import useExtensionStore from '../stores/extensionStore';

// ====================================================
// --- Generic Subscription Helpers ---
// ====================================================

// Generic real-time handler for any table
function createRealtimeSubscription({ channelName, table, schema = 'public', event = '*', filter, onPayload }) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event, schema, table, filter },
      async (payload) => {
        const eventType = payload.eventType;
        const record = eventType === 'DELETE' ? payload.old : payload.new;
        await onPayload(eventType, record, payload);
      }
    )
    .subscribe((status) => {
      console.log(`${channelName} subscription status:`, status);
    });

  return channel;
}

// Utility to unsubscribe from channels
export function unsubscribeFromChannel(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// ====================================================
// --- RENTALS TABLE ---
// ====================================================

// Subscribe to rental updates in real-time (User-specific)
export function subscribeToUserRentals(userId) {
  if (!userId) return null;

  const channelName = `user_rentals_${userId}`;

  return createRealtimeSubscription({
    channelName,
    table: 'rentals',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateRental, removeRental } = useRentalStore.getState();

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Fetch full details to ensure data consistency
          const { data, error } = await getRentalById(record.id);
          if (error) {
            console.error(`[Realtime] Failed to fetch details for rental ${record.id}:`, error);
            return;
          }
          if (data) {
            addOrUpdateRental(data);
          }
          break;
        }
        case 'DELETE':
          removeRental(record.id);
          break;
        default:
          break;
      }
    }
  });
}

// Subscribe to all rental updates (Admin)
export function subscribeToAllRentals() {
  const channelName = 'admin_all_rentals';

  return createRealtimeSubscription({
    channelName,
    table: 'rentals',
    event: '*',
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateRental, removeRental } = useRentalStore.getState();

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Fetch full details to ensure data consistency
          const { data, error } = await getRentalById(record.id);
          if (error) {
            console.error(`[Realtime] Failed to fetch details for rental ${record.id}:`, error);
            return;
          }
          if (data) {
            addOrUpdateRental(data);
          }
          break;
        }
        case 'DELETE':
          removeRental(record.id);
          break;
        default:
          break;
      }
    }
  });
}

// ====================================================
// --- USERS TABLE ---
// ====================================================

// Subscribe to user updates in real-time (User-specific)
export function subscribeToUserUpdates(userId, callback) {
  if (!userId) return null;

  const channelName = `user_profile_${userId}`;

  return createRealtimeSubscription({
    channelName,
    table: 'users',
    event: '*',
    filter: `id=eq.${userId}`,
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateUser, removeUser } = useUserStore.getState();

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          const user = await getUserById(record.id);
          if (user) addOrUpdateUser(user);
          break;
        }
        case 'DELETE':
          removeUser(record.id);
          break;
        default:
          break;
      }

      callback?.(payload);
    }
  });
}

// Subscribe to all user updates (Admin)
export function subscribeToAllUsers(callback) {
  const channelName = 'admin_all_users';

  return createRealtimeSubscription({
    channelName,
    table: 'users',
    event: '*',
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateUser, removeUser } = useUserStore.getState();

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          const user = await getUserById(record.id);
          if (user) addOrUpdateUser(user);
          break;
        }
        case 'DELETE':
          removeUser(record.id);
          break;
        default:
          break;
      }

      callback?.(payload);
    }
  });
}

// ====================================================
// --- PAYMENTS TABLE ---
// ====================================================

// Subscribe to user-specific payments
export function subscribeToUserPayments(userId, callback) {
  if (!userId) return null;

  const channelName = `user_payments_${userId}`;

  return createRealtimeSubscription({
    channelName,
    table: 'payments',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdatePayment, removePayment } = usePaymentStore.getState();
      let hydratedData = null;

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Hydrate full shape to match initial load
          const { data, error } = await getPaymentById(record.id);
          if (error) {
            console.error(`[Realtime] Failed to fetch payment ${record.id}:`, error);
            // Don't add incomplete data, just log the error
            return;
          } else if (data) {
            hydratedData = data;
            addOrUpdatePayment(data);
          }
          break;
        }
        case 'DELETE':
          removePayment(record.id);
          break;
        default:
          break;
      }

      callback?.({ ...payload, eventType, hydratedData });
    }
  });
}

// Subscribe to all payments (Admin)
export function subscribeToAllPayments(callback) {
  const channelName = 'admin_all_payments';

  return createRealtimeSubscription({
    channelName,
    table: 'payments',
    event: '*',
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdatePayment, removePayment } = usePaymentStore.getState();
      let hydratedData = null;

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Hydrate full shape to match initial load
          const { data, error } = await getPaymentById(record.id);
          if (error) {
            console.error(`[Realtime] Failed to fetch payment ${record.id}:`, error);
            // Don't add incomplete data, just log the error
            return;
          } else if (data) {
            // Only add/update if we have complete hydrated data
            hydratedData = data;
            addOrUpdatePayment(data);
          }
          break;
        }
        case 'DELETE':
          removePayment(record.id);
          break;
        default:
          break;
      }

      callback?.({ ...payload, eventType, hydratedData });
    }
  });
}

// ====================================================
// --- RENTAL_EXTENSIONS TABLE ---
// ====================================================

// Subscribe to user-specific extensions
export function subscribeToUserExtensions(userId, callback) {
  if (!userId) return null;

  const channelName = `user_extensions_${userId}`;

  return createRealtimeSubscription({
    channelName,
    table: 'rental_extensions',
    event: '*',
    filter: `requested_by=eq.${userId}`,
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateExtension, removeExtension } = useExtensionStore.getState();
      let hydratedData = null;

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Hydrate full shape to match initial load using getExtensionById
          const { getExtensionById } = await import('./extensionService');
          const { data, error } = await getExtensionById(record.id);
          if (error) {
            console.error(`[Realtime] Failed to fetch extension ${record.id}:`, error);
            // Don't add incomplete data, just log the error
            return;
          } else if (data) {
            hydratedData = data;
            addOrUpdateExtension(data);
          }
          break;
        }
        case 'DELETE':
          removeExtension(record.id);
          break;
        default:
          break;
      }

      callback?.({ ...payload, eventType, hydratedData });
    }
  });
}

// Subscribe to all extensions (Admin)
export function subscribeToAllExtensions(callback) {
  const channelName = 'admin_all_extensions';

  return createRealtimeSubscription({
    channelName,
    table: 'rental_extensions',
    event: '*',
    onPayload: async (eventType, record, payload) => {
      const { addOrUpdateExtension, removeExtension } = useExtensionStore.getState();
      let hydratedData = null;

      switch (eventType) {
        case 'INSERT':
        case 'UPDATE': {
          // Hydrate full shape to match initial load - use same structure as adminGetAllExtensions
          const { data, error } = await supabase
            .from('rental_extensions')
            .select(`
              *,
              rentals (
                id, 
                start_date, 
                end_date, 
                camera_id, 
                cameras (name),
                users (id, first_name, last_name, email, contact_number)
              )
            `)
            .eq('id', record.id)
            .single();
            
          if (error) {
            console.error(`[Realtime] Failed to fetch extension ${record.id}:`, error);
            return;
          } else if (data) {
            hydratedData = data;
            addOrUpdateExtension(data);
          }
          break;
        }
        case 'DELETE':
          removeExtension(record.id);
          break;
        default:
          break;
      }

      callback?.({ ...payload, eventType, hydratedData });
    }
  });
}

// ====================================================
// --- COMBINED SUBSCRIPTIONS ---
// ====================================================

// Subscribe to both rental extension updates and related payment updates for a user
export function subscribeToUserExtensionsAndPayments(userId, extensionCallback, paymentCallback) {
  const extensionChannel = subscribeToUserExtensions(userId, extensionCallback);
  const paymentChannel = subscribeToUserPayments(userId, paymentCallback);
  
  return {
    extensionChannel,
    paymentChannel,
    unsubscribe: () => {
      unsubscribeFromChannel(extensionChannel);
      unsubscribeFromChannel(paymentChannel);
    }
  };
}

// Subscribe to all rentals and payments (Admin dashboard)
export function subscribeToAllRentalsAndPayments(rentalCallback, paymentCallback) {
  const rentalChannel = subscribeToAllRentals();
  const paymentChannel = subscribeToAllPayments(paymentCallback);
  
  return {
    rentalChannel,
    paymentChannel,
    unsubscribe: () => {
      unsubscribeFromChannel(rentalChannel);
      unsubscribeFromChannel(paymentChannel);
    }
  };
}