import { useMemo } from "react";
import type { ClientWorkoutCardResponse } from "../../../api/types";

const dayMonthShort = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

/** И счётчики, и график смотрят на одно и то же окно — последние три месяца. */
const STATS_MONTHS = 3;

function fromISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Подпись веса без лишнего нуля: 78 вместо 78.00. */
function formatWeight(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Статистика клиента: как он ходит и что происходит с весом.
 *
 * Считается из того же списка тренировок, что показан выше, — отдельного запроса не нужно,
 * и цифры гарантированно совпадают с тем, что клиент видит в календаре.
 */
export function ClientStats({ cards, loading }: { cards: ClientWorkoutCardResponse[]; loading: boolean }) {
  const stats = useMemo(() => {
    const since = new Date();
    since.setMonth(since.getMonth() - STATS_MONTHS);
    const sinceISO = toISODate(since);

    const recent = cards.filter((c) => c.scheduledDate >= sinceISO);

    const attended = recent.filter((c) => c.state === "CLOSED" || c.state === "OPEN").length;
    const missed = recent.filter((c) => c.state === "MISSED").length;
    const behind = attended + missed;

    const points = recent
      .filter((c) => c.weightKg != null)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      .map((c) => ({ date: c.scheduledDate, weight: Number(c.weightKg) }));

    return {
      attended,
      missed,
      behind,
      rate: behind > 0 ? Math.round((attended / behind) * 100) : null,
      points,
    };
  }, [cards]);

  const chart = useMemo(() => {
    const { points } = stats;
    if (points.length < 2) return null;

    // Точки стоят через равные промежутки: график про «от тренировки к тренировке»,
    // а не про календарные дни.
    const width = 640;
    const height = 190;
    const padding = { top: 26, right: 16, bottom: 26, left: 16 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const values = points.map((p) => p.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Ровная линия не должна прилипать к краю: раздвигаем диапазон хотя бы на килограмм.
    const span = Math.max(max - min, 1);
    const low = min - span * 0.2;
    const high = max + span * 0.2;

    const x = (index: number) =>
      padding.left + (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1));
    const y = (value: number) => padding.top + plotHeight * (1 - (value - low) / (high - low));

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.weight).toFixed(1)}`).join(" ");
    const area =
      `${line} L ${x(points.length - 1).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)}` +
      ` L ${x(0).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`;

    return { width, height, padding, plotHeight, points, x, y, line, area, min, max };
  }, [stats]);

  return (
    <div className="rounded-card bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-ink">Статистика</h2>
      <p className="mt-1 text-sm text-ink/60">
        Как вы ходите на тренировки и что происходит с весом — за последние три месяца.
      </p>

      {loading && <p className="mt-4 text-sm text-ink/50">Загрузка...</p>}

      {!loading && (
        <>
          {stats.behind === 0 ? (
            <p className="mt-4 text-sm text-ink/60">За три месяца тренировок ещё не было.</p>
          ) : (
            <div className="mt-4 rounded-2xl bg-offwhite px-5 py-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-extrabold tabular-nums text-ink">{stats.rate}%</p>
                  <p className="mt-0.5 text-xs text-ink/50">тренировок вы не пропустили</p>
                </div>

                {/* Цвет держат точки, числа остаются обычным текстом — так они читаются. */}
                <div className="flex gap-5 text-sm text-ink/70">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    Посещено <b className="font-bold tabular-nums text-ink">{stats.attended}</b>
                  </span>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-coral" />
                    Пропущено <b className="font-bold tabular-nums text-ink">{stats.missed}</b>
                  </span>
                </div>
              </div>

              {/* Одна полоса вместо трёх плиток: доля видна на глаз, а не вычисляется в уме. */}
              <div className="mt-3 flex h-2 gap-0.5">
                {stats.attended > 0 && (
                  <div
                    style={{ flexGrow: stats.attended }}
                    className="rounded-full bg-primary"
                    title={`Посещено: ${stats.attended}`}
                  />
                )}
                {stats.missed > 0 && (
                  <div
                    style={{ flexGrow: stats.missed }}
                    className="rounded-full bg-coral"
                    title={`Пропущено: ${stats.missed}`}
                  />
                )}
              </div>
            </div>
          )}

          <h3 className="mt-8 font-bold text-ink">Вес от тренировки к тренировке</h3>
          <p className="mt-1 text-xs text-ink/50">Вес вы называете, когда открываете тренировку.</p>

          {chart == null ? (
            <p className="mt-4 text-sm text-ink/60">
              {stats.points.length === 1
                ? `Пока одна точка: ${formatWeight(stats.points[0].weight)} кг. График появится со второй тренировкой.`
                : "График появится, когда вы откроете тренировку и назовёте свой вес."}
            </p>
          ) : (
            <figure className="mt-4">
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                role="img"
                aria-label={`Вес по тренировкам: от ${formatWeight(chart.points[0].weight)} до ${formatWeight(
                  chart.points[chart.points.length - 1].weight,
                )} килограммов`}
                className="h-auto w-full text-primary"
              >
                {/* Сетка спокойная: это фон, а не данные. */}
                {[0, 0.5, 1].map((step) => {
                  const lineY = chart.padding.top + chart.plotHeight * step;
                  return (
                    <line
                      key={step}
                      x1={chart.padding.left}
                      x2={chart.width - chart.padding.right}
                      y1={lineY}
                      y2={lineY}
                      stroke="currentColor"
                      strokeOpacity="0.12"
                      strokeWidth="1"
                    />
                  );
                })}

                <path d={chart.area} fill="currentColor" fillOpacity="0.08" />
                <path
                  d={chart.line}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chart.points.map((point, index) => {
                  const isEdge = index === 0 || index === chart.points.length - 1;
                  return (
                    <g key={point.date}>
                      <circle
                        cx={chart.x(index)}
                        cy={chart.y(point.weight)}
                        r={isEdge ? 4.5 : 3.5}
                        fill="#fff"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <title>{`${dayMonthShort.format(fromISODate(point.date))} — ${formatWeight(
                          point.weight,
                        )} кг`}</title>
                      </circle>

                      {/* Подписываем только края: число над каждой точкой превращает график в таблицу. */}
                      {isEdge && (
                        <>
                          <text
                            x={chart.x(index)}
                            y={chart.y(point.weight) - 12}
                            textAnchor={index === 0 ? "start" : "end"}
                            className="fill-ink text-[13px] font-bold"
                          >
                            {formatWeight(point.weight)} кг
                          </text>
                          <text
                            x={chart.x(index)}
                            y={chart.height - 6}
                            textAnchor={index === 0 ? "start" : "end"}
                            className="fill-ink/50 text-[11px]"
                          >
                            {dayMonthShort.format(fromISODate(point.date))}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
              <figcaption className="mt-2 text-xs text-ink/50">
                {chart.points.length} {chart.points.length === 1 ? "тренировка" : "тренировок"} с указанным весом,
                от {formatWeight(chart.min)} до {formatWeight(chart.max)} кг.
              </figcaption>
            </figure>
          )}
        </>
      )}
    </div>
  );
}
