const messageInput = document.getElementById("messageInput");
const recipientsInput = document.getElementById("recipientsInput");
const charCount = document.getElementById("charCount");
const previewBox = document.getElementById("previewBox");
const totalCount = document.getElementById("totalCount");
const validCount = document.getElementById("validCount");
const duplicateCount = document.getElementById("duplicateCount");
const invalidCount = document.getElementById("invalidCount");
const intervalInput = document.getElementById("intervalInput");
const targetMode = document.getElementById("targetMode");
const consentCheck = document.getElementById("consentCheck");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const logBox = document.getElementById("logBox");
const csvInput = document.getElementById("csvInput");

let queue = [];
let currentIndex = 0;
let timer = null;
let isPaused = false;
let logs = [];

const templates = {
  event: "你好 {{name}}，提提你活動將於明天舉行。\n\n時間：下午 2:00\n地點：請參閱活動通知\n\n如有查詢，歡迎回覆此訊息。謝謝！",
  follow: "你好 {{name}}，多謝你早前查詢 {{company}} 的資料。\n\n我想跟進一下你是否需要進一步協助？",
  festival: "你好 {{name}}，祝你節日快樂！\n\n願你和家人身體健康、生活愉快 😊",
  promo: "你好 {{name}}，我們現正推出最新活動／服務資訊。\n\n有興趣了解更多，可直接回覆此訊息。"
};

function saveState() {
  localStorage.setItem("waFlowState", JSON.stringify({
    message: messageInput.value,
    recipients: recipientsInput.value,
    interval: intervalInput.value
  }));
}

function loadState() {
  const raw = localStorage.getItem("waFlowState");
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    messageInput.value = state.message || "";
    recipientsInput.value = state.recipients || "";
    intervalInput.value = state.interval || 3;
  } catch {}
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function parseRecipients() {
  const rows = recipientsInput.value.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
  const seen = new Set();
  const valid = [];
  const invalid = [];
  let duplicates = 0;

  for (const row of rows) {
    const parts = row.split(",").map(p => p.trim());
    const phone = normalizePhone(parts[0]);
    const name = parts[1] || "";
    const company = parts[2] || "";

    if (phone.length < 8 || phone.length > 15) {
      invalid.push({ row, reason: "電話號碼長度不正確" });
      continue;
    }

    if (seen.has(phone)) {
      duplicates++;
      continue;
    }

    seen.add(phone);
    valid.push({ phone, name, company, row });
  }

  return { valid, invalid, duplicates, total: rows.length };
}

function renderPreview() {
  const parsed = parseRecipients();
  const first = parsed.valid[0] || { phone: "85291234567", name: "Chan Tai Man", company: "ABC Company" };
  const preview = personalize(messageInput.value, first).trim();
  previewBox.textContent = preview || "請先輸入訊息內容";
  charCount.textContent = `${messageInput.value.length} 字`;

  totalCount.textContent = parsed.total;
  validCount.textContent = parsed.valid.length;
  duplicateCount.textContent = parsed.duplicates;
  invalidCount.textContent = parsed.invalid.length;
}

function personalize(message, recipient) {
  return message
    .replaceAll("{{name}}", recipient.name || "")
    .replaceAll("{{phone}}", recipient.phone || "")
    .replaceAll("{{company}}", recipient.company || "");
}

function makeWaLink(recipient) {
  const text = personalize(messageInput.value, recipient);
  return `https://wa.me/${recipient.phone}?text=${encodeURIComponent(text)}`;
}

function addLog(text, type = "normal") {
  const item = {
    time: new Date().toLocaleTimeString(),
    text,
    type
  };
  logs.unshift(item);
  logs = logs.slice(0, 200);
  renderLog();
}

function renderLog() {
  logBox.innerHTML = logs.map(log => `
    <div class="log-item ${log.type === "error" ? "error" : ""}">
      [${log.time}] ${escapeHtml(log.text)}
    </div>
  `).join("");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[m]));
}

function updateProgress() {
  const total = queue.length || 1;
  const percent = Math.min(100, Math.round((currentIndex / total) * 100));
  progressBar.style.width = `${percent}%`;
  statusText.textContent = queue.length
    ? `已開啟 ${currentIndex} / ${queue.length}`
    : "未開始";
}

function openNext() {
  if (isPaused) return;
  if (currentIndex >= queue.length) {
    clearInterval(timer);
    timer = null;
    statusText.textContent = "完成";
    progressBar.style.width = "100%";
    addLog("全部 wa.me 連結已開啟。請於 WhatsApp 內確認及手動發送。");
    return;
  }

  const recipient = queue[currentIndex];
  const link = makeWaLink(recipient);

  if (targetMode.value === "same") {
    window.location.href = link;
  } else {
    window.open(link, "_blank", "noopener,noreferrer");
  }

  currentIndex++;
  addLog(`已開啟：${recipient.phone}${recipient.name ? " / " + recipient.name : ""}`);
  updateProgress();
}

function startSending() {
  const parsed = parseRecipients();

  if (!consentCheck.checked) {
    alert("請先確認收訊者已同意接收相關 WhatsApp 訊息。");
    return;
  }

  if (!messageInput.value.trim()) {
    alert("請先輸入訊息內容。");
    return;
  }

  if (!parsed.valid.length) {
    alert("請先輸入有效電話號碼。");
    return;
  }

  queue = parsed.valid;
  currentIndex = 0;
  isPaused = false;
  clearInterval(timer);

  const interval = Math.max(1, Math.min(60, Number(intervalInput.value) || 3)) * 1000;
  addLog(`開始開啟 ${queue.length} 個 wa.me 連結，間隔 ${interval / 1000} 秒。`);
  updateProgress();
  openNext();
  timer = setInterval(openNext, interval);
}

function pauseSending() {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "繼續" : "暫停";
  statusText.textContent = isPaused ? "已暫停" : `已開啟 ${currentIndex} / ${queue.length}`;
  if (!isPaused && queue.length) {
    openNext();
  }
}

function stopSending() {
  clearInterval(timer);
  timer = null;
  isPaused = false;
  pauseBtn.textContent = "暫停";
  queue = [];
  currentIndex = 0;
  progressBar.style.width = "0%";
  statusText.textContent = "已停止";
  addLog("已停止。");
}

function exportLogs() {
  const content = [
    ["Time", "Record"],
    ...logs.map(log => [log.time, log.text])
  ].map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wa-flow-sender-log-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadDemo() {
  messageInput.value = templates.event;
  recipientsInput.value = "85291234567, Chan Tai Man, ABC Company\n85298765432, Wong Siu Ming, XYZ Limited\n85261234567, Lee Ka Yan, Example NGO";
  intervalInput.value = 3;
  saveState();
  renderPreview();
}

document.querySelectorAll("[data-template]").forEach(btn => {
  btn.addEventListener("click", () => {
    messageInput.value = templates[btn.dataset.template];
    saveState();
    renderPreview();
  });
});

csvInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  recipientsInput.value = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).join("\n");
  saveState();
  renderPreview();
});

messageInput.addEventListener("input", () => { saveState(); renderPreview(); });
recipientsInput.addEventListener("input", () => { saveState(); renderPreview(); });
intervalInput.addEventListener("input", saveState);

startBtn.addEventListener("click", startSending);
pauseBtn.addEventListener("click", pauseSending);
stopBtn.addEventListener("click", stopSending);
document.getElementById("exportBtn").addEventListener("click", exportLogs);
document.getElementById("demoBtn").addEventListener("click", loadDemo);
document.getElementById("clearBtn").addEventListener("click", () => {
  if (!confirm("確定清除全部資料？")) return;
  messageInput.value = "";
  recipientsInput.value = "";
  intervalInput.value = 3;
  logs = [];
  localStorage.removeItem("waFlowState");
  renderLog();
  renderPreview();
});

loadState();
renderPreview();
