import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RefreshCw, AlertTriangle, History, ArrowLeft, Lightbulb, DownloadCloud } from 'lucide-react';
import './style.css';

const SOURCE_URL = 'https://bible.alpha.org/en/#todays-devotion';
const CLASSIC_DAY_URL = 'https://bible.alpha.org/en/classic/';
const HISTORY_KEY = 'bwp-devotion-history-v5';
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
  { theme: 'Clarity', keywords: ['wisdom', 'truth', 'word', 'listen', 'hear', 'teach', 'understand'], idea: 'Clarify one priority today so the team knows what matters most.', question: 'Where does BWP need less noise and more direction?' },
  { theme: 'Courage', keywords: ['fear', 'enemy', 'battle', 'bold', 'courage', 'strong', 'stand'], idea: 'Name one difficult issue early and handle it with calm honesty.', question: 'What conversation should not be delayed?' },
  { theme: 'Gratitude', keywords: ['praise', 'thanks', 'thanksgiving', 'worship', 'joy', 'bless'], idea: 'Create a moment of visible appreciation in the business today.', question: 'Who needs to hear that their contribution matters?' },
  { theme: 'Service', keywords: ['serve', 'poor', 'help', 'mercy', 'compassion', 'give', 'love'], idea: 'Look for one practical way to make another person’s job easier.', question: 'Where can leadership remove friction today?' },
  { theme: 'Wisdom', keywords: ['pray', 'prayer', 'ask', 'discern', 'wise', 'counsel', 'spirit'], idea: 'Pause before repeating an old tactic; ask what this moment requires.', question: 'What has changed since the last time we made this decision?' },
  { theme: 'Unity', keywords: ['together', 'one', 'peace', 'body', 'people', 'church', 'family'], idea: 'Bring two parts of the business closer together around a shared aim.', question: 'Where are teams hearing different versions of the same goal?' },
  { theme: 'Stewardship', keywords: ['faithful', 'money', 'work', 'build', 'house', 'fruit', 'harvest'], idea: 'Treat time, money, energy, and attention as resources to protect.', question: 'What deserves more focus, and what should stop draining energy?' }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function booksPattern() {
  return BIBLE_BOOKS.sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
}

function referencePatternSource() {
  return `(?:${booksPattern()})\\s+\\d{1,3}:\\d{1,3}(?:[–-]\\d{1,3})?(?:\\s*[–-]\\s*\\d{1,3}:\\d{1,3}(?:[–-]\\d{1,3})?)?`;
}

function cleanReference(ref) {
  return ref.replace(/\s+/g, ' ').replace(/\s*[–-]\s*/g, '-').trim();
}

function extractAlphaMainReadings(text) {
  const ref = referencePatternSource();

  const labelledPatterns = [
    { label: 'Wisdom', regex: new RegExp(`Wisdom\\s+(${ref})`, 'i') },
    { label: 'New Testament', regex: new RegExp(`New Testament\\s+(${ref})`, 'i') },
    { label: 'Old Testament', regex: new RegExp(`Old Testament\\s+(${ref})`, 'i') }
  ];

  const labelled = labelledPatterns
    .map((item) => {
      const match = text.match(item.regex);
      return match ? { label: item.label, reference: cleanReference(match[1]) } : null;
    })
    .filter(Boolean);

  if (labelled.length === 3) return labelled;

  const introIndex = text.toLowerCase().indexOf('introduction');
  const topText = introIndex > 0 ? text.slice(0, introIndex) : text.slice(0, 1200);
  const regex = new RegExp(ref, 'gi');
  const matches = topText.match(regex) || [];

  const unique = [];
  for (const match of matches) {
    const reference = cleanReference(match);
    if (!unique.some((item) => item.reference.toLowerCase() === reference.toLowerCase())) {
      unique.push({
        label: unique.length === 0 ? 'Wisdom' : unique.length === 1 ? 'New Testament' : 'Old Testament',
        reference
      });
    }
    if (unique.length >= 3) break;
  }

  return unique;
}

function findReferenceIndex(text, reference) {
  const variants = [
    reference,
    reference.replace(/-/g, '–'),
    reference.replace(/-/g, ' - '),
    reference.replace(/-/g, ' – ')
  ];

  for (const variant of variants) {
    const index = text.indexOf(variant);
    if (index >= 0) return index;
  }

  return -1;
}

function extractReadingSection(text, reference, fallbackLength = 1900) {
  const start = findReferenceIndex(text, reference);
  if (start < 0) return '';

  const after = text.slice(start);
  const markers = ['Commentary', 'Prayer', 'Pippa Adds'];
  let end = fallbackLength;

  for (const marker of markers) {
    const markerIndex = after.indexOf(marker);
    if (markerIndex > 80) end = Math.min(end, markerIndex);
  }

  return after.slice(0, end).replace(/\s+/g, ' ').trim();
}

function scoreSentence(sentence) {
  const lower = sentence.toLowerCase();
  const keywords = ['god', 'jesus', 'spirit', 'lord', 'pray', 'prayer', 'wisdom', 'love', 'faith', 'hope', 'serve', 'lead', 'heart', 'trust', 'peace', 'joy', 'truth', 'power', 'courage', 'mercy', 'grace', 'forgive', 'praise', 'listen', 'call'];

  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword)) score += 1;
  }

  if (sentence.length >= 70 && sentence.length <= 230) score += 2;
  if (sentence.length > 280) score -= 2;

  return score;
}

function summariseReading(sectionText, label, reference) {
  const sentences = sectionText.match(/[^.!?]+[.!?]+/g) || [];
  const candidates = sentences
    .map((s) => s.trim())
    .filter((s) => s.length > 45 && s.length < 300)
    .filter((s) => !s.startsWith(reference))
    .sort((a, b) => scoreSentence(b) - scoreSentence(a));

  if (candidates.length) return candidates.slice(0, 2).join(' ');

  return `The ${label} reading, ${reference}, is part of today’s three-part Alpha reading. Open the source for the full passage and commentary.`;
}


function valuesLensForReading(summary) {
  const text = summary.toLowerCase();

  const lenses = [
    {
      value: 'Human',
      triggers: ['love', 'mercy', 'compassion', 'serve', 'poor', 'help', 'forgive', 'heart', 'peace', 'people', 'family', 'neighbour'],
      observation: 'This reading has a Human lens: it points towards people, care, mercy, understanding and the way decisions affect real lives.',
      thought: 'For BWP, this asks us to lead with empathy before efficiency. Notice the person behind the task, client challenge or internal pressure.'
    },
    {
      value: 'Passionate',
      triggers: ['praise', 'joy', 'bold', 'spirit', 'power', 'fire', 'worship', 'zeal', 'call', 'send', 'life', 'hope'],
      observation: 'This reading has a Passionate lens: it carries energy, conviction, hope, worship or a call to wholehearted action.',
      thought: 'For BWP, this asks us to bring positive energy and belief to the work, not just process. Passion should lift the room and move people forward.'
    },
    {
      value: 'Impact',
      triggers: ['fruit', 'harvest', 'build', 'work', 'faithful', 'truth', 'teach', 'word', 'understand', 'change', 'grow', 'kingdom'],
      observation: 'This reading has an Impact lens: it points towards fruit, growth, truth, building well and creating outcomes that last.',
      thought: 'For BWP, this asks us to focus on what changes because of our work. Activity matters less than meaningful progress for clients, people and the business.'
    },
    {
      value: 'Brave',
      triggers: ['fear', 'battle', 'enemy', 'courage', 'strong', 'stand', 'bold', 'truth', 'justice', 'false', 'wicked', 'trouble', 'suffer'],
      observation: 'This reading has a Brave lens: it points towards courage, truth, standing firm or facing pressure honestly.',
      thought: 'For BWP, this asks us not to avoid the hard thing. Brave leadership names reality clearly and takes the next honest step.'
    }
  ];

  const scored = lenses
    .map((lens) => ({
      ...lens,
      score: lens.triggers.reduce((total, trigger) => total + (text.includes(trigger) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];

  if (!best || best.score === 0) {
    return {
      value: 'Values reflection',
      observation: 'This reading invites reflection on how belief becomes behaviour.',
      thought: 'For BWP, use it to ask which value needs to be most visible today: Human, Passionate, Impact or Brave.'
    };
  }

  return {
    value: best.value,
    observation: best.observation,
    thought: best.thought
  };
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
  const combinedOriginal = readingSummaries
    .map((item) => `${item.label}: ${item.reference}. ${item.summary}`)
    .join(' ');

  const combined = combinedOriginal.toLowerCase();

  const valueBank = [
    {
      value: 'Human',
      triggers: ['love', 'mercy', 'compassion', 'serve', 'poor', 'help', 'forgive', 'heart', 'peace', 'people', 'family', 'neighbour'],
      relevance: 'Human: read through the lens of people first. Today’s readings ask BWP to notice the person behind the task, client brief, pressure or problem.',
      action: 'Ask where someone needs more care, clarity or support today, then act on it.'
    },
    {
      value: 'Passionate',
      triggers: ['praise', 'joy', 'bold', 'spirit', 'power', 'fire', 'worship', 'zeal', 'call', 'send', 'life', 'hope'],
      relevance: 'Passionate: the readings point towards energy with purpose, not noise. BWP should bring conviction, belief and positive momentum to the work.',
      action: 'Choose one piece of work that needs fresh energy and personally lift the tone around it.'
    },
    {
      value: 'Impact',
      triggers: ['fruit', 'harvest', 'build', 'work', 'faithful', 'truth', 'teach', 'word', 'understand', 'change', 'grow', 'kingdom'],
      relevance: 'Impact: the readings challenge BWP to focus on outcomes that last. Activity is not the same as impact; the question is what changes because of the work.',
      action: 'Identify one meeting, client action or internal task that should create measurable progress today.'
    },
    {
      value: 'Brave',
      triggers: ['fear', 'battle', 'enemy', 'courage', 'strong', 'stand', 'bold', 'truth', 'justice', 'false', 'wicked', 'trouble', 'suffer'],
      relevance: 'Brave: the readings point towards honest courage. BWP should not avoid the hard conversation, difficult decision or uncomfortable truth.',
      action: 'Name one issue that needs courage today and take the next honest step.'
    }
  ];

  const scored = valueBank
    .map((item) => ({
      ...item,
      score: item.triggers.reduce((total, trigger) => total + (combined.includes(trigger) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  const selected = scored.filter((item) => item.score > 0).slice(0, 3);
  const chosen = selected.length ? selected : valueBank;

  const references = readingSummaries
    .map((item) => `${item.label}: ${item.reference}`)
    .join('; ');

  const readingSpecificOpening = `Based on today’s three readings — ${references} — the strongest BWP application is to turn the spiritual message into visible leadership behaviour.`;

  return [
    readingSpecificOpening,
    ...chosen.map((item) => `${item.relevance} Today’s action: ${item.action}`),
    'Values check: before the day ends, ask whether one decision or conversation has been made more Human, more Passionate, more Impact-focused or more Brave because of these readings.'
  ];
}


function buildLocalSummary(text, date = new Date()) {
  const titleMatch = text.match(/Day\s+\d+[:\-–]\s*([^|]{3,80})/i);
  const dayMatch = text.match(/Day\s+(\d+)/i);
  const title = titleMatch ? titleMatch[0].trim() : `Day ${dayOfYear(date)}`;

  const mainReadings = extractAlphaMainReadings(text);

  const readingSummaries = mainReadings.length
    ? mainReadings.map((reading) => {
        const sectionText = extractReadingSection(text, reading.reference);
        const summary = summariseReading(sectionText, reading.label, reading.reference);
        const lens = valuesLensForReading(summary);

        return {
          label: reading.label,
          reference: reading.reference,
          summary,
          value: lens.value,
          valuesObservation: lens.observation,
          bwpThought: lens.thought
        };
      })
    : [
        {
          label: 'Source',
          reference: 'Alpha source reading',
          summary: 'Open the Alpha source reading for today’s three passages and commentary.'
        }
      ];

  const relevance = buildBwpRelevance(readingSummaries);

  return {
    title,
    day: dayMatch ? Number(dayMatch[1]) : dayOfYear(date),
    readingSummaries,
    readings: readingSummaries.map((item) => `${item.label}: ${item.reference}`),
    summary: readingSummaries.map((item) => `${item.label} — ${item.reference}: ${item.summary}`),
    combinedSummary: readingSummaries.map((item) => `${item.label} (${item.reference}): ${item.summary}`).join(' '),
    relevance
  };
}

async function fetchDevotionForDate(date) {
  const url = getReadingUrl(date);
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const html = await response.text();
  const text = stripHtml(html);

  if (!text || text.length < 500) throw new Error('Fetched page did not contain enough readable text.');

  return {
    url,
    text,
    ...buildLocalSummary(text, date)
  };
}

function loadHistory() {
  try {
    const v5 = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (v5) return v5;

    const v4 = JSON.parse(localStorage.getItem('bwp-devotion-history-v4'));
    if (v4) return v4;

    const v3 = JSON.parse(localStorage.getItem('bwp-devotion-history-v3'));
    if (v3) return v3;

    const v2 = JSON.parse(localStorage.getItem('bwp-devotion-history-v2'));
    if (v2) return v2;

    const old = JSON.parse(localStorage.getItem('bwp-devotion-history-v1'));
    return old || [];
  } catch {
    return [];
  }
}

function saveHistoryList(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 370)));
}

function saveToHistory(entry) {
  const existing = loadHistory();
  const withoutDate = existing.filter((item) => item.dateKey !== entry.dateKey);
  const updated = [entry, ...withoutDate].slice(0, 370);
  saveHistoryList(updated);
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
      date: copy,
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
  const [loadingDate, setLoadingDate] = useState('');
  const [autoPulling, setAutoPulling] = useState(false);
  const [autoProgress, setAutoProgress] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState(localStorage.getItem(NOTES_KEY) || '');

  const fullArchive = useMemo(() => {
    const savedByDate = new Map(history.map((item) => [item.dateKey, item]));
    return makeArchiveSinceJan().map((item) => ({ ...item, saved: savedByDate.get(item.dateKey) || null }));
  }, [history]);

  const missingCount = fullArchive.filter((item) => !item.saved).length;

  async function loadToday() {
    setError('');

    try {
      const result = await fetchDevotionForDate(today);
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
          readingSummaries: [{ label: 'Source', reference: 'Alpha source reading', summary: 'Open the source link to view and reflect on today’s three passages.' }],
          readings: ['Open the source link to view today’s exact three passages.'],
          summary: ['The browser could not fetch the Alpha page automatically. This can happen because of CORS or a temporary proxy issue.'],
          combinedSummary: 'The browser could not fetch the Alpha page automatically. Open the source reading to review the three passages.',
          relevance: ['Use the source link, then capture your BWP leadership reflection in the notes box below.']
        });
      }

      setHistory(existingHistory);
      setError(e.message);
    }
  }

  async function pullArchiveDate(item, quiet = false) {
    if (!quiet) {
      setSelected(item.dateKey);
      setLoadingDate(item.dateKey);
      setError('');
    }

    try {
      const result = await fetchDevotionForDate(item.date);
      const savedEntry = {
        ...result,
        text: undefined,
        dateKey: item.dateKey,
        displayDate: item.displayDate,
        savedAt: new Date().toISOString()
      };

      const updated = saveToHistory(savedEntry);
      setHistory(updated);

      if (item.dateKey === todayKey) setData(savedEntry);
      return { ok: true, entry: savedEntry };
    } catch (e) {
      if (!quiet) setError(`Could not pull ${item.displayDate}: ${e.message}`);
      return { ok: false, error: e.message };
    } finally {
      if (!quiet) setLoadingDate('');
    }
  }

  async function autoPullAllMissing() {
    setAutoPulling(true);
    setError('');

    let currentHistory = loadHistory();
    const archive = makeArchiveSinceJan();
    const savedKeys = new Set(currentHistory.map((item) => item.dateKey));
    const missing = archive.filter((item) => !savedKeys.has(item.dateKey)).reverse();

    let completed = 0;
    let failed = 0;

    for (const item of missing) {
      setAutoProgress(`Pulling ${completed + 1} of ${missing.length}: ${item.displayDate}`);

      try {
        const result = await fetchDevotionForDate(item.date);
        const savedEntry = {
          ...result,
          text: undefined,
          dateKey: item.dateKey,
          displayDate: item.displayDate,
          savedAt: new Date().toISOString()
        };

        currentHistory = [savedEntry, ...currentHistory.filter((existing) => existing.dateKey !== item.dateKey)].slice(0, 370);
        saveHistoryList(currentHistory);
        setHistory([...currentHistory]);
        completed += 1;

        if (item.dateKey === todayKey) setData(savedEntry);
      } catch {
        failed += 1;
      }

      await sleep(450);
    }

    setAutoProgress(`Done. Pulled ${completed} missing days${failed ? `, ${failed} failed` : ''}.`);
    setAutoPulling(false);
  }

  async function rebuildAllHistory() {
    setRebuilding(true);
    setError('');

    const archive = makeArchiveSinceJan().reverse(); // oldest first
    let currentHistory = loadHistory();
    let completed = 0;
    let failed = 0;

    for (const item of archive) {
      setRebuildProgress(`Rebuilding ${completed + 1} of ${archive.length}: ${item.displayDate}`);

      try {
        const result = await fetchDevotionForDate(item.date);
        const savedEntry = {
          ...result,
          text: undefined,
          dateKey: item.dateKey,
          displayDate: item.displayDate,
          savedAt: new Date().toISOString()
        };

        currentHistory = [savedEntry, ...currentHistory.filter((existing) => existing.dateKey !== item.dateKey)].slice(0, 370);
        saveHistoryList(currentHistory);
        setHistory([...currentHistory]);

        if (item.dateKey === todayKey) setData(savedEntry);

        completed += 1;
      } catch {
        failed += 1;
      }

      await sleep(450);
    }

    setRebuildProgress(`Done. Rebuilt ${completed} days${failed ? `, ${failed} failed` : ''}.`);
    setRebuilding(false);
  }

  async function autoPullMissingOnly() {
    setRebuilding(true);
    setError('');

    const archive = makeArchiveSinceJan().reverse(); // oldest first
    let currentHistory = loadHistory();
    const savedKeys = new Set(currentHistory.map((item) => item.dateKey));
    const missing = archive.filter((item) => !savedKeys.has(item.dateKey));

    let completed = 0;
    let failed = 0;

    for (const item of missing) {
      setRebuildProgress(`Pulling ${completed + 1} of ${missing.length}: ${item.displayDate}`);

      try {
        const result = await fetchDevotionForDate(item.date);
        const savedEntry = {
          ...result,
          text: undefined,
          dateKey: item.dateKey,
          displayDate: item.displayDate,
          savedAt: new Date().toISOString()
        };

        currentHistory = [savedEntry, ...currentHistory.filter((existing) => existing.dateKey !== item.dateKey)].slice(0, 370);
        saveHistoryList(currentHistory);
        setHistory([...currentHistory]);

        if (item.dateKey === todayKey) setData(savedEntry);

        completed += 1;
      } catch {
        failed += 1;
      }

      await sleep(450);
    }

    setRebuildProgress(`Done. Pulled ${completed} missing days${failed ? `, ${failed} failed` : ''}.`);
    setRebuilding(false);
  }

  useEffect(() => { loadToday(); }, []);
  useEffect(() => { localStorage.setItem(NOTES_KEY, notes); }, [notes]);

  if (view === 'history') {
    return (
      <main>
        <section className="hero">
          <button className="secondary" onClick={() => setView('today')}>
            <ArrowLeft size={16} /> Back to today
          </button>

          <h1>Since 1 January 2026</h1>
          <p>Open any day or auto-pull all missing dates into your saved archive.</p>

          <div className="actions">
            <button onClick={autoPullAllMissing} disabled={autoPulling || missingCount === 0}>
              <DownloadCloud size={16} />
              {autoPulling ? 'Auto pulling...' : `Auto pull all missing (${missingCount})`}
            </button>
          </div>

          {autoProgress && <p className="progress-text">{autoProgress}</p>}
        </section>

        {error && (
          <section className="warning">
            <AlertTriangle size={18} /> {error}
          </section>
        )}

        <section className="archive-intro">
          <Lightbulb size={20} />
          <div>
            <strong>{fullArchive.length} days listed</strong>
            <p>The first auto-pull may take a few minutes. Keep the app open until it says done.</p>
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
                    <h3>Saved three readings</h3>
                    {(item.saved.readingSummaries || []).map((reading, index) => (
                      <div className="reading-summary" key={index}>
                        <strong>{index + 1}. {reading.label}: {reading.reference}</strong>
                        <p><b>Reading summary:</b> {reading.summary}</p>
                        {reading.value && <p><b>BWP value lens:</b> {reading.value}</p>}
                        {reading.valuesObservation && <p>{reading.valuesObservation}</p>}
                        {reading.bwpThought && <p><b>BWP thought:</b> {reading.bwpThought}</p>}
                      </div>
                    ))}

                    <h3>Saved BWP relevance</h3>
                    <ul>{item.saved.relevance.map((line, index) => <li key={index}>{line}</li>)}</ul>

                    <button className="secondary" onClick={() => pullArchiveDate(item)} disabled={loadingDate === item.dateKey || autoPulling}>
                      {loadingDate === item.dateKey ? 'Refreshing...' : 'Refresh saved summary'}
                    </button>
                  </>
                ) : (
                  <>
                    <p>No saved summary for this date yet.</p>
                    <button onClick={() => pullArchiveDate(item)} disabled={loadingDate === item.dateKey || autoPulling}>
                      {loadingDate === item.dateKey ? 'Pulling summary...' : 'Pull summary for this date'}
                    </button>
                  </>
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
        <p>Wisdom, New Testament and Old Testament readings, summarized and translated into practical relevance for BWP’s values: Human, Passionate, Impact and Brave.</p>

        <div className="actions">
          <button onClick={loadToday}><RefreshCw size={16} /> Refresh today</button>
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
                <strong>{i + 1}. {reading.label}: {reading.reference}</strong>
                <p><b>Reading summary:</b> {reading.summary}</p>
                {reading.value && <p><b>BWP value lens:</b> {reading.value}</p>}
                {reading.valuesObservation && <p>{reading.valuesObservation}</p>}
                {reading.bwpThought && <p><b>BWP thought:</b> {reading.bwpThought}</p>}
              </div>
            ))}
          </section>

          <section className="card">
            <h3>Combined summary</h3>
            <p>{data.combinedSummary || data.summary?.join(' ')}</p>
          </section>

          <section className="card accent">
            <h3>Relevance to running BWP</h3>
            <ul>{data.relevance.map((item, i) => <li key={i}>{item}</li>)}</ul>
          </section>

          <section className="card">
            <h3>Richard’s leadership notes</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What do the three readings say about being Human, Passionate, Impact-focused or Brave today?" />
          </section>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
