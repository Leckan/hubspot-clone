"use client"

import { useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePresetSelect = (preset: string) => {
    const now = new Date()
    let range: DateRange | undefined

    switch (preset) {
      case "today":
        range = {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        }
        break
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        range = {
          from: yesterday,
          to: yesterday,
        }
        break
      case "last7days":
        range = {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        }
        break
      case "last30days":
        range = {
          from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
          to: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        }
        break
      case "thisMonth":
        range = {
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        }
        break
      case "lastMonth":
        range = {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          to: new Date(now.getFullYear(), now.getMonth(), 0),
        }
        break
      case "thisYear":
        range = {
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31),
        }
        break
      case "all":
      default:
        range = undefined
        break
    }

    onDateRangeChange(range)
    setIsOpen(false)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r p-3">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("all")}
                  >
                    All Time
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("today")}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("yesterday")}
                  >
                    Yesterday
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("last7days")}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("last30days")}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("thisMonth")}
                  >
                    This month
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("lastMonth")}
                  >
                    Last month
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handlePresetSelect("thisYear")}
                  >
                    This year
                  </Button>
                </div>
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}