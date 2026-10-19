import { Block } from "./AppShell";

interface Props {
  block: Block;
  accent: string;
}

export default function BlockRenderer({ block, accent }: Props) {
  switch (block.type) {
    case "stats":
      return (
        <div className="grid grid-cols-2 gap-2">
          {block.items.map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">
                {item.icon && <span className="mr-1" aria-hidden>{item.icon}</span>}
                {item.label}
              </p>
              <p className="text-sm font-bold text-gray-900 leading-snug">{item.value}</p>
            </div>
          ))}
        </div>
      );

    case "note":
      return (
        <div
          className="relative overflow-hidden rounded-xl pl-5 pr-4 py-3 text-sm leading-relaxed"
          style={{ backgroundColor: `${block.accentColor ?? accent}18`, color: "#374151" }}
        >
          <div
            className="w-1 h-full rounded-full absolute left-0 top-0"
            style={{ backgroundColor: block.accentColor ?? accent }}
          />
          {block.text}
        </div>
      );

    case "steps":
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700">
              {block.style === "number" ? (
                <span
                  className="shrink-0 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold mt-0.5"
                  style={{ backgroundColor: block.accentColor ?? accent }}
                >
                  {i + 1}
                </span>
              ) : (
                <span
                  className="shrink-0 w-2 h-2 rounded-full mt-2"
                  style={{ backgroundColor: block.accentColor ?? accent }}
                />
              )}
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-x-auto -mx-1">
          {block.heading && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              {block.heading}
            </p>
          )}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {block.columns.map((col, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold uppercase tracking-wide py-2 px-2 border-b border-gray-200 text-gray-500"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 px-2 text-gray-700 align-top border-b border-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "chart":
      return <Chart block={block} accent={accent} />;

    default:
      return null;
  }
}

type ChartBlock = Extract<Block, { type: "chart" }>;

/** Format a number the way people read it: 12, 12.5, 1,250 — no long decimals. */
function formatValue(v: number): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 1 : 0 });
}

/** Horizontal bars, drawn with plain elements so they work offline and in any theme. */
function Chart({ block, accent }: { block: ChartBlock; accent: string }) {
  const color = block.accentColor ?? accent;
  const progress = block.style === "progress";
  const top = progress ? block.max ?? 100 : Math.max(...block.items.map((i) => i.value), 0);
  // Values show their unit; a progress chart out of 100 with no unit reads as a percentage.
  const suffix = block.unit ? ` ${block.unit}` : progress && top === 100 ? "%" : "";
  const outOf = progress && top !== 100 ? ` / ${formatValue(top)}` : "";
  return (
    <figure className="space-y-2" aria-label={block.heading ?? "Chart"}>
      {block.heading && (
        <figcaption className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{block.heading}</figcaption>
      )}
      {block.items.map((item, i) => {
        const pct = top > 0 ? Math.min(100, (item.value / top) * 100) : 0;
        return (
          <div key={i}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-700 min-w-0 truncate">
                {item.icon && <span className="mr-1" aria-hidden>{item.icon}</span>}
                {item.label}
              </span>
              <span className="font-semibold text-gray-900 shrink-0 tabular-nums">
                {formatValue(item.value)}
                {suffix}
                {outOf && <span className="text-gray-400 font-normal">{outOf}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: `${color}22` }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </figure>
  );
}
