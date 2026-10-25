import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check,
  ChevronDown, Clock3, Code2, Compass, FileText, Flame, Hash, Menu,
  MoonStar, PenLine, Search, Sparkles, SunMedium, Tag, UserRound, X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams,
  useSearchParams,
} from 'react-router-dom'
import './App.css'

const AuthContext = createContext(null)
const ThemeContext = createContext(null)
const useAuth = () => useContext(AuthContext)
const useTheme = () => useContext(ThemeContext)
const currentYear = new Date().getFullYear()
const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('css', css)

const api = async (path, options = {}) => {
  const token = localStorage.getItem('devlog-token')
  const endpoint = `${apiBaseUrl}${path}`
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null
  if (!response.ok) {
    if (response.status === 404 && !data) {
      throw new Error(`API endpoint not found at ${endpoint}. Set VITE_API_URL to the API base URL (including /api) and make sure the host forwards API requests to it.`)
    }
    throw new Error(data?.message || `The API returned HTTP ${response.status}.`)
  }
  if (!data) throw new Error('The server returned an invalid response.')
  return data
}

const formatDate = (date) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date(date))

const readingTime = (content = '') => `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220))} min read`
const initials = (name = 'Developer') => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('devlog-token')))

  useEffect(() => {
    if (!localStorage.getItem('devlog-token')) return
    api('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => localStorage.removeItem('devlog-token'))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (credentials, endpoint) => {
    const data = await api(`/auth/${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    localStorage.setItem('devlog-token', data.token)
    setUser(data.user)
    return data.user
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem('devlog-token')
    setUser(null)
  }, [])

  const updateProfile = useCallback((nextUser) => setUser(nextUser), [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

function Avatar({ name, size = 'normal' }) {
  return <span className={`avatar avatar-${size}`} aria-hidden="true">{initials(name)}</span>
}

function Header() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="PenYourPlot home">
          <span className="brand-mark"><Code2 size={18} strokeWidth={2.4} /></span>
          <span>Pen<span className="brand-accent">YourPlot</span></span>
        </Link>
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          <Link to="/" onClick={() => setMenuOpen(false)}>Explore</Link>
          {user && <Link to="/my-drafts" onClick={() => setMenuOpen(false)}>My drafts</Link>}
        </nav>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunMedium size={17} /> : <MoonStar size={17} />}
          </button>
          <Link className="write-link" to={user ? '/write' : '/login'}><PenLine size={15} /> Write</Link>
          {user ? (
            <div className="user-menu">
              <button className="user-trigger" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open account menu">
                <Avatar name={user.name} size="small" /><ChevronDown size={14} />
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <Link to={`/author/${user.username}`} onClick={() => setMenuOpen(false)}><UserRound size={15} /> My profile</Link>
                  <Link to="/settings" onClick={() => setMenuOpen(false)}><PenLine size={15} /> Edit profile</Link>
                  <Link to="/my-drafts" onClick={() => setMenuOpen(false)}><FileText size={15} /> My drafts</Link>
                  <button type="button" onClick={() => { signOut(); setMenuOpen(false); navigate('/') }}><ArrowLeft size={15} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-actions"><Link className="login-link" to="/login">Log in</Link><Link className="button button-dark button-small" to="/register">Get started</Link></div>
          )}
          <button className="mobile-menu" type="button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={21} /></button>
        </div>
      </div>
    </header>
  )
}

function ErrorMessage({ children, onDismiss }) {
  if (!children) return null
  return <div className="notice notice-error" role="alert">{children}{onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss error"><X size={16} /></button>}</div>
}

function Loading({ label = 'Loading stories' }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>
}

function TagPill({ children, active, onClick, small = false }) {
  const className = `tag-pill ${small ? 'tag-small' : ''} ${active ? 'tag-active' : ''}`
  return onClick
    ? <button type="button" className={className} onClick={onClick}>{children}</button>
    : <Link className={className} to={`/?tag=${encodeURIComponent(children)}`}>{children}</Link>
}

function StoryCard({ story, compact = false }) {
  const authorName = story.author?.name || 'PenYourPlot author'
  return (
    <article className={`story-card ${compact ? 'story-compact' : ''}`}>
      <div className="story-byline">
        <Link to={`/author/${story.author?.username || ''}`} className="author-inline"><Avatar name={authorName} size="tiny" /><span>{authorName}</span></Link>
        <span className="dot-separator">·</span><time>{formatDate(story.publishedAt || story.updatedAt)}</time>
        <span className="reading-time"><Clock3 size={13} /> {readingTime(story.body)}</span>
      </div>
      <Link to={`/story/${story.slug}`} className="story-title-link"><h3>{story.title}</h3></Link>
      {!compact && <p className="story-description">{story.description}</p>}
      <div className="story-footer">
        <div className="story-tags">{story.tags.slice(0, 3).map((tag) => <TagPill small key={tag}>{tag}</TagPill>)}</div>
        <span className="story-arrow"><ArrowUpRight size={15} /></span>
      </div>
    </article>
  )
}

function Sidebar({ tags, activeTag, onTagClick }) {
  const { user } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-section sidebar-intro">
        <span className="eyebrow"><Sparkles size={13} /> YOUR NEXT GOOD READ</span>
        <h3>Ideas that move<br />the web forward.</h3>
        <p>A community for the curious minds building what comes next.</p>
        {!user && <Link className="button button-dark button-block" to="/register">Join the community <ArrowRight size={16} /></Link>}
      </div>
      <div className="sidebar-section topics-section">
        <div className="sidebar-heading"><span><Hash size={15} /> Topics to explore</span><Compass size={15} /></div>
        <div className="topic-list">
          {tags.map((tag) => <TagPill key={tag} active={activeTag === tag} onClick={() => onTagClick(tag)}>{tag}</TagPill>)}
        </div>
      </div>
      <div className="sidebar-note"><span className="note-icon"><Flame size={17} /></span><div><strong>Made for developers</strong><p>Real experience. Practical ideas. No noise.</p></div></div>
      <footer className="sidebar-footer">A little corner of the internet<br />for people who build things.</footer>
    </aside>
  )
}

function Feed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stories, setStories] = useState([])
  const [tags, setTags] = useState([])
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [reloadIndex, setReloadIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchStories = async () => {
      try {
        const params = new URLSearchParams({ page, limit: 6 })
        if (query.trim()) params.set('q', query.trim())
        if (activeTag) params.set('tag', activeTag)
        const data = await api(`/blogs?${params}`)
        if (cancelled) return
        setStories(data.stories)
        setTags(data.tags)
        setTotalPages(data.pagination.pages)
        setError('')
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStories()
    return () => { cancelled = true }
  }, [activeTag, page, query, reloadIndex])

  const updateAddress = (nextQuery, nextTag) => {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextTag) params.set('tag', nextTag)
    setSearchParams(params, { replace: true })
  }

  const updateQuery = (nextQuery) => {
    setQuery(nextQuery)
    setPage(1)
    setLoading(true)
    setError('')
    updateAddress(nextQuery, activeTag)
  }

  const chooseTag = (tag) => {
    const nextTag = activeTag === tag ? '' : tag
    setActiveTag(nextTag)
    setPage(1)
    setLoading(true)
    setError('')
    updateAddress(query, nextTag)
  }

  const clearFilters = () => {
    setQuery('')
    setActiveTag('')
    setPage(1)
    setLoading(true)
    setError('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const changePage = (nextPage) => {
    setPage(nextPage)
    setLoading(true)
    setError('')
  }

  return (
    <main>
      <section className="hero-band">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> THE DEVELOPER JOURNAL</span>
          <h1>Build things.<br /><span>Share what you learn.</span></h1>
          <p>A home for the ideas, lessons, and little discoveries<br className="desktop-break" /> that make us better builders.</p>
          <Link to="/write" className="hero-cta">Share your story <ArrowRight size={17} /></Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-card art-card-back"><span className="art-line short" /><span className="art-line" /><span className="art-line medium" /></div>
          <div className="art-card art-card-front"><span className="art-card-label">A NOTE FROM THE FIELD</span><span className="art-card-title">It finally<br />clicked.</span><span className="art-card-bottom"><i /> ideas worth sharing</span></div>
          <div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✳</div><div className="art-code">&lt;/&gt;</div>
        </div>
        <div className="hero-bottom"><span><span className="live-dot" /> BUILT BY DEVELOPERS, FOR DEVELOPERS</span><span>GOOD IDEAS TRAVEL FAR <ArrowDown size={13} /></span></div>
      </section>
      <section className="content-layout">
        <div className="feed-main">
          <div className="feed-topline">
            <div><span className="eyebrow"><span className="eyebrow-dot" /> THE COMMUNITY FEED</span><h2>Fresh from the community<span className="title-period">.</span></h2></div>
            <div className="feed-sort"><span className="sort-icon"><Flame size={14} /></span> Latest stories</div>
          </div>
          <form className="search-box" onSubmit={(event) => { event.preventDefault(); setPage(1) }}>
            <Search size={18} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search stories, topics, or authors..." aria-label="Search stories" />
            {query && <button type="button" onClick={() => updateQuery('')} aria-label="Clear search"><X size={16} /></button>}
            <kbd>↵</kbd>
          </form>
          <div className="active-filters">
            {activeTag ? <button type="button" className="filter-chip" onClick={() => chooseTag(activeTag)}><Tag size={12} /> {activeTag}<X size={13} /></button> : <span><span className="filter-dot" /> Showing all stories</span>}
            <span className="story-count">{stories.length ? `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}` : ''}</span>
          </div>
          {loading ? <Loading /> : error ? (
            <div className="empty-state"><span className="empty-icon"><X size={20} /></span><h3>We couldn't load the feed</h3><p>{error}</p><button className="button button-outline" type="button" onClick={() => { setLoading(true); setError(''); setReloadIndex((value) => value + 1) }}>Try again</button></div>
          ) : stories.length ? (
            <div className="story-list">{stories.map((story) => <StoryCard key={story._id} story={story} />)}</div>
          ) : (
            <div className="empty-state"><span className="empty-icon"><Search size={20} /></span><h3>No stories found</h3><p>Try a different search, or clear the topic filter to see more.</p><button className="button button-outline" type="button" onClick={clearFilters}>Clear filters</button></div>
          )}
          {!loading && totalPages > 1 && <div className="pagination"><button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}><ArrowLeft size={15} /> Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>Next <ArrowRight size={15} /></button></div>}
        </div>
        <Sidebar tags={tags} activeTag={activeTag} onTagClick={chooseTag} />
      </section>
    </main>
  )
}

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading label="Checking your account" />
  return user ? children : <Navigate to="/login" replace />
}

function AuthPage({ register = false }) {
  const { user, signIn } = useAuth()
  const [fields, setFields] = useState({ name: '', username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signIn(fields, register ? 'register' : 'login')
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration"><div className="auth-orbit" /><div className="auth-decoration-mark"><Code2 size={38} /></div><span className="auth-decoration-text">A community<br />of builders.</span></div>
      <section className="auth-card">
        <span className="eyebrow"><span className="eyebrow-dot" /> YOUR CORNER OF THE WEB</span>
        <h1>{register ? 'Make yourself at home.' : 'Welcome back.'}</h1>
        <p className="auth-lede">{register ? 'Create an account and start sharing what you know.' : 'Pick up where your curiosity left off.'}</p>
        <ErrorMessage>{error}</ErrorMessage>
        <form className="form-stack" onSubmit={submit}>
          {register && <label>Your name<input required minLength="2" maxLength="60" autoComplete="name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} placeholder="Ada Lovelace" /></label>}
          {register && <label>Username<div className="input-with-prefix"><span>@</span><input required minLength="3" maxLength="24" pattern="[a-zA-Z0-9_-]+" autoComplete="username" value={fields.username} onChange={(event) => setFields({ ...fields, username: event.target.value })} placeholder="yourhandle" /></div></label>}
          <label>Email address<input required type="email" maxLength="254" autoComplete="email" value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength="8" maxLength="72" autoComplete={register ? 'new-password' : 'current-password'} value={fields.password} onChange={(event) => setFields({ ...fields, password: event.target.value })} placeholder={register ? 'At least 8 characters' : 'Your password'} /></label>
          <button className="button button-dark button-block" type="submit" disabled={busy}>{busy ? 'One moment...' : register ? 'Create account' : 'Log in'} <ArrowRight size={16} /></button>
        </form>
        <p className="auth-switch">{register ? 'Already have an account?' : 'New to PenYourPlot?'} <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link></p>
        <div className="auth-privacy"><Check size={13} /> Your data stays yours. Always.</div>
      </section>
    </main>
  )
}

function Markdown({ children }) {
  return (
    <ReactMarkdown components={{
      code({ className, children: code, ...props }) {
        const match = /language-(\w+)/.exec(className || '')
        return match
          ? <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div">{String(code).replace(/\n$/, '')}</SyntaxHighlighter>
          : <code className={className} {...props}>{code}</code>
      },
      a({ href, children: linkChildren, ...props }) {
        const external = href?.startsWith('http')
        return <a href={href} {...props} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>{linkChildren}</a>
      },
    }}>{children}</ReactMarkdown>
  )
}

function StoryPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [story, setStory] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api(`/blogs/${encodeURIComponent(slug)}`)
      .then(({ story: loadedStory }) => setStory(loadedStory))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const deleteStory = async () => {
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    try {
      await api(`/blogs/${story._id}`, { method: 'DELETE' })
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <Loading />
  if (!story) return <main className="narrow-page"><ErrorMessage>{error || 'Story not found.'}</ErrorMessage><Link className="text-link" to="/">Back to the feed</Link></main>
  const isOwner = user && story.author?._id === user.id

  return (
    <main className="story-page">
      <Link to="/" className="back-link"><ArrowLeft size={15} /> Back to the feed</Link>
      {story.status === 'draft' && <div className="draft-banner"><FileText size={16} /> This is a draft. Only you can see it.</div>}
      <article>
        <header className="story-header">
          <div className="story-tags story-header-tags">{story.tags.map((tag) => <TagPill key={tag}>{tag}</TagPill>)}</div>
          <h1>{story.title}</h1>
          <p className="story-dek">{story.description}</p>
          <div className="story-author-row">
            <Link to={`/author/${story.author?.username}`} className="author-inline"><Avatar name={story.author?.name} /><span><strong>{story.author?.name}</strong><small>@{story.author?.username}</small></span></Link>
            <span className="byline-meta">{formatDate(story.publishedAt || story.updatedAt)} <span className="dot-separator">·</span> {readingTime(story.body)}</span>
            {isOwner && <div className="owner-actions"><Link className="button button-outline button-small" to={`/write/${story._id}`}><PenLine size={14} /> Edit</Link><button className="button button-danger button-small" type="button" onClick={deleteStory}>Delete</button></div>}
          </div>
        </header>
        <div className="article-rule" />
        <div className="markdown-body"><Markdown>{story.body}</Markdown></div>
        <div className="story-end"><span>✳</span><p>Thanks for reading. Keep building.</p></div>
        <Link className="author-card" to={`/author/${story.author?.username}`}><Avatar name={story.author?.name} size="large" /><span><small>WRITTEN BY</small><strong>{story.author?.name}</strong><span>@{story.author?.username}</span></span><ArrowUpRight size={18} /></Link>
      </article>
      <ErrorMessage>{error && story ? error : ''}</ErrorMessage>
    </main>
  )
}

const emptyDraft = { title: '', description: '', body: '', tags: '', status: 'draft' }
function Editor() {
  const { id } = useParams()
  const { user } = useAuth()
  const [draft, setDraft] = useState(emptyDraft)
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    api(`/blogs/${id}`)
      .then(({ story }) => {
        if (story.author?._id !== user.id) throw new Error('You can only edit your own stories.')
        setDraft({ title: story.title, description: story.description, body: story.body, tags: story.tags.join(', '), status: story.status })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, user.id])

  const save = async (status) => {
    setBusy(true)
    setError('')
    const payload = { ...draft, status, tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean) }
    try {
      const data = id
        ? await api(`/blogs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await api('/blogs', { method: 'POST', body: JSON.stringify(payload) })
      navigate(`/story/${data.story.slug}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Opening your editor" />
  return (
    <main className="editor-page">
      <div className="editor-top"><Link to="/" className="back-link"><ArrowLeft size={15} /> Back to feed</Link><span className="editor-status"><span /> {draft.status === 'draft' ? 'Saved as draft' : 'Ready to publish'}</span></div>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="editor-heading"><span className="eyebrow"><PenLine size={13} /> THE WRITING DESK</span><h1>{id ? 'Keep shaping your story.' : 'What have you learned?'}</h1><p>Good notes make great stories. Take your time.</p></div>
      <div className="editor-card">
        <label className="editor-label">STORY TITLE<input className="title-input" required maxLength="120" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Give your story a clear, human title..." /></label>
        <label className="editor-label">SHORT DESCRIPTION<input maxLength="240" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What will someone take away from reading this?" /></label>
        <label className="editor-label">TOPICS <span className="label-hint">Separate with commas</span><div className="tags-input"><Tag size={16} /><input value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="react, webdev, learning" /></div></label>
        <div className="editor-label body-label"><div className="body-toolbar"><span>YOUR STORY</span><div className="editor-tabs"><button className={!preview ? 'tab-active' : ''} type="button" onClick={() => setPreview(false)}>Write</button><button className={preview ? 'tab-active' : ''} type="button" onClick={() => setPreview(true)}>Preview</button></div><span className="markdown-hint"><Code2 size={13} /> Markdown supported</span></div>
          {preview ? <div className="markdown-body editor-preview"><Markdown>{draft.body || '*Your preview will show up here.*'}</Markdown></div> : <textarea required minLength="40" maxLength="50000" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder={'Start with the moment something clicked...\n\nWrite in Markdown. Use triple backticks for code blocks:\n\n```js\nconsole.log("hello, world")\n```'} />}
        </div>
      </div>
      <div className="editor-actions"><span>Drafts are private until you publish.</span><div><button className="button button-outline" type="button" disabled={busy} onClick={() => save('draft')}>{busy ? 'Saving...' : 'Save draft'}</button><button className="button button-dark" type="button" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving...' : 'Publish story'} <ArrowUpRight size={15} /></button></div></div>
    </main>
  )
}

function Drafts() {
  const [stories, setStories] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api('/blogs/mine')
      .then(({ stories: ownStories }) => setStories(ownStories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])
  return (
    <main className="narrow-page drafts-page">
      <span className="eyebrow"><FileText size={13} /> YOUR WRITING DESK</span><h1>Your stories<span className="title-period">.</span></h1><p className="page-lede">The published pieces and works in progress that are yours.</p>
      <div className="drafts-toolbar"><span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span><Link to="/write" className="button button-dark button-small"><PenLine size={14} /> New story</Link></div>
      <ErrorMessage>{error}</ErrorMessage>
      {loading ? <Loading /> : stories.length ? <div className="story-list">{stories.map((story) => <div key={story._id} className="draft-row"><div className="draft-row-status"><span className={`status-badge ${story.status}`}>{story.status === 'draft' ? 'Draft' : 'Published'}</span><time>{formatDate(story.updatedAt)}</time></div><StoryCard story={story} compact /><Link className="draft-edit" to={`/write/${story._id}`} aria-label={`Edit ${story.title}`}><PenLine size={16} /></Link></div>)}</div> : <div className="empty-state"><span className="empty-icon"><PenLine size={20} /></span><h3>Your first story starts here</h3><p>Capture a lesson, a thought, or a small win worth sharing.</p><Link to="/write" className="button button-dark">Write a story <ArrowRight size={15} /></Link></div>}
    </main>
  )
}

function ProfileEditor() {
  const { user, updateProfile } = useAuth()
  const [fields, setFields] = useState({ name: user.name, bio: user.bio || '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user: updatedUser } = await api('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(fields),
      })
      updateProfile(updatedUser)
      navigate(`/author/${updatedUser.username}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="narrow-page profile-editor-page">
      <span className="eyebrow"><UserRound size={13} /> YOUR PUBLIC PROFILE</span>
      <h1>Make it yours<span className="title-period">.</span></h1>
      <p className="page-lede">A few details help readers get to know the person behind the stories.</p>
      <ErrorMessage>{error}</ErrorMessage>
      <form className="profile-form" onSubmit={submit}>
        <div className="profile-preview"><Avatar name={fields.name || user.name} size="large" /><span><strong>{fields.name || user.name}</strong><small>@{user.username}</small></span></div>
        <label className="editor-label">DISPLAY NAME<input required minLength="2" maxLength="60" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} /></label>
        <label className="editor-label">BIO <span className="label-hint">Up to 280 characters</span><textarea maxLength="280" value={fields.bio} onChange={(event) => setFields({ ...fields, bio: event.target.value })} placeholder="What do you build? What are you learning?" /></label>
        <div className="profile-form-actions"><Link className="button button-outline" to={`/author/${user.username}`}>Cancel</Link><button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save profile'} <Check size={15} /></button></div>
      </form>
    </main>
  )
}

function AuthorPage() {
  const { username } = useParams()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stories, setStories] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api(`/users/${encodeURIComponent(username)}`)
      .then((data) => { setProfile(data.user); setStories(data.stories) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [username])
  if (loading) return <Loading label="Finding this author" />
  if (!profile) return <main className="narrow-page"><ErrorMessage>{error || 'Author not found.'}</ErrorMessage><Link className="text-link" to="/">Back to the feed</Link></main>
  const ownProfile = user?.username === profile.username
  return (
    <main className="narrow-page author-page">
      <div className="profile-cover"><span className="profile-orbit" /><span className="profile-mark"><Code2 size={25} /></span></div>
      <div className="profile-main"><Avatar name={profile.name} size="profile" />{ownProfile && <div className="profile-actions"><Link to="/settings" className="button button-outline button-small"><PenLine size={14} /> Edit profile</Link><Link to="/my-drafts" className="button button-outline button-small"><FileText size={14} /> Manage stories</Link></div>}<h1>{profile.name}</h1><p className="profile-handle">@{profile.username}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-stats"><span><strong>{stories.length}</strong> {stories.length === 1 ? 'story' : 'stories'}</span><span><span className="live-dot" /> MEMBER OF PENYOURPLOT</span></div></div>
      <section className="profile-stories"><div className="section-label"><span><FileText size={15} /> STORIES BY {profile.name.split(' ')[0].toUpperCase()}</span><span>{stories.length}</span></div><ErrorMessage>{error}</ErrorMessage>{stories.length ? <div className="story-list">{stories.map((story) => <StoryCard key={story._id} story={story} />)}</div> : <div className="empty-state"><h3>No published stories yet</h3><p>There will be something good here soon.</p></div>}</section>
    </main>
  )
}

function NotFound() {
  return <main className="narrow-page not-found"><span className="eyebrow"><Code2 size={14} /> 404 — LOST IN THE STACK</span><h1>This page took a wrong turn<span className="title-period">.</span></h1><p>We couldn't find what you were looking for. The good stories are still here, though.</p><Link className="button button-dark" to="/">Back to the feed <ArrowRight size={16} /></Link></main>
}

function Footer() {
  return <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark"><Code2 size={15} /></span><span>Pen<span className="brand-accent">YourPlot</span></span></Link>  <span>Made for the people who make the internet.</span><span>© {currentYear} PenYourPlot community</span></footer>
}

function AppRoutes() {
  const { loading } = useAuth()
  const { theme } = useTheme()

  return (
    <div className="app-shell" data-theme={theme}>
      <Header />
      {loading ? <Loading label="Getting things ready" /> : (
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/story/:slug" element={<StoryPage />} />
          <Route path="/author/:username" element={<AuthorPage />} />
          <Route path="/write" element={<Protected><Editor /></Protected>} />
          <Route path="/write/:id" element={<Protected><Editor /></Protected>} />
          <Route path="/my-drafts" element={<Protected><Drafts /></Protected>} />
          <Route path="/settings" element={<Protected><ProfileEditor /></Protected>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
      <Footer />
    </div>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('penyourplot-theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('penyourplot-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <AppRoutes />
        </ThemeContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  )
}
