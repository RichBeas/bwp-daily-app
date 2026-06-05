import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RefreshCw, AlertTriangle, History, ArrowLeft, Lightbulb } from 'lucide-react';
import './style.css';

const SOURCE_URL = 'https://bible.alpha.org/en/#todays-devotion';
const CLASSIC_DAY_URL = 'https://bible.alpha.org/en/classic/';
const HISTORY_KEY = 'bwp-devotion-history-v2';
const NOTES_KEY = 'bwp-devotion-notes';

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalm', 'Psalms', 'Proverbs', 'Ecclesiastes',
  'Song of Songs', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

const LEADERSHIP_IDEAS = [
  {
    theme: 'Clarity',
    keywords: ['wisdom', 'truth', 'word', 'listen', 'hear', 'teach', 'understand'],
    idea: 'Clarify one priority today so the team knows what matters most.',
    question: 'Where does BWP need less noise and more direction?'
  },
  {
    theme: 'Courage',
    keywords: ['fear', 'enemy', 'battle', 'bold', 'courage', 'strong', 'stand'],
    idea: 'Name one difficult issue early and handle it with calm honesty.',
    question: 'What conversation should not be delayed?'
  },
  {
    theme: 'Gratitude',
    keywords: ['praise', 'thanks', 'thanksgiving', 'worship', 'joy', 'bless'],
    idea: 'Create a moment of visible appreciation in the business today.',
    question: 'Who needs to hear that their contribution matters?'
  },
  {
    theme: 'Service',
    keywords: ['serve', 'poor', 'help', 'mercy', 'compassion', 'give', 'love'],
    idea: 'Look for one practical way to make another person’s job easier.',
    question: 'Where can leadership remove friction today?'
  },
  {
    theme: 'Wisdom',
    keywords: ['pray', 'prayer', 'ask', 'discern', 'wise', 'counsel', 'spirit'],
    idea: 'Pause before repeating an old tactic; ask what this moment requires.',
    question: 'What has changed since the last time we made this decision?'
  },
  {
    theme: 'Unity',
    keywords: ['together', 'one', 'peace', 'body', 'people', 'church', 'family'],
    idea: 'Bring two parts of the business closer together around a shared aim.',
    question: 'Where are teams hearing different versions of the same goal?'
  },
  {
    theme: 'Stewardship',
    keywords: ['faithful', 'money', 'work', 'build', 'house', 'fruit', 'harvest'],
    idea: 'Treat time, money, energy, and attention as resources to protect.',
    question: 'What deserves more focus, and what should stop draining energy?'
  }
];

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getReadingUrl(date = new Date()) {
  return `${CLASSIC_DAY_URL}${dayOfYear(date)}`;
}

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent.replace(/\s+/g, ' ').trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function referenceRegex() {
  const booksPattern = BIBLE_BOOKS
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');

  return new RegExp(
    `\\b(?:${booksPattern})\\s+\\d{1,3}:\\d{1,3}(?:[–-]\\d{1,3})?(?:\\s*[–-]\\s*\\d{1,3}:\\d{1,3}(?:[–-]\\d{1,3})?)?`,
    'gi'
  );
}

function cleanReference(ref) {
  return ref.replace(/\s+/g, ' ').replace(/\s*[–-]\s*/g, '-').trim();
}

function extractReadingSections(text) {
  const regex = referenceRegex();
  const matches = [...text.matchAll(regex)];

  const unique = [];
  const seen = new Set();

  for (const match of matches) {
    const reference = cleanReference(match[0]);
    const key = reference.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        reference,
        index: match.index
      });
    }

    if (unique.length >= 3) break;
  }

  return unique.map((item, index) => {
    const next = unique[index + 1];
    const sectionStart = item.index;
    const sectionEnd = next ? next.index : Math.min(text.length, item.index + 1800);
    const sectionText = text.slice(sectionStart, sectionEnd).replace(/\s+/g, ' ').trim();

    return {
      reference: item.reference,
      text: sectionText
    };
  });
}

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  const keywords = [
    'god', 'jesus', 'spirit', 'lord', 'pray', 'prayer', 'wisdom', 'love', 'faith',
    'hope', 'serve', 'lead', 'heart', 'trust', 'peace', 'joy', 'truth', 'power',
    'courage', 'mercy', 'grace', 'forgive', 'praise', 'listen', 'call'
  ];

  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }

  if (sentence.length >= 70 && sentence.length <= 220) score += 2;
  if (sentence.length > 260) score -= 2;

  return score;
}

function summariseReading(sectionText, fallbackReference) {
  const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [];
  const candidates = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 45 && s.length < 280)
    .sort((a, b) => scoreSentence(b) - scoreSentence(a));

  const picked = candidates.slice(0, 2);

  if (picked.length) {
    return picked.join(' ');
  }

  return `Use this reading, ${fallbackReference}, as part of today’s reflection. Open the source for the full passage and commentary.`;
}

function detectThemes(text) {
  const lower = text.toLowerCase();

  return LEADERSHIP_IDEAS
    .map((item) => ({
      ...item,
      score: item.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function buildBwpRelevance(readingSummaries) {
  const combined = readingSummaries
    .map((item) => `${item.reference}. ${item.summary}`)
    .join(' ');

  const themes = detectThemes(combined).filter((item) => item.score > 0);
  const selected = themes.length ? themes : LEADERSHIP_IDEAS.slice(0, 3);

  const relevance = selected.map((item) => `${item.theme}: ${item.idea} ${item.question}`);

  relevance.push(
    'Joined-up leadership: read the three passages together, then ask what one repeated message is saying about the way BWP should lead, communicate, decide, and serve today.'
  );

  return relevance;
}

function buildLocalSummary(text) {
  const titleMatch = text.match(/Day\s+\d+[:\-–]\s*([^|]{3,80})/i);
  const dayMatch = text.match(/Day\s+(\d+)/i);
  const title = titleMatch ? titleMatch[0].trim() : `Day ${dayOfYear()}`;

  const sections = extractReadingSections(text);

  const readingSummaries = sections.length
    ? sections.map((section) => ({
        reference: section.reference,
        summary: summariseReading(section.text, section.reference)
      }))
    : [
        {
          reference: 'Source reading',
          summary: 'Open the Alpha source reading for today’s three passages and commentary.'
        }
      ];

  const combinedSummary = readingSummaries.map((item) => `${item.reference}: ${item.summary}`);
  const relevance = buildBwpRelevance(readingSummaries);

  return {
    title,
    day: dayMatch ? Number(dayMatch[1]) : dayOfYear(),
    readingSummaries,
    readings: readingSummaries.map((item) => `Reading: ${item.reference}`),
    summary: combinedSummary,
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

function loadHistory() {
  try {
    const v2 = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (v2) return v2;

    const old = JSON.parse(localStorage.getItem('bwp-devotion-history-v1'));
    return old || [];
  } catch {
    return [];
  }
}

function saveToHistory(entry) {
  const existing = loadHistory();
  const withoutToday = existing.filter((item) => item.dateKey !== entry.dateKey);
  const updated = [entry, ...withoutToday].slice(0, 370);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function bwpIdeaForDay(day) {
  return LEADERSHIP_IDEAS[(day - 1) % LEADERSHIP_IDEAS.length];
}

function makeArchiveSinceJan() {
  const start = new Date(2026, 0, 1);
  const today = new Date();
  const end = today < start ? start : today;
  const days = [];

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const copy = new Date(date);
    const day = dayOfYear(copy);
    const idea = bwpIdeaForDay(day);

    days.push({
      dateKey: dateKey(copy),
      displayDate: formatDisplayDate(copy),
      day,
      title: `Day ${day}`,
      url: getReadingUrl(copy),
      idea
    });
  }

  return days.reverse();
}

function App() {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [data, setData] = useState(null);
  const [history, setHistory] = useState(loadHistory());
  const [view, setView] = useState('today');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(localStorage.getItem(NOTES_KEY) || '');

  const fullArchive = useMemo(() => {
    const saved = loadHistory();
    const savedByDate = new Map(saved.map((item) => [item.dateKey, item]));
    return makeArchiveSinceJan().map((item) => ({ ...item, saved: savedByDate.get(item.dateKey) || null }));
  }, [history]);

  async function load() {
    setError('');

    try {
      const result = await fetchDevotion();
      const savedEntry = {
        ...result,
        text: undefined,
        dateKey: todayKey,
        displayDate: formatDisplayDate(today),
        savedAt: new Date().toISOString()
      };

      setData(savedEntry);
      setHistory(saveToHistory(savedEntry));
    } catch (e) {
      const existingHistory = loadHistory();
      const todaySaved = existingHistory.find((item) => item.dateKey === todayKey);

      if (todaySaved) {
        setData(todaySaved);
      } else {
        setData({
          title: `Day ${dayOfYear(today)}`,
          day: dayOfYear(today),
          url: getReadingUrl(today),
          dateKey: todayKey,
          displayDate: formatDisplayDate(today),
          readingSummaries: [
            {
              reference: 'Source reading',
              summary: 'Open the source link to view and reflect on today’s three passages.'
            }
          ],
          readings: ['Open the source link to view today’s exact three passages.'],
          summary: ['The browser could not fetch the Alpha page automatically. This can happen because of CORS or a temporary proxy issue.'],
          relevance: ['Use the source link, then capture your BWP leadership reflection in the notes box below.']
        });
      }

      setHistory(existingHistory);
      setError(e.message);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { localStorage.setItem(NOTES_KEY, notes); }, [notes]);

  if (view === 'history') {
    return (
      <main>
        <section className="hero">
          <button className="secondary" onClick={() => setView('today')}>
            <ArrowLeft size={16} /> Back to today
          </button>

          <h1>Since 1 January 2026</h1>
          <p>A running archive of Alpha reading links, saved summaries and BWP leadership ideas from the start of the year.</p>
        </section>

        <section className="archive-intro">
          <Lightbulb size={20} />
          <div>
            <strong>{fullArchive.length} days listed</strong>
            <p>Saved summaries appear when available. Otherwise, use the Alpha source link and the BWP idea as a reflection prompt.</p>
          </div>
        </section>

        {fullArchive.map((item) => (
          <section className="card history-card" key={item.dateKey}>
            <div className="history-top">
              <div>
                <h2>{item.displayDate}</h2>
                <p><strong>{item.saved?.title || item.title}</strong> · Day {item.day}</p>
              </div>
              <button onClick={() => setSelected(selected === item.dateKey ? null : item.dateKey)}>
                {selected === item.dateKey ? 'Hide' : 'Open'}
              </button>
            </div>

            <div className="idea">
              <strong>BWP idea: {item.idea.theme}</strong>
              <p>{item.idea.idea}</p>
              <p><em>{item.idea.question}</em></p>
            </div>

            {selected === item.dateKey && (
              <div className="history-detail">
                {item.saved ? (
                  <>
                    <h3>Saved three-reading summary</h3>
                    {(item.saved.readingSummaries || []).map((reading, index) => (
                      <div className="reading-summary" key={index}>
                        <strong>{reading.reference}</strong>
                        <p>{reading.summary}</p>
                      </div>
                    ))}

                    <h3>Saved BWP relevance</h3>
                    <ul>{item.saved.relevance.map((line, index) => <li key={index}>{line}</li>)}</ul>
                  </>
                ) : (
                  <p>No saved summary for this date yet. Open the source reading and use the BWP idea above as your reflection.</p>
                )}

                <a href={item.saved?.url || item.url} target="_blank" rel="noreferrer">Open Alpha source reading</a>
              </div>
            )}
          </section>
        ))}
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Daily 6:00 AM reflection</p>
        <h1>BWP Daily Devotion</h1>
        <p>Three Alpha Bible readings, summarized and translated into practical relevance for running BWP Group.</p>

        <div className="actions">
          <button onClick={load}><RefreshCw size={16} /> Refresh today</button>
          <button className="secondary" onClick={() => setView('history')}><History size={16} /> Since 1 Jan 2026</button>
        </div>
      </section>

      {error && (
        <section className="warning">
          <AlertTriangle size={18} /> {error}
        </section>
      )}

      {data && (
        <>
          <section className="card">
            <h2>{data.title}</h2>
            <p>Day {data.day}. <a href={data.url || SOURCE_URL} target="_blank" rel="noreferrer">Open source reading</a></p>
          </section>

          <section className="card">
            <h3>Today’s three readings</h3>
            {(data.readingSummaries || []).map((reading, i) => (
              <div className="reading-summary" key={i}>
                <strong>{reading.reference}</strong>
                <p>{reading.summary}</p>
              </div>
            ))}
          </section>

          <section className="card accent">
            <h3>Relevance to running BWP</h3>
            <ul>{data.relevance.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>

          <section className="card">
            <h3>Richard’s leadership notes</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do the three readings say to BWP today? What should I act on?" />
          </section>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
