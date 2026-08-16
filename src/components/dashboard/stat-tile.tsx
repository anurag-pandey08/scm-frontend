import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string
  value: string
  sub: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </div>
        {/* Proportional figures — tabular-nums only where numbers stack. */}
        <div className="text-2xl leading-none font-semibold tracking-tight">
          {value}
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{sub}</CardContent>
    </Card>
  )
}
