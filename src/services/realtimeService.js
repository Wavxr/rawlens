import { supabase } from '../lib/supabaseClient';
import useRentalStore from '../stores/rentalStore';
import useUserStore from '../stores/userStore';
import { getRentalById } from './rentalService';
import { getUserById } from './userService';
import { sendRentalConfirmed, sendReturnReminder, sendItemReturned } from './emailService';

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
      console.log('Real-time event received:', payload);
      
      const { eventType } = payload;
      const rentalId = eventType === 'DELETE' ? payload.old.id : payload.new.id;

      // Handle email notifications for UPDATE events
      if (eventType === 'UPDATE') {
        await handleRentalEmailNotifications(payload.old, payload.new);
      }

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

// ====================================================
// --- EMAIL NOTIFICATIONS ---
// ====================================================

/**
 * Handle email notifications based on rental status changes
 */
async function handleRentalEmailNotifications(oldRecord, newRecord) {
  try {
    
    // Admin confirms rental → notify user (email)
    if (oldRecord.rental_status !== 'confirmed' && newRecord.rental_status === 'confirmed') {
      console.log('CONDITION MET: Rental confirmed - sending email');
      await sendRentalConfirmedEmail(newRecord);
    }

    // End date passed or is near return (return_scheduled in shipping_status) → notify user
    if (oldRecord.shipping_status !== 'return_scheduled' && newRecord.shipping_status === 'return_scheduled') {
      console.log('CONDITION MET: Return scheduled - sending email');
      await sendReturnScheduledEmail(newRecord);
    }

    // returned (marked by admin) → notify user (email)
    if (oldRecord.shipping_status !== 'returned' && newRecord.shipping_status === 'returned') {
      console.log('CONDITION MET: Item returned - sending email');
      await sendRentalCompletedEmail(newRecord);
    }
  } catch (error) {
    console.error('Error handling rental email notifications:', error);
  }
}

/**
 * Send rental confirmed email to user
 */
async function sendRentalConfirmedEmail(rentalData) {
  try {
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', rentalData.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Get camera data
    const { data: cameraData, error: cameraError } = await supabase
      .from('cameras')
      .select('name')
      .eq('id', rentalData.camera_id)
      .single();

    if (cameraError) {
      console.error('Error fetching camera data:', cameraError);
      throw cameraError;
    }

    // Send email
    await sendRentalConfirmed(
      userData,
      { ...rentalData, item_name: cameraData.name }
    );
  } catch (error) {
    console.error('Error sending rental confirmed email:', error);
  }
}

/**
 * Send return scheduled email to user
 */
async function sendReturnScheduledEmail(rentalData) {
  try {
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', rentalData.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Get camera data
    const { data: cameraData, error: cameraError } = await supabase
      .from('cameras')
      .select('name')
      .eq('id', rentalData.camera_id)
      .single();

    if (cameraError) {
      console.error('Error fetching camera data:', cameraError);
      throw cameraError;
    }

    // Send email
    await sendReturnReminder(
      userData,
      { ...rentalData, item_name: cameraData.name }
    );
  } catch (error) {
    console.error('Error sending return scheduled email:', error);
  }
}

/**
 * Send rental completed email to user
 */
async function sendRentalCompletedEmail(rentalData) {
  try {
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', rentalData.user_id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Get camera data
    const { data: cameraData, error: cameraError } = await supabase
      .from('cameras')
      .select('name')
      .eq('id', rentalData.camera_id)
      .single();

    if (cameraError) {
      console.error('Error fetching camera data:', cameraError);
      throw cameraError;
    }

    // Send email
    await sendItemReturned(
      userData,
      { ...rentalData, item_name: cameraData.name }
    );
  } catch (error) {
    console.error('Error sending rental completed email:', error);
  }
}