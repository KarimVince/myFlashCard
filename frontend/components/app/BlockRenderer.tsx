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
              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
              <p className="text-sm font-bold text-gray-900 leading-snug">{item.value}</p>
            </div>
          ))}
        </div>
      );

    case "note":
      return (
        <div
          className="rounded-xl px-4 py-3 text-sm leading-relaxed"
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

    default:
      return null;
  }
}
