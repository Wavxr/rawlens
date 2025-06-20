import { createContext, useContext } from 'react'

const UIContext = createContext()

export function UIProvider({ children }) {
  const value = {
    theme: 'light',
    toggleTheme: () => {},
    showModal: false,
    setShowModal: () => {}
  }
  
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

export function useUIContext() {
  return useContext(UIContext)
}