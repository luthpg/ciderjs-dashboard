import type { TooltipProps } from 'recharts';
import type {
  ValueType,
  NameType,
} from 'recharts/types/component/DefaultTooltipContent';

export const Tooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-lg shadow-md flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">Views:</span>
            <span className="font-mono font-medium text-foreground">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};
