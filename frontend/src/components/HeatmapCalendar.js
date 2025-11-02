import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

export default function HeatmapCalendar({ habitId, habitLogs, color }) {
  // Get last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

  const getIntensity = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const log = habitLogs.find(l => l.date === dateStr);
    return log?.completed ? 1 : 0;
  };

  const getColorForIntensity = (intensity) => {
    if (intensity === 0) return '#e0e0e0';
    return color;
  };

  return (
    <div className="flex flex-wrap gap-1.5" data-testid={`heatmap-${habitId}`}>
      {days.map((day) => {
        const intensity = getIntensity(day);
        const dateStr = format(day, 'yyyy-MM-dd');
        return (
          <div
            key={dateStr}
            data-testid={`heatmap-day-${dateStr}`}
            className="w-8 h-8 rounded-md transition-all hover:scale-110 hover:shadow-md"
            style={{ backgroundColor: getColorForIntensity(intensity) }}
            title={`${format(day, 'MMM d, yyyy')} - ${intensity ? 'Completed' : 'Not completed'}`}
          />
        );
      })}
    </div>
  );
}
