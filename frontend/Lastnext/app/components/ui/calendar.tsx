"use client"

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

// Precise type definitions for calendar modes
type SingleMode = {
  mode: "single";
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
}

type RangeMode = {
  mode: "range";
  selected?: { from?: Date; to?: Date } | undefined;
  onSelect?: (date: { from?: Date; to?: Date } | undefined) => void;
}

type MultipleMode = {
  mode: "multiple";
  selected?: Date[] | undefined;
  onSelect?: (dates: Date[] | undefined) => void;
}

// Base calendar props shared across all modes
type BaseCalendarProps = {
  className?: string;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  initialFocus?: boolean;
}

// Combine modes with base props
type CalendarProps = BaseCalendarProps & (SingleMode | RangeMode | MultipleMode);

function Calendar(props: CalendarProps) {
  const {
    className,
    month = new Date(),
    selected,
    onSelect,
    onMonthChange,
    mode = "single",
    disabled,
    numberOfMonths = 1,
    initialFocus,
  } = props;

  // More flexible state management
  const [currentMonth, setCurrentMonth] = React.useState(() => new Date(month));
  const [internalSelected, setInternalSelected] = React.useState<
    | Date 
    | { from?: Date; to?: Date } 
    | Date[] 
    | undefined
  >(selected);

  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Synchronize external and internal selected state
  React.useEffect(() => {
    setInternalSelected(selected);
  }, [selected]);

  // Update current month when external month prop changes
  React.useEffect(() => {
    setCurrentMonth(new Date(month));
  }, [month]);

  // Initial focus handling
  React.useEffect(() => {
    if (initialFocus && calendarRef.current) {
      calendarRef.current.focus();
    }
  }, [initialFocus]);

  // Utility functions for calendar calculations
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Comprehensive date handling logic
  const handleDateClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (disabled?.(newDate)) return;

    switch (mode) {
      case "single": {
        const singleOnSelect = onSelect as (date: Date | undefined) => void;
        setInternalSelected(newDate);
        singleOnSelect(newDate);
        break;
      }
      case "range": {
        const rangeOnSelect = onSelect as (date: { from?: Date; to?: Date } | undefined) => void;
        const currentRange = internalSelected as { from?: Date; to?: Date } | undefined;
        let newSelected: { from?: Date; to?: Date };

        if (!currentRange?.from) {
          newSelected = { from: newDate };
        } else if (!currentRange.to) {
          newSelected = {
            from: currentRange.from,
            to: newDate >= currentRange.from ? newDate : currentRange.from,
            ...(newDate < currentRange.from && { from: newDate }),
          };
        } else {
          newSelected = { from: newDate };
        }

        setInternalSelected(newSelected);
        rangeOnSelect(newSelected);
        break;
      }
      case "multiple": {
        const multipleOnSelect = onSelect as (dates: Date[] | undefined) => void;
        const currentDates = Array.isArray(internalSelected) ? [...internalSelected] : [];
        const dateIndex = currentDates.findIndex(
          (d) => d.toDateString() === newDate.toDateString()
        );

        if (dateIndex > -1) {
          currentDates.splice(dateIndex, 1);
        } else {
          currentDates.push(newDate);
        }

        setInternalSelected(currentDates);
        multipleOnSelect(currentDates);
        break;
      }
    }
  };

  // Month navigation
  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  // Date selection checking logic
  const isDateSelected = (day: number): boolean => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    if (!internalSelected) return false;

    switch (mode) {
      case "single":
        return internalSelected instanceof Date && 
               date.toDateString() === (internalSelected as Date).toDateString();
      
      case "range": {
        const { from, to } = internalSelected as { from?: Date; to?: Date };
        return !!(
          (from && date.toDateString() === from.toDateString()) ||
          (to && date.toDateString() === to.toDateString()) ||
          (from && to && date >= from && date <= to)
        );
      }
      
      case "multiple":
        return Array.isArray(internalSelected) && 
               (internalSelected as Date[]).some(
                 (d) => d.toDateString() === date.toDateString()
               );
      
      default:
        return false;
    }
  };

  // Today checking
  const isToday = (day: number): boolean => {
    const today = new Date();
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toDateString() === today.toDateString();
  };

  // Calendar rendering
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);

    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const weeks: React.JSX.Element[] = [];
    let days: React.JSX.Element[] = [];

    // Fill initial empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<td key={`empty-${i}`} className="p-0 h-9 w-9" />);
    }

    // Render days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isDisabled = disabled?.(date) || false;

      days.push(
        <td key={day} className="p-0 h-9 w-9 text-center">
          <Button
            variant={isDateSelected(day) ? "default" : isToday(day) ? "secondary" : "ghost"}
            className={cn(
              "h-9 w-9 p-0 font-normal",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={isDisabled}
            onClick={() => handleDateClick(day)}
            aria-label={`${monthNames[month]} ${day}, ${year}`}
          >
            {day}
          </Button>
        </td>
      );

      // Complete a week or finish the month
      if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
        weeks.push(<tr key={`week-${day}`} className="flex w-full">{days}</tr>);
        days = [];
      }
    }

    return (
      <div className="space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 opacity-50 hover:opacity-100"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {monthNames[month]} {year}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 opacity-50 hover:opacity-100"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="flex w-full">
              {dayNames.map((day) => (
                <th
                  key={day}
                  className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex-1"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{weeks}</tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      ref={calendarRef}
      className={cn("p-3", className)}
      tabIndex={initialFocus ? 0 : -1}
    >
      {renderCalendar()}
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };