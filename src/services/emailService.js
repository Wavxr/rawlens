import { rentalConfirmedTemplate } from '../templates/email/rentalConfirmed.js';
import { returnReminderTemplate } from '../templates/email/returnReminder.js';
import { itemReturnedTemplate } from '../templates/email/itemReturned.js';
import { supabase } from '../lib/supabaseClient';

// Send email using Supabase Edge Function
export async function sendEmail(to, subject, html) {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                html
            }
        });

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Specific email functions
export async function sendRentalConfirmed(userData, rentalData) {
    const html = rentalConfirmedTemplate(userData, rentalData);
    return sendEmail(
        userData.email,
        'Your Rental Has Been Confirmed',
        html
    );
}

export async function sendReturnReminder(userData, rentalData) {
    const html = returnReminderTemplate(userData, rentalData);
    return sendEmail(
        userData.email,
        'Return Reminder - Rental Ending Soon',
        html
    );
}

export async function sendItemReturned(userData, rentalData) {
    const html = itemReturnedTemplate(userData, rentalData);
    return sendEmail(
        userData.email,
        'Item Returned Successfully',
        html
    );
}