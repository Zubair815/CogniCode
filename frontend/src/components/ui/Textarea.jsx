/**
 * Textarea — multi-line field sharing Input's label/hint/error styling.
 */

import { forwardRef } from "react";
import { FieldLabel, FieldMessage, fieldClasses } from "./Input.jsx";

const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, className = "", rows = 4, ...rest },
  ref
) {
  const fieldId = id || rest.name;
  const messageId = error || hint ? `${fieldId}-message` : undefined;

  return (
    <div className="mb-4">
      {label && <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={fieldClasses({ error: !!error, className: `py-2.5 leading-relaxed resize-y min-h-[88px] ${className}` })}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        {...rest}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
});

export default Textarea;
