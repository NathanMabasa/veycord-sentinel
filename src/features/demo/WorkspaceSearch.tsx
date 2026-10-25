import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CornerDownLeft, FileSearch, Search, X } from 'lucide-react';
import { demoEvents, type DemoEvent } from '../../data/demo';
import { pageInfo, type Page } from './navigation';

type Props = {
  open: boolean; onClose: () => void; onNavigate: (page: Page) => void;
  onEvent: (event: DemoEvent) => void; onToggleTheme: () => void;
  onToggleSidebar: () => void; theme: 'light' | 'dark'; collapsed: boolean;
};
type Result = { id: string; title: string; description: string; kind: 'Page' | 'Event' | 'Action' | 'Resource'; run: () => void };

export default function WorkspaceSearch(props: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { open } = props;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setQuery('');
      setActiveIndex(0);
      element.showModal();
      input.current?.focus();
    } else if (!open && element.open) element.close();
  }, [open]);

  const needle = query.trim().toLowerCase();
  // This is bounded local fixture search. Never send queries or private telemetry elsewhere.
  const matches = useMemo(() => {
    const pages: Result[] = (Object.keys(pageInfo) as Page[]).map(page => ({
      id: 'page-' + page, title: pageInfo[page].label, description: pageInfo[page].description,
      kind: 'Page', run: () => props.onNavigate(page),
    }));
    const events: Result[] = needle ? demoEvents.filter(event =>
      [event.event, event.host, event.source, event.id, event.user, event.srcIp].join(' ').toLowerCase().includes(needle),
    ).map(event => ({
      id: event.id, title: event.event, description: event.source + ' · ' + event.host,
      kind: 'Event', run: () => props.onEvent(event),
    })) : [];
    const actions: Result[] = [
      { id: 'theme', title: 'Switch to ' + (props.theme === 'light' ? 'dark' : 'light') + ' theme',
        description: 'Change the appearance of this workspace', kind: 'Action', run: props.onToggleTheme },
      { id: 'sidebar', title: props.collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        description: 'Adjust the desktop navigation width', kind: 'Action', run: props.onToggleSidebar },
      { id: 'docs', title: 'Documentation', description: 'Setup and product guidance', kind: 'Resource', run: () => navigate('/docs') },
      { id: 'api', title: 'API reference', description: 'Inspect the synthetic API endpoints', kind: 'Resource', run: () => navigate('/docs/api') },
      { id: 'private', title: 'Private workspace', description: 'Connect your own PostgreSQL database', kind: 'Resource', run: () => navigate('/workspace') },
    ];
    return [...pages, ...events, ...actions].filter(item =>
      item.kind === 'Event' || !needle || (item.title + ' ' + item.description).toLowerCase().includes(needle),
    ).slice(0, 16);
  }, [needle, props.onNavigate, props.onEvent, props.onToggleTheme, props.onToggleSidebar, props.theme, props.collapsed, navigate]);
  const selected = matches[Math.min(activeIndex, Math.max(0, matches.length - 1))];

  useEffect(() => {
    if (open && selected) document.getElementById('command-' + selected.id)?.scrollIntoView({ block: 'nearest' });
  }, [open, selected?.id]);

  function choose(result: Result) {
    // Release native modal focus before the destination focuses its heading.
    dialog.current?.close();
    props.onClose();
    result.run();
  }

  return (
    <dialog ref={dialog} className="workspace-search-dialog" aria-labelledby="workspace-search-title"
      onCancel={event => { event.preventDefault(); props.onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) props.onClose();
      }}
    >
      <div className="workspace-search-heading">
        <h2 id="workspace-search-title">Search workspace</h2>
        <button className="icon-button" type="button" onClick={props.onClose} aria-label="Close workspace search"><X size={20} /></button>
      </div>
      <div className="workspace-search-input">
        <Search size={21} aria-hidden="true" />
        <label className="sr-only" htmlFor="workspace-command-query">Find a page, event or action</label>
        <input id="workspace-command-query" ref={input} value={query} maxLength={200} autoComplete="off"
          placeholder="Find a page, event or action…"
          role="combobox" aria-expanded={open && matches.length > 0} aria-controls="workspace-command-results"
          aria-autocomplete="list" aria-activedescendant={selected ? 'command-' + selected.id : undefined}
          aria-describedby="workspace-search-instructions"
          onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const direction = event.key === 'ArrowDown' ? 1 : -1;
              setActiveIndex(index => matches.length ? (index + direction + matches.length) % matches.length : 0);
            } else if (event.key === 'Enter' && selected) {
              event.preventDefault(); choose(selected);
            }
          }}
        />
      </div>
      <p className="workspace-search-caption" role="status">{needle ? matches.length + (matches.length === 1 ? ' result' : ' results') : 'Go to a page or run an action. Search to find sample events.'}</p>
      <ul id="workspace-command-results" role="listbox" aria-label="Workspace search results" className="workspace-search-results" hidden={!matches.length}>
        {matches.map((item, index) => (
          <li role="presentation" key={item.id}>
            <button id={'command-' + item.id} type="button" role="option" aria-selected={selected?.id === item.id}
              tabIndex={-1} onClick={() => choose(item)} onMouseEnter={() => setActiveIndex(index)}
              className={selected?.id === item.id ? 'is-selected' : ''}
            >
              <span className="command-result-icon" aria-hidden="true">{item.kind === 'Event' ? <FileSearch size={19} /> : <ArrowRight size={18} />}</span>
              <span className="command-result-copy"><b>{item.title}</b><small>{item.description}</small></span>
              <span className="command-result-kind">{item.kind}</span>
            </button>
          </li>
        ))}
      </ul>
      {!matches.length && <div className="workspace-search-empty"><b>No matching pages or events</b><p>Try a host, source, event name or a page such as Alerts.</p></div>}
      <div className="workspace-search-footer" id="workspace-search-instructions">
        <span>↑ ↓ Move</span><span><CornerDownLeft size={13} aria-hidden="true" /> Open</span><span>Esc Close</span>
        <small>Synthetic data only</small>
      </div>
    </dialog>
  );
}
