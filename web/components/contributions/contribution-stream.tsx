import {
  monthTicks,
  runStartWeek,
  scatter,
  streamWeeks,
  termIslands,
  type DayActivity,
} from "@/lib/contributions/stream";

// Sized so the drawing scales at about one to one in the card, which keeps
// the labels at their real size instead of shrinking with a wide viewBox.
const W = 780;
const H = 250;
const TOP = 30;
const BOTTOM = 14;
const SIDE = 10;

/**
 * Twelve months of one person's work, week by week, drawn as clusters of
 * droplets carried along a slow stream: the picture from the Figma file,
 * on this product's tokens. Each column is a week; each droplet is a day
 * that counted, sized by how much landed. Terms are the four islands the
 * stream crosses. The current run is boxed at the right so the number on
 * the card beside it has a place in the picture.
 *
 * Server rendered SVG on CSS variables, so it follows the theme and costs
 * no script. Nothing here is ever drawn for another person.
 */
export function ContributionStream({
  days,
  today,
  current,
  total,
}: {
  days: DayActivity[];
  today: string;
  /** Days in a row right now, boxed at the right when there is a run. */
  current: number;
  total: number;
}) {
  const weeks = streamWeeks(days, today);
  if (weeks.length === 0) return null;
  const step = (W - SIDE * 2) / weeks.length;
  const x = (i: number) => SIDE + step * (i + 0.5);
  const mid = TOP + (H - TOP - BOTTOM) / 2;
  const amp = (H - TOP - BOTTOM) * 0.22;
  // A slow bend, so the stream reads as a stream rather than a line.
  const centre = (i: number) => mid + amp * Math.sin((i / weeks.length) * Math.PI * 2 * 1.4 + 0.6);
  const islands = termIslands(weeks);
  const ticks = monthTicks(weeks);
  const runFrom = runStartWeek(weeks, today, current);
  // A term that spans both ends of the year appears twice; the year tells
  // them apart.
  const termCounts = new Map<string, number>();
  for (const island of islands) termCounts.set(island.term, (termCounts.get(island.term) ?? 0) + 1);
  const label = (term: string, start: string) =>
    (termCounts.get(term) ?? 0) > 1 ? `${term} ${start.slice(0, 4)}` : term;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={
        total === 0
          ? "Twelve months of your contributions, week by week. Nothing on it yet."
          : `Twelve months of your contributions, week by week: ${total} in all.`
      }
      className="h-auto w-full"
    >
      {/* Terms as islands the stream runs across. */}
      {islands.map((island) => {
        const left = x(island.from) - step / 2 + 2;
        const right = x(island.to) + step / 2 - 2;
        const winter = island.term === "Winter";
        return (
          <g key={`${island.term}-${island.from}`}>
            <rect
              x={left}
              y={TOP - 6}
              width={Math.max(0, right - left)}
              height={H - TOP - BOTTOM + 12}
              rx={14}
              fill={winter ? "var(--sunken)" : "var(--primary-soft)"}
              opacity={winter ? 0.7 : 0.5}
            />
            {right - left > 70 ? (
              <text x={left + 12} y={TOP + 10} fontSize={11} fontWeight={600} fill="var(--ink-faint)">
                {label(island.term, weeks[island.from].start)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Month labels above the stream. */}
      {ticks.map((tick) => (
        <text key={tick.label + tick.index} x={x(tick.index) - step / 2} y={12} fontSize={11} fill="var(--ink-faint)">
          {tick.label}
        </text>
      ))}

      {/* The current run, boxed. */}
      {current > 0 ? (
        <g>
          <rect
            x={x(runFrom) - step / 2 - 4}
            y={TOP + 2}
            width={x(weeks.length - 1) + step / 2 + 4 - (x(runFrom) - step / 2 - 4)}
            height={H - TOP - BOTTOM - 4}
            rx={12}
            fill="var(--primary-soft)"
            stroke="var(--primary)"
            strokeOpacity={0.5}
          />
          <text
            x={x(weeks.length - 1) + step / 2}
            y={TOP + 16}
            fontSize={10}
            fontWeight={600}
            textAnchor="end"
            fill="var(--primary)"
          >
            {current === 1 ? "1 day so far" : `${current} days in a row`}
          </text>
        </g>
      ) : null}

      {/* The stream itself: a short stroke per busy week, then its droplets. */}
      {weeks.map((week, i) => {
        if (week.days.length === 0) return null;
        const cx = x(i);
        const cy = centre(i);
        const tilt = scatter(`${week.start}-tilt`) * 6;
        return (
          <g key={week.start}>
            <line
              x1={cx - step * 0.6}
              y1={cy + tilt}
              x2={cx + step * 0.6}
              y2={cy - tilt}
              stroke="var(--primary)"
              strokeOpacity={0.3}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {week.days.map((d, j) => {
              // Spread inside the column, never into the neighbour's.
              const count = week.days.length;
              const spread = Math.min(step * 0.7, count * 4);
              const raw = count === 1 ? 0 : spread * (j / (count - 1) - 0.5);
              const rx = Math.min(6.5, 2.2 + d.impact * 0.75);
              const px = Math.min(W - SIDE - rx, Math.max(SIDE + rx, cx + raw));
              const dx = px - cx;
              const dy = scatter(d.day) * amp * 0.9;
              const strong = d.impact >= 5;
              const light = d.impact <= 1;
              return (
                <ellipse
                  key={d.day}
                  cx={cx + dx}
                  cy={cy + dy}
                  rx={rx}
                  ry={rx * 1.35}
                  fill={strong ? "var(--primary-active)" : "var(--primary)"}
                  opacity={light ? 0.55 : 1}
                  transform={`rotate(${scatter(`${d.day}-r`) * 18} ${cx + dx} ${cy + dy})`}
                >
                  <title>{`${niceDate(d.day)}: ${describe(d.counts)}`}</title>
                </ellipse>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function niceDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function describe(counts: DayActivity["counts"]): string {
  const parts: string[] = [];
  if (counts.share) parts.push(`${counts.share} shared`);
  if (counts.accepted) parts.push(`${counts.accepted} accepted`);
  if (counts.review) parts.push(`${counts.review} reviewed`);
  if (counts.resource) parts.push(`${counts.resource} attached`);
  if (counts.study) parts.push(`${counts.study} studied`);
  return parts.join(", ");
}
