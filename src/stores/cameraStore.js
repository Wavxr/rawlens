// src/stores/cameraStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware'; // Optional, for Redux DevTools support

const useCameraStore = create(
  devtools(
    (set, get) => ({
      // --- Browsing State ---
      cameras: [],
      displayedCameras: [],
      loading: true,
      error: null,
      filterLoading: false,
      startDate: '',
      endDate: '',
      isFilterActive: false,

      // --- Rental Flow State ---
      rentalFlowCamera: null,
      rentalFlowCameraModelName: null, // New: stores the selected model name
      selectedCameraUnitId: null, // New: stores the specific unit ID found during availability check
      isCheckingAvailability: false,
      isAvailabilityChecked: false,
      isAvailable: false,
      availabilityError: '',
      calculatedPrice: null,
      isSubmitting: false,
      requestError: '',
      requestSuccess: false,
      showContractModal: false,
      submittedRentalData: null,
      signatureDataUrl: null,
      isGeneratingContract: false,
      pdfSignedUrl: null,
      isGeneratingPdfUrl: false,
      pdfViewError: '',

      // --- Browsing Actions ---
      setCameras: (cameras) => set({ cameras, displayedCameras: cameras }),
      setDisplayedCameras: (cameras) => set({ displayedCameras: cameras }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilterLoading: (filterLoading) => set({ filterLoading }),
      setStartDate: (date) => set({ startDate: date }),
      setEndDate: (date) => set({ endDate: date }),
      setIsFilterActive: (active) => set({ isFilterActive: active }),
      // Combined date change handler for browsing
      handleBrowseDateChange: (e, dateType) => set((state) => {
        let newState = {};
        if (dateType === 'start') {
          newState.startDate = e.target.value;
          // Reset end date if start date is after or equal to current end date
          if (state.endDate && e.target.value && new Date(e.target.value) >= new Date(state.endDate)) {
            newState.endDate = '';
          }
        } else if (dateType === 'end') {
          newState.endDate = e.target.value;
        }
        // Deactivate filter if both dates are cleared
        if ((dateType === 'start' && !e.target.value && !state.endDate) || 
            (dateType === 'end' && !e.target.value && !state.startDate)) {
            newState.isFilterActive = false;
            newState.displayedCameras = state.cameras;
        }
        return newState;
      }),

      // --- Rental Flow Actions ---
      setRentalFlowCamera: (camera) => set({ rentalFlowCamera: camera }),
      setRentalFlowCameraModelName: (modelName) => set({ rentalFlowCameraModelName: modelName }),
      setSelectedCameraUnitId: (unitId) => set({ selectedCameraUnitId: unitId }),
      setIsCheckingAvailability: (checking) => set({ isCheckingAvailability: checking }),
      setIsAvailabilityChecked: (checked) => set({ isAvailabilityChecked: checked }),
      setIsAvailable: (available) => set({ isAvailable: available }),
      setAvailabilityError: (error) => set({ availabilityError: error }),
      setCalculatedPrice: (price) => set({ calculatedPrice: price }),
      setIsSubmitting: (submitting) => set({ isSubmitting: submitting }),
      setRequestError: (error) => set({ requestError: error }),
      setRequestSuccess: (success) => set({ requestSuccess: success }),
      setShowContractModal: (show) => set({ showContractModal: show }),
      setSubmittedRentalData: (data) => set({ submittedRentalData: data }),
      setSignatureDataUrl: (url) => set({ signatureDataUrl: url }),
      setIsGeneratingContract: (generating) => set({ isGeneratingContract: generating }),
      setPdfSignedUrl: (url) => set({ pdfSignedUrl: url }),
      setIsGeneratingPdfUrl: (generating) => set({ isGeneratingPdfUrl: generating }),
      setPdfViewError: (error) => set({ pdfViewError: error }),
      
      // Combined date change handler for rental flow
      handleRentalFlowDateChange: (e, dateType) => set((state) => {
        let newState = {};
        if (dateType === 'start') {
          newState.startDate = e.target.value;
        } else if (dateType === 'end') {
          newState.endDate = e.target.value;
        }
        // Reset availability check when dates change
        newState.isAvailabilityChecked = false;
        newState.isAvailable = false;
        newState.calculatedPrice = null;
        newState.availabilityError = '';
        return newState;
      }),

      // --- Reset Actions ---
      resetRentalFlowState: () => set({
        rentalFlowCamera: null,
        rentalFlowCameraModelName: null,
        selectedCameraUnitId: null,
        isCheckingAvailability: false,
        isAvailabilityChecked: false,
        isAvailable: false,
        availabilityError: '',
        calculatedPrice: null,
        isSubmitting: false,
        requestError: '',
        requestSuccess: false,
        showContractModal: false,
        signatureDataUrl: null,
        submittedRentalData: null,
        pdfSignedUrl: null,
        pdfViewError: '',
        // Note: startDate and endDate are kept for potential reuse in browsing
        // If you want to clear them too, uncomment the next lines:
        // startDate: '',
        // endDate: '',
      }),
      resetBrowseFilter: () => set((state) => ({
        startDate: '',
        endDate: '',
        isFilterActive: false,
        displayedCameras: state.cameras,
        error: '',
      })),
      // Reset the entire store to initial state (optional)
      resetStore: () => set({
        // Browsing
        cameras: [],
        displayedCameras: [],
        loading: true,
        error: null,
        filterLoading: false,
        startDate: '',
        endDate: '',
        isFilterActive: false,
        // Rental Flow
        rentalFlowCamera: null,
        rentalFlowCameraModelName: null,
        selectedCameraUnitId: null,
        isCheckingAvailability: false,
        isAvailabilityChecked: false,
        isAvailable: false,
        availabilityError: '',
        calculatedPrice: null,
        isSubmitting: false,
        requestError: '',
        requestSuccess: false,
        showContractModal: false,
        submittedRentalData: null,
        signatureDataUrl: null,
        isGeneratingContract: false,
        pdfSignedUrl: null,
        isGeneratingPdfUrl: false,
        pdfViewError: '',
      }),
    }),
    { name: 'CameraStore' } // Name for Redux DevTools
  )
);

export default useCameraStore;