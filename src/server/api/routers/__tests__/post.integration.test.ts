import { describe, expect, it, beforeEach } from "vitest";
import { createTestDatabase, type TestDatabase } from "@/test-utils/db";
import { posts } from "@/server/db/schema";

/**
 * Integration test for post database operations.
 *
 * This test demonstrates:
 * - Testing database operations with in-memory SQLite
 * - Creating fresh database for each test (matches isolated test pattern)
 * - Testing CRUD operations with real database queries
 * - Complete isolation between tests
 */
describe("Post Database Operations", () => {
  let db: TestDatabase;

  beforeEach(async () => {
    // Create a fresh database for each test (matches isolated test pattern)
    db = await createTestDatabase();
  });

  it("should create a post", async () => {
    const result = await db
      .insert(posts)
      .values({ name: "Test Post" })
      .returning();

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Test Post");
    expect(result[0]?.id).toBeDefined();
    expect(result[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("should retrieve posts", async () => {
    // Insert a test post
    const inserted = await db
      .insert(posts)
      .values({ name: "Retrieval Test Post" })
      .returning();

    // Retrieve all posts
    const allPosts = await db.query.posts.findMany();

    expect(allPosts.length).toBe(1);
    expect(allPosts[0]?.id).toBe(inserted[0]?.id);
    expect(allPosts[0]?.name).toBe("Retrieval Test Post");
  });

  it("should retrieve the latest post", async () => {
    // Insert multiple posts with explicit timestamps to ensure ordering
    const now = new Date();
    const firstTime = new Date(now.getTime() - 2000); // 2 seconds ago
    const secondTime = new Date(now.getTime() - 1000); // 1 second ago
    const latestTime = now; // Now

    await db.insert(posts).values({ name: "First Post", createdAt: firstTime });
    await db
      .insert(posts)
      .values({ name: "Second Post", createdAt: secondTime });
    const latest = await db
      .insert(posts)
      .values({ name: "Latest Post", createdAt: latestTime })
      .returning();

    // Query for latest post
    const latestPost = await db.query.posts.findFirst({
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    expect(latestPost).toBeDefined();
    expect(latestPost?.name).toBe("Latest Post");
    expect(latestPost?.id).toBe(latest[0]?.id);
  });

  it("should handle multiple posts", async () => {
    // Insert multiple posts
    const post1 = await db.insert(posts).values({ name: "Post 1" }).returning();
    const post2 = await db.insert(posts).values({ name: "Post 2" }).returning();
    const post3 = await db.insert(posts).values({ name: "Post 3" }).returning();

    // Verify all posts exist
    const allPosts = await db.query.posts.findMany();
    expect(allPosts.length).toBe(3);

    // Verify each post
    const names = allPosts.map((p) => p.name).sort();
    expect(names).toEqual(["Post 1", "Post 2", "Post 3"]);

    // Verify IDs
    const ids = allPosts.map((p) => p.id).sort();
    const expectedIds = [post1[0]?.id, post2[0]?.id, post3[0]?.id]
      .filter((id): id is number => id !== undefined)
      .sort();
    expect(ids).toEqual(expectedIds);
  });
});
