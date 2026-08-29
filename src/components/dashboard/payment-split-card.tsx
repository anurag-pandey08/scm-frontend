"use client"

import { Cell, Label, Pie, PieChart } from "recharts"

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
import type { PaymentSlice } from "@/lib/analytics"
import { formatINR, formatINRCompact } from "@/lib/format"
import { PAYMENT_COLOR } from "@/lib/palette"

const KEYS: Record<string, string> = {
  Paid: "paid",
  "To Pay": "toPay",
  TBB: "tbb",
}

const config = {
  paid: { label: "Paid", color: PAYMENT_COLOR.Paid },
  toPay: { label: "To Pay", color: PAYMENT_COLOR["To Pay"] },
  tbb: { label: "TBB", color: PAYMENT_COLOR.TBB },
} satisfies ChartConfig

export function PaymentSplitCard({
  slices,
  days,
}: {
  slices: PaymentSlice[]
  days: number
}) {
  const total = slices.reduce((sum, s) => sum + s.freight, 0)
  const data = slices.map((s) => ({
    ...s,
    key: KEYS[s.type],
    fill: PAYMENT_COLOR[s.type],
  }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Payment terms</CardTitle>
        <CardDescription>
          Share of freight booked in the last {days} days
        </CardDescription>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <p className="flex h-[190px] items-center justify-center text-center text-sm text-muted-foreground">
            No freight booked in this window.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="mx-auto aspect-square h-[190px]"
          >
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="key"
                    formatter={(value) => (
                      <span className="text-foreground tabular-nums">
                        {formatINR(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              <Pie
                data={data}
                dataKey="freight"
                nameKey="key"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                /* A surface-coloured gap, not a border, separates the arcs */
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                      return null
                    }
                    const cx = Number(viewBox.cx)
                    const cy = Number(viewBox.cy)
                    return (
                      <text x={cx} y={cy} textAnchor="middle">
                        <tspan
                          x={cx}
                          y={cy - 4}
                          className="fill-foreground text-lg font-semibold"
                        >
                          {formatINRCompact(total)}
                        </tspan>
                        <tspan
                          x={cx}
                          y={cy + 14}
                          className="fill-muted-foreground text-xs"
                        >
                          booked
                        </tspan>
                      </text>
                    )
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}

        {/* Legend doubles as the table view — no value lives only in a tooltip */}
        {/* Two lines per row rather than four fixed-width columns, so the
            legend still reads at a narrow card width. */}
        <ul className="mt-3 space-y-2">
          {data.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: slice.fill }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{slice.type}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {slice.count} LR · {slice.share.toFixed(1)}%
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums">
                {formatINR(slice.freight)}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          TBB — to be billed against the party&rsquo;s monthly account.
        </p>
      </CardContent>
    </Card>
  )
}
