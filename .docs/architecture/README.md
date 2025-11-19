# Architecture Documentation

This directory contains architecture documentation for major system components and design decisions.

## Documents

### [Questionnaire Response Store](./questionnaire-response-store.md)

Describes the Zustand-based store architecture for managing questionnaire analysis data. Covers:

- Per-slug store isolation
- Data persistence and multi-tab synchronization
- Selection-based filtering
- Background sync mechanisms

### [Batch Save Flow](./batch-save-flow.md)

Describes the batch save implementation that ensures all questionnaire responses are saved before session completion. Covers:

- Race condition fix for debounced auto-saves
- Transaction-based batch saving
- Error handling and retry mechanisms
- Beforeunload handler for best-effort saves

## Cross-References

- **Test Taking**: Batch save flow ensures responses are saved during test completion
- **Analysis Store**: Completed sessions are added to the store via `useTestAnalysisMutations`
- **API Endpoints**: See [API Documentation](../api/endpoints.md) for endpoint details
