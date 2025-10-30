import { createContext, useContext } from 'react';

export const BackHandlerContext = createContext(null);

export const useBackHandlerContext = () => {
  const context = useContext(BackHandlerContext);
  if (!context) {
    throw new Error('useBackHandlerContext must be used within BackHandlerProvider');
  }
  return context;
};