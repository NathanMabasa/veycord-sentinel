import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, BookOpen, Check, ChevronDown, Database, FileSearch, Github,
  HardDrive, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Search,
  Settings2, ShieldAlert, X,
} from 'lucide-react';
import Brand from '../../components/Brand';
import { appConfig } from '../../config';
import { demoHref, navigationGroups, pageInfo, type Page } from './navigation';

const icons = {
  Overview: LayoutDashboard, Explore: Search, Alerts: Bell, Cases: FileSearch,
  Guide: BookOpen, Detections: ShieldAlert, Sources: HardDrive, Settings: Settings2,
};

type Props = {
  page: Page; workspace: string; collapsed: boolean; mobileOpen: boolean; searchOpen: boolean;
  alertCount: number; caseCount: number; sidebarRef: RefObject<HTMLElement | null>;
  onToggleCollapse: () => void; onClose: () => void; onNavigate: () => void;
};

export default function ConsoleSidebar(props: Props) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [hint, setHint] = useState<{ label: string; top: number; left: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const workspaceTrigger = useRef<HTMLButtonElement>(null);
  const collapsed = props.collapsed && !props.mobileOpen;

  useEffect(() => {
    if (!workspaceOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !workspaceRef.current?.contains(event.target)) setWorkspaceOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setWorkspaceOpen(false);
      workspaceTrigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [workspaceOpen]);

  useEffect(() => {
    setWorkspaceOpen(false);
    setHint(null);
  }, [props.collapsed, props.mobileOpen, props.page, props.searchOpen]);

  function showHint(element: HTMLElement, label: string) {
    if (!collapsed || window.innerWidth <= 760) return;
    const rect = element.getBoundingClientRect();
    setHint({ label, top: Math.min(rect.top + rect.height / 2, window.innerHeight - 30), left: rect.right + 12 });
  }

  function navigate() {
    setWorkspaceOpen(false);
    setHint(null);
    props.onNavigate();
  }

  return (
    <aside id="workspace-navigation" ref={props.sidebarRef}
      className={'sidebar' + (props.mobileOpen ? ' sidebar-open' : '')}
      role={props.mobileOpen ? 'dialog' : undefined} aria-modal={props.mobileOpen || undefined}
      aria-label="Workspace navigation" onMouseLeave={() => setHint(null)}
    >
      <div className="sidebar-top">
        <Brand />
        <button className="icon-button sidebar-collapse" type="button"
          aria-label={props.collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={(props.collapsed ? 'Expand sidebar' : 'Collapse sidebar') + ' (Ctrl / ⌘ B)'}
          aria-keyshortcuts="Control+B Meta+B"
          aria-expanded={!props.collapsed} aria-controls="sidebar-sections"
          onClick={props.onToggleCollapse}
          onMouseEnter={event => showHint(event.currentTarget, props.collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          onFocus={event => showHint(event.currentTarget, props.collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          onBlur={() => setHint(null)}
        >{props.collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        <button className="icon-button close-nav" type="button" onClick={props.onClose} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>
      <div className="workspace-picker" ref={workspaceRef}
        onBlur={event => {
          if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setWorkspaceOpen(false);
        }}
      >
        <button className="workspace-switch" type="button" ref={workspaceTrigger}
          onClick={() => { setHint(null); setWorkspaceOpen(value => !value); }}
          aria-expanded={workspaceOpen} aria-controls="workspace-options"
          aria-label={collapsed ? props.workspace + ' Synthetic demo, switch workspace' : undefined}
          aria-description="Switch between the demo and private workspaces"
          onMouseEnter={event => showHint(event.currentTarget, 'Switch workspace')}
          onFocus={event => showHint(event.currentTarget, 'Switch workspace')}
          onBlur={() => setHint(null)}
        >
          <span className="workspace-avatar" aria-hidden="true"><LayoutDashboard size={18} /></span>
          <span className="workspace-copy"><b>{props.workspace}</b>{' '}<small>Synthetic demo</small></span>
          <ChevronDown size={16} className="workspace-chevron" aria-hidden="true" />
        </button>
        {workspaceOpen && (
          <div id="workspace-options" className="workspace-options" role="region" aria-label="Choose workspace">
            <p>Choose workspace</p>
            <Link to="/demo" onClick={navigate} aria-current="true">
              <LayoutDashboard size={19} aria-hidden="true" />
              <span><b>Demo workspace</b><small>Practice with synthetic events</small></span>
              <Check size={16} aria-hidden="true" />
            </Link>
            <Link to="/workspace" onClick={navigate}>
              <Database size={19} aria-hidden="true" />
              <span><b>Private workspace</b><small>Connect your own PostgreSQL</small></span>
            </Link>
            <Link className="workspace-setup-link" to="/docs" onClick={navigate}>Read the setup guide</Link>
          </div>
        )}
      </div>
      <nav className="side-nav" id="sidebar-sections" aria-label="Product navigation" onScroll={() => setHint(null)}>
        {navigationGroups.map(group => (
          <div className="nav-group" key={group.label}>
            <h2>{group.label}</h2>
            <ul>
              {group.pages.map(page => {
                const Icon = icons[page];
                const count = page === 'Alerts' ? props.alertCount : page === 'Cases' ? props.caseCount : 0;
                const description = page === 'Alerts' ? count + ' unresolved alerts' : count + (count === 1 ? ' open case' : ' open cases');
                const label = pageInfo[page].label;
                return (
                  <li key={page}>
                    <Link to={demoHref(page)} className={props.page === page ? 'active' : ''}
                      aria-current={props.page === page ? 'page' : undefined}
                      aria-label={collapsed ? label + (count > 0 ? ' ' + description : '') : undefined} onClick={navigate}
                      onMouseEnter={event => showHint(event.currentTarget, label + (count ? ' (' + description + ')' : ''))}
                      onFocus={event => showHint(event.currentTarget, label + (count ? ' (' + description + ')' : ''))}
                      onBlur={() => setHint(null)}
                    >
                      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                      <span className="nav-item-label">{label}</span>{' '}
                      {count > 0 && <span className="nav-count">{count}<span className="sr-only">{page === 'Alerts' ? ' unresolved alerts' : count === 1 ? ' open case' : ' open cases'}</span></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Link className="sidebar-resource" to="/docs" onClick={navigate}
          aria-label="Documentation"
          onMouseEnter={event => showHint(event.currentTarget, 'Documentation')}
          onFocus={event => showHint(event.currentTarget, 'Documentation')} onBlur={() => setHint(null)}
        ><BookOpen size={19} aria-hidden="true" /><span>Documentation</span></Link>
        <a className="sidebar-resource" href={appConfig.githubUrl || '/community'} target="_blank" rel="noreferrer"
          aria-label="GitHub project (opens in a new tab)"
          onMouseEnter={event => showHint(event.currentTarget, 'GitHub project (new tab)')}
          onFocus={event => showHint(event.currentTarget, 'GitHub project (new tab)')} onBlur={() => setHint(null)}
        ><Github size={19} aria-hidden="true" /><span>GitHub project</span></a>
      </div>
      {hint && <div className="sidebar-tooltip" role="tooltip" style={{ top: hint.top, left: hint.left }}>{hint.label}</div>}
    </aside>
  );
}
