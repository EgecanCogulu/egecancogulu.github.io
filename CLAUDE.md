# CLAUDE.md — egecancogulu.github.io

Personal professional website for Ege Cogulu. Jekyll site hosted on GitHub Pages using the Academic Pages theme.

Live site: https://egecancogulu.github.io

---

## Development

### Local server
```bash
bundle exec jekyll serve --livereload
```
Visit http://localhost:4000. The `--livereload` flag auto-refreshes on file changes. Note: `_config.yml` changes require a server restart.

### Alternative (hawkins gem for livereload)
```bash
bundle exec jekyll liveserve
```

### Build only
```bash
bundle exec jekyll build
```

### Dependencies
```bash
bundle install
```

---

## Project Structure

```
_config.yml          # Site-wide settings — edit carefully, requires server restart
_data/
  navigation.yml     # Top nav links
_pages/
  about.md           # Home page / bio
  cv.html            # CV/Resume page
  publications.html  # Publications listing
  portfolio.html     # Portfolio listing
_posts/              # Blog posts (YYYY-MM-DD-title.md)
_publications/       # Academic publication entries
_portfolio/          # Portfolio project entries
_layouts/            # HTML templates (rarely edited)
_includes/           # Reusable HTML components (rarely edited)
_sass/               # Stylesheets (rarely edited)
images/              # All images, interactive HTML visualizations
files/               # Downloadable PDFs (resume, papers, thesis)
```

---

## Content Conventions

### Blog Posts (`_posts/`)

Filename format: `YYYY-MM-DD-slug.md`

Required front matter:
```yaml
---
title: 'Post Title'
date: YYYY-MM-DD
permalink: /posts/YYYY/MM/slug/
tags:
  - Tag One
  - Tag Two
---
```

- Write in Kramdown Markdown (GitHub Flavored Markdown compatible)
- LaTeX math: inline with `$$...$$`, block with `$$\n...\n$$`
- Embed interactive HTML visualizations via iframe:
  ```html
  <iframe src="/images/visualization.html" width="100%" height="500px" frameborder="0"></iframe>
  ```
- Code blocks use Rouge syntax highlighting with triple backticks and language tag
- Posts appear at `/posts/YYYY/MM/slug/` based on permalink in front matter

### Portfolio Items (`_portfolio/`)

Front matter:
```yaml
---
title: "Project Title"
excerpt: "Short description"
collection: portfolio
---
```

### Publications (`_publications/`)

Front matter:
```yaml
---
title: "Paper Title"
collection: publications
permalink: /publication/slug/
excerpt: 'Short excerpt'
date: YYYY-MM-DD
venue: 'Journal Name'
paperurl: '/files/paper.pdf'
citation: 'Author et al. (Year).'
category: firstauthor  # thesis | firstauthor | manuscripts
---
```

---

## Site Identity

- **Name:** Ege Cogulu
- **Role:** Data Scientist | Ph.D. in Physics
- **Employer:** Meta (Sr. Data Scientist, Jun 2025–present)
- **Location:** San Francisco
- **Email:** egecancogulu@gmail.com
- **GitHub:** EgecanCogulu
- **LinkedIn:** egecan-cogulu
- **Google Scholar:** https://scholar.google.com/citations?user=YzKgnmAAAAAJ&hl=en

---

## Navigation

Defined in `_data/navigation.yml`. Current links:
- Posts → /year-archive/
- Publications → /publications/
- Portfolio → /portfolio/
- Resume / CV → /cv/

To add a new nav item, edit `_data/navigation.yml`.

---

## Existing Blog Posts

| Date | Title | Tags |
|------|-------|------|
| 2024-11-11 | Bootstrapping for Confidence Intervals and A/B Testing | Data Science, A/B Testing |
| 2024-11-24 | The Counter-Intuitiveness of 'Random' | Probability, Randomness |
| 2024-12-17 | Double Round Robin Simulation | Simulation, Chess |
| 2025-02-02 | Bayesian vs. Frequentist Approach | Bayesian, Statistics |
| 2026-02-23 | The Ising Model: Phase Transitions | Physics, Monte Carlo |

Three posts (randomness, round-robin, ising-model) are currently untracked in git.

---

## Key Notes & Gotchas

- `future: true` is set in `_config.yml` — posts with future dates will still be published locally and on GitHub Pages
- `_config.yml` is NOT hot-reloaded; restart the server after any changes to it
- Interactive visualizations (Plotly, custom HTML5) live in `/images/` as `.html` files and are embedded via iframes
- MathJax / LaTeX rendering is supported in posts and portfolio items
- The `permalink` field in each post's front matter controls the URL — it must be set correctly or links will break
- PDF files for download go in `/files/`; images and HTML visualizations go in `/images/`
- Do not commit large binary files (videos, large PDFs) without checking file size first
- GitHub Pages uses the `master` branch for deployment; push to `master` to publish

---

## Content Themes

Blog posts follow two main themes:
1. **Data Science concepts** — A/B testing, bootstrapping, Bayesian inference, causal inference
2. **Physics / simulation** — Ising model, statistical mechanics, Monte Carlo methods

Portfolio items showcase technical depth: equations of motion, spin dynamics, LLGS equations.
