'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ReactNode, useRef, useEffect, ButtonHTMLAttributes } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Inbox, ShieldAlert, LoaderCircle } from 'lucide-react';
import { Person } from '@/domain/models';
import { money } from '@/lib/format';
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button {...props} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'blue';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Avatar({ person, small = false }: { person: Person; small?: boolean }) {
  return (
    <span className={`avatar avatar-${person.color} ${small ? 'avatar-small' : ''}`}>
      {person.photo ? (
        <Image
          src={person.photo}
          alt={`${person.name} এর ছবি`}
          width={96}
          height={96}
          unoptimized
        />
      ) : (
        person.initials
      )}
    </span>
  );
}
export function PersonCell({ person, subtitle }: { person: Person; subtitle?: string }) {
  return (
    <div className="person-cell">
      <Avatar person={person} />
      <div>
        <strong>{person.name}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );
}
export function Balance({ value }: { value: number }) {
  return (
    <span className={`balance ${value < 0 ? 'negative' : 'positive'}`}>
      {value < 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}{' '}
      {money(Math.abs(value))}
      <small>{value < 0 ? 'দিতে হবে' : value > 0 ? 'ফেরত পাবেন' : 'সমান'}</small>
    </span>
  );
}
export function Empty({
  title = 'এখনও কোনো রেকর্ড নেই',
  description = 'নতুন রেকর্ড যোগ করলে এখানে দেখা যাবে।',
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={25} className="spin" /> হিসাব প্রস্তুত হচ্ছে…
    </div>
  );
}
export function Denied({
  message = 'এই পরিচয়ে নির্বাচিত মাসের পাতাটি দেখার অনুমতি নেই।',
}: {
  message?: string;
}) {
  return (
    <Card>
      <div className="empty">
        <ShieldAlert size={38} />
        <h2>অ্যাক্সেসের অনুমতি নেই</h2>
        <p>{message}</p>
        <p>ডেমো প্যানেল থেকে এই মাসের সঠিক ম্যানেজার বা পরিচয় নির্বাচন করুন।</p>
        <Link className="btn btn-primary" href="/">
          ড্যাশবোর্ডে ফিরুন
        </Link>
      </div>
    </Card>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className="modal"
    >
      <div className="modal-head">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-btn" aria-label="বন্ধ করুন" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Alert({
  children,
  tone = 'warning',
}: {
  children: ReactNode;
  tone?: 'warning' | 'danger' | 'success';
}) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
