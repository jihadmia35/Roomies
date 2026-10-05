'use client';
import { useState } from 'react';
import { Users, Save } from 'lucide-react';
import { MonthView } from '@/domain/models';
import { useDemo, useMutation } from '@/features/demo/provider';
import { Card, Button, Badge, PageHeading, Avatar, Alert } from '@/components/ui';
import { monthLabel } from '@/lib/format';
import { monthDates } from '@/domain/dates';
export function Members({ view }: { view: MonthView }) {
  const { session, repo, context } = useDemo();
  const mess = session?.mess;
  const [participants, setParticipants] = useState(view.participants);
  const { run, pending, error } = useMutation();
  return (
    <>
      <PageHeading
        title="সদস্য ও মাসের অংশগ্রহণ"
        eyebrow={monthLabel(view.calendar)}
        description="প্রতি মাসের সদস্য তালিকা আলাদা। মাঝমাসে এলেও ন্যূনতম মিল পুরো মাস ধরে হিসাব হবে।"
      >
        <Badge tone="blue">
          <Users size={14} />
          {participants.length} জন নির্বাচিত
        </Badge>
      </PageHeading>
      <Card>
        <div className="card-heading">
          <div>
            <h3>এই মাসে যারা অংশ নেবেন</h3>
            <p>জমা বা খাওয়া মিল আছে এমন সদস্যকে সরানো যাবে না।</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>অংশগ্রহণ</th>
                <th>সদস্য</th>
                <th>যোগদানের তারিখ</th>
                <th>মাসের ভূমিকা</th>
              </tr>
            </thead>
            <tbody>
              {mess?.people.map((p) => {
                const participant = participants.find((x) => x.memberId === p.id);
                const manager = view.managers.some((m) => m.id === p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        aria-label={`${p.name} অংশগ্রহণ`}
                        type="checkbox"
                        checked={!!participant}
                        disabled={manager}
                        onChange={(e) =>
                          setParticipants((old) =>
                            e.target.checked
                              ? [...old, { memberId: p.id, joinedOn: `${view.calendar}-01` }]
                              : old.filter((x) => x.memberId !== p.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="person-cell">
                        <Avatar person={p} />
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>
                      {participant ? (
                        <input
                          aria-label={`${p.name} যোগদানের তারিখ`}
                          type="date"
                          min={`${view.calendar}-01`}
                          max={monthDates(view.calendar).at(-1)}
                          value={participant.joinedOn}
                          onChange={(e) =>
                            setParticipants((old) =>
                              old.map((x) =>
                                x.memberId === p.id ? { ...x, joinedOn: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        <span className="muted">অংশগ্রহণ নেই</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={manager ? 'success' : 'neutral'}>
                        {manager ? 'ম্যানেজার' : 'সদস্য'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-actions">
          <Button
            disabled={pending}
            onClick={() =>
              run(() =>
                repo.updateParticipants(context, { expectedRevision: view.revision, participants }),
              )
            }
          >
            <Save size={16} />
            {pending ? 'সংরক্ষণ হচ্ছে…' : 'অংশগ্রহণ সংরক্ষণ'}
          </Button>
        </div>
      </Card>
      {error && <Alert tone="danger">{error}</Alert>}
    </>
  );
}
