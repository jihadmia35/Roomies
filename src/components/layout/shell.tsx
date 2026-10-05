'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PanelLeftClose,
  Menu,
  Search,
  ArrowUpRight,
  Building2,
  Leaf,
  ChevronRight,
  BookOpen,
  Command,
} from 'lucide-react';
import { useDemo } from '@/features/demo/provider';
import { DemoControls } from '@/features/demo/controls';
import { Avatar, Badge, Modal } from '@/components/ui';
import { managerNav, navFor, postNav, sharedNav } from './navigation';
import { monthLabel, roleLabel } from '@/lib/format';
import { ReactNode } from 'react';
export function AppShell({ children }: { children: ReactNode }) {
  const { session, context, switchContext } = useDemo();
  const path = usePathname().replace(/^\//, '');
  const mess = session?.mess;
  const person = mess?.people.find((p) => p.id === context.userId);
  const month = session?.months.find((m) => m.id === context.monthId);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [smallScreen, setSmallScreen] = useState(false);
  const sideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const title = navFor(month?.role).find((n) => n.path === path)?.label ?? 'বিস্তারিত হিসাব';
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setSmallScreen(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!mobile || !smallScreen) return;
    const nodes = Array.from(
      sideRef.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') ?? [],
    );
    nodes[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobile(false);
        menuRef.current?.focus();
      }
      if (e.key === 'Tab' && nodes.length) {
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobile, smallScreen]);
  const navigation = (items: typeof sharedNav) =>
    items.map((n) => (
      <Link
        href={`/${n.path}`}
        key={n.path}
        title={n.label}
        onClick={() => setMobile(false)}
        className={`nav-item ${path === n.path || (n.path === 'accounts' && path.startsWith('accounts/')) ? 'nav-active' : ''}`}
      >
        <n.icon size={19} />
        <span>{n.label}</span>
        {path === n.path && <span className="active-dot" />}
      </Link>
    ));
  return (
    <div className={`app ${collapsed ? 'app-collapsed' : ''}`}>
      <a className="skip-link" href="#main">
        মূল পাতায় যান
      </a>
      {mobile && (
        <button
          aria-label="মেনু বন্ধ করুন"
          className="mobile-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sideRef}
        inert={smallScreen && !mobile}
        role={smallScreen && mobile ? 'dialog' : 'complementary'}
        aria-modal={smallScreen && mobile ? true : undefined}
        aria-label="মূল নেভিগেশন"
        className={`sidebar ${mobile ? 'sidebar-mobile' : ''}`}
      >
        <Link href="/" className="brand">
          <span className="brand-mark">
            <BookOpen size={24} />
            <span className="brand-dot" />
          </span>
          <div>
            <strong>
              মেসখাতা<span>MessKhata</span>
            </strong>
            <small>একসাথে থাকার হিসাব</small>
          </div>
        </Link>
        <div className="sidebar-mess">
          <span className="mess-icon">
            <Building2 size={19} />
          </span>
          <div>
            <strong>{mess?.name ?? 'সুবর্ণ মেস'}</strong>
            <small>{mess?.address ?? 'ধানমন্ডি, ঢাকা'}</small>
          </div>
        </div>
        <div className="nav-scroll">
          <div className="nav-section-label">আপনার খাতা</div>
          {navigation(sharedNav)}
          {month?.role === 'MANAGER' && (
            <>
              <div className="nav-section-label">
                মেস পরিচালনা <Badge tone="success">ম্যানেজার</Badge>
              </div>
              {navigation(managerNav)}
            </>
          )}
          {month?.role === 'POST_MANAGER' && (
            <>
              <div className="nav-section-label">মাসের নিষ্পত্তি</div>
              {navigation(postNav)}
            </>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Leaf size={19} />
            <strong>পরিষ্কার হিসাব, নিশ্চিন্ত মেস।</strong>
            <p>
              প্রতিটি মিল ও টাকার হিসাব
              <br />
              থাকুক এক জায়গায়।
            </p>
          </div>
          <button
            className="collapse-btn"
            onClick={() => {
              if (mobile) setMobile(false);
              else setCollapsed(!collapsed);
            }}
          >
            <PanelLeftClose size={18} />
            <span>মেনু ছোট করুন</span>
            <span className="shortcut">[</span>
          </button>
          <div className="sidebar-version">
            MESSKHATA <span>DEMO v1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              ref={menuRef}
              className="icon-btn mobile-menu"
              aria-label="মেনু খুলুন"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">মেস পরিচালনা</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label="পাতা খুঁজুন"
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
              <span>খুঁজুন</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <label className="month-picker">
              <select
                aria-label="হিসাবের মাস"
                value={context.monthId}
                onChange={(e) => switchContext({ monthId: e.target.value })}
              >
                {session?.months.map((m) => (
                  <option key={m.id} value={m.id}>
                    {monthLabel(m.calendar)}
                  </option>
                ))}
              </select>
            </label>
            <div className="topbar-divider" />
            {person && (
              <Link href="/profile" className="user-context" aria-label="আমার প্রোফাইল খুলুন">
                <Avatar person={person} small />
                <div>
                  <strong>{person.name}</strong>
                  <small>{month?.role ? roleLabel[month.role] : 'অংশগ্রহণ নেই'}</small>
                </div>
              </Link>
            )}
          </div>
        </header>
        <div className="content">
          <DemoControls />
          <div className="mobile-context">
            <span>{mess?.name}</span>
            <span>
              {person?.name} · {month?.role ? roleLabel[month.role] : 'অংশগ্রহণ নেই'}
            </span>
          </div>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <footer className="footer">
            <span>মেসখাতা · একসাথে থাকার হিসাব</span>
            <span>সব সময় বাংলাদেশ সময় অনুযায়ী · BDT</span>
          </footer>
        </div>
      </div>
      {search && (
        <Modal title="আপনার পাতাটি খুঁজুন" onClose={() => setSearch(false)}>
          <div className="modal-body">
            <input
              autoFocus
              placeholder="যেমন: মিল, জমা, নিষ্পত্তি…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="পাতা খোঁজার শব্দ"
            />
            <div className="search-results">
              {navFor(month?.role)
                .filter((n) => n.label.includes(query))
                .map((n) => (
                  <Link
                    key={n.path}
                    href={`/${n.path}`}
                    onClick={() => {
                      setSearch(false);
                      setMobile(false);
                    }}
                  >
                    <n.icon size={20} />
                    {n.label}
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
