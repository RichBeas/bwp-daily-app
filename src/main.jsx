import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RefreshCw, Calendar, BriefcaseBusiness, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import './style.css';

const SOURCE_URL = 'https://bible.alpha.org/en/#todays-devotion';
const CLASSIC_DAY_URL = 'https://bible.alpha.org/en/classic/';

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getReadingUrl(date = new Date()) {
  return `${CLASSIC_DAY_URL}${dayOfYear(date)}`;
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent.replace(/\s+/g, ' ').trim();
}

function pickSentences(text, keywords, limit = 5) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const picked = [];
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.length < 40 || s.length > 280) continue;
    const lower = s.toLowerCase();
    if (keywords.some(k => lower.includes(k)) && !picked.includes(s)) picked.push(s);
    if (picked.length >= limit) break;
  }
  return picked;
}

function buildLocalSummary(text) {
  const titleMatch = text.match(/Day\s+\d+[:\-–]\s*([^|]{3,80})/i);
  const dayMatch = text.match(/Day\s+(\d+)/i);
  const title = titleMatch ? titleMatch[0].trim() : `Day ${dayOfYear()}`;
  const readingHints = pickSentences(text, ['psalm', 'proverbs', 'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'samuel', 'kings', 'chronicles', 'isaiah'], 3);
  const themes = pickSentences(text, ['god', 'jesus', 'spirit', 'pray', 'prayer', 'wisdom', 'love', 'lead', 'faith', 'hope', 'serve'], 6);

  const relevance = [
    'Leadership atmosphere: notice what people hear from leaders today: clarity, gratitude, courage, encouragement, or confusion.',
    'Communication: translate the same message for different audiences across clients, commercial teams, creative teams, operations, and partners.',
    'Decision-making: pause before repeating an old tactic; ask what this situation needs now.',
    'Culture: make one visible act of appreciation or encouragement that raises the emotional temperature of the business.'
  ];

  return {
    title,
    day: dayMatch ? Number(dayMatch[1]) : dayOfYear(),
    readings: readingHints.length ? readingHints : ['Open the source reading for the exact Bible passages and commentary.'],
    summary: themes.length ? themes : ['The app fetched the source page. Review the full reading using the source link, then add your own notes below.'],
    relevance
  };
}

async function fetchDevotion() {
  const todayUrl = getReadingUrl();
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(todayUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const html = await response.text();
  const text = stripHtml(html);
  if (!text || text.length < 500) throw new Error('Fetched page did not contain enough readable text.');
  return { url: todayUrl, text, ...buildLocalSummary(text) };
}

function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(localStorage.getItem('bwp-devotion-notes') || '');
  const today = useMemo(() => new Date(), []);

  async function load() {
    setStatus('Fetching today’s devotion...');
    setError('');
    try {
      const result = await fetchDevotion();
      setData(result);
      setStatus('Updated');
      localStorage.setItem('bwp-devotion-last', JSON.stringify({ ...result, text: undefined, savedAt: new Date().toISOString() }));
    } catch (e) {
      const cached = localStorage.getItem('bwp-devotion-last');
      if (cached) {
        setData(JSON.parse(cached));
        setStatus('Showing last saved result');
      } else {
        setStatus('Needs manual source review');
        setData({
          title: `Day ${dayOfYear(today)}`,
          day: dayOfYear(today),
          url: getReadingUrl(today),
          readings: ['Open the source link to view today’s exact passages.'],
          summary: ['The browser could not fetch the Alpha page automatically. This can happen because of CORS or a temporary proxy issue.'],
          relevance: ['Use the source link, then capture your BWP leadership reflection in the notes box below.']
        });
      }
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { localStorage.setItem('bwp-devotion-notes', notes); }, [notes]);

  return <main className="shell">
    <section className="hero">
      <div>
        <p className="eyebrow"><Calendar size={16}/> Daily 6:00 AM reflection</p>
        <h1>BWP Daily Devotion</h1>
        <p className="sub">Alpha Bible reading, summarized and translated into practical relevance for running BWP Group.</p>
      </div>
      <button onClick={load}><RefreshCw size={18}/> Refresh today</button>
    </section>

    <section className="status">
      <span><CheckCircle2 size={18}/> {status}</span>
      <span>{today.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
    </section>
    {error && <section className="warning"><AlertTriangle size={18}/> {error}</section>}

    {data && <>
      <section className="card title-card">
        <BookOpen size={28}/>
        <div>
          <h2>{data.title}</h2>
          <p>Day {data.day}. <a href={data.url || SOURCE_URL} target="_blank" rel="noreferrer">Open source reading</a></p>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h3>Today’s reading</h3>
          {data.readings.map((item, i) => <p key={i}>{item}</p>)}
        </article>
        <article className="card">
          <h3>Summary</h3>
          {data.summary.map((item, i) => <p key={i}>{item}</p>)}
        </article>
      </section>

      <section className="card">
        <h3><BriefcaseBusiness size={22}/> Relevance to running BWP</h3>
        <ul>{data.relevance.map((item, i) => <li key={i}>{item}</li>)}</ul>
      </section>

      <section className="card">
        <h3>Richard’s leadership notes</h3>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What does this mean for BWP today? What should I act on?" />
      </section>
    </>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
