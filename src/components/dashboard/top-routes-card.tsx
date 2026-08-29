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

export function TopRoutesCard({
  routes,
  origin,
  days,
}: {
  routes: RoutePoint[]
  /** The station the firm books from — the lanes all run out of it. */
  origin: string
  days: number
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top lanes out of {origin}</CardTitle>
        <CardDescription>
          Freight booked by destination, last {days} days
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* A bar chart of nothing draws an axis and no bars, which reads as a
            broken card rather than as a quiet month. */}
        {routes.length === 0 ? (
          <p className="flex h-59 items-center justify-center text-center text-sm text-muted-foreground">
            Nothing booked in these {days} days.
          </p>
        ) : (
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
                      (payload?.[0]?.payload as RoutePoint | undefined)
                        ?.route ?? ""
                    }
                    formatter={(value, _name, item) => (
                      <span className="text-foreground tabular-nums">
                        {formatINR(Number(value))}
                        <span className="text-muted-foreground">
                          {" · "}
                          {
                            (item?.payload as RoutePoint | undefined)?.trips
                          }{" "}
                          trips
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
        )}
      </CardContent>
    </Card>
  )
}
