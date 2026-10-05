'use client';
import { useRef, useState, useEffect, FormEvent } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { MemberProfile } from '@/domain/models';
import { DEMO_PASSWORD, PHOTO_MAX_BYTES, validatePhoto, validatePassword } from '@/domain/profile';
import { useDemo, useMutation } from '@/features/demo/provider';
import { useProfile } from './hooks';
import {
  Avatar,
  Alert,
  Badge,
  Button,
  Card,
  Denied,
  Field,
  Loading,
  PageHeading,
} from '@/components/ui';
import { useConfirm } from '@/components/ui/confirmation';
import { roleLabel, timestamp } from '@/lib/format';
export function ProfileScreen() {
  const { data, loading, error } = useProfile();
  const { session, context } = useDemo();
  if (loading) return <Loading />;
  if (error) return <Denied message={error.message} />;
  if (!data) return null;
  const role = session?.months.find((m) => m.id === context.monthId)?.role;
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="আপনার ব্যক্তিগত পরিচয়"
        title="আমার প্রোফাইল"
        description="নিজের ছবি ও পাসওয়ার্ড এখান থেকেই পরিবর্তন করুন। সব মাসে একই প্রোফাইল থাকবে।"
      />
      <Card className="profile-summary">
        <div className="profile-avatar">
          <Avatar person={data.person} />
        </div>
        <div>
          <h2>{data.person.name}</h2>
          <p>
            {session?.mess.name ?? 'সুবর্ণ মেস'} · {session?.mess.address ?? 'ধানমন্ডি, ঢাকা'}
          </p>
          <Badge tone="success">
            <UserRound size={13} />
            {role ? roleLabel[role] : 'মেসের সদস্য'}
          </Badge>
        </div>
        <span className="profile-ownership">
          <ShieldCheck size={17} />
          শুধু আপনার প্রোফাইল
        </span>
      </Card>
      <div className="profile-layout" key={`${context.userId}:${data.revision}`}>
        <PhotoForm profile={data} />
        <PasswordForm profile={data} />
      </div>
      <Alert>
        এটি ডেমো প্রোফাইল। ছবি কোনো সার্ভারে আপলোড হয় না; পাসওয়ার্ড বদল বাস্তব কোনো অ্যাকাউন্টে
        প্রযোজ্য নয়। পাতা বদলালে পরিবর্তন থাকবে, ব্রাউজার রিলোড বা ডেমো রিসেটে ছবি ও পাসওয়ার্ড
        আগের অবস্থায় ফিরবে। অনুশীলনে বাস্তব পাসওয়ার্ড ব্যবহার করবেন না।
      </Alert>
    </div>
  );
}
function PhotoForm({ profile }: { profile: MemberProfile }) {
  const { repo, context, notify } = useDemo();
  const { run, pending, error } = useMutation();
  const ask = useConfirm();
  const [photo, setPhoto] = useState<string | null>(profile.person.photo ?? null);
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const query = { messId: context.messId, userId: context.userId, memberId: context.userId };
  const dirty = photo !== (profile.person.photo ?? null);
  useEffect(
    () => () => {
      readerRef.current?.abort();
    },
    [],
  );
  const selectFile = (file?: File) => {
    readerRef.current?.abort();
    setFileError('');
    setReading(false);
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > PHOTO_MAX_BYTES
    ) {
      setFileError('PNG, JPEG বা WebP ছবি বেছে নিন; আকার সর্বোচ্চ 2 MB।');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    setReading(true);
    reader.onload = () => {
      try {
        const result = String(reader.result);
        validatePhoto(result);
        setPhoto(result);
        setFileName(file.name);
      } catch (e) {
        setFileError(e instanceof Error ? e.message : 'ছবিটি পড়া যায়নি।');
      }
      setReading(false);
    };
    reader.onerror = () => {
      setFileError('ছবিটি পড়া যায়নি। অন্য ছবি বেছে নিন।');
      setReading(false);
    };
    reader.readAsDataURL(file);
  };
  return (
    <Card className="padded profile-card">
      <div className="profile-card-title">
        <Camera size={21} />
        <div>
          <h3>প্রোফাইলের ছবি</h3>
          <p className="muted">মেনু ও সদস্য তালিকায় এই ছবিটি দেখাবে।</p>
        </div>
      </div>
      <div className="photo-editor">
        <div className="profile-avatar profile-preview">
          <Avatar person={{ ...profile.person, photo: photo ?? undefined }} />
        </div>
        <div>
          <strong>{reading ? 'ছবি পড়া হচ্ছে…' : fileName || 'আপনার ছবি বেছে নিন'}</strong>
          <p className="muted small">PNG, JPEG বা WebP · সর্বোচ্চ 2 MB</p>
          <input
            className="photo-file-input"
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="প্রোফাইলের ছবি আপলোড"
            disabled={pending}
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            disabled={pending || reading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} />
            ছবি বেছে নিন
          </Button>
        </div>
      </div>
      <p className="muted small">
        আগে প্রিভিউ দেখে নিন, তারপর সংরক্ষণ করুন। ছবি না থাকলে নামের আদ্যক্ষর দেখাবে।
      </p>
      {(fileError || error) && (
        <Alert tone="danger">
          <span role="alert">{fileError || error}</span>
        </Alert>
      )}
      <div className="card-actions profile-photo-actions">
        <Button
          disabled={!dirty || pending || reading}
          onClick={() =>
            run(
              () => repo.updatePhoto(query, { expectedRevision: profile.revision, photo }),
              'প্রোফাইলের ছবি সংরক্ষিত হয়েছে।',
            )
          }
        >
          <Camera size={16} />
          {pending ? 'সংরক্ষণ হচ্ছে…' : 'ছবি সংরক্ষণ'}
        </Button>
        {photo && (
          <Button
            variant="ghost"
            disabled={pending || reading}
            onClick={async () => {
              if (!(await ask('প্রোফাইলের ছবিটি সরিয়ে নামের আদ্যক্ষর দেখাবেন?'))) return;
              if (profile.person.photo)
                await run(
                  () =>
                    repo.updatePhoto(query, { expectedRevision: profile.revision, photo: null }),
                  'প্রোফাইলের ছবি সরানো হয়েছে।',
                );
              else {
                setPhoto(null);
                setFileName('');
                notify('বাছাই করা ছবি সরানো হয়েছে।');
              }
            }}
          >
            <Trash2 size={16} />
            ছবি সরান
          </Button>
        )}
      </div>
    </Card>
  );
}
function PasswordForm({ profile }: { profile: MemberProfile }) {
  const { repo, context } = useDemo();
  const { run, pending, error } = useMutation();
  const [visible, setVisible] = useState(false);
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validation, setValidation] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidation('');
    try {
      validatePassword(values.currentPassword, values.newPassword, values.confirmPassword);
    } catch (e) {
      setValidation(e instanceof Error ? e.message : 'তথ্য পরীক্ষা করুন।');
      return;
    }
    const ok = await run(
      () =>
        repo.changePassword(
          { messId: context.messId, userId: context.userId, memberId: context.userId },
          { ...values, expectedRevision: profile.revision },
        ),
      'ডেমো পাসওয়ার্ড পরিবর্তিত হয়েছে। পরেরবার নতুন পাসওয়ার্ডটি ব্যবহার করুন।',
    );
    if (ok) {
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setVisible(false);
    }
  };
  return (
    <Card className="padded profile-card">
      <div className="profile-card-title">
        <LockKeyhole size={21} />
        <div>
          <h3>পাসওয়ার্ড পরিবর্তন</h3>
          <p className="muted">বর্তমান পাসওয়ার্ড দিয়ে পরিবর্তন নিশ্চিত করুন।</p>
        </div>
      </div>
      <div className="demo-password-hint">
        <Badge tone="warning">ডেমো</Badge>
        <span>
          শুরুর পাসওয়ার্ড: <code>{DEMO_PASSWORD}</code>
        </span>
      </div>
      <form onSubmit={submit} noValidate>
        {(
          [
            ['currentPassword', 'বর্তমান পাসওয়ার্ড', 'current-password'],
            ['newPassword', 'নতুন পাসওয়ার্ড', 'new-password'],
            ['confirmPassword', 'নতুন পাসওয়ার্ড নিশ্চিত করুন', 'new-password'],
          ] as const
        ).map(([key, label, autocomplete]) => (
          <Field key={key} label={label}>
            <input
              type={visible ? 'text' : 'password'}
              autoComplete={autocomplete}
              required
              maxLength={128}
              value={values[key]}
              disabled={pending}
              onChange={(e) => {
                setValues((old) => ({ ...old, [key]: e.target.value }));
                setValidation('');
              }}
            />
          </Field>
        ))}
        <div className="password-options">
          <span className="muted small">8–128 অক্ষর; বর্তমানটির থেকে আলাদা দিন।</span>
          <button
            type="button"
            className="password-visibility"
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
            {visible ? 'লুকান' : 'দেখুন'}
          </button>
        </div>
        {(validation || error) && (
          <Alert tone="danger">
            <span role="alert">{validation || error}</span>
          </Alert>
        )}
        {profile.passwordChangedAt && (
          <p className="muted small">শেষ পরিবর্তন: {timestamp(profile.passwordChangedAt)}</p>
        )}
        <div className="card-actions">
          <Button
            type="submit"
            disabled={
              pending || !values.currentPassword || !values.newPassword || !values.confirmPassword
            }
          >
            <LockKeyhole size={16} />
            {pending ? 'পরিবর্তন হচ্ছে…' : 'পাসওয়ার্ড পরিবর্তন করুন'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
