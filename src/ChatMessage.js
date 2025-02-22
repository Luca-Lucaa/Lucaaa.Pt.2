import React from "react";
import { Box, Typography } from "@mui/material";

const ChatMessage = ({ message, sender, timestamp, isOwnMessage }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        mb: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: "70%",
          p: 1,
          borderRadius: "10px",
          backgroundColor: isOwnMessage ? "#60a5fa" : "#e0e7ff",
          color: isOwnMessage ? "#fff" : "#333",
        }}
      >
        <Typography variant="body2">{message}</Typography>
        <Typography variant="caption" sx={{ textAlign: "right", display: "block" }}>
          {new Date(timestamp).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatMessage;
