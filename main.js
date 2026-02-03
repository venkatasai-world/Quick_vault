import express from "express";
import dotenv from "dotenv";
import connectDB from "./db.js";
import Data from "./models/Data.js";
import { requestLogger } from "./middleware/requestLogger.js";

dotenv.config();

connectDB().catch(err => {
  console.error("Database connection error:", err);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.static("public"));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(requestLogger);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/test", (req, res) => {
  res.json({ message: "Server is working!", timestamp: new Date() });
});

app.get("/test-retrieve", async (req, res) => {
  try {
    const testCode = 1234;
    const data = await Data.findOne({ code: testCode });
    res.json({
      message: "Retrieve route test",
      code: testCode,
      found: !!data,
      data: data
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/check-code/:code", async (req, res) => {
  try {
    const code = parseInt(req.params.code);
    if (isNaN(code)) {
      return res.json({ exists: false });
    }

    const existingData = await Data.findOne({ code: code });
    res.json({ exists: !!existingData, data: existingData });
  } catch (error) {
    console.error("Check code error:", error);
    res.status(500).json({ error: "Failed to check code", message: error.message });
  }
});

app.get("/retrieve/:code", async (req, res) => {
  try {
    const codeParam = req.params.code;
    const providedAnswer = req.query.answer ? req.query.answer.trim().toLowerCase() : null;

    if (!codeParam || codeParam.trim() === '') {
      return res.status(400).json({
        error: "Code parameter is required",
        success: false
      });
    }

    const code = parseInt(codeParam);
    if (isNaN(code)) {
      return res.status(400).json({
        error: "Invalid code. Please enter a valid number.",
        success: false
      });
    }

    const data = await Data.findOne({ code: code });

    if (!data) {
      return res.status(404).json({
        error: "No data found for this code",
        success: false,
        code: code
      });
    }

    if (data.securityQuestion && data.securityAnswer) {
      if (!providedAnswer || providedAnswer !== data.securityAnswer.toLowerCase()) {
        return res.json({
          success: true,
          restricted: true,
          question: data.securityQuestion,
          message: "Security answer required"
        });
      }
    }

    const dataObj = data.toObject ? data.toObject() : data;

    res.json({
      success: true,
      restricted: false,
      data: {
        _id: dataObj._id,
        title: dataObj.title,
        code: dataObj.code,
        createdAt: dataObj.createdAt,
        expiresAt: dataObj.expiresAt
      }
    });
  } catch (error) {
    console.error("Retrieve error:", error);
    res.status(500).json({
      error: "Failed to retrieve data",
      message: error.message,
      success: false
    });
  }
});

app.put("/update/:code", async (req, res) => {
  try {
    const code = parseInt(req.params.code);
    if (isNaN(code)) {
      return res.status(400).json({ error: "Invalid code" });
    }

    const { title, newCode } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (newCode) updateData.code = parseInt(newCode);

    const updatedData = await Data.findOneAndUpdate(
      { code: code },
      updateData,
      { new: true }
    );

    if (!updatedData) {
      return res.status(404).json({ error: "No data found for this code" });
    }

    res.json({
      success: true,
      message: "Data updated successfully",
      data: updatedData
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update data", message: error.message });
  }
});



app.post("/save-text", async (req, res) => {
  try {
    const { text, code, securityQuestion, securityAnswer } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const codeNum = code ? parseInt(code) : null;
    let dataEntry;
    let isUpdate = false;

    if (codeNum) {
      const existingData = await Data.findOne({ code: codeNum });
      if (existingData) {
        return res.status(400).json({
          error: "Code already in use. Please choose a different code.",
          success: false
        });
      } else {
        dataEntry = new Data({
          title: text,
          code: codeNum,
          securityQuestion: securityQuestion,
          securityAnswer: securityAnswer
        });
        await dataEntry.save();
      }
    } else {
      dataEntry = new Data({
        title: text,
        code: null,
        securityQuestion: securityQuestion,
        securityAnswer: securityAnswer
      });
      await dataEntry.save();
    }

    res.json({
      success: true,
      dataId: dataEntry._id,
      code: dataEntry.code,
      message: isUpdate ? "Text updated successfully" : "Text saved successfully"
    });
  } catch (error) {
    console.error("Save text error:", error);
    res.status(500).json({ error: "Failed to save text", message: error.message });
  }
});

app.post("/save-code", async (req, res) => {
  try {
    const { code, title } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const dataEntry = new Data({
      title: title || `Code: ${code}`,
      code: parseInt(code)
    });

    await dataEntry.save();

    res.json({
      success: true,
      dataId: dataEntry._id,
      message: "Code saved successfully"
    });
  } catch (error) {
    console.error("Save code error:", error);
    res.status(500).json({ error: "Failed to save code", message: error.message });
  }
});

app.get("/results", async (req, res) => {
  try {
    const allData = await Data.find().sort({ _id: -1 });
    res.render("results", { data: allData });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch data", message: error.message });
  }
});





app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (req.path.startsWith('/retrieve') ||
    req.path.startsWith('/check-code') || req.path.startsWith('/save-text') ||
    req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({
      error: err.message || "Internal server error",
      success: false
    });
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
