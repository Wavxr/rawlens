import { useState } from 'react';
import { calculateTotalPrice } from '../services/rentalService';

const useRentalPricing = () => {
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [pricingError, setPricingError] = useState('');

  const calculateAndSetPrice = async (cameraId, startDate, endDate) => {
    if (!cameraId || !startDate || !endDate) {
      setPricingError("Missing required information for price calculation.");
      return;
    }

    const startD = new Date(startDate);
    const endD = new Date(endDate);
    startD.setHours(0, 0, 0, 0);
    endD.setHours(0, 0, 0, 0);

    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || endD < startD) {
      setPricingError("Invalid rental period: End date is before start date.");
      return;
    }

    try {
      setPricingError('');
      const { totalPrice, pricePerDay, rentalDays } = await calculateTotalPrice(cameraId, startDate, endDate);
      setCalculatedPrice({
        days: rentalDays,
        pricePerDay: pricePerDay,
        total: totalPrice
      });
    } catch (err) {
      console.error("Error in calculateAndSetPrice:", err);
      setPricingError(err.message || "Failed to calculate rental price.");
      setCalculatedPrice(null);
    }
  };

  const resetPricing = () => {
    setCalculatedPrice(null);
    setPricingError('');
  };

  return {
    calculatedPrice,
    pricingError,
    calculateAndSetPrice,
    resetPricing,
  };
};

export default useRentalPricing;
