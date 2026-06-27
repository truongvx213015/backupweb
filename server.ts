import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 9000;

// Body parser with higher limit for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DB_FILE = path.join(process.cwd(), "db_love.json");

// Default initial state
const defaultDb = {
  profile: {
    anniversaryDate: "2025-02-14",
    user1Name: "Anh Quân",
    user1Avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
    user2Name: "Khánh Vy",
    user2Avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=256&auto=format&fit=crop",
    password: "love",
    musicTrackUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    musicTrackName: "Melody Nhẹ Nhàng 01"
  },
  memories: [
    {
      id: "mem-1",
      title: "Buổi hẹn hò đầu tiên",
      description: "Chúng mình đã ngồi nói chuyện suốt 3 tiếng đồng hồ ở quán cà phê nhỏ góc phố. Cảm giác ngượng ngùng nhưng vô cùng ấm áp.",
      photo: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop",
      date: "2025-02-14",
      location: "Quán cà phê Góc Phố, Hà Nội"
    },
    {
      id: "mem-2",
      title: "Chuyến du lịch biển đáng nhớ",
      description: "Cùng ngắm hoàng hôn buông xuống trên bãi cát. Cơn gió biển thổi nhẹ mát lạnh, tay trong tay hẹn ước đi cùng nhau thật xa.",
      photo: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
      date: "2025-05-20",
      location: "Bãi biển Mỹ Khê, Đà Nẵng"
    }
  ],
  letters: [
    {
      id: "let-1",
      title: "Gửi Vy của anh...",
      content: "Vy ơi, cảm ơn em đã bước vào cuộc sống của anh, mang theo cả một thế giới rực rỡ sắc màu. Mỗi ngày bên cạnh em đều là một ngày đặc biệt. Hãy cùng anh đi qua thêm thật nhiều mùa yêu thương nữa nhé. Yêu em rất nhiều!",
      author: "Anh Quân",
      date: "2026-02-14",
      theme: "romantic-pink"
    },
    {
      id: "let-2",
      title: "Gửi anh Quân yêu thương",
      content: "Nhớ những ngày đầu tụi mình mới quen nhau, em đã bối rối biết bao. Cảm ơn sự kiên nhẫn, sự ấm áp và sự chu đáo mà anh luôn dành cho em. Cùng viết tiếp cuốn nhật ký ngọt ngào này mỗi ngày nha anh!",
      author: "Khánh Vy",
      date: "2026-03-01",
      theme: "warm-orange"
    }
  ]
};

// Read Database Helper
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
      return defaultDb;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, using fallback:", error);
    return defaultDb;
  }
}

// Write Database Helper
function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing to database file:", error);
    return false;
  }
}

// API: Get entire love content (secured with profile metadata for frontend initialization)
app.get("/api/love-profile", (req, res) => {
  const db = readDatabase();
  // We return everything except password for direct usage, or keep password check separate
  const { password, ...publicProfile } = db.profile;
  res.json({
    profile: publicProfile,
    hasPassword: !!password,
    memories: db.memories,
    letters: db.letters
  });
});

// API: Verify password
app.post("/api/verify-password", (req, res) => {
  const { password } = req.body;
  const db = readDatabase();
  const currentPassword = db.profile.password || "love";
  
  if (password === currentPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Mật khẩu không chính xác. Hãy nhớ lại ngày kỷ niệm hoặc từ khóa đặc biệt nhé!" });
  }
});

// API: Update love profile settings
app.post("/api/update-profile", (req, res) => {
  const { anniversaryDate, user1Name, user1Avatar, user2Name, user2Avatar, password, musicTrackUrl, musicTrackName } = req.body;
  const db = readDatabase();

  if (anniversaryDate !== undefined) db.profile.anniversaryDate = anniversaryDate;
  if (user1Name !== undefined) db.profile.user1Name = user1Name;
  if (user1Avatar !== undefined) db.profile.user1Avatar = user1Avatar;
  if (user2Name !== undefined) db.profile.user2Name = user2Name;
  if (user2Avatar !== undefined) db.profile.user2Avatar = user2Avatar;
  if (password !== undefined && password.trim() !== "") db.profile.password = password;
  if (musicTrackUrl !== undefined) db.profile.musicTrackUrl = musicTrackUrl;
  if (musicTrackName !== undefined) db.profile.musicTrackName = musicTrackName;

  writeDatabase(db);
  const { password: _, ...publicProfile } = db.profile;
  res.json({ success: true, profile: publicProfile });
});

// API: Add memory
app.post("/api/memories", (req, res) => {
  const { title, description, photo, date, location } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: "Tiêu đề và thời gian kỉ niệm là bắt buộc." });
  }

  const db = readDatabase();
  const newMemory = {
    id: "mem-" + Date.now(),
    title,
    description: description || "",
    photo: photo || "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop",
    date,
    location: location || "Nơi bình yên của hai người"
  };

  db.memories.unshift(newMemory); // Newest memories first
  writeDatabase(db);
  res.status(201).json({ success: true, memory: newMemory, memories: db.memories });
});

// API: Delete memory
app.delete("/api/memories/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const initialLength = db.memories.length;
  db.memories = db.memories.filter((m: any) => m.id !== id);

  if (db.memories.length < initialLength) {
    writeDatabase(db);
    res.json({ success: true, memories: db.memories });
  } else {
    res.status(404).json({ error: "Không tìm thấy kỉ niệm cần xóa." });
  }
});

// API: Add shared letter
app.post("/api/letters", (req, res) => {
  const { title, content, author, theme } = req.body;
  if (!title || !content || !author) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ tiêu đề, nội dung thư và người viết." });
  }

  const db = readDatabase();
  const newLetter = {
    id: "let-" + Date.now(),
    title,
    content,
    author,
    date: new Date().toISOString().split("T")[0],
    theme: theme || "romantic-pink"
  };

  db.letters.unshift(newLetter); // Newest letters first
  writeDatabase(db);
  res.status(201).json({ success: true, letter: newLetter, letters: db.letters });
});

// API: Delete shared letter
app.delete("/api/letters/:id", (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const initialLength = db.letters.length;
  db.letters = db.letters.filter((l: any) => l.id !== id);

  if (db.letters.length < initialLength) {
    writeDatabase(db);
    res.json({ success: true, letters: db.letters });
  } else {
    res.status(404).json({ error: "Không tìm thấy lá thư cần xóa." });
  }
});

// API: AI Love Helper (Uses Gemini 3.5 Flash to generate romance letters, advice or poems)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key chưa cấu hình. Hãy cấu hình GEMINI_API_KEY ở panel Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}

app.post("/api/generate-love-letter", async (req, res) => {
  const { prompt, tone, author, recipient } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Vui lòng cung cấp gợi ý hoặc cảm xúc của bạn." });
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `Bạn là một trợ lý viết thư tình ngọt ngào và thơ mộng nhất thế giới. Hãy giúp người dùng tên là "${author || 'Anh'}" viết một bức thư tình hoặc một bài thơ gửi cho người yêu của họ tên là "${recipient || 'Em'}".
Cảm hứng hoặc ý tưởng của người dùng: "${prompt}"
Tông giọng mong muốn: ${tone || "lãng mạn, chân thành, sâu lắng"}

Yêu cầu:
1. Viết bằng tiếng Việt mượt mà, sâu lắng, tràn ngập tình cảm ấm áp, lay động lòng người.
2. Bạn có thể sử dụng các hình ảnh ẩn dụ đẹp đẽ như trăng, sao, biển, nắng, gió.
3. Độ dài từ 100 đến 250 từ. Trình bày đẹp mắt, có tiêu đề thư tình thật ý nghĩa.
4. Không thêm bất kỳ văn bản giải thích thừa thãi nào ngoài nội dung thư.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: systemPrompt,
      config: {
        temperature: 0.85
      }
    });

    const text = response.text || "";
    // Break into Title and Content if possible, or just send text
    res.json({ letterText: text });
  } catch (error: any) {
    console.error("Gemini Love helper error:", error);
    res.status(500).json({
      error: error.message || "Không thể kết nối với AI Love Assistant. Bạn có thể tự viết tay lá thư ngọt ngào này nhé!"
    });
  }
});

// Setup Vite Development Middleware or Production Static Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Serve static files from project root (for heartcopy1.html, etc.) - AFTER vite middleware
  app.use(express.static(process.cwd()));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Couple Memories server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
