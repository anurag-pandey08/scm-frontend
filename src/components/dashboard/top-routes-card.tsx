"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { RoutePoint } from "@/lib/analytics"
import { formatINR, formatINRCompact } from "@/lib/format"

/** Nominal categories, one series — every bar takes slot 1, never a value ramp. */
const config = {
  freight: { label: "Freight booked", color: "var(--chart-1)" },
} satisfies ChartConfig

export function TopRoutesCard({ routes }: { routes: RoutePoint[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top lanes out of Ahmedabad</CardTitle>
        <CardDescription>
          Freight booked by destination, last 30 days
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-59 w-full">
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={routes}
            margin={{ top: 4, right: 52, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" dataKey="freight" hide />
            <YAxis
              type="category"
              dataKey="destination"
              width={76}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) =>
                    (payload?.[0]?.payload as RoutePoint | undefined)?.route ??
                    ""
                  }
                  formatter={(value, _name, item) => (
                    <span className="text-foreground tabular-nums">
                      {formatINR(Number(value))}
                      <span className="text-muted-foreground">
                        {" · "}
                        {(item?.payload as RoutePoint | undefined)?.trips} trips
                      </span>
                    </span>
                  )}
                />
              }
            />
            <Bar
              dataKey="freight"
              fill="var(--color-freight)"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            >
              {/* Few enough bars that every one can carry its value */}
              <LabelList
                dataKey="freight"
                position="right"
                offset={8}
                className="fill-muted-foreground"
                fontSize={11}
                formatter={(value) => formatINRCompact(Number(value))}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
