import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom' as const,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

// @turf/turf v7 and its deps are ESM-only — transpile them through SWC.
export default async () => {
  const nextJestConfig = await createJestConfig(customJestConfig)();
  return {
    ...nextJestConfig,
    transformIgnorePatterns: [
      '/node_modules/(?!(kdbush|quickselect|robust-predicates|geokdbush|tinyqueue|@turf)/).*/',
    ],
  };
};
