import { useRef, useState } from "react";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

// QuickSight embedding SDK is loaded as a global script in index.html
declare const QuickSightEmbedding: {
  createEmbeddingContext: (options?: object) => Promise<{ embedQuickChat: Function }>;
};

const EMBED_CONFIG_URL = "https://d101591d1kwpyj.cloudfront.net/api/get-embed-config";
const PARTNER_ID = "finops";
const PANEL_BODY_ID = "qs-widget-body";

const QuickSuiteChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const initialised = useRef(false);

  const initEmbed = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`${EMBED_CONFIG_URL}?partnerId=${encodeURIComponent(PARTNER_ID)}`);
      if (!res.ok) throw new Error(await res.text());
      const { embedUrl, contentOptions } = await res.json();
      // Clear loading state before SDK runs so the body div is visible and has real dimensions
      setStatus("ready");
      const ctx = await QuickSightEmbedding.createEmbeddingContext();
      await ctx.embedQuickChat({ url: embedUrl, container: `#${PANEL_BODY_ID}`, height: "100%", width: "100%" }, contentOptions);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!initialised.current) {
      initialised.current = true;
      // 50ms: let the CSS transition start so the container has real dimensions before SDK init
      setTimeout(initEmbed, 50);
    }
  };

  return (
    <>
      {/* FAB — fixed bottom-right */}
      <Fab
        color="primary"
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1250 }}
      >
        {open ? <CloseIcon /> : <ChatBubbleIcon />}
      </Fab>

      {/* Expandable panel */}
      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          bottom: 96,
          right: 24,
          width: 400,
          height: 560,
          maxHeight: "80vh",
          zIndex: 1249,
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          overflow: "hidden",
          transformOrigin: "bottom right",
          transform: open ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "transform 0.25s ease, opacity 0.25s ease",
          "@media (max-width: 480px)": {
            width: "100vw",
            height: "100dvh",
            bottom: 0,
            right: 0,
            borderRadius: 0,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: "primary.main",
            color: "white",
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <ChatBubbleIcon fontSize="small" />
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              FinOps Assistant
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Ask anything about your cloud costs
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "white" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Embed target — QuickSight SDK mounts the iframe here */}
        <Box id={PANEL_BODY_ID} flex={1} sx={{ overflow: "hidden", position: "relative" }}>
          {status === "loading" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Loading AI Assistant…
              </Typography>
            </Box>
          )}
          {status === "error" && (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" color="error.main">
                Failed to load assistant. {errorMsg}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </>
  );
};

export default QuickSuiteChatWidget;
