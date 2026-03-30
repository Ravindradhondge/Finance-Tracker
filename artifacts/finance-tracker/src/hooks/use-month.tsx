import { createContext, useContext, useState, ReactNode } from 'react';
import { format, subMonths, addMonths } from 'date-fns';

type MonthContextType = {
  month: string;
  setMonth: (m: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
};

const MonthContext = createContext<MonthContextType | null>(null);

export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  const prevMonth = () => setMonth(m => format(subMonths(new Date(m + '-01T00:00:00'), 1), 'yyyy-MM'));
  const nextMonth = () => setMonth(m => format(addMonths(new Date(m + '-01T00:00:00'), 1), 'yyyy-MM'));

  return (
    <MonthContext.Provider value={{ month, setMonth, prevMonth, nextMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonthContext() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonthContext must be used within MonthProvider');
  return ctx;
}
