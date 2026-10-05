'use client';
import { useConfirm } from '@/components/ui/confirmation';
import { useState } from 'react';
import { Save, Plus, Trash2, Settings2 } from 'lucide-react';
import { MonthView } from '@/domain/models';
import { useDemo, useMutation } from '@/features/demo/provider';
import { Card, Button, Badge, PageHeading, Field, Alert } from '@/components/ui';
import { monthLabel } from '@/lib/format';
export function Settings({ view }: { view: MonthView }) {
  const [rules, setRules] = useState(structuredClone(view.rules));
  const ask = useConfirm();
  const { repo, context } = useDemo();
  const { run, pending, error } = useMutation();
  return (
    <>
      <PageHeading
        eyebrow={monthLabel(view.calendar)}
        title="মাসের নিয়ম"
        description="এই মাসের জন্য নিয়ম নির্ধারণ করুন। আগের বন্ধ মাসের নিয়ম বদলাবে না।"
      >
        <Badge tone="success">
          <Settings2 size={14} />
          চলমান মাস
        </Badge>
      </PageHeading>
      <div className="settings-layout">
        <Card className="padded">
          <h3>প্রতিদিনের মিল স্লট</h3>
          <p className="muted">একটি স্লটে 1 মিলের মান সব স্লটেই সমান। দশমিক মিলও লেখা যাবে।</p>
          <div className="slot-config">
            {rules.slots.map((s, i) => (
              <div key={s.id}>
                <span className="slot-number">{i + 1}</span>
                <Field label={`স্লট ${i + 1}-এর নাম`}>
                  <input
                    value={s.label}
                    onChange={(e) =>
                      setRules((old) => ({
                        ...old,
                        slots: old.slots.map((x) =>
                          x.id === s.id ? { ...x, label: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </Field>
                <button
                  className="icon-btn danger-icon"
                  aria-label={`${s.label} স্লট সরান`}
                  onClick={async () => {
                    if (!(await ask('স্লটটি সরাবেন? এতে খাওয়া মিল থাকলে সংরক্ষণ আটকে যাবে।')))
                      return;
                    setRules((old) => ({ ...old, slots: old.slots.filter((x) => x.id !== s.id) }));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={rules.slots.length >= 5}
            onClick={() =>
              setRules((old) => ({
                ...old,
                slots: [
                  ...old.slots,
                  { id: `slot-${crypto.randomUUID()}`, label: `মিল ${old.slots.length + 1}` },
                ],
              }))
            }
          >
            <Plus size={16} />
            নতুন স্লট
          </Button>
          <hr />
          <h3>ন্যূনতম মিল</h3>
          <label className="setting-toggle">
            <div>
              <strong>ন্যূনতম মিলের নিয়ম চালু</strong>
              <small>বাসায় থাকা ও বাবুর্চির অনুপস্থিতি বাদ দিয়ে</small>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={rules.minimumEnabled}
              onChange={(e) => setRules((old) => ({ ...old, minimumEnabled: e.target.checked }))}
            />
          </label>
          <Field
            label="ন্যূনতম শতাংশ (%)"
            hint="পুরো মাসের যোগ্য স্লটের এই অংশের পূর্ণ সংখ্যা ন্যূনতম মিল।"
          >
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              disabled={!rules.minimumEnabled}
              value={rules.minimumPercent}
              onChange={(e) =>
                setRules((old) => ({ ...old, minimumPercent: Number(e.target.value) }))
              }
            />
          </Field>
          <hr />
          <h3>ট্র্যাকিং ফিচার</h3>
          {(
            [
              {
                key: 'cookTracking',
                label: 'বাবুর্চির উপস্থিতি',
                hint: 'বন্ধ থাকলে সব স্লটে বাবুর্চি উপস্থিত ধরে নেওয়া হয়।',
              },
              {
                key: 'homeTracking',
                label: 'সদস্যের বাসায় থাকা',
                hint: 'বন্ধ থাকলে ন্যূনতম মিল থেকে বাসায় থাকার স্লট বাদ যায় না।',
              },
            ] as const
          ).map((t) => (
            <label className="setting-toggle" key={t.key}>
              <div>
                <strong>{t.label}</strong>
                <small>{t.hint}</small>
              </div>
              <input
                type="checkbox"
                role="switch"
                checked={rules[t.key]}
                onChange={(e) => setRules((old) => ({ ...old, [t.key]: e.target.checked }))}
              />
            </label>
          ))}
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="card-actions">
            <Button
              disabled={pending}
              onClick={() =>
                run(() => repo.updateSettings(context, { expectedRevision: view.revision, rules }))
              }
            >
              <Save size={16} />
              {pending ? 'সংরক্ষণ হচ্ছে…' : 'নিয়ম সংরক্ষণ'}
            </Button>
          </div>
        </Card>
        <div>
          <Card className="padded">
            <span className="eyebrow">সহজ করে বুঝুন</span>
            <h3>ন্যূনতম মিল কেন?</h3>
            <p>
              মেসে কিছু নির্দিষ্ট খরচ সবার জন্য হয়। নিয়ম চালু থাকলে খাওয়া মিল ও ন্যূনতম মিলের বড়
              সংখ্যাটি খাবারের বিলের ভিত্তি।
            </p>
            <div className="calculation-example">
              <div>
                30 দিন × 2 স্লট = <strong>60</strong>
              </div>
              <div>বাবুর্চি নেই 4, বাসায় 10, উভয় 2</div>
              <div>
                যোগ্য স্লট = 60 − (4 + 10 − 2) = <strong>48</strong>
              </div>
              <div>
                70% ন্যূনতম = floor(48 × 0.70) = <strong>33</strong>
              </div>
            </div>
            <p className="muted small">
              পাঁচ দিন বাসায় থাকলে দুই স্লটের মেসে 10 স্লট বাদ যাবে। ভগ্নাংশ বাদ যায় শুধু ন্যূনতম
              হিসাবে; প্রকৃত খাবারের দশমিক থাকে।
            </p>
          </Card>
          <Alert>
            নতুন স্লট যোগ করলে পুরো মাসের ওই স্লটের তথ্য পূরণ করতে হবে। পুরোনো মাসের হিসাব তার
            চূড়ান্ত নিয়মেই থাকবে।
          </Alert>
        </div>
      </div>
    </>
  );
}
