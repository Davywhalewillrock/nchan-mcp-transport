module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    "^nanoid(/(.*)|$)": "nanoid$1",
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 10000, // 增加超时时间，因为服务器启动可能需要一些时间
  transformIgnorePatterns: [
    'node_modules/(?!(@modelcontextprotocol|nanoid)/)'
  ]
};
