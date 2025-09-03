import { useState } from 'react';
import { findAvailableUnitOfModel } from '../services/cameraService';
import { isUserVerified } from '../services/verificationService';

const useRentalAvailability = (user) => {
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailabilityChecked, setIsAvailabilityChecked] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [selectedCameraUnitId, setSelectedCameraUnitId] = useState(null);

  const checkAvailability = async (cameraModelName, startDate, endDate) => {
    if (!cameraModelName || !startDate || !endDate || !user?.id) {
      setAvailabilityError("Please select a camera model and both start and end dates.");
      return { success: false };
    }

    // Enforce verification before proceeding
    try {
      const canRent = await isUserVerified(user.id);
      if (!canRent) {
        setAvailabilityError("Your account is not verified. Please complete verification in your Profile before renting.");
        return { success: false };
      }
    } catch (e) {
      setAvailabilityError(e.message || "Unable to verify your account status. Please try again or check your Profile.");
      return { success: false };
    }

    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(0, 0, 0, 0));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      setAvailabilityError("Please select valid dates. End date must be on or after start date.");
      return { success: false };
    }

    setAvailabilityError('');
    setIsCheckingAvailability(true);
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setSelectedCameraUnitId(null);

    try {
      const { data: availableUnit, error } = await findAvailableUnitOfModel(cameraModelName, startDate, endDate);

      if (error) {
        setAvailabilityError(error);
        setIsAvailable(false);
        return { success: false };
      } else if (availableUnit) {
        setSelectedCameraUnitId(availableUnit.id);
        setIsAvailable(true);
        setIsAvailabilityChecked(true);
        return { success: true, unitId: availableUnit.id };
      } else {
        setAvailabilityError(`No units of ${cameraModelName} are available for the selected dates.`);
        setIsAvailable(false);
        return { success: false };
      }
    } catch (err) {
      setAvailabilityError(err.message || "An error occurred while checking availability.");
      return { success: false };
    } finally {
      setIsCheckingAvailability(false);
      setIsAvailabilityChecked(true);
    }
  };

  const resetAvailability = () => {
    setIsCheckingAvailability(false);
    setIsAvailabilityChecked(false);
    setIsAvailable(false);
    setAvailabilityError('');
    setSelectedCameraUnitId(null);
  };

  return {
    isCheckingAvailability,
    isAvailabilityChecked,
    isAvailable,
    availabilityError,
    selectedCameraUnitId,
    checkAvailability,
    resetAvailability,
    setAvailabilityError,
  };
};

export default useRentalAvailability;
