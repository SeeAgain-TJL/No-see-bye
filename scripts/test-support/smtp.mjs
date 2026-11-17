import net from "node:net";

/** Isolated loopback SMTP inbox for end-to-end verification; no external mail is sent. */
export async function smtpInbox() {
  const messages = [], connections = new Set();
  let reject = false;
  const server = net.createServer(socket => {
    connections.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => connections.delete(socket));
    socket.write("220 localhost ESMTP test inbox\r\n");
    let buffer = "", data = false, body = "", to = "";
    socket.on("data", chunk => {
      buffer += chunk.toString("utf8");
      let index;
      while ((index = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 2);
        if (data) {
          if (line === ".") {
            data = false;
            if (reject) socket.write("550 test rejection\r\n");
            else { messages.push({ to, body }); socket.write("250 accepted\r\n"); }
            body = "";
          } else body += line.replace(/^\.\./, ".") + "\r\n";
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-localhost\r\n250 8BITMIME\r\n");
        else if (/^MAIL FROM:/i.test(line)) { to = ""; socket.write("250 sender accepted\r\n"); }
        else if (/^RCPT TO:/i.test(line)) { to = line.slice(8).trim().replace(/^<|>$/g, ""); socket.write("250 recipient accepted\r\n"); }
        else if (/^DATA$/i.test(line)) { data = true; body = ""; socket.write("354 End with dot\r\n"); }
        else if (/^QUIT$/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return {
    port: server.address().port,
    messages,
    reject: value => { reject = value; },
    code: (index = messages.length - 1) => {
      const raw = messages[index]?.body || "", split = raw.indexOf("\r\n\r\n");
      const headers = raw.slice(0, split), content = raw.slice(split + 4);
      const message = /Content-Transfer-Encoding:\s*base64/i.test(headers) ? Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8")
        : content.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      const match = message.match(/Verification code: (\d{6})/);
      if (!match) throw new Error("SMTP capture has no verification code");
      return match[1];
    },
    close: () => new Promise(resolve => { for (const connection of connections) connection.destroy(); server.close(resolve); }),
  };
}
