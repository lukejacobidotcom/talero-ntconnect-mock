// ba-ui.jsx — shared back-office primitives. Exposes window.BAUI.
(function () {
  const { useState, useMemo } = React;
  const { Icon } = window.BAShell;

  /* ---------- page intro ---------- */
  function PageIntro({ icon, eyebrow, title, sub, right }) {
    return (
      <div className="pagehead">
        <div className="pagehead-l">
          {icon && <div className="ph-icon"><Icon name={icon} size={21} /></div>}
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1 className="ph-title">{title}</h1>
            {sub && <p className="ph-sub">{sub}</p>}
          </div>
        </div>
        {right && <div className="pagehead-r">{right}</div>}
      </div>
    );
  }

  /* ---------- card ---------- */
  function Card({ className = '', children, flush, ...rest }) {
    return <section className={'card ' + (flush ? 'flush ' : '') + className} {...rest}>{children}</section>;
  }
  function CardHead({ eyebrow, title, sub, right }) {
    return (
      <div className="card-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && <h3 className="card-title">{title}</h3>}
          {sub && <p className="card-sub">{sub}</p>}
        </div>
        {right && <div className="card-head-right">{right}</div>}
      </div>
    );
  }

  /* ---------- badge / tile ---------- */
  function Badge({ tone = 'neutral', children, dot }) {
    return <span className={'badge badge-' + tone}>{dot && <i className="badge-dot" />}{children}</span>;
  }
  function IconTile({ name, tone = 'accent', size = 18 }) {
    return <span className={'icontile tile-' + tone}><Icon name={name} size={size} /></span>;
  }

  // shared status → tone maps
  const TONES = {
    // account states
    'Active': 'pos', 'Restricted': 'warn', 'Liquidation Only': 'neg', 'Suspended': 'neg', 'Enabled': 'pos', 'Disabled': 'neutral',
    // applications
    'Application Started': 'neutral', 'KYC Pending': 'info', 'Agreements Pending': 'info', 'Awaiting Funding': 'warn', 'Rejected': 'neg',
    // kyc
    'Verified': 'pos', 'Approved': 'pos', 'Pending Review': 'info', 'Action Required': 'warn', 'Not Started': 'neutral',
    // transfers
    'Completed': 'pos', 'Processing': 'info', 'Pending': 'info', 'Pending Review': 'warn', 'Failed': 'neg', 'Cancelled': 'neutral',
    // transactions
    'Processed': 'pos', 'Refunded': 'neutral', 'Disputed': 'warn',
    // review
    'Reviewed': 'pos', 'Cleared': 'pos', 'Escalated': 'warn', 'Open': 'warn', 'Action Taken': 'info',
    // generic
    'Paused': 'neutral', 'Draft': 'neutral', 'Scheduled': 'info', 'Upcoming': 'info', 'Ended': 'neutral', 'Inactive': 'neutral', 'Halted': 'neg',
    'Yes': 'pos', 'No': 'neutral',
    // risk controls / market data / AOP
    'MDA Required': 'warn', 'Documents Required': 'warn', 'Signed': 'pos', 'Required': 'warn', 'Live': 'pos', 'Halt Active': 'neg',
  };
  function StatusPill({ value }) {
    const tone = TONES[value] || 'neutral';
    return <span className={'badge badge-' + tone}><i className="badge-dot" />{value}</span>;
  }

  /* ---------- KPI ---------- */
  function Kpi({ label, value, sub, tone, icon, iconTone, onClick }) {
    return (
      <div className={'kpi' + (onClick ? ' clickable' : '')} onClick={onClick}>
        <div className="kpi-top">
          <span className="kpi-label">{label}</span>
          {icon && <IconTile name={icon} tone={iconTone || 'accent'} size={15} />}
        </div>
        <div className={'kpi-value ' + (tone || '')}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    );
  }

  /* ---------- search input ---------- */
  function SearchInput({ value, onChange, placeholder }) {
    return (
      <label className="filter-search">
        <Icon name="search" size={15} />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Search…'} />
        {value && <button className="modal-x iconbtn-sm" style={{ border: 0 }} onClick={() => onChange('')}><Icon name="x" size={13} /></button>}
      </label>
    );
  }

  /* ---------- toggle pill ---------- */
  function TogglePill({ on, onChange, children }) {
    return (
      <button className={'toggle-pill' + (on ? ' on' : '')} onClick={() => onChange(!on)}>
        <span className="toggle-sw" /><span>{children}</span>
      </button>
    );
  }

  /* ---------- select filter (reuses .sel) ---------- */
  function Sel({ value, options, onChange, icon }) {
    return (
      <label className="sel">
        {icon && <span className="sel-ico"><Icon name={icon} size={15} /></span>}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <span className="sel-chev"><Icon name="chevron" size={13} /></span>
      </label>
    );
  }

  /* ---------- sub-tabs ---------- */
  function SubTabs({ value, tabs, onChange }) {
    return (
      <div className="subtabs">
        {tabs.map((t) => (
          <button key={t.v} className={'subtab' + (value === t.v ? ' on' : '')} onClick={() => onChange(t.v)}>{t.l}</button>
        ))}
      </div>
    );
  }

  /* ---------- DataTable ----------
     columns: [{ key, label, num?, sortable?(default true), render?(row)=>node, width? }]
     rows: array of objects
     opts: search (string), searchKeys, onRowClick, pageSize, foot (extra node), initialSort
  */
  function DataTable({ columns, rows, search = '', searchKeys, onRowClick, pageSize = 10, dense, emptyTitle = 'No results', emptyText }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
      if (!search) return rows;
      const keys = searchKeys || columns.map((c) => c.key);
      const q = search.toLowerCase();
      return rows.filter((r) => keys.some((k) => String(r[k] == null ? '' : r[k]).toLowerCase().includes(q)));
    }, [rows, search, searchKeys, columns]);

    const sorted = useMemo(() => {
      if (!sortKey) return filtered;
      const arr = [...filtered];
      arr.sort((a, b) => {
        let x = a[sortKey], y = b[sortKey];
        if (typeof x === 'number' && typeof y === 'number') return sortDir === 'asc' ? x - y : y - x;
        x = String(x == null ? '' : x).toLowerCase(); y = String(y == null ? '' : y).toLowerCase();
        return sortDir === 'asc' ? x.localeCompare(y) : y.localeCompare(x);
      });
      return arr;
    }, [filtered, sortKey, sortDir]);

    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const curPage = Math.min(page, pages - 1);
    const view = sorted.slice(curPage * pageSize, curPage * pageSize + pageSize);

    const clickSort = (c) => {
      if (c.sortable === false) return;
      if (sortKey === c.key) { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); }
      else { setSortKey(c.key); setSortDir('asc'); }
    };

    return (
      <div>
        <div className="dt-wrap scroll">
          <table className="dt">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={(c.num ? 'num ' : '') + (c.sortable === false ? 'no-sort' : '')}
                    style={c.width ? { width: c.width } : undefined} onClick={() => clickSort(c)}>
                    <span className="th-in">{c.label}
                      {c.sortable !== false && sortKey === c.key &&
                        <span className="th-sort"><Icon name={sortDir === 'asc' ? 'sortUp' : 'sortDown'} size={13} /></span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan={columns.length}>
                  <div className="empty"><span className="empty-ic"><Icon name="search" size={22} /></span><b>{emptyTitle}</b>{emptyText && <small>{emptyText}</small>}</div>
                </td></tr>
              )}
              {view.map((r, i) => (
                <tr key={r.id || i} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.num ? 'num' : ''} style={dense ? { padding: '9px 14px' } : undefined}>
                      {c.render ? c.render(r) : (r[c.key] == null ? '—' : r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dt-foot">
          <span className="dt-count">{sorted.length} {sorted.length === 1 ? 'record' : 'records'}{search ? ' · filtered' : ''}</span>
          {pages > 1 && (
            <div className="pager">
              <button className="iconbtn iconbtn-sm" disabled={curPage === 0} onClick={() => setPage(curPage - 1)} title="Previous"><span style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon name="arrowRight" size={14} /></span></button>
              <span className="pg-num">Page {curPage + 1} / {pages}</span>
              <button className="iconbtn iconbtn-sm" disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)}><Icon name="arrowRight" size={14} /></button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- modal ---------- */
  function Modal({ title, eyebrow, onClose, children, footer, wide }) {
    return ReactDOM.createPortal(
      <div className="modal-scrim" onClick={onClose}>
        <div className={'modal-card' + (wide ? ' wide' : '')} onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<b>{title}</b></div>
            <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="x" size={17} /></button>
          </div>
          <div className="modal-body scroll">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      </div>, document.body);
  }

  /* ---------- empty / note ---------- */
  function Empty({ icon = 'doc', title, children, action, onAction }) {
    return (
      <div className="empty">
        <span className="empty-ic"><Icon name={icon} size={24} /></span>
        {title && <b>{title}</b>}
        {children && <small>{children}</small>}
        {action && <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={onAction}>{action}</button>}
      </div>
    );
  }
  function Note({ tone = 'info', icon, title, children }) {
    return (
      <div className={'note note-' + tone}>
        <span className="note-ic"><Icon name={icon || (tone === 'warn' ? 'alert' : 'info')} size={18} /></span>
        <div><b>{title}</b>{children && <p>{children}</p>}</div>
      </div>
    );
  }

  /* ---------- form field ---------- */
  function Field({ label, hint, children }) {
    return <div className="field"><label>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>;
  }

  /* ---------- definition rows ---------- */
  function DefRows({ rows }) {
    return <dl style={{ margin: 0 }}>{rows.map((r, i) => (
      <div className="drow" key={i}><dt>{r.l}</dt><dd>{r.v}</dd></div>
    ))}</dl>;
  }

  window.BAUI = { PageIntro, Card, CardHead, Badge, IconTile, StatusPill, TONES, Kpi, SearchInput, TogglePill, Sel, SubTabs, DataTable, Modal, Empty, Note, Field, DefRows };
})();
