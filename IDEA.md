# Persona[i] - Personality Benchmark Platform

**Website**: [personai.review](https://personai.review)

## Project Overview

Persona[i] is a personality benchmarking platform that hosts DISC personality questionnaires. Users can discover their personality profile and compare it with various LLM models to see which AI personality matches them most closely.

## Core Features

### 1. DISC Personality Test
- Single questionnaire focusing on DISC personality assessment
- Users take the test and receive their DISC scores (Dominance, Influence, Steadiness, Conscientiousness)
- Clean, user-friendly interface for completing the questionnaire

### 2. LLM Comparison Feature
- Compare user personality scores with various LLM models (GPT-4, Claude, Gemini, etc.)
- Shows which LLM model is most similar to the user's personality profile
- Visual comparison of personality dimensions

### 3. CLI Tool for LLM Responses
- Command-line tool to run LLM models through the questionnaire
- Generates responses from various models
- Stores LLM responses in the database for comparison

### 4. Analysis & Results Page
- Displays user's DISC scores with visualizations
- Shows top LLM matches ranked by similarity
- Detailed comparison of personality profiles

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth**: BetterAuth with magic link authentication
- **Database**: Drizzle ORM with LibSQL/Turso
- **API**: tRPC for type-safe APIs
- **Styling**: Tailwind CSS
- **Package Manager**: Bun

## Future Enhancements

- Multiple questionnaire support
- Detailed personality insights
- Export/share results functionality
- Historical tracking of personality changes

