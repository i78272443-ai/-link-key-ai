require("dotenv").config();
const express = require("express");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

app.post("/api/check", async (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!validUrl(url)) {
    return res.status(400).json({ error: "URL không hợp lệ." });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "Link-Key-AI/1.0" }
    });

    const location = response.headers.get("location");
    res.json({
      status: response.status,
      redirectedTo: location || null,
      message: location
        ? "Website trả về một chuyển hướng công khai."
        : "Không phát hiện chuyển hướng công khai ở phản hồi đầu tiên."
    });
  } catch (err) {
    res.status(502).json({
      error: "Không thể kiểm tra URL từ máy chủ.",
      detail: err.message
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "Thiếu tin nhắn." });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Chưa cấu hình OPENAI_API_KEY trên máy chủ." });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: "gpt-5-mini",
      instructions:
        "Bạn là Link Key AI, chatbot hỗ trợ người dùng hiểu URL, redirect và các bước hợp lệ trên website. Trả lời bằng tiếng Việt, ngắn gọn và dễ hiểu. Không hướng dẫn bypass CAPTCHA, Cloudflare, anti-bot, paywall hoặc cơ chế bảo vệ/truy cập trái phép.",
      input: message
    });

    res.json({ answer: result.output_text || "Không có phản hồi." });
  } catch (err) {
    res.status(500).json({ error: "Lỗi gọi AI.", detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`Link Key AI running on http://localhost:${port}`);
});
