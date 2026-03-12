import { describe, it, expect } from "vitest";
import {
  emptyProfile,
  parseInterests,
  formatInterests,
  mergeInterests,
} from "../src/state/interests.js";
import type { Interest, InterestProfile } from "../src/types.js";

describe("emptyProfile", () => {
  it("returns object with four empty arrays", () => {
    const profile = emptyProfile();
    expect(profile).toEqual({
      high: [],
      moderate: [],
      pinned: [],
      blocked: [],
    });
  });

  it("returns a new object each time", () => {
    const a = emptyProfile();
    const b = emptyProfile();
    expect(a).not.toBe(b);
    a.high.push({ topic: "test", weight: 1 });
    expect(b.high).toHaveLength(0);
  });
});

describe("parseInterests", () => {
  it("parses a full markdown document", () => {
    const markdown = `# Interests

## High Interest
- TypeScript (weight: 0.90)
- Rust (weight: 0.75)

## Moderate Interest
- Go (weight: 0.50)

## Pinned (always include)
- AI safety

## Blocked (never include)
- Celebrity gossip
`;

    const profile = parseInterests(markdown);
    expect(profile.high).toHaveLength(2);
    expect(profile.high[0]).toEqual({
      topic: "TypeScript",
      weight: 0.9,
      pinned: false,
      blocked: false,
    });
    expect(profile.high[1]).toEqual({
      topic: "Rust",
      weight: 0.75,
      pinned: false,
      blocked: false,
    });
    expect(profile.moderate).toHaveLength(1);
    expect(profile.moderate[0]).toEqual({
      topic: "Go",
      weight: 0.5,
      pinned: false,
      blocked: false,
    });
    expect(profile.pinned).toHaveLength(1);
    expect(profile.pinned[0]).toEqual({
      topic: "AI safety",
      weight: 1.0,
      pinned: true,
      blocked: false,
    });
    expect(profile.blocked).toHaveLength(1);
    expect(profile.blocked[0]).toEqual({
      topic: "Celebrity gossip",
      weight: 1.0,
      pinned: false,
      blocked: true,
    });
  });

  it("returns empty profile for empty input", () => {
    const profile = parseInterests("");
    expect(profile).toEqual(emptyProfile());
  });

  it("handles partial sections", () => {
    const markdown = `## High Interest
- Node.js (weight: 0.85)
`;
    const profile = parseInterests(markdown);
    expect(profile.high).toHaveLength(1);
    expect(profile.high[0]!.topic).toBe("Node.js");
    expect(profile.high[0]!.weight).toBe(0.85);
    expect(profile.moderate).toHaveLength(0);
    expect(profile.pinned).toHaveLength(0);
    expect(profile.blocked).toHaveLength(0);
  });

  it("assigns default weight when not specified", () => {
    const markdown = `## High Interest
- TypeScript

## Moderate Interest
- Go
`;
    const profile = parseInterests(markdown);
    expect(profile.high[0]!.weight).toBe(0.8);
    expect(profile.moderate[0]!.weight).toBe(0.5);
  });

  it("ignores lines outside of a known section", () => {
    const markdown = `## Unknown Section
- Should be ignored

## High Interest
- Real topic (weight: 0.70)
`;
    const profile = parseInterests(markdown);
    expect(profile.high).toHaveLength(1);
    expect(profile.high[0]!.topic).toBe("Real topic");
  });
});

describe("formatInterests", () => {
  it("formats a profile to markdown", () => {
    const profile: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 0.9 }],
      moderate: [{ topic: "Go", weight: 0.5 }],
      pinned: [{ topic: "AI safety", weight: 1.0, pinned: true }],
      blocked: [
        { topic: "Celebrity gossip", weight: 1.0, blocked: true },
      ],
    };

    const output = formatInterests(profile);
    expect(output).toContain("# Interests");
    expect(output).toContain("## High Interest");
    expect(output).toContain("- TypeScript (weight: 0.90)");
    expect(output).toContain("## Moderate Interest");
    expect(output).toContain("- Go (weight: 0.50)");
    expect(output).toContain("## Pinned (always include)");
    expect(output).toContain("- AI safety");
    expect(output).toContain("## Blocked (never include)");
    expect(output).toContain("- Celebrity gossip");
  });

  it("omits empty sections", () => {
    const profile: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 0.9 }],
      moderate: [],
      pinned: [],
      blocked: [],
    };
    const output = formatInterests(profile);
    expect(output).toContain("## High Interest");
    expect(output).not.toContain("## Moderate Interest");
    expect(output).not.toContain("## Pinned");
    expect(output).not.toContain("## Blocked");
  });

  it("roundtrips with parseInterests", () => {
    const profile: InterestProfile = {
      high: [
        { topic: "TypeScript", weight: 0.9 },
        { topic: "Rust", weight: 0.75 },
      ],
      moderate: [{ topic: "Go", weight: 0.5 }],
      pinned: [{ topic: "AI safety", weight: 1.0, pinned: true }],
      blocked: [
        { topic: "Celebrity gossip", weight: 1.0, blocked: true },
      ],
    };

    const markdown = formatInterests(profile);
    const parsed = parseInterests(markdown);

    expect(parsed.high).toHaveLength(2);
    expect(parsed.high[0]!.topic).toBe("TypeScript");
    expect(parsed.high[0]!.weight).toBe(0.9);
    expect(parsed.high[1]!.topic).toBe("Rust");
    expect(parsed.high[1]!.weight).toBe(0.75);
    expect(parsed.moderate).toHaveLength(1);
    expect(parsed.moderate[0]!.topic).toBe("Go");
    expect(parsed.pinned).toHaveLength(1);
    expect(parsed.pinned[0]!.topic).toBe("AI safety");
    expect(parsed.blocked).toHaveLength(1);
    expect(parsed.blocked[0]!.topic).toBe("Celebrity gossip");
  });
});

describe("mergeInterests", () => {
  it("decays existing weights", () => {
    const existing: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 1.0 }],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const result = mergeInterests(existing, [], 0.9);
    // 1.0 * 0.9 = 0.9, still >= 0.65 so in high
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.weight).toBeCloseTo(0.9);
  });

  it("boosts weight on overlap with new interests", () => {
    const existing: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 0.8 }],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const newInterests: Interest[] = [
      { topic: "TypeScript", weight: 0.5 },
    ];

    const result = mergeInterests(existing, newInterests, 0.9);
    // Decayed: 0.8 * 0.9 = 0.72, then boosted: 0.72 + 0.5 * 0.3 = 0.87
    expect(result.high[0]!.weight).toBeCloseTo(0.87);
  });

  it("adds brand new interests from new list", () => {
    const existing: InterestProfile = {
      high: [],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const newInterests: Interest[] = [{ topic: "Rust", weight: 0.7 }];
    const result = mergeInterests(existing, newInterests, 0.9);
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.topic).toBe("Rust");
    expect(result.high[0]!.weight).toBe(0.7);
  });

  it("categorizes by threshold: >=0.65 high, >=0.3 moderate, <0.3 dropped", () => {
    const existing: InterestProfile = {
      high: [
        { topic: "High", weight: 0.8 },
        { topic: "Mid", weight: 0.5 },
        { topic: "Low", weight: 0.25 },
      ],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const result = mergeInterests(existing, [], 0.9);
    // High: 0.8 * 0.9 = 0.72 -> high
    // Mid: 0.5 * 0.9 = 0.45 -> moderate
    // Low: 0.25 * 0.9 = 0.225 -> dropped (below 0.3)
    expect(result.high).toHaveLength(1);
    expect(result.high[0]!.topic).toBe("High");
    expect(result.moderate).toHaveLength(1);
    expect(result.moderate[0]!.topic).toBe("Mid");
  });

  it("excludes pinned topics from merge", () => {
    const existing: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 0.8 }],
      moderate: [],
      pinned: [{ topic: "TypeScript", weight: 1.0, pinned: true }],
      blocked: [],
    };

    const result = mergeInterests(existing, [], 0.9);
    // TypeScript is pinned, so it should be excluded from high/moderate
    expect(result.high).toHaveLength(0);
    expect(result.moderate).toHaveLength(0);
    expect(result.pinned).toHaveLength(1);
    expect(result.pinned[0]!.topic).toBe("TypeScript");
  });

  it("excludes blocked topics from merge", () => {
    const existing: InterestProfile = {
      high: [],
      moderate: [],
      pinned: [],
      blocked: [
        { topic: "Celebrity gossip", weight: 1.0, blocked: true },
      ],
    };

    const newInterests: Interest[] = [
      { topic: "Celebrity gossip", weight: 0.9 },
    ];

    const result = mergeInterests(existing, newInterests, 0.9);
    expect(result.high).toHaveLength(0);
    expect(result.moderate).toHaveLength(0);
    expect(result.blocked).toHaveLength(1);
  });

  it("caps boosted weight at 1.0", () => {
    const existing: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 1.0 }],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const newInterests: Interest[] = [
      { topic: "TypeScript", weight: 1.0 },
    ];

    const result = mergeInterests(existing, newInterests, 1.0);
    // 1.0 * 1.0 = 1.0, then 1.0 + 1.0*0.3 = 1.3, capped to 1.0
    expect(result.high[0]!.weight).toBe(1.0);
  });

  it("preserves pinned and blocked lists from existing profile", () => {
    const existing: InterestProfile = {
      high: [],
      moderate: [],
      pinned: [{ topic: "AI safety", weight: 1.0, pinned: true }],
      blocked: [
        { topic: "Spam", weight: 1.0, blocked: true },
      ],
    };

    const result = mergeInterests(existing, [], 0.9);
    expect(result.pinned).toHaveLength(1);
    expect(result.pinned[0]!.topic).toBe("AI safety");
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0]!.topic).toBe("Spam");
  });

  it("uses default decay factor of 0.9", () => {
    const existing: InterestProfile = {
      high: [{ topic: "TypeScript", weight: 1.0 }],
      moderate: [],
      pinned: [],
      blocked: [],
    };

    const result = mergeInterests(existing, []);
    expect(result.high[0]!.weight).toBeCloseTo(0.9);
  });
});
