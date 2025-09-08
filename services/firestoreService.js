import { db } from "../firebase.js";

export const createUser = async (uid, role, data = {}) => {
  return db.collection("users").doc(uid).set({
    role,
    profile: data,
    createdAt: db.FieldValue.serverTimestamp(), // 🔹 or admin.firestore.FieldValue.serverTimestamp() if needed
  });
};
