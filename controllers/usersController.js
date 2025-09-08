const registerUser = (req, res) => {
  try {
    console.log(req)
    const { uid, role, data } = req.body || {};

    if (!uid || !role || !data) {
      return res.status(400).json({ error: "uid, role and data are required" });
    }

    // For example, extract nested fields:
    const { fullName, email, company, investmentFocus, phone, address } = data;

    // Here you can save to DB / Firebase
    console.log("Registering user:", { uid, role, fullName, email });

    res.status(201).json({
      message: "User registered successfully",
      uid,
      role,
      profile: data
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { registerUser };
