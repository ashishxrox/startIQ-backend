const { db, admin } = require("../firebase");

const bucket = admin.storage().bucket();

const registerStartup = async (req, res) => {
  try {
    const { uid, data } = req.body;

    let logoUrl = null;

    // If logo file uploaded, save to Firebase Storage
    if (req.file) {
      const fileName = `logos/${uid}_${Date.now()}.png`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        public: true,
      });

      // Make file publicly accessible
      await file.makePublic();
      logoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    await db.collection("startups").doc(uid).set({
      ...data,
      logo: logoUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ message: "Startup registered successfully!", logoUrl });
  } catch (error) {
    console.error("❌ Error registering startup:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { registerStartup };
