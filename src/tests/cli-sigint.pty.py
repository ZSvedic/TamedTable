# Helper for cli-sigint.test.ts: forks the REPL child (cli-sigint.child.ts) in a real
# PTY, types an NL request, sends Ctrl-C (0x03) while the request is in
# flight, then queues ":history" + "exit" to see whether the session is still
# alive. Prints the raw transcript followed by one machine-readable JSON line
# prefixed PTY-RESULT: that the bun test parses.
#
# Usage: python3 cli-sigint.pty.py <child.ts path> <src dir (cwd for bun)>
import json
import os
import pty
import select
import signal
import sys
import time

child = sys.argv[1]
srcdir = sys.argv[2]

pid, fd = pty.fork()
if pid == 0:
    os.chdir(srcdir)
    # The child replays a cassette with an injected key; strip real keys so a
    # CI environment can never turn this into a live call.
    for k in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY"):
        os.environ.pop(k, None)
    os.execvp("bun", ["bun", child])

out = b""


def drain(timeout):
    """Read PTY output for `timeout` seconds; False once the PTY closes."""
    global out
    end = time.time() + timeout
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.2)
        if fd in r:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                return False  # EOF (pty closed)
            if not chunk:
                return False
            out += chunk
    return True


drain(3.0)  # startup table + prompt
os.write(fd, b"Normalize country names\n")
drain(1.5)  # request now in flight (first model call sits in its 3 s delay)
os.write(fd, b"\x03")  # Ctrl-C: spec: cancel the in-flight request
time.sleep(0.3)
os.write(fd, b":history\nexit\n")  # only processed if the loop survives
drain(15.0)

status = None
for _ in range(100):
    p, st = os.waitpid(pid, os.WNOHANG)
    if p == pid:
        status = st
        break
    time.sleep(0.1)
if status is None:
    os.kill(pid, signal.SIGKILL)
    os.waitpid(pid, 0)

text = out.decode("utf-8", "replace")
print(text)
result = {
    "childExited": status is not None,
    "cancelledLine": "Cancelled." in text,
    "requestCompleted": "United States" in text,
    # The queued ":history" only runs if the readline loop survived the ^C.
    # After a spec-compliant cancel the journal is empty -> "(no history)";
    # if the request somehow committed first, the entry shows "[committed]".
    "historyProcessed": ("(no history)" in text) or ("[committed]" in text),
    "runcliReturned": "RUNCLI-RETURNED" in text,
    "startupSeen": "Type :help for commands" in text,
}
print("PTY-RESULT:" + json.dumps(result))
