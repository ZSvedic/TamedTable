// packages/voice-input/index.ts
function buildVoicePrompt(ctx) {
  const lines = [
    "The user's request is spoken in the attached audio clip. Listen to it",
    "and carry out that request directly — there is no written request text.",
    "Also set the `transcript` argument of apply_spec_patch to a verbatim",
    "transcript of the audio.",
    "",
    "Current table context:",
    `- File: ${ctx.filename}`,
    `- Columns: ${ctx.columns.join(", ")}`
  ];
  if (ctx.selectedCell) {
    const { col, row, value } = ctx.selectedCell;
    lines.push(`- Selected cell: column "${col}", row ${row + 1}, value ${JSON.stringify(value)}`);
  }
  return lines.join(`
`);
}

// packages/model-config/audio-wav.ts
async function blobToWavBytes(blob) {
  const rate = 16000;
  const ctx = new OfflineAudioContext(1, 1, rate);
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  const mono = new Float32Array(decoded.length);
  for (let ch = 0;ch < decoded.numberOfChannels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0;i < decoded.length; i++)
      mono[i] += data[i] / decoded.numberOfChannels;
  }
  const out = new DataView(new ArrayBuffer(44 + mono.length * 2));
  const ascii = (off, s) => {
    for (let i = 0;i < s.length; i++)
      out.setUint8(off + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  out.setUint32(4, 36 + mono.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 1, true);
  out.setUint32(24, decoded.sampleRate, true);
  out.setUint32(28, decoded.sampleRate * 2, true);
  out.setUint16(32, 2, true);
  out.setUint16(34, 16, true);
  ascii(36, "data");
  out.setUint32(40, mono.length * 2, true);
  for (let i = 0;i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    out.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return new Uint8Array(out.buffer);
}

// packages/voice-input/browser-voice.ts
function browserVoicePort() {
  let recorder = null;
  let stream = null;
  let chunks = [];
  const teardown = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    recorder = null;
    chunks = [];
  };
  return {
    async startRecording() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0)
          chunks.push(e.data);
      };
      recorder.start();
    },
    stopRecording() {
      return new Promise((resolve, reject) => {
        const rec = recorder;
        if (!rec) {
          reject(new Error("No recording in progress."));
          return;
        }
        rec.onstop = () => {
          const recorded = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          teardown();
          blobToWavBytes(recorded).then((wav) => resolve(new Blob([wav], { type: "audio/wav" })), reject);
        };
        rec.stop();
      });
    },
    cancelRecording() {
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      teardown();
    }
  };
}

// packages/voice-input/demo.ts
var $ = (id) => document.getElementById(id);
var startBtn = $("vi-start");
var stopBtn = $("vi-stop");
var cancelBtn = $("vi-cancel");
var port = browserVoicePort();
function setState(state) {
  $("vi-state").textContent = state;
  startBtn.disabled = state === "recording";
  stopBtn.disabled = state !== "recording";
  cancelBtn.disabled = state !== "recording";
}
startBtn.addEventListener("click", async () => {
  try {
    await port.startRecording();
    setState("recording");
  } catch (e) {
    $("vi-result").textContent = e.message;
  }
});
stopBtn.addEventListener("click", async () => {
  try {
    const blob = await port.stopRecording();
    $("vi-result").textContent = `${blob.type} · ${blob.size.toLocaleString("en-US")} bytes`;
    const audio = $("vi-audio");
    audio.src = URL.createObjectURL(blob);
    audio.style.display = "";
    setState("stopped");
  } catch (e) {
    $("vi-result").textContent = e.message;
    setState("idle");
  }
});
cancelBtn.addEventListener("click", () => {
  port.cancelRecording();
  $("vi-result").textContent = "cancelled";
  setState("idle");
});
$("out").textContent = buildVoicePrompt({
  filename: "people.csv",
  columns: ["name", "phone", "country"],
  selectedCell: { col: "phone", row: 2, value: "555-0199" }
});
