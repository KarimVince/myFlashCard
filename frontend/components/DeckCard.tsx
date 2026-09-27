import { Deck } from "@/lib/types";
import { downloadUrl } from "@/lib/api";

interface Props {
  deck: Deck;
  showVisibility?: boolean;
  onToggleVisibility?: (id: number, current: boolean) => void;
  onToggleFree?: (id: number, current: boolean) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
}

export default function DeckCard({
  deck,
  showVisibility,
  onToggleVisibility,
  onToggleFree,
  onDelete,
  onEdit,
}: Props) {
  const icon = deck.category.icon ?? "📄";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
            {deck.category.label}
          </span>
          {/* Free / Premium badge */}
          {deck.is_free ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              ✓ Free
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              ★ Premium
            </span>
          )}
          {showVisibility && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deck.is_public
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {deck.is_public ? "Public" : "Hidden"}
            </span>
          )}
        </div>
        {deck.card_count != null && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {deck.card_count} cards
          </span>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 leading-snug">{deck.title}</h3>
        {deck.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{deck.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {deck.author && <>{deck.author} · </>}
          {deck.language.toUpperCase()} · {deck.downloads} downloads
        </p>
      </div>

      <div className="flex gap-2 mt-auto flex-wrap">
        {/* Public view: only show download for free decks */}
        {!showVisibility && deck.is_free && (
          <a
            href={downloadUrl(deck.id)}
            download
            className="flex-1 text-center text-sm py-1.5 px-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            ↓ Download JSON
          </a>
        )}
        {!showVisibility && !deck.is_free && (
          <span className="flex-1 text-center text-sm py-1.5 px-3 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
            Premium — access required
          </span>
        )}

        {/* Admin view */}
        {showVisibility && (
          <>
            <button
              onClick={() => onEdit?.(deck.id)}
              className="text-sm py-1.5 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onToggleVisibility?.(deck.id, deck.is_public ?? true)}
              className="text-sm py-1.5 px-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {deck.is_public ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => onToggleFree?.(deck.id, deck.is_free)}
              className={`text-sm py-1.5 px-3 rounded-lg transition-colors ${
                deck.is_free
                  ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "border border-teal-200 text-teal-700 hover:bg-teal-50"
              }`}
            >
              {deck.is_free ? "→ Premium" : "→ Free"}
            </button>
            <button
              onClick={() => onDelete?.(deck.id)}
              className="text-sm py-1.5 px-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
