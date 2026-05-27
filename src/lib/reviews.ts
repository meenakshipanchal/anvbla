import "server-only";
import { adminDb } from "./firebase-admin";

/* Reviews — a passenger rates the driver after a completed trip. Server-only. */

export type Review = {
  id: string;
  rideId: string;
  driverId: string;
  authorId: string;
  authorName: string;
  rating: number; // 1..5
  text: string;
  createdAt: number;
};

export async function createReview(r: Omit<Review, "id" | "createdAt">): Promise<string> {
  if (!adminDb) throw new Error("Firestore is not configured.");
  const ref = await adminDb.collection("reviews").add({ ...r, createdAt: Date.now() });
  return ref.id;
}

export async function listReviewsForDriver(driverId: string): Promise<Review[]> {
  if (!adminDb || !driverId) return [];
  try {
    const snap = await adminDb.collection("reviews").where("driverId", "==", driverId).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function hasReviewed(rideId: string, authorId: string): Promise<boolean> {
  if (!adminDb) return false;
  try {
    const snap = await adminDb
      .collection("reviews")
      .where("rideId", "==", rideId)
      .where("authorId", "==", authorId)
      .limit(1)
      .get();
    return !snap.empty;
  } catch {
    return false;
  }
}

export function driverRating(reviews: Review[]): { avg: number; count: number } {
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}
