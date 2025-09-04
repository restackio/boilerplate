"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/ui/select";
import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Checkbox } from "@workspace/ui/components/ui/checkbox";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { Clock, Calendar, Code } from "lucide-react";

// Unified schedule specification that matches backend models
export interface ScheduleCalendar {
  dayOfWeek: string; // "0"-"6" (0=Sunday, 6=Saturday)
  hour: number; // 0-23
  minute: number; // 0-59, defaults to 0
}

export interface ScheduleInterval {
  every: string; // e.g., "5m", "1h", "2d"
}

export interface ScheduleSpec {
  calendars?: ScheduleCalendar[];
  intervals?: ScheduleInterval[];
  cron?: string;
  timeZone?: string; // IANA timezone name (e.g., 'America/New_York', 'Europe/London', 'UTC')
}

interface ScheduleSetupModalProps {
  trigger: React.ReactNode;
  onScheduleSubmit: (scheduleSpec: ScheduleSpec) => Promise<void>;
  initialSchedule?: ScheduleSpec;
  title?: string;
  submitLabel?: string;
  isEditing?: boolean;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const PRESET_INTERVALS = [
  { value: "5m", label: "Every 5 minutes" },
  { value: "15m", label: "Every 15 minutes" },
  { value: "30m", label: "Every 30 minutes" },
  { value: "1h", label: "Every hour" },
  { value: "2h", label: "Every 2 hours" },
  { value: "6h", label: "Every 6 hours" },
  { value: "12h", label: "Every 12 hours" },
  { value: "24h", label: "Every day" },
];

const getTimezoneOptions = () => {
  const userTimezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  })();

  const commonTimezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (US & Canada)" },
    { value: "America/Chicago", label: "Central Time (US & Canada)" },
    { value: "America/Denver", label: "Mountain Time (US & Canada)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "Mumbai (IST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  ];

  // Check if user's timezone is already in the list
  const userTimezoneExists = commonTimezones.some(tz => tz.value === userTimezone);
  
  // If user timezone is not in common list, add it at the top
  if (!userTimezoneExists && userTimezone !== "UTC") {
    return [
      { value: userTimezone, label: `${userTimezone} (Current)` },
      ...commonTimezones
    ];
  }

  // If user timezone is in the list, mark it as current
  return commonTimezones.map(tz => 
    tz.value === userTimezone 
      ? { ...tz, label: `${tz.label} (Current)` }
      : tz
  );
};

export function ScheduleSetupModal({
  trigger,
  onScheduleSubmit,
  initialSchedule,
  title,
  submitLabel,
  isEditing = false,
}: ScheduleSetupModalProps) {
  const [open, setOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<"calendar" | "interval" | "cron">(
    initialSchedule?.calendars ? "calendar" : 
    initialSchedule?.intervals ? "interval" : 
    initialSchedule?.cron ? "cron" : "calendar"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine default title and submit label based on editing mode
  const modalTitle = title || (isEditing ? "Edit schedule" : "Create schedule");
  const modalSubmitLabel = submitLabel || (isEditing ? "Update" : "Create");

  // Calendar state
  const [selectedDays, setSelectedDays] = useState<string[]>(
    initialSchedule?.calendars?.[0]?.dayOfWeek ? [initialSchedule.calendars[0].dayOfWeek] : []
  );
  const [selectedHour, setSelectedHour] = useState<number>(
    initialSchedule?.calendars?.[0]?.hour ?? 9
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    initialSchedule?.calendars?.[0]?.minute ?? 0
  );

  // Interval state
  const [intervalValue, setIntervalValue] = useState<string>(
    initialSchedule?.intervals?.[0]?.every ?? "1h"
  );

  // Cron state
  const [cronExpression, setCronExpression] = useState<string>(
    initialSchedule?.cron ?? "0 9 * * 1-5"
  );
  // Automatically detect user's timezone as default
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC"; // Fallback if detection fails
    }
  };

  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    initialSchedule?.timeZone ?? getUserTimezone()
  );

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let scheduleSpec: ScheduleSpec = {};

      switch (scheduleType) {
        case "calendar":
          if (selectedDays.length === 0) {
            alert("Please select at least one day");
            return;
          }
          scheduleSpec = {
            calendars: selectedDays.map(day => ({
              dayOfWeek: day,
              hour: selectedHour,
              minute: selectedMinute, // Always set, defaults to 0
            })),
            timeZone: selectedTimezone,
          };
          break;

        case "interval": {
          // Basic client-side validation for interval format
          const intervalPattern = /^\d+(?:\.\d+)?\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|day|days?)$/i;
          if (!intervalPattern.test(intervalValue.trim())) {
            alert("Invalid interval format. Please use format like '5m', '1h', '2d'");
            return;
          }
          scheduleSpec = {
            intervals: [{ every: intervalValue.trim() }],
            timeZone: selectedTimezone,
          };
          break;
        }

        case "cron":
          if (!cronExpression.trim()) {
            alert("Please enter a cron expression");
            return;
          }
          scheduleSpec = {
            cron: cronExpression.trim(),
            timeZone: selectedTimezone,
          };
          break;
      }

      await onScheduleSubmit(scheduleSpec);
      setOpen(false);
    } catch (error) {
      console.error("Failed to create schedule:", error);
      alert("Failed to create schedule. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modalTitle}
          </DialogTitle>
        </DialogHeader>



        <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value as typeof scheduleType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="interval" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Interval
            </TabsTrigger>
            <TabsTrigger value="cron" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Cron
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Recurring day(s)</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hour" className="text-sm font-medium">
                    Hour (0-23)
                  </Label>
                  <Select value={selectedHour.toString()} onValueChange={(value) => setSelectedHour(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="minute" className="text-sm font-medium">
                    Minute (0-59)
                  </Label>
                  <Select value={selectedMinute.toString()} onValueChange={(value) => setSelectedMinute(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                        <SelectItem key={minute} value={minute.toString()}>
                          :{minute.toString().padStart(2, "0")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-neutral-600 bg-neutral-100 p-3 rounded-md">
                <p className="font-medium">Example:</p>
                <p>
                  Will run {selectedDays.length === 0 ? "on selected days" : `on ${selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ")}`} at {selectedHour.toString().padStart(2, "0")}:{selectedMinute.toString().padStart(2, "0")}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="interval" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="interval" className="text-sm font-medium">
                  Recurring Time
                </Label>
                <Select value={intervalValue} onValueChange={setIntervalValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_INTERVALS.map((interval) => (
                      <SelectItem key={interval.value} value={interval.value}>
                        {interval.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="custom-interval" className="text-sm font-medium">
                  Or enter custom interval
                </Label>
                <Input
                  id="custom-interval"
                  placeholder="e.g., 30m, 2h, 1d"
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(e.target.value)}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Format: number + unit (s=seconds, m=minutes, h=hours, d=days)<br/>
                  Examples: 30s, 5m, 1h, 2d, 1.5h
                </p>
              </div>

              <div className="text-sm text-neutral-600 bg-neutral-100 p-3 rounded-md">
                <p className="font-medium">Example:</p>
                <p>Will run every {intervalValue}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cron" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cron" className="text-sm font-medium">
                  Cron Expression
                </Label>
                <Textarea
                  id="cron"
                  placeholder="0 9 * * 1-5"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="text-sm text-neutral-600 bg-neutral-100 p-3 rounded-md">
                <p className="font-medium">Format:</p>
                <pre className="text-xs mt-1">minute hour day_of_month month day_of_week</pre>
                <p className="mt-2 font-medium">Examples:</p>
                <ul className="text-xs mt-1 space-y-1">
                  <li><code>0 9 * * 1-5</code> - 9:00 AM, Monday to Friday</li>
                  <li><code>0 */2 * * *</code> - Every 2 hours</li>
                  <li><code>30 8 * * 0</code> - 8:30 AM every Sunday</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

                {/* Timezone Selection - Common to all schedule types */}
                <div className="space-y-2">
          <Label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </Label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getTimezoneOptions().map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-neutral-500">
            All schedule times will be in the selected timezone
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : modalSubmitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
