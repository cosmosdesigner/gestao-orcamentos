import * as React from "react";
import { X } from "lucide-react";

interface Tag {
  readonly id: string;
  readonly name: string;
}

interface TagInputProps {
  readonly tags: Tag[];
  readonly suggestions: Tag[];
  readonly onAdd: (name: string) => void;
  readonly onRemove: (id: string) => void;
  readonly placeholder?: string;
}

export function TagInput({ tags, suggestions, onAdd, onRemove, placeholder = "Escrever categoria..." }: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => s.name.toLowerCase().includes(inputValue.toLowerCase()) && !tags.some((t) => t.id === s.id),
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const value = inputValue.trim();
      if (!value) return;

      const existing = suggestions.find((s) => s.name.toLowerCase() === value.toLowerCase());
      if (existing && !tags.some((t) => t.id === existing.id)) {
        onAdd(existing.name);
      } else if (!existing) {
        onAdd(value);
      }
      setInputValue("");
      setShowSuggestions(false);
    }

    if (event.key === "Backspace" && !inputValue && tags.length) {
      onRemove(tags[tags.length - 1].id);
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none transition-colors focus-within:ring-2 focus-within:ring-ring">
        {tags.map((tag) => (
          <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {tag.name}
            <button type="button" onClick={() => onRemove(tag.id)} className="inline-flex hover:text-primary/70" aria-label={`Remover ${tag.name}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(event) => { setInputValue(event.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={tags.length ? "" : placeholder}
          className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showSuggestions && filteredSuggestions.length ? (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(event) => { event.preventDefault(); onAdd(suggestion.name); setInputValue(""); setShowSuggestions(false); }}
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
