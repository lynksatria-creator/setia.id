const labelFor = (key) => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/^./, (first) => first.toUpperCase());

function ValueEditor({ name, value, path, onChange }) {
  if (Array.isArray(value)) {
    return (
      <fieldset className="data-editor-collection">
        <legend>{labelFor(name)}</legend>
        {value.map((item, index) => (
          <div className="data-editor-array-item" key={`${path.join('.')}-${index}`}>
            <ValueEditor name={`Item ${index + 1}`} value={item} path={[...path, index]} onChange={onChange} />
            <button type="button" className="data-editor-remove" onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}>Hapus item</button>
          </div>
        ))}
        <button
          type="button"
          className="data-editor-add"
          onClick={() => {
            const sample = value[0];
            const next = sample && typeof sample === 'object' ? structuredClone(sample) : typeof sample === 'number' ? 0 : typeof sample === 'boolean' ? false : '';
            onChange(path, [...value, next]);
          }}
        >
          Tambah {labelFor(name).toLowerCase()}
        </button>
      </fieldset>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <fieldset className="data-editor-object">
        <legend>{labelFor(name)}</legend>
        <div className="data-editor-grid">
          {Object.entries(value).map(([key, nestedValue]) => (
            <ValueEditor key={key} name={key} value={nestedValue} path={[...path, key]} onChange={onChange} />
          ))}
        </div>
      </fieldset>
    );
  }

  const id = `data-editor-${path.map(String).join('-')}`;
  const longText = typeof value === 'string' && (value.length > 90 || /description|subtitle|message|quote|story|address|instructions|footer|about|^a$|^text$/i.test(name));
  const rangeSettings = {
    fontScale: { min: 0.75, max: 1.4, step: 0.05 },
    logoSize: { min: 24, max: 100, step: 1 },
    heroHeight: { min: 240, max: 760, step: 10 },
    radius: { min: 0, max: 40, step: 1 },
  }[name];
  return (
    <label className="data-editor-field" htmlFor={id}>
      {labelFor(name)}
      {typeof value === 'boolean' ? (
        <input id={id} type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
      ) : typeof value === 'number' && rangeSettings ? (
        <span className="data-editor-range">
          <input id={id} type="range" min={rangeSettings.min} max={rangeSettings.max} step={rangeSettings.step} value={value} onChange={(event) => onChange(path, Number(event.target.value))} />
          <output htmlFor={id}>{name === 'fontScale' ? `${Math.round(value * 100)}%` : name === 'radius' ? `${value}px` : `${value}px`}</output>
        </span>
      ) : typeof value === 'number' ? (
        <input id={id} type="number" value={value} onChange={(event) => onChange(path, Number(event.target.value))} />
      ) : typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? (
        <span className="data-editor-color"><input type="color" aria-label={`${labelFor(name)} color`} value={value} onChange={(event) => onChange(path, event.target.value)} /><input id={id} value={value} onChange={(event) => onChange(path, event.target.value)} /></span>
      ) : longText ? (
        <textarea id={id} rows={3} value={value ?? ''} onChange={(event) => onChange(path, event.target.value)} />
      ) : (
        <input id={id} value={value ?? ''} onChange={(event) => onChange(path, event.target.value)} />
      )}
    </label>
  );
}

export default function StructuredEditor({ data, onChange }) {
  return (
    <div className="data-editor">
      {Object.entries(data).map(([key, value]) => (
        <ValueEditor key={key} name={key} value={value} path={[key]} onChange={onChange} />
      ))}
    </div>
  );
}
