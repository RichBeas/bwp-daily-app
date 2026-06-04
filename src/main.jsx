import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RefreshCw,
  Calendar,
  BriefcaseBusiness,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowLeft
} from 'lucide-react';
import './style.css';

const SOURCE_URL = 'https://bible.alpha.org/en/#todays-devotion';
const CLASSIC_DAY_URL = 'https://bible.alpha.org/en/classic/';
const HISTORY_KEY = 'bwp-devotion-history-v1';
const NOTES_KEY = 'bwp-devotion-notes';

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff =
    date - start +
    (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getReadingUrl(date = new Date()) {
  return `${CLASSIC_DAY_URL}${dayOfYear(date)}`;
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
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
    if (keywords.some((k) => lower.includes(k)) && !picked.includes(s)) {
      picked.push(s);
    }

    if (picked.length >= limit) break;
  }

  return picked;
}

function buildLocalSummary(text) {
  const titleMatch = text.match(/Day\s+\d+[:\-–]\s*([^|]{3,80})/i);
  const dayMatch = text.match(/Day\s+(\d+)/i);

  const title = titleMatch ? titleMatch[0].trim() : `Day ${dayOfYear()}`;

  const readingHints = pickSentences(
    text,
    [
      'psalm',
      'proverbs',
      'matthew',
      'mark',
      'luke',
      'john',
      'acts',
      'romans',
      'samuel',
      'kings',
      'chronicles',
      'isaiah'
    ],
    3
  );

  const themes = pickSentences(
    text,
    [
      'god',
      'jesus',
      'spirit',
      'pray',
      'prayer',
      'wisdom',
      'love',
      'lead',
      'faith',
      'hope',
      'serve'
    ],
    6
  );

  const relevance = [
    'Leadership atmosphere: notice what people hear from leaders today — clarity, gratitude, courage, encouragement, or confusion.',
    'Communication: translate the same message for different audiences across clients, commercial teams, creative teams, operations, and partners.',
    'Decision-making: pause before repeating an old tactic; ask what this situation needs now.',
    'Culture: make one visible act of appreciation or encouragement that raises the emotional temperature of the business.'
  ];

  return {
    title,
    day: dayMatch ? Number(dayMatch[1]) : dayOfYear(),
    readings: readingHints.length
      ? readingHints
      : ['Open the source reading for the exact Bible passages and commentary.'],
    summary: themes.length
      ? themes
      : ['Review the full reading using the source link, then add your own notes below.'],
    relevance
  };
}

async function fetchDevotion() {
  const todayUrl = getReadingUrl();
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
    todayUrl
  )}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const text = stripHtml(html);

  if (!text || text.length < 500) {
    throw new Error('Fetched page did not contain enough readable text.');
  }

  return {
    url: todayUrl,
    text,
    ...buildLocalSummary(text)
  };
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const existing = loadHistory();
  const withoutToday = existing.filter((item) => item.dateKey !== entry.dateKey);
  const updated = [entry, ...withoutToday].slice(0, 60);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function App() {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [data, setData] = useState(null);
  const [history, setHistory] = useState(loadHistory());
  const [view, setView] = useState('today');
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(localStorage.getItem(NOTES_KEY) || '');

  async function load() {
    setStatus('Fetching today’s devotion...');
    setError('');

    try {
      const result = await fetchDevotion();

      const savedEntry = {
        ...result,
        text: undefined,
        dateKey: todayKey,
        displayDate: today.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        savedAt: new Date().toISOString()
      };

      setData(savedEntry);
      setHistory(saveToHistory(savedEntry));
      setStatus('Updated');
    } catch (e) {
      const existingHistory = loadHistory();
      const todaySaved = existingHistory.find((item) => item.dateKey === todayKey);

      if (todaySaved) {
        setData(todaySaved);
        setStatus('Showing today from history');
      } else {
        const fallback = {
          title: `Day ${dayOfYear(today)}`,
          day: dayOfYear(today),
          url: getReadingUrl(today),
          dateKey: todayKey,
          displayDate: today.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          readings: ['Open the source link to view today’s exact passages.'],
          summary: [
            'The browser could not fetch the Alpha page automatically. This can happen because of CORS or a temporary proxy issue.'
          ],
          relevance: [
            'Use the source link, then capture your BWP leadership reflection in the notes box below.'
          ]
        };

        setData(fallback);
      }

      setHistory(existingHistory);
      setStatus('Needs manual source review');
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, notes);
  }, [notes]);

  const previousReadings = history.filter((item) => item.dateKey !== todayKey);

  if (view === 'history') {
    return (
      <main>
        <section className="hero">
          <button className="secondary" onClick={() => setView('today')}>
            <ArrowLeft size={16} /> Back to today
          </button>

          <h1>Previous Readings</h1>
          <p>Saved readings from this device.</p>
        </section>

        {previousReadings.length === 0 ? (
          <section className="card">
            <h2>No previous readings yet</h2>
            <p>
              Once you open the app on different days, previous readings will appear here.
            </p>
          </section>
        ) : (
          previousReadings.map((item) => (
            <section className="card" key={item.dateKey}>
              <h2>{item.displayDate}</h2>
              <p>
                <strong>{item.title}</strong>
              </p>
              <p>Day {item.day}</p>
              <button onClick={() => setSelected(selected === item.dateKey ? null : item.dateKey)}>
                {selected === item.dateKey ? 'Hide reading' : 'Open reading'}
              </button>

              {selected === item.dateKey && (
                <div>
                  <h3>Summary</h3>
                  {item.summary.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}

                  <h3>Relevance to running BWP</h3>
                  <ul>
                    {item.relevance.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>

                  <a href={item.url} target="_blank" rel="noreferrer">
                    Open source reading
                  </a>
                </div>
              )}
            </section>
          ))
        )}
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Daily 6:00 AM reflection</p>
        <h1>BWP Daily Devotion</h1>
        <p>
          Alpha Bible reading, summarized and translated into practical relevance for
          running BWP Group.
        </p>

        <div className="actions">
          <button onClick={load}>
            <RefreshCw size={16} /> Refresh today
          </button>

          <button className="secondary" onClick={() => setView('history')}>
            <History size={16} /> View Previous Readings
          </button>
        </div>

        <div className="status">
          <CheckCircle2 size={16} /> {status}
        </div>
      </section>

      <section className="meta">
        <div>
          <Calendar size={18} />
          {today.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </div>

        <div>
          <BookOpen size={18} />
          Alpha Bible
        </div>

        <div>
          <BriefcaseBusiness size={18} />
          BWP relevance
        </div>
      </section>

      {error && (
        <section className="warning">
          <AlertTriangle size={18} />
          {error}
        </section>
      )}

      {data && (
        <>
          <section className="card">
            <h2>{data.title}</h2>
            <p>
              Day {data.day}.{' '}
              <a href={data.url || SOURCE_URL} target="_blank" rel="noreferrer">
                Open source reading
              </a>
            </p>
          </section>

          <section className="card">
            <h3>Today’s reading</h3>
            {data.readings.map((item, i) => (
              <p key={i}>{item}</p>
            ))}
          </section>

          <section className="card">
            <h3>Summary</h3>
            {data.summary.map((item, i) => (
              <p key={i}>{item}</p>
            ))}
          </section>

          <section className="card accent">
            <h3>Relevance to running BWP</h3>
            <ul>
              {data.relevance.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3>Richard’s leadership notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What does this mean for BWP today? What should I act on?"
            />
          </section>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
