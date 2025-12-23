import { createContext, useContext } from 'react';

export const BreakfastContext = createContext(null);

export const useBreakfast = () => {
  return useContext(BreakfastContext);
};