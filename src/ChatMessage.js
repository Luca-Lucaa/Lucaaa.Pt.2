import React from "react";
import { Box, Typography } from "@mui/material";

const ChatMessage = ({ message, sender, timestamp, isOwnMessage }) => {
  // Formatierung des Datums und der Uhrzeit
  const formattedTimestamp = new Date(timestamp).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        marginBottom: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: "70%",
          padding: 1.5,
          borderRadius: 2,
          backgroundColor: isOwnMessage ? "primary.main" : "grey.200",
          color: isOwnMessage ? "primary.contrastText" : "text.primary",
          boxShadow: 1,
        }}
      >
        <Typography variant="body1">{message}</Typography>
        <Typography variant="caption" sx={{ display: "block", textAlign: "right" }}>
          {sender} - {formattedTimestamp}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatMessage;
