export function detectarIPPrivada() {
  return new Promise((resolve) => {
    const ips = new Set();
    const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;

    if (!RTCPeerConnection) {
      resolve(null);
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel(""); // Necesario para que se generen candidatos

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        pc.close();
        resolve(ips.size > 0 ? Array.from(ips)[0] : null); // Solo devolvemos la primera IP detectada
        return;
      }

      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = candidate.match(ipRegex);

      if (match) {
        const ip = match[1];
        if (
          ip.startsWith("192.168.") ||
          ip.startsWith("10.") ||
          ip.startsWith("172.16.") || ip.startsWith("172.17.") || ip.startsWith("172.18.") ||
          ip.startsWith("172.19.") || ip.startsWith("172.20.") || ip.startsWith("172.21.") ||
          ip.startsWith("172.22.") || ip.startsWith("172.23.") || ip.startsWith("172.24.") ||
          ip.startsWith("172.25.") || ip.startsWith("172.26.") || ip.startsWith("172.27.") ||
          ip.startsWith("172.28.") || ip.startsWith("172.29.") || ip.startsWith("172.30.") ||
          ip.startsWith("172.31.")
        ) {
          if (!ips.has(ip)) {
            ips.add(ip);
          }
        }
      }
    };

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch((err) => {
        console.error("Error WebRTC:", err);
        resolve(null);
      });
  });
}
