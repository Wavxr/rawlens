import { supabase } from '../lib/supabaseClient';
import useRentalStore from '../stores/rentalStore';
import useUserStore from '../stores/userStore';
import { getRentalById } from './rentalService';
import { getUserById } from './userService';
import { sendRentalConfirmed, sendReturnReminder, sendItemReturned } from './emailService';
import { sendPushNotification, sendPushToAdmins } from './pushService';
import { getUserSettings } from './settingsService';

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
 * @param {function} callback - A function to call when an update is received.
 * @param {string} role - 'user' or 'admin'
 */
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
            // Push notifications for user events (appeals, verification status)
            try {
              await handleUserPushNotifications(payload.old, payload.new);
            } catch (e) {
              console.error('Error in user push notifications:', e);
            }
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

/**
 * Unsubscribe from a user updates channel.
 */
export function unsubscribeFromUserUpdates(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}


// Helper: check if recipient allows emails (cheap single-row fetch)
async function shouldSendEmailTo(userId) {
 try {
    const { data, error } = await supabase
      .from('user_settings')
     .select('email_notifications')
      .eq('user_id', userId)
      .single();
   if (error) {
      // If row not found or any error, be conservative and allow (backend will enforce too)
     console.warn('Email settings lookup failed, proceeding to backend check:', error?.message || error);
      return true;
    }
    return !!data?.email_notifications;
  } catch (e) {
    console.warn('Email settings lookup threw, proceeding to backend check:', e);
    return true;
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
    // Fetch user settings once per update
    const settings = await getUserSettings(newRecord.user_id);

    // Guard: if user has email notifications off, skip
    if (!settings?.email_notifications) {
      console.log(`User ${newRecord.user_id} has email notifications disabled. Skipping emails.`);
      return;
    }

    // Admin confirms rental → notify user (email)
    if (oldRecord.rental_status !== 'confirmed' && newRecord.rental_status === 'confirmed') {
      console.log('CONDITION MET: Rental confirmed - sending email');
      await sendRentalConfirmedEmail(newRecord);
    }

    // End date passed or return scheduled → notify user
    if (oldRecord.shipping_status !== 'return_scheduled' && newRecord.shipping_status === 'return_scheduled') {
      console.log('CONDITION MET: Return scheduled - sending email');
      await sendReturnScheduledEmail(newRecord);
    }

    // Returned (marked by admin) → notify user
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


// ====================================================
// --- PUSH NOTIFICATIONS ---
// ====================================================

/**
 * Handle push notifications based on rental status changes
 * 
 * Notification Events:
 * - User submits rental request → notify admin
 * - Admin confirms rental request → notify user
 * - Admin sets ready_to_ship → notify user
 * - Shipping in_transit_to_user → notify user
 * - Delivered (user camera as delivered) → notify admin
 * - Rental_status set to active → notify admin/user
 * - End date passed / return_scheduled → notify admin/user
 * - In_transit_to_owner → notify admin
 * - Returned (admin marks) → notify user
 */
async function handleRentalPushNotifications(oldRecord, newRecord) {
  try {
    // User submits rental request - notify admin
    if (!oldRecord && newRecord && newRecord.rental_status === 'pending') {
      console.log('Push: New rental request - notifying admins');
      await sendPushToAdmins(
        'New Rental Request',
        `A new rental request has been submitted for rental ${newRecord.id}`,
        { 
          type: 'new_rental', 
          rentalId: newRecord.id,
          url: `/admin/rentals/${newRecord.id}` 
        }
      );
    }

    // Admin confirms rental request - notify user
    else if (oldRecord?.rental_status !== 'confirmed' && newRecord?.rental_status === 'confirmed') {
      console.log('Push: Rental confirmed - notifying user');
      await sendPushNotification(
        newRecord.user_id,
        'Rental Confirmed!',
        'Your rental request has been confirmed by the admin',
        { 
          type: 'rental_confirmed', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );
    }

    // Admin sets ready_to_ship - notify user
    else if (oldRecord?.shipping_status !== 'ready_to_ship' && newRecord?.shipping_status === 'ready_to_ship') {
      console.log('Push: Ready to ship - notifying user');
      await sendPushNotification(
        newRecord.user_id,
        'Ready to Ship',
        'Your rental is ready to be shipped',
        { 
          type: 'ready_to_ship', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );
    }

    // Shipping in_transit_to_user - notify user
    else if (oldRecord?.shipping_status !== 'in_transit_to_user' && newRecord?.shipping_status === 'in_transit_to_user') {
      console.log('Push: In transit to user - notifying user');
      await sendPushNotification(
        newRecord.user_id,
        'In Transit',
        'Your rental is on the way to you',
        { 
          type: 'in_transit_to_user', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );
    }

    // Delivered - notify admin
    else if (oldRecord?.shipping_status !== 'delivered' && newRecord?.shipping_status === 'delivered') {
      console.log('Push: Delivered - notifying admins');
      await sendPushToAdmins(
        'Rental Delivered',
        `Rental ${newRecord.id} has been delivered to user`,
        { 
          type: 'delivered', 
          rentalId: newRecord.id,
          url: `/admin/rentals/${newRecord.id}` 
        }
      );
    }

    // Rental_status set to active - notify user and admin
    else if (oldRecord?.rental_status !== 'active' && newRecord?.rental_status === 'active') {
      console.log('Push: Rental active - notifying user and admins');
      // Notify user
      await sendPushNotification(
        newRecord.user_id,
        'Rental Active',
        'Your rental is now active. Enjoy!',
        { 
          type: 'rental_active', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );

      // Notify admin
      await sendPushToAdmins(
        'Rental Active',
        `Rental ${newRecord.id} is now active`,
        { 
          type: 'rental_active', 
          rentalId: newRecord.id,
          url: `/admin/rentals/${newRecord.id}` 
        }
      );
    }

    // End date passed / return_scheduled - notify user and admin
    else if (oldRecord?.shipping_status !== 'return_scheduled' && newRecord?.shipping_status === 'return_scheduled') {
      console.log('Push: Return scheduled - notifying user and admins');
      // Notify user
      await sendPushNotification(
        newRecord.user_id,
        'Return Reminder',
        'Please prepare to return your rental item',
        { 
          type: 'return_scheduled', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );

      // Notify admin
      await sendPushToAdmins(
        'Return Scheduled',
        `Return scheduled for rental ${newRecord.id}`,
        { 
          type: 'return_scheduled', 
          rentalId: newRecord.id,
          url: `/admin/rentals/${newRecord.id}` 
        }
      );
    }

    // In_transit_to_owner - notify admin
    else if (oldRecord?.shipping_status !== 'in_transit_to_owner' && newRecord?.shipping_status === 'in_transit_to_owner') {
      console.log('Push: In transit to owner - notifying admins');
      await sendPushToAdmins(
        'Return in Transit',
        `Rental ${newRecord.id} is being returned`,
        { 
          type: 'in_transit_to_owner', 
          rentalId: newRecord.id,
          url: `/admin/rentals/${newRecord.id}` 
        }
      );
    }

    // Returned (admin marks) - notify user
    else if (oldRecord?.rental_status !== 'completed' && newRecord?.rental_status === 'completed') {
      console.log('Push: Rental completed - notifying user');
      await sendPushNotification(
        newRecord.user_id,
        'Rental Completed',
        'Thank you for returning your rental',
        { 
          type: 'rental_completed', 
          rentalId: newRecord.id,
          url: `/rentals/${newRecord.id}` 
        }
      );
    }
  } catch (error) {
    console.error('Error handling rental push notifications:', error);
  }
}

/**
 * Handle push notifications based on user verification status changes
 * 
 * Notification Events:
 * - Users table Boolean is_appealing = true - notify admin
 * - Admin approves/rejects verification - notify user
 */
async function handleUserPushNotifications(oldRecord, newRecord) {
  try {
    // User sets is_appealing = true - notify admin
    if (!oldRecord?.is_appealing && newRecord?.is_appealing) {
      console.log('Push: User appeal submitted - notifying admins');
      await sendPushToAdmins(
        'User Appeal',
        `User ${newRecord.first_name} ${newRecord.last_name} has submitted an appeal`,
        { 
          type: 'user_appeal', 
          userId: newRecord.id,
          url: `/admin/users/${newRecord.id}` 
        }
      );
    }

    // User verification status changes - notify user
    else if (oldRecord?.verification_status !== newRecord?.verification_status) {
      console.log('Push: Verification status changed - notifying user');
      let title = '';
      let body = '';

      switch (newRecord.verification_status) {
        case 'verified':
          title = 'Verification Approved';
          body = 'Your account has been verified!';
          break;
        case 'rejected':
          title = 'Verification Rejected';
          body = 'Your verification request was rejected. Please check your documents.';
          break;
        case 'pending':
          title = 'Verification Submitted';
          body = 'Your verification documents have been received.';
          break;
        default:
          return; // No notification for other status changes
      }

      await sendPushNotification(
        newRecord.id,
        title,
        body,
        { 
          type: 'verification_status', 
          userId: newRecord.id,
          url: '/profile' 
        }
      );
    }
  } catch (error) {
    console.error('Error handling user push notifications:', error);
  }
}