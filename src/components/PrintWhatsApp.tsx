import { forwardRef } from "react";

interface Props {
  nomeCliente: string;
  fotoCliente?: string | null;
  telefone: string;
  texto: string;
  hora: string; // "14:32"
}

/**
 * Mockup fiel da UI do WhatsApp pra gerar print sintético via html-to-image.
 * Resolução alvo 1080x1920 (proporção 9:16). Renderizado em 360x640 e
 * exportado em 3x pelo pixelRatio do html-to-image (vira 1080x1920).
 */
export const PrintWhatsApp = forwardRef<HTMLDivElement, Props>(({ nomeCliente, fotoCliente, telefone, texto, hora }, ref) => {
  const inicial = (nomeCliente || telefone || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      ref={ref}
      style={{
        width: "360px",
        height: "640px",
        background: "#E5DDD5",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\"><rect width=\"60\" height=\"60\" fill=\"%23E5DDD5\"/><circle cx=\"15\" cy=\"15\" r=\"1\" fill=\"%23D5CCC4\"/><circle cx=\"45\" cy=\"45\" r=\"1\" fill=\"%23D5CCC4\"/></svg>')",
        fontFamily: '"Segoe UI", -apple-system, sans-serif',
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header verde WA */}
      <div
        style={{
          background: "#075E54",
          color: "#fff",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "20px", marginRight: "2px" }}>‹</span>
        {fotoCliente ? (
          <img src={fotoCliente} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#128C7E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {inicial}
          </div>
        )}
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ fontSize: "15px", fontWeight: 500 }}>{nomeCliente || telefone}</div>
          <div style={{ fontSize: "11px", opacity: 0.85 }}>online</div>
        </div>
        <span style={{ fontSize: "18px" }}>📹</span>
        <span style={{ fontSize: "18px" }}>📞</span>
        <span style={{ fontSize: "18px" }}>⋮</span>
      </div>

      {/* Corpo */}
      <div style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {/* Data divider */}
        <div style={{ textAlign: "center", margin: "0 0 14px 0" }}>
          <span
            style={{
              background: "#E1F3FB",
              padding: "3px 10px",
              borderRadius: "8px",
              fontSize: "11px",
              color: "#5B6B72",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
            }}
          >
            HOJE
          </span>
        </div>

        {/* Bolha verde (enviada pelo corretor) */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: "#DCF8C6",
              color: "#111",
              padding: "7px 10px 5px 10px",
              borderRadius: "8px",
              borderTopRightRadius: "0",
              maxWidth: "78%",
              fontSize: "14px",
              lineHeight: "19px",
              boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              position: "relative",
            }}
          >
            <div style={{ paddingRight: "44px" }}>{texto}</div>
            <div
              style={{
                fontSize: "10px",
                color: "#667781",
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                position: "absolute",
                right: "8px",
                bottom: "4px",
              }}
            >
              {hora}
              <span style={{ color: "#4FC3F7", fontSize: "12px", marginLeft: "2px" }}>✓✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input fake */}
      <div style={{ background: "#F0F0F0", padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "18px", color: "#919191" }}>😊</span>
        <div style={{ flex: 1, background: "#fff", borderRadius: "20px", padding: "8px 12px", fontSize: "13px", color: "#999" }}>
          Mensagem
        </div>
        <span style={{ fontSize: "18px", color: "#919191" }}>📎</span>
        <div
          style={{
            background: "#128C7E",
            color: "#fff",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
          }}
        >
          🎤
        </div>
      </div>

      {/* Watermark Buzz */}
      <div
        style={{
          position: "absolute",
          top: "50px",
          right: "8px",
          background: "rgba(255,255,255,0.85)",
          padding: "3px 8px",
          borderRadius: "10px",
          fontSize: "9px",
          color: "#666",
          fontWeight: 500,
        }}
      >
        Buzz Oferta Ativa
      </div>
    </div>
  );
});

PrintWhatsApp.displayName = "PrintWhatsApp";
