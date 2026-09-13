require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "1mb" }));

// Trang chính
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Kiểm tra một redirect công khai
async function getRedirect(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0 Link-Key-AI"
    }
  });

  const location = response.headers.get("location");

  return {
    status: response.status,
    location: location || null
  };
}

// Kiểm tra link
app.post("/api/check", async (req, res) => {
  try {
    const { url } = req.body;

    if (!validUrl(url)) {
      return res.status(400).json({
        error: "Link không hợp lệ."
      });
    }

    const result = await getRedirect(url);

    res.json({
      ok: true,
      status: result.status,
      location: result.location,
      message: result.location
        ? "Đã tìm thấy chuyển hướng công khai."
        : "Không tìm thấy chuyển hướng công khai."
    });
  } catch (error) {
    res.status(500).json({
      error: "Không thể kiểm tra link này.",
      detail: error.message
    });
  }
});

// Xử lý chuỗi redirect công khai
app.post("/api/process", async (req, res) => {
  try {
    const { url } = req.body;

    if (!validUrl(url)) {
      return res.status(400).json({
        error: "Link không hợp lệ."
      });
    }

    let currentUrl = url;
    const steps = [];
    const maxSteps = 5;

    for (let i = 0; i < maxSteps; i++) {
      const result = await getRedirect(currentUrl);

      steps.push({
        from: currentUrl,
        status: result.status,
        to: result.location
      });

      if (!result.location) {
        return res.json({
          ok: true,
          finalUrl: currentUrl,
          steps,
          message:
            "Đã xử lý các chuyển hướng công khai. Nếu website yêu cầu CAPTCHA hoặc xác minh, hãy thực hiện thủ công trên trang đó."
        });
      }

      const nextUrl = new URL(result.location, currentUrl).toString();

      if (nextUrl === currentUrl) {
        break;
      }

      currentUrl = nextUrl;
    }

    res.json({
      ok: true,
      finalUrl: currentUrl,
      steps,
      message:
        "Đã xử lý tối đa 5 chuyển hướng công khai. CAPTCHA/anti-bot nếu có phải được người dùng thực hiện thủ công."
    });
  } catch (error) {
    res.status(500).json({
      error: "Không thể xử lý link.",
      detail: error.message
    });
  }
});

// Chatbot AI
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Bạn chưa nhập nội dung."
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions:
        "Bạn là Link Key AI. Hỗ trợ người dùng phân tích URL, redirect và hướng dẫn các bước hợp lệ trên website. Nếu gặp CAPTCHA, Cloudflare, anti-bot, paywall hoặc cơ chế bảo vệ, yêu cầu người dùng tự thực hiện xác minh. Không hướng dẫn hoặc thực hiện bypass các cơ chế bảo vệ.",
      input: message
    });

    res.json({
      reply: response.output_text
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Chatbot đang gặp lỗi.",
      detail: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Link Key AI running on port ${port}`);
});
