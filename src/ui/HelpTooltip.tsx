import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { useUiLanguage, type FieldHelpContent } from "./i18n.js";

interface HelpTooltipProps {
  readonly content: FieldHelpContent;
  readonly fieldLabel: string;
  readonly descriptionId: string;
}

/**
 * Reusable, keyboard-accessible help used by every calculator input.
 * The permanently available screen-reader copy is deliberately separate from
 * the visual popup so an input never loses its description while the popup is
 * closed.
 */
export function HelpTooltip({ content, fieldLabel, descriptionId }: HelpTooltipProps) {
  const { text } = useUiLanguage();
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  function closeWhenFocusLeaves(event: FocusEvent<HTMLSpanElement>): void {
    if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false);
  }

  function closeOnEscape(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setOpen(false);
    event.currentTarget.blur();
  }

  function keepOpen(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setOpen(true);
  }

  const completeDescription = `${content.what} ${content.how} ${content.impact}`;

  return (
    <span
      className={open ? "help-tooltip is-open" : "help-tooltip"}
      onBlur={closeWhenFocusLeaves}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={rootRef}
    >
      <span className="sr-only" id={descriptionId}>{completeDescription}</span>
      <button
        aria-controls={tooltipId}
        aria-expanded={open}
        aria-label={text(`查看“${fieldLabel}”的填写说明`, `Show help for “${fieldLabel}”`)}
        className="help-tooltip__button"
        onClick={keepOpen}
        onFocus={() => setOpen(true)}
        onKeyDown={closeOnEscape}
        type="button"
      >
        <span aria-hidden="true">?</span>
      </button>
      <span className="help-tooltip__popup" hidden={!open} id={tooltipId} role="tooltip">
        <strong>{fieldLabel}</strong>
        <span><b>{text("这是什么：", "What it is: ")}</b>{content.what}</span>
        <span><b>{text("怎么填写：", "How to provide it: ")}</b>{content.how}</span>
        <span><b>{text("会影响什么：", "What it affects: ")}</b>{content.impact}</span>
      </span>
    </span>
  );
}
