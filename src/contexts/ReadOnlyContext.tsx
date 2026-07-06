import { createContext, useContext, ReactNode } from 'react';

interface ReadOnlyContextType {
  isReadOnly: boolean;
}

const ReadOnlyContext = createContext<ReadOnlyContextType>({ isReadOnly: false });

export const ReadOnlyProvider: React.FC<{ isReadOnly: boolean; children: ReactNode }> = ({ isReadOnly, children }) => {
  return (
    <ReadOnlyContext.Provider value={{ isReadOnly }}>
      {children}
    </ReadOnlyContext.Provider>
  );
};

export const useReadOnly = (): ReadOnlyContextType => {
  const context = useContext(ReadOnlyContext);
  return context;
};
