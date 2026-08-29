"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import {
  Card,
  CardAction,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MonthPoint } from "@/lib/analytics"
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format"

/** One series, so it takes categorical slot 1 and needs no legend box. */
const config = {
  freight: { label: "Freight booked", color: "var(--chart-1)" },
} satisfies ChartConfig

export function FreightTrendCard({
  data,
  changePct,
}: {
  data: MonthPoint[]
  /** null where the month before was quiet — see `monthOverMonth`. */
  changePct: number | null
}) {
  const first = data[0]
  const last = data[data.length - 1]
  // The trend always ends with the month in progress, so the last bar is a
  // part-month and the line under the chart has to say so.
  const previous = data[data.length - 2]
  const Trend =
    changePct !== null && changePct < 0 ? TrendingDownIcon : TrendingUpIcon

  // h-full down the whole chain, so the card fills its grid track and the plot
  // takes whatever height the neighbouring card sets.
  return (
    <Card className="h-full">
      <Tabs defaultValue="chart" className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle>Freight booked</CardTitle>
          <CardDescription>
            Gross of every charge head · {first.fullLabel} – {last.fullLabel}
          </CardDescription>
          <CardAction>
            <TabsList>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col">
          {/* One panel box shared by both tabs. Both panels are absolutely
              positioned inside it, so neither tab's content can drive the card
              height — the chart fills the box, the table scrolls within it, and
              switching tabs never resizes the card. */}
          <div className="relative min-h-65 flex-1">
            <TabsContent value="chart" className="absolute inset-0">
              <ChartContainer
                config={config}
                className="aspect-auto h-full w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={data}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} />
                  {/* Drop month ticks rather than letting them collide once
                      the card gets narrow. */}
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis
                    width={56}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    tickFormatter={(value: number) => formatINRCompact(value)}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--muted)" }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_label, payload) =>
                          (payload?.[0]?.payload as MonthPoint | undefined)
                            ?.fullLabel ?? ""
                        }
                        formatter={(value) => (
                          <span className="text-foreground tabular-nums">
                            {formatINR(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  {/* 4px rounded data-end, anchored square to the baseline */}
                  <Bar
                    dataKey="freight"
                    fill="var(--color-freight)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={34}
                  />
                </BarChart>
              </ChartContainer>
            </TabsContent>

            {/* The WCAG-clean twin — every value the chart plots, readable as text. */}
            <TabsContent
              value="table"
              className="absolute inset-0 overflow-y-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Freight booked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((point) => (
                    <TableRow key={point.month}>
                      <TableCell>{point.fullLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(point.freight)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </div>

          {/* A percentage against a month with nothing in it is either
              infinity or an invention, so the line says what it can instead. */}
          <p className="mt-3 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Trend className="size-3.5" aria-hidden />
            {changePct === null ? (
              <span>
                Nothing booked in {previous.fullLabel} to compare{" "}
                {last.fullLabel} against
              </span>
            ) : (
              <span>
                <span className="font-medium text-foreground">
                  {formatPercent(changePct)}
                </span>{" "}
                — {last.fullLabel} so far, against all of {previous.fullLabel}
              </span>
            )}
          </p>
        </CardContent>
      </Tabs>
    </Card>
  )
}
