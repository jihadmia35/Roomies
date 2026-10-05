'use client';
import { useConfirm } from '@/components/ui/confirmation';
import { useState } from 'react';
import { FlaskConical, ChevronDown, RotateCcw } from 'lucide-react';
import { useDemo } from './provider';
import { monthLabel, roleLabel, statusLabel } from '@/lib/format';
import { Button } from '@/components/ui';
export function DemoControls() {
  const ask = useConfirm();
  const { context, session, switchContext, reset } = useDemo();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mess = session?.mess;
  return (
    <div className={`demo-panel ${open ? 'demo-expanded' : ''}`}>
      <button className="demo-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <FlaskConical size={15} />
        <strong>ডেমো পরিবেশ</strong>
        <span>সেপ্টেম্বর ২০২৬ · সব তথ্য অনুশীলনের জন্য</span>
        <span className="demo-toggle-end">
          পরিচয় / মাস বদলান <ChevronDown size={15} />
        </span>
      </button>
      {open && (
        <div className="demo-body">
          <div className="demo-fields">
            <label>
              পরিচয়
              <select
                aria-label="ডেমো পরিচয়"
                value={context.userId}
                onChange={(e) => switchContext({ userId: e.target.value })}
              >
                {mess?.people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              হিসাবের মাস
              <select
                aria-label="ডেমো মাস"
                value={context.monthId}
                onChange={(e) => switchContext({ monthId: e.target.value })}
              >
                {session?.months.map((m) => (
                  <option key={m.id} value={m.id}>
                    {monthLabel(m.calendar)} · {m.role ? roleLabel[m.role] : 'অংশগ্রহণ নেই'} ·{' '}
                    {statusLabel[m.status]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                if (!(await ask('সব ডেমো পরিবর্তন মুছে প্রাথমিক তথ্য ফিরিয়ে আনবেন?'))) return;
                setBusy(true);
                await reset();
                setBusy(false);
              }}
            >
              <RotateCcw size={15} />
              ডেমো রিসেট
            </Button>
          </div>
          <p>
            সুবর্ণ মেসের ডেমো। পাতা বদলালেও হিসাব, ছবি ও ডেমো পাসওয়ার্ড থাকবে; ব্রাউজার রিলোডে সব
            পরিবর্তন আবার শুরু হবে (পরিচয় ও মাস মনে রাখা হয়)। সেপ্টেম্বরে আরিফ / তানভীর ম্যানেজার,
            রাফি সদস্য। আগস্টে রাফি / সাকিব সাবেক ম্যানেজার। জুলাইয়ের নিষ্পত্তি সম্পন্ন।
          </p>
        </div>
      )}
    </div>
  );
}
