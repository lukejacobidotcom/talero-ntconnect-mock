// td-chat.jsx — global floating chat / ticket launcher. Exposes window.TDChat.ChatWidget
(function () {
  const { useState, useRef, useEffect } = React;
  const { Icon } = window.TDShell;
  const { Badge } = window.TDUI;

  const SEED = [
    { from: 'them', text: 'Hi Jordan 👋 I’m here to help with funding, verification, or anything on your account. What can I do for you?' },
  ];
  const TOPICS = ['Funding & withdrawals', 'Identity / KYC', 'Market data', 'Platform access', 'Something else'];

  function ChatWidget() {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('chat');
    const [msgs, setMsgs] = useState(SEED);
    const [draft, setDraft] = useState('');
    const [typing, setTyping] = useState(false);
    const [unread, setUnread] = useState(1);
    const [ticket, setTicket] = useState({ topic: TOPICS[0], subject: '', body: '' });
    const [submitted, setSubmitted] = useState(null);
    const bodyRef = useRef(null);

    useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, typing, tab]);
    useEffect(() => { if (open) setUnread(0); }, [open]);

    const send = () => {
      const text = draft.trim();
      if (!text) return;
      setMsgs((m) => [...m, { from: 'me', text }]);
      setDraft('');
      setTyping(true);
      setTimeout(() => {
        setMsgs((m) => [...m, { from: 'them', text: 'Thanks — a specialist is reviewing this now. Typical reply time is under a minute during market hours.' }]);
        setTyping(false);
      }, 1300);
    };

    const submitTicket = (e) => {
      e.preventDefault();
      if (!ticket.subject.trim()) return;
      const id = 'TAL-' + Math.floor(1000 + Math.random() * 9000);
      setSubmitted(id);
      setTicket({ topic: TOPICS[0], subject: '', body: '' });
    };

    return (
      <div className={'chatw' + (open ? ' open' : '')}>
        {open && (
          <div className="chatw-panel" role="dialog" aria-label="Talero support">
            <div className="chatw-head">
              <div className="chatw-head-l">
                <span className="chatw-avatar"><Icon name="messages" size={18} /></span>
                <div className="chatw-who">
                  <b>Talero Support</b>
                  <small><i className="live-dot" /> Online · replies in ~1 min</small>
                </div>
              </div>
              <button className="chatw-x" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={18} /></button>
            </div>

            <div className="chatw-tabs">
              <button className={'chatw-tab' + (tab === 'chat' ? ' on' : '')} onClick={() => setTab('chat')}><Icon name="messages" size={14} /> Live chat</button>
              <button className={'chatw-tab' + (tab === 'ticket' ? ' on' : '')} onClick={() => setTab('ticket')}><Icon name="fileText" size={14} /> Open a ticket</button>
            </div>

            {tab === 'chat' ? (
              <>
                <div className="chatw-body" ref={bodyRef}>
                  {msgs.map((m, i) => <div className={'chat-bubble ' + m.from} key={i}>{m.text}</div>)}
                  {typing && <div className="chat-bubble them typing"><i /><i /><i /></div>}
                </div>
                <form className="chatw-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <button type="submit" className="chatw-send" title="Send"><Icon name="send" size={16} /></button>
                </form>
              </>
            ) : (
              <div className="chatw-body chatw-ticket">
                {submitted ? (
                  <div className="chatw-success">
                    <span className="chatw-success-ic"><Icon name="check" size={22} /></span>
                    <b>Ticket {submitted} created</b>
                    <small>We’ve emailed you a confirmation. You can track replies right here in chat.</small>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSubmitted(null); setTab('chat'); }}>Back to chat</button>
                  </div>
                ) : (
                  <form onSubmit={submitTicket} className="chatw-form">
                    <label className="fld"><span className="fld-l">Topic</span>
                      <div className="fld-sel"><select value={ticket.topic} onChange={(e) => setTicket((t) => ({ ...t, topic: e.target.value }))}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select><span className="fld-chev"><Icon name="chevron" size={13} /></span></div>
                    </label>
                    <label className="fld"><span className="fld-l">Subject</span>
                      <input placeholder="Brief summary" value={ticket.subject} onChange={(e) => setTicket((t) => ({ ...t, subject: e.target.value }))} />
                    </label>
                    <label className="fld"><span className="fld-l">Details</span>
                      <textarea rows="4" placeholder="Tell us what’s going on…" value={ticket.body} onChange={(e) => setTicket((t) => ({ ...t, body: e.target.value }))} />
                    </label>
                    <button type="submit" className="btn btn-primary chatw-submit" disabled={!ticket.subject.trim()}>Submit ticket</button>
                    <p className="chatw-note">Avg first response under 4 hours. Urgent? Use live chat.</p>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <button className="chatw-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close support' : 'Open support'}>
          <span className="chatw-fab-ic">{open ? <Icon name="x" size={24} /> : <Icon name="messages" size={24} />}</span>
          {!open && unread > 0 && <span className="chatw-badge">{unread}</span>}
        </button>
      </div>
    );
  }

  window.TDChat = { ChatWidget };
})();
