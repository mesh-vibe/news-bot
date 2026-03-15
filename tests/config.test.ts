import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import {
  defaultConfig,
  loadConfig,
  saveConfig,
  defaultConfigContent,
} from "../src/state/config.js";
import {
  DEFAULT_MODEL,
  DEFAULT_MAX_ARTICLES,
  DEFAULT_SCAN_INTERVAL,
  DEFAULT_HISTORY_DAYS,
  DEFAULT_MIN_SCORE,
} from "../src/constants.js";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
  };
});

const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);
const mockedMkdirSync = vi.mocked(mkdirSync);
const mockedRenameSync = vi.mocked(renameSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("defaultConfig", () => {
  it("returns expected defaults", () => {
    const config = defaultConfig();
    expect(config.model).toBe(DEFAULT_MODEL);
    expect(config.maxArticles).toBe(DEFAULT_MAX_ARTICLES);
    expect(config.scanInterval).toBe(DEFAULT_SCAN_INTERVAL);
    expect(config.historyDays).toBe(DEFAULT_HISTORY_DAYS);
    expect(config.minScore).toBe(DEFAULT_MIN_SCORE);
  });

  it("returns a new object each call", () => {
    const a = defaultConfig();
    const b = defaultConfig();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe("loadConfig", () => {
  it("parses a valid config file", () => {
    mockedReadFileSync.mockReturnValue(`# Newsbot Configuration

- **model**: claude-sonnet-4-5-20250514
- **maxArticles**: 30
- **scanInterval**: 6 hours
- **historyDays**: 14
- **minScore**: 0.5
`);
    const config = loadConfig();
    expect(config.model).toBe("claude-sonnet-4-5-20250514");
    expect(config.maxArticles).toBe(30);
    expect(config.scanInterval).toBe("6 hours");
    expect(config.historyDays).toBe(14);
    expect(config.minScore).toBe(0.5);
  });

  it("returns defaults when file is missing", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const config = loadConfig();
    expect(config).toEqual(defaultConfig());
  });

  it("fills missing fields with defaults", () => {
    mockedReadFileSync.mockReturnValue(`# Newsbot Configuration

- **model**: custom-model
`);
    const config = loadConfig();
    expect(config.model).toBe("custom-model");
    expect(config.maxArticles).toBe(DEFAULT_MAX_ARTICLES);
    expect(config.scanInterval).toBe(DEFAULT_SCAN_INTERVAL);
    expect(config.historyDays).toBe(DEFAULT_HISTORY_DAYS);
    expect(config.minScore).toBe(DEFAULT_MIN_SCORE);
  });

  it("falls back to defaults for non-numeric values", () => {
    mockedReadFileSync.mockReturnValue(`# Newsbot Configuration

- **maxArticles**: not-a-number
- **historyDays**: abc
- **minScore**: xyz
`);
    const config = loadConfig();
    expect(config.maxArticles).toBe(DEFAULT_MAX_ARTICLES);
    expect(config.historyDays).toBe(DEFAULT_HISTORY_DAYS);
    expect(config.minScore).toBe(DEFAULT_MIN_SCORE);
  });

  it("returns defaults for empty file", () => {
    mockedReadFileSync.mockReturnValue("");
    const config = loadConfig();
    expect(config).toEqual(defaultConfig());
  });

  it("ignores lines that don't match config pattern", () => {
    mockedReadFileSync.mockReturnValue(`# Newsbot Configuration

Some random text here
- Not a valid config line
- **model**: valid-model
Another random line
`);
    const config = loadConfig();
    expect(config.model).toBe("valid-model");
  });
});

describe("saveConfig", () => {
  it("writes markdown config format", () => {
    const config = {
      model: "test-model",
      maxArticles: 50,
      scanInterval: "2 hours",
      historyDays: 30,
      minScore: 0.3,
    };
    saveConfig(config);
    // atomicWrite calls mkdirSync, writeFileSync, renameSync
    expect(mockedMkdirSync).toHaveBeenCalled();
    expect(mockedWriteFileSync).toHaveBeenCalled();
    expect(mockedRenameSync).toHaveBeenCalled();
    const writtenContent = mockedWriteFileSync.mock.calls[0]![1] as string;
    expect(writtenContent).toContain("- **model**: test-model");
    expect(writtenContent).toContain("- **maxArticles**: 50");
    expect(writtenContent).toContain("- **scanInterval**: 2 hours");
    expect(writtenContent).toContain("- **historyDays**: 30");
    expect(writtenContent).toContain("- **minScore**: 0.3");
  });
});

describe("defaultConfigContent", () => {
  it("produces parseable content that roundtrips to defaults", () => {
    const content = defaultConfigContent();
    mockedReadFileSync.mockReturnValue(content);
    const config = loadConfig();
    expect(config).toEqual(defaultConfig());
  });
});
