// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Import Jest DOM matchers
import '@testing-library/jest-dom'

// Setup for property-based testing
process.env.NODE_ENV = 'test'