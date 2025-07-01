function detectarIPPrivadaWebRTC(callback) {
    let ipDetectada = null;
  
    const pc = new RTCPeerConnection({
      iceServers: []
    });
  
    // Crea un canal de datos ficticio (necesario en algunos navegadores)
    pc.createDataChannel("");
  
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        pc.close();
        callback(ipDetectada); // Devuelve la IP si fue encontrada
        return;
      }
  
      const candidate = event.candidate.candidate;
      const ipMatch = candidate.match(/(\b\d{1,3}(\.\d{1,3}){3}\b)/);
  
      if (ipMatch) {
        const ip = ipMatch[1];
  
        // Filtros para solo IPs privadas (192.168.x.x, 10.x.x.x, etc.)
        if (
          ip.startsWith("192.168.") ||
          ip.startsWith("10.") ||
          ip.startsWith("172.16.") || ip.startsWith("172.17.") ||
          ip.startsWith("172.18.") || ip.startsWith("172.19.") ||
          ip.startsWith("172.20.") || ip.startsWith("172.21.") ||
          ip.startsWith("172.22.") || ip.startsWith("172.23.") ||
          ip.startsWith("172.24.") || ip.startsWith("172.25.") ||
          ip.startsWith("172.26.") || ip.startsWith("172.27.") ||
          ip.startsWith("172.28.") || ip.startsWith("172.29.") ||
          ip.startsWith("172.30.") || ip.startsWith("172.31.")
        ) {
          ipDetectada = ip;
        }
      }
    };
  
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch((err) => {
        console.warn("❌ WebRTC offer failed:", err);
        callback(null);
      });
  }
  
  // Si no tienes IP aún, intenta con WebRTC
if (!window.datosVisitante.ipPrivada || window.datosVisitante.ipPrivada === "No disponible") {
    detectarIPPrivadaWebRTC((ip) => {
      if (ip) {
        window.datosVisitante.ipPrivada = ip;
        localStorage.setItem("ipPrivada", ip);
        console.log("✅ IP privada detectada con WebRTC:", ip);
      } else {
        console.warn("⚠️ No se pudo detectar la IP privada con WebRTC");
      }
    });
  }
  
