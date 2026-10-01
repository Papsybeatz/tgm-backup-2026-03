import React, { useState, useMemo } from 'react';
import styles from './AdminLogsViewer.module.css';
import { gmLogs, selfHealLogs } from '../data/logs';
import { exportToCSV } from '../utils/exportCSV';
import { useUser } from './UserContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

function filterLogs(logs, { search, startDate, endDate, dropdown, dropdownType }) {
  return logs.filter(log => {
    const text = JSON.stringify(log).toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (startDate && new Date(log.timestamp) < new Date(startDate)) return false;
    if (endDate && new Date(log.timestamp) > new Date(endDate)) return false;
    if (dropdown && dropdownType && log[dropdownType] && log[dropdownType] !== dropdown) return false;
    return true;
  });
}

export default function AdminLogsViewer() {
  const { user = null, ...userContextRest } = useUser() ?? {};
  const navigate = useNavigate();
  const [tab, setTab] = useState('gm');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dropdown, setDropdown] = useState('');
  const [page, setPage] = useState(1);

  if (!user) {
    return <div>Loading user data...</div>;
  }
  if (user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const logs = tab === 'gm' ? gmLogs : selfHealLogs;
  const dropdownType = tab === 'gm' ? 'eventType' : 'componentName';
  const dropdownOptions = useMemo(() => {
    const opts = new Set(logs.map(l => l[dropdownType]).filter(Boolean));
    return Array.from(opts);
  }, [logs, dropdownType]);
  const filtered = useMemo(() => filterLogs(logs, { search, startDate, endDate, dropdown, dropdownType }), [logs, search, startDate, endDate, dropdown, dropdownType]);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  return (
    <div className={styles.container}>
      <h1>System Logs</h1>
      <div className={styles.tabs}>
        <button className={tab === 'gm' ? styles.activeTab : ''} onClick={() => { setTab('gm'); setPage(1); }}>GM-LOG Events</button>
        <button className={tab === 'self' ? styles.activeTab : ''} onClick={() => { setTab('self'); setPage(1); }}>SELF-HEAL Logs</button>
      </div>
      <div className={styles.filters}>
        <input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
        <select value={dropdown} onChange={e => { setDropdown(e.target.value); setPage(1); }}>
          <option value="">All {tab === 'gm' ? 'Event Types' : 'Components'}</option>
          {dropdownOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <button onClick={() => exportToCSV(tab === 'gm' ? 'gm-logs.csv' : 'self-heal-logs.csv', filtered)}>Export CSV</button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>{tab === 'gm' ? 'Event Type' : 'Component Name'}</th>
              <th>{tab === 'gm' ? 'Payload' : 'Patch Summary'}</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((log, i) => (
              <tr key={i}>
                <td>{log.timestamp}</td>
                <td>{tab === 'gm' ? log.eventType : log.componentName}</td>
                <td style={{ maxWidth: 320, wordBreak: 'break-all' }}>{tab === 'gm' ? JSON.stringify(log.payload) : log.patchSummary}</td>
              </tr>
            ))}
            {paged.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>No logs found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
