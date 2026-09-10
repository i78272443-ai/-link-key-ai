require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));

// Hiển thị website
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

// Kiểm tra 1 redirect công khai
async function getRedirect(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "Link-Key-AI/1.0"
    }
  });

  const location = response.headers.get("location");

  if (!location) {
    return {
      status: response.status,
      redirectedTo: null
    };
  }

  return {
    status: response.status,
    redirectedTo: new URL(location, url).href
  };
}

// Kiểm tra link
app.post("/api/check", async (req, res) => {
  const url = String(req.body?.url || "").trim();

  if (!validUrl(url)) {
    return res.status(400).json({
      error: "URL không hợp lệ."
    });
  }

  try {
    const result = await getRedirect(url);

    res.json({
      status: result.status,
      redirectedTo: result.redirectedTo,
      message: result.redirectedTo
        ? "Phát hiện chuyển hướng công khai."
        : "Không phát hiện chuyển hướng công khai."
    });
  } catch (err) {
    res.status(502).json({
      error: "Không thể kiểm tra URL từ máy chủ.",
      detail: err.message
    });
  }
});

// Xử lý chuỗi redirect công khai
app.post("/api/process", async (req, res) => {
  const startUrl = String(req.body?.url || "").trim();

  if (!validUrl(startUrl)) {
    return res.status(400).json({
      error: "URL không hợp lệ."
    });
  }

  const history = [];
  let currentUrl = startUrl;

  try {
    for (let i = 0; i < 5; i++) {
      const result = await getRedirect(currentUrl);

      history.push({
        url: currentUrl,
        status: result.status
      });

      if (!result.redirectedTo) {
        return res.json({
          success: true,
          finalUrl: currentUrl,
          steps: history,
          message: "Đã xử lý xong các chuyển hướng công khai."
        });
      }

      const nextUrl = result.redirectedTo;

      if (!validUrl(nextUrl)) {
        return res.json({
          success: false,
          finalUrl: currentUrl,
          steps: history,
          message: "Chuyển hướng tiếp theo không phải URL HTTP/HTTPS hợp lệ."
        });
      }

      if (nextUrl === currentUrl) {
        break;
      }

      currentUrl = nextUrl;
    }

    res.json({
      success: true,
      finalUrl: currentUrl,
      steps: history,
      message:
        "Đã xử lý tối đa 5 bước chuyển hướng công khai."
    });
  } catch (err) {
    res.status(502).json({
      error: "Không thể xử lý link từ máy chủ.",
      detail: err.message
    });
  }
});

// Chatbot AI
app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({
      error: "Thiếu nội dung."
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "Chưa cấu hình OPENAI_API_KEY."
    });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const result = await client.responses.create({
      model: "gpt-5-mini",
      instructions:
        "Bạn là Link Key AI, chatbot hỗ trợ người dùng hiểu và xử lý URL theo các bước công khai, hợp lệ. Có thể giải thích redirect và hướng dẫn người dùng mở trang đích. Không hướng dẫn bypass CAPTCHA, Cloudflare, anti-bot, paywall, quảng cáo bắt buộc hoặc cơ chế bảo vệ truy cập.",
      input: message
    });

    res.json({
      answer: result.output_text || "Không nhận được câu trả lời từ AI."
    });
  } catch (err) {
    res.status(500).json({
      error: "Lỗi gọi AI.",
      detail: err.message
    });
  }
});

app.listen(port, () => {
  console.log(`Link Key AI running on port ${port}`);
});
