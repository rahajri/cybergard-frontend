'use client';

interface ProgressBarProps {
  total: number;
  answered: number;
  percentage: number;
}

export function ProgressBar({ total, answered, percentage }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">
          Progression : {answered} / {total} questions
        </span>
        <span className="text-gray-600 font-semibold">
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
