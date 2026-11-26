/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/ui.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Componentes reutilizables: botones, campos y secciones.
 */
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { useStore } from '../store/useStore';
import { fromUnit, parseExpression, toUnit, trimNum, UNIT_DECIMALS } from '../core/units';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Btn({ className, variant = 'default', size = 'md', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'accent'; size?: 'sm' | 'md' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none',
        size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm',
        variant === 'default' && 'bg-panel2 border border-line hover:bg-line/60 text-zinc-800',
        variant === 'primary' && 'bg-accent hover:bg-accent-hover text-white',
        variant === 'accent' && 'bg-amber-500 hover:bg-amber-400 text-zinc-900',
        variant === 'ghost' && 'hover:bg-line/60 text-zinc-700',
        variant === 'danger' && 'bg-red-600/20 border border-red-300 hover:bg-red-600/40 text-red-700',
        className,
      )}
    />
  );
}

export function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <div className="flex items-center justify-between px-3 py-2 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <span className="text-xs font-semibold text-zinc-800">{title}</span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {right}
          <span className="text-zinc-500 text-xs w-3 cursor-pointer" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'}</span>
        </div>
      </div>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid grid-cols-[1fr_1.15fr] items-center gap-2 text-xs" title={hint}>
      <span className="text-zinc-600 truncate">{label}</span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

export function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={cx('field w-full', className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="inline-flex items-center gap-2 text-xs text-zinc-700">
      <span className={cx('relative h-4 w-7 rounded-full transition-colors', value ? 'bg-accent' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all', value ? 'left-3.5' : 'left-0.5')} />
      </span>
      {label}
    </button>
  );
}

export function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="field w-full" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * Campo numérico. Si `length` es true el valor es mm y se muestra/edita en la unidad activa.
 * Acepta expresiones: 1220/2-18, 23 1/2, 3/4.
 */
export function NumberField({
  value, onChange, length = true, min, max, step, suffix, className, disabled,
}: {
  value: number; onChange: (v: number) => void; length?: boolean; min?: number; max?: number; step?: number; suffix?: string; className?: string; disabled?: boolean;
}) {
  const unit = useStore((s) => s.unit);
  const shown = length ? toUnit(value, unit) : value;
  const dec = length ? UNIT_DECIMALS[unit] : 2;
  const [text, setText] = useState(trimNum(shown, dec));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(trimNum(shown, dec));
  }, [shown, dec, focus]);

  const commit = (raw: string) => {
    const v = parseExpression(raw);
    if (v === null) {
      setText(trimNum(shown, dec));
      return;
    }
    let mm = length ? fromUnit(v, unit) : v;
    if (min !== undefined) mm = Math.max(min, mm);
    if (max !== undefined) mm = Math.min(max, mm);
    onChange(mm);
    setText(trimNum(length ? toUnit(mm, unit) : mm, dec));
  };
  const inc = (dir: number) => {
    const st = step ?? (length ? (unit === 'mm' ? 1 : unit === 'cm' ? 0.1 : 1 / 16) : 1);
    const v = (length ? toUnit(value, unit) : value) + dir * st;
    commit(String(v));
  };
  return (
    <div className={cx('relative flex items-center', className)}>
      <input
        disabled={disabled}
        className="field w-full pr-8 font-mono"
        value={text}
        onFocus={() => setFocus(true)}
        onBlur={(e) => {
          setFocus(false);
          commit(e.target.value);
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            inc(e.shiftKey ? 10 : 1);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            inc(e.shiftKey ? -10 : -1);
          }
        }}
      />
      <span className="pointer-events-none absolute right-2 text-[10px] text-zinc-500">{suffix ?? (length ? unit : '')}</span>
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: string; sub?: string; tone?: 'default' | 'good' | 'warn' }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className={cx('text-xl font-semibold font-mono', tone === 'good' && 'text-emerald-700', tone === 'warn' && 'text-amber-700', tone === 'default' && 'text-zinc-900')}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}
