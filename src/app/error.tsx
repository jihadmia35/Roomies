'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card empty">
      <h2>পাতাটি লোড করতে সমস্যা হয়েছে</h2>
      <p>আবার চেষ্টা করুন। ডেমো রিসেট করেও নতুন করে শুরু করতে পারেন।</p>
      <button className="btn btn-primary" onClick={reset}>
        আবার চেষ্টা
      </button>
    </div>
  );
}
