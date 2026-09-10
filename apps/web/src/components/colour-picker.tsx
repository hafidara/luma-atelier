import { Product } from "@/lib/types";

export function ColourPicker({
  colours,
  selected,
  onChange,
  disabled = false,
}: {
  colours: Product["colours"];
  selected: string;
  onChange: (colour: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="colour-options" role="group" aria-label="Lamp colour">
      {colours.map((colour) => (
        <button
          key={colour.name}
          type="button"
          className="colour-option"
          aria-label={colour.label || colour.name}
          aria-pressed={selected === colour.name}
          disabled={disabled}
          onClick={() => onChange(colour.name)}
        >
          <span style={{ backgroundColor: colour.hex }} />
          <span className="sr-only">{colour.label || colour.name}</span>
        </button>
      ))}
    </div>
  );
}
